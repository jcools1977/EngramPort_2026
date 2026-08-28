BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE observation_subject_bindings (
  database_role name PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  subscriber_id uuid NOT NULL REFERENCES principals(id),
  active boolean NOT NULL DEFAULT true,
  bound_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE observation_subscriptions (
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  subscription_id uuid PRIMARY KEY,
  subscriber_id uuid NOT NULL REFERENCES principals(id),
  project_id uuid NOT NULL REFERENCES projects(id),
  selector_revision text NOT NULL CHECK (selector_revision ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (tenant_id, subscription_id, subscriber_id)
);

CREATE TABLE observation_checkpoints (
  checkpoint_sequence bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  checkpoint_id uuid NOT NULL UNIQUE,
  tenant_id uuid NOT NULL,
  subscription_id uuid NOT NULL,
  subscriber_id uuid NOT NULL,
  selector_revision text NOT NULL CHECK (selector_revision ~ '^[0-9a-f]{64}$'),
  covered_from text NOT NULL,
  covered_to text NOT NULL,
  event_count integer NOT NULL CHECK (event_count > 0),
  batch_digest text NOT NULL CHECK (batch_digest ~ '^[0-9a-f]{64}$'),
  prior_checkpoint_digest text CHECK (prior_checkpoint_digest IS NULL OR prior_checkpoint_digest ~ '^[0-9a-f]{64}$'),
  delivery_id text NOT NULL CHECK (delivery_id ~ '^[0-9a-f]{64}$'),
  checkpoint_digest text NOT NULL CHECK (checkpoint_digest ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY (tenant_id, subscription_id, subscriber_id)
    REFERENCES observation_subscriptions(tenant_id, subscription_id, subscriber_id),
  UNIQUE (subscription_id, delivery_id),
  UNIQUE (subscription_id, checkpoint_digest)
);

CREATE FUNCTION observation_subject_matches(p_tenant_id uuid, p_subscriber_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM observation_subject_bindings b
    WHERE b.database_role=session_user::name AND b.tenant_id=p_tenant_id
      AND b.subscriber_id=p_subscriber_id AND b.active
  )
$$;

REVOKE ALL ON FUNCTION observation_subject_matches(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION observation_subject_matches(uuid,uuid) TO engram_app;

ALTER TABLE observation_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE observation_subscriptions FORCE ROW LEVEL SECURITY;
CREATE POLICY observation_subscription_subject ON observation_subscriptions
  FOR SELECT TO PUBLIC
  USING (observation_subject_matches(tenant_id,subscriber_id));

ALTER TABLE observation_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE observation_checkpoints FORCE ROW LEVEL SECURITY;
CREATE POLICY observation_checkpoint_subject ON observation_checkpoints
  FOR SELECT TO PUBLIC
  USING (observation_subject_matches(tenant_id,subscriber_id)); /* OBSERVATION_FORCED_RLS_SUBJECT */
CREATE POLICY observation_checkpoint_append_subject ON observation_checkpoints
  FOR INSERT TO PUBLIC
  WITH CHECK (observation_subject_matches(tenant_id,subscriber_id));

CREATE FUNCTION observation_digest_field(p_value text)
RETURNS bytea LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$ SELECT convert_to(octet_length(convert_to(COALESCE(p_value,''),'UTF8'))::text || ':' || COALESCE(p_value,''),'UTF8') $$;

CREATE FUNCTION observation_checkpoint_body_digest(
  p_tenant_id uuid,p_subscription_id uuid,p_subscriber_id uuid,p_selector_revision text,
  p_covered_from text,p_covered_to text,p_event_count integer,p_batch_digest text,
  p_prior_checkpoint_digest text,p_delivery_id text
) RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$
  SELECT encode(digest(
    observation_digest_field('observation-checkpoint-v1') ||
    observation_digest_field(p_tenant_id::text) || observation_digest_field(p_subscription_id::text) ||
    observation_digest_field(p_subscriber_id::text) || observation_digest_field(p_selector_revision) ||
    observation_digest_field(p_covered_from) || observation_digest_field(p_covered_to) ||
    observation_digest_field(p_event_count::text) || observation_digest_field(p_batch_digest) ||
    observation_digest_field(COALESCE(p_prior_checkpoint_digest,'')) || observation_digest_field(p_delivery_id),
    'sha256'),'hex')
$$;

CREATE FUNCTION reject_observation_checkpoint_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'OBSERVATION_CHECKPOINT_APPEND_ONLY' USING ERRCODE='55000'; END $$;
CREATE TRIGGER observation_checkpoint_no_change
  BEFORE UPDATE OR DELETE ON observation_checkpoints FOR EACH ROW EXECUTE FUNCTION reject_observation_checkpoint_mutation();
CREATE TRIGGER observation_checkpoint_no_truncate
  BEFORE TRUNCATE ON observation_checkpoints FOR EACH STATEMENT EXECUTE FUNCTION reject_observation_checkpoint_mutation();

CREATE FUNCTION append_observation_checkpoint(
  p_checkpoint_id uuid,p_tenant_id uuid,p_subscription_id uuid,p_subscriber_id uuid,
  p_selector_revision text,p_covered_from text,p_covered_to text,p_event_count integer,
  p_batch_digest text,p_prior_checkpoint_digest text,p_delivery_id text,p_checkpoint_digest text
) RETURNS SETOF observation_checkpoints
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE tip text; existing observation_checkpoints%ROWTYPE;
BEGIN
  IF NOT observation_subject_matches(p_tenant_id,p_subscriber_id) THEN
    RAISE EXCEPTION 'OBSERVATION_SUBJECT_DENIED' USING ERRCODE='42501';
  END IF;
  PERFORM 1 FROM observation_subscriptions s
    WHERE s.tenant_id=p_tenant_id AND s.subscription_id=p_subscription_id
      AND s.subscriber_id=p_subscriber_id AND s.selector_revision=p_selector_revision;
  IF NOT FOUND THEN RAISE EXCEPTION 'OBSERVATION_SUBSCRIPTION_DENIED' USING ERRCODE='42501'; END IF;
  IF observation_checkpoint_body_digest(p_tenant_id,p_subscription_id,p_subscriber_id,p_selector_revision,
       p_covered_from,p_covered_to,p_event_count,p_batch_digest,p_prior_checkpoint_digest,p_delivery_id) <> p_checkpoint_digest THEN
    RAISE EXCEPTION 'OBSERVATION_CHECKPOINT_BODY_INVALID' USING ERRCODE='22000';
  END IF;
  SELECT * INTO existing FROM observation_checkpoints c
    WHERE c.subscription_id=p_subscription_id AND c.delivery_id=p_delivery_id;
  IF FOUND THEN
    IF existing.checkpoint_digest<>p_checkpoint_digest THEN
      RAISE EXCEPTION 'OBSERVATION_DELIVERY_COLLISION' USING ERRCODE='23505';
    END IF;
    RETURN NEXT existing; RETURN;
  END IF;
  SELECT c.checkpoint_digest INTO tip FROM observation_checkpoints c
    WHERE c.subscription_id=p_subscription_id ORDER BY c.checkpoint_sequence DESC LIMIT 1 FOR UPDATE;
  IF COALESCE(tip,'')<>COALESCE(p_prior_checkpoint_digest,'') THEN
    RAISE EXCEPTION 'OBSERVATION_PRIOR_DIGEST_INVALID' USING ERRCODE='40001';
  END IF;
  INSERT INTO observation_checkpoints(checkpoint_id,tenant_id,subscription_id,subscriber_id,selector_revision,
    covered_from,covered_to,event_count,batch_digest,prior_checkpoint_digest,delivery_id,checkpoint_digest)
  VALUES(p_checkpoint_id,p_tenant_id,p_subscription_id,p_subscriber_id,p_selector_revision,
    p_covered_from,p_covered_to,p_event_count,p_batch_digest,p_prior_checkpoint_digest,p_delivery_id,p_checkpoint_digest)
  RETURNING * INTO existing;
  RETURN NEXT existing;
END $$;

CREATE FUNCTION list_observation_checkpoints(p_subscription_id uuid)
RETURNS SETOF observation_checkpoints LANGUAGE sql STABLE SECURITY INVOKER
AS $$ SELECT * FROM observation_checkpoints WHERE subscription_id=p_subscription_id ORDER BY checkpoint_sequence $$;

CREATE FUNCTION get_observation_checkpoint(p_checkpoint_id uuid)
RETURNS SETOF observation_checkpoints
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public SET row_security=off
AS $$
DECLARE found_row observation_checkpoints%ROWTYPE;
BEGIN
  SELECT * INTO found_row FROM observation_checkpoints c WHERE c.checkpoint_id=p_checkpoint_id;
  IF NOT FOUND THEN RETURN; END IF;
  IF NOT observation_subject_matches(found_row.tenant_id,found_row.subscriber_id) THEN
    RAISE EXCEPTION 'OBSERVATION_CHECKPOINT_DENIED' USING ERRCODE='42501';
  END IF;
  RETURN NEXT found_row;
END $$;

REVOKE ALL ON observation_subject_bindings,observation_subscriptions,observation_checkpoints FROM PUBLIC,engram_app,engram_maintenance;
GRANT SELECT ON observation_subscriptions,observation_checkpoints TO engram_app;
REVOKE ALL ON FUNCTION observation_digest_field(text),observation_checkpoint_body_digest(uuid,uuid,uuid,text,text,text,integer,text,text,text),
  append_observation_checkpoint(uuid,uuid,uuid,uuid,text,text,text,integer,text,text,text,text),
  list_observation_checkpoints(uuid),get_observation_checkpoint(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION append_observation_checkpoint(uuid,uuid,uuid,uuid,text,text,text,integer,text,text,text,text),
  list_observation_checkpoints(uuid),get_observation_checkpoint(uuid) TO engram_app;

COMMIT;
