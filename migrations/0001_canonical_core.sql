BEGIN;

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE principal_kind AS ENUM ('human','service','api_client');
CREATE TYPE actor_kind AS ENUM ('human','agent','service');
CREATE TYPE trust_level AS ENUM ('system','verified_human','trusted_service','trusted_agent','untrusted_agent','imported');
CREATE TYPE visibility AS ENUM ('private','thread','project');

CREATE TABLE tenants (
  id uuid PRIMARY KEY, slug text NOT NULL UNIQUE, name text NOT NULL,
  settings jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE principals (
  id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES tenants(id), kind principal_kind NOT NULL,
  external_issuer text, external_subject text, display_name text NOT NULL, disabled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (tenant_id, external_issuer, external_subject), UNIQUE (tenant_id, id)
);
CREATE TABLE projects (
  id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES tenants(id), slug text NOT NULL, name text NOT NULL,
  default_visibility visibility NOT NULL DEFAULT 'project', retention_policy jsonb NOT NULL DEFAULT '{}',
  next_seq bigint NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(), archived_at timestamptz,
  UNIQUE (tenant_id, slug), UNIQUE (tenant_id, id)
);
CREATE TABLE project_memberships (
  tenant_id uuid NOT NULL, project_id uuid NOT NULL, principal_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('owner','maintainer','contributor','reader','approver')),
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (project_id, principal_id),
  FOREIGN KEY (tenant_id, project_id) REFERENCES projects(tenant_id, id),
  FOREIGN KEY (tenant_id, principal_id) REFERENCES principals(tenant_id, id)
);
CREATE TABLE actors (
  id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES tenants(id), project_id uuid NOT NULL,
  kind actor_kind NOT NULL, slug text NOT NULL, display_name text NOT NULL, provider text, model_family text,
  owner_principal_id uuid REFERENCES principals(id), trust trust_level NOT NULL,
  capabilities text[] NOT NULL DEFAULT '{}', metadata jsonb NOT NULL DEFAULT '{}', disabled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), FOREIGN KEY (tenant_id, project_id) REFERENCES projects(tenant_id, id),
  UNIQUE (project_id, slug), UNIQUE (tenant_id, id)
);
CREATE TABLE actor_delegations (
  actor_id uuid NOT NULL REFERENCES actors(id), principal_id uuid NOT NULL REFERENCES principals(id),
  scopes text[] NOT NULL, expires_at timestamptz, PRIMARY KEY (actor_id, principal_id)
);
CREATE TABLE agent_sessions (
  id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES tenants(id), project_id uuid NOT NULL,
  actor_id uuid NOT NULL REFERENCES actors(id), provider_session_ref text, client_name text NOT NULL,
  client_version text, started_at timestamptz NOT NULL DEFAULT now(), ended_at timestamptz,
  last_seen_seq bigint NOT NULL DEFAULT 0, metadata jsonb NOT NULL DEFAULT '{}',
  FOREIGN KEY (tenant_id, project_id) REFERENCES projects(tenant_id, id)
);
CREATE TABLE threads (
  id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES tenants(id), project_id uuid NOT NULL, slug text NOT NULL,
  title text NOT NULL, mode text NOT NULL CHECK (mode IN ('strict_relay','free_form','coordinator_led','human_gated')),
  created_by uuid NOT NULL REFERENCES actors(id), created_at timestamptz NOT NULL DEFAULT now(), closed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}', FOREIGN KEY (tenant_id, project_id) REFERENCES projects(tenant_id, id),
  UNIQUE (project_id, slug), UNIQUE (tenant_id, id)
);
CREATE TABLE events (
  id uuid PRIMARY KEY, tenant_id uuid NOT NULL, project_id uuid NOT NULL, thread_id uuid REFERENCES threads(id),
  project_seq bigint NOT NULL, schema_version integer NOT NULL, kind text NOT NULL,
  actor_id uuid NOT NULL REFERENCES actors(id), principal_id uuid NOT NULL REFERENCES principals(id),
  agent_session_id uuid REFERENCES agent_sessions(id), occurred_at timestamptz NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT clock_timestamp(), in_reply_to uuid REFERENCES events(id),
  correlation_id uuid NOT NULL, causation_id uuid REFERENCES events(id), idempotency_key text NOT NULL,
  visibility visibility NOT NULL, trust trust_level NOT NULL, content_type text NOT NULL DEFAULT 'application/json',
  payload jsonb NOT NULL, labels text[] NOT NULL DEFAULT '{}', metadata jsonb NOT NULL DEFAULT '{}',
  hash_profile text NOT NULL, content_sha256 bytea NOT NULL, previous_chain_hash bytea, chain_hash bytea NOT NULL,
  signature jsonb, search_document tsvector GENERATED ALWAYS AS
    (to_tsvector('english', coalesce(payload->>'title','') || ' ' || coalesce(payload->>'body','') || ' ' || coalesce(payload->>'statement',''))) STORED,
  FOREIGN KEY (tenant_id, project_id) REFERENCES projects(tenant_id, id), UNIQUE (project_id, project_seq),
  UNIQUE (principal_id, project_id, idempotency_key), CHECK (octet_length(content_sha256) = 32),
  CHECK (octet_length(chain_hash) = 32)
);
CREATE TABLE event_recipients (
  event_id uuid NOT NULL REFERENCES events(id), tenant_id uuid NOT NULL,
  address_type text NOT NULL CHECK (address_type IN ('actor','role','group','capability','project')),
  address_value text NOT NULL, PRIMARY KEY (event_id, address_type, address_value)
);

CREATE INDEX events_project_thread_seq ON events(project_id, thread_id, project_seq);
CREATE INDEX events_project_kind_seq ON events(project_id, kind, project_seq DESC);
CREATE INDEX events_search_gin ON events USING gin(search_document);
CREATE INDEX events_labels_gin ON events USING gin(labels);
CREATE INDEX recipients_lookup ON event_recipients(tenant_id, address_type, address_value, event_id);

CREATE FUNCTION reject_canonical_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = TG_TABLE_NAME || ' is append-only'; END $$;
CREATE TRIGGER events_immutable BEFORE UPDATE OR DELETE ON events
  FOR EACH ROW EXECUTE FUNCTION reject_canonical_mutation();
CREATE TRIGGER event_recipients_immutable BEFORE UPDATE OR DELETE ON event_recipients
  FOR EACH ROW EXECUTE FUNCTION reject_canonical_mutation();

CREATE FUNCTION validate_event_actor_delegation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Leave foreign-tenant rows to the RLS WITH CHECK policy so callers receive the
  -- canonical policy error without learning whether referenced identities exist.
  IF NEW.tenant_id IS DISTINCT FROM nullif(current_setting('app.tenant_id', true), '')::uuid THEN
    RETURN NEW;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM principals p WHERE p.id = NEW.principal_id AND p.tenant_id = NEW.tenant_id AND p.disabled_at IS NULL) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'event principal is disabled or outside tenant';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM actors a WHERE a.id = NEW.actor_id AND a.tenant_id = NEW.tenant_id
                 AND a.project_id = NEW.project_id AND a.disabled_at IS NULL) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'event actor is disabled or outside project';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM actor_delegations d WHERE d.actor_id = NEW.actor_id
                 AND d.principal_id = NEW.principal_id AND (d.expires_at IS NULL OR d.expires_at > clock_timestamp())
                 AND ('events:append' = ANY(d.scopes) OR '*' = ANY(d.scopes))) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'valid actor delegation with events:append scope required';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER events_actor_delegation BEFORE INSERT ON events
  FOR EACH ROW EXECUTE FUNCTION validate_event_actor_delegation();

-- Tenant predicates are fail-closed: an unset setting produces no rows rather than an error.
DO $rls$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['principals','projects','project_memberships','actors','agent_sessions','threads','events','event_recipients'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY tenant_isolation ON %I USING (tenant_id = nullif(current_setting(''app.tenant_id'', true), '''')::uuid) WITH CHECK (tenant_id = nullif(current_setting(''app.tenant_id'', true), '''')::uuid)', t);
  END LOOP;
END $rls$;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY; ALTER TABLE tenants FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON tenants USING (id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (id = nullif(current_setting('app.tenant_id', true), '')::uuid);
ALTER TABLE actor_delegations ENABLE ROW LEVEL SECURITY; ALTER TABLE actor_delegations FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON actor_delegations USING (EXISTS (
  SELECT 1 FROM actors a WHERE a.id = actor_id AND a.tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
)) WITH CHECK (EXISTS (
  SELECT 1 FROM actors a WHERE a.id = actor_id AND a.tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
));

-- Project reads also require the current principal's membership. Writes remain tenant-scoped;
-- the append service performs role/delegation authorization in its transaction.
CREATE POLICY project_member_read ON events AS RESTRICTIVE FOR SELECT USING (EXISTS (
  SELECT 1 FROM project_memberships pm WHERE pm.project_id = events.project_id
    AND pm.principal_id = nullif(current_setting('app.principal_id', true), '')::uuid
));
CREATE POLICY project_member_read ON projects AS RESTRICTIVE FOR SELECT USING (EXISTS (
  SELECT 1 FROM project_memberships pm WHERE pm.project_id = projects.id
    AND pm.principal_id = nullif(current_setting('app.principal_id', true), '')::uuid
));
CREATE POLICY project_member_read ON actors AS RESTRICTIVE FOR SELECT USING (EXISTS (
  SELECT 1 FROM project_memberships pm WHERE pm.project_id = actors.project_id
    AND pm.principal_id = nullif(current_setting('app.principal_id', true), '')::uuid
));
CREATE POLICY project_member_read ON agent_sessions AS RESTRICTIVE FOR SELECT USING (EXISTS (
  SELECT 1 FROM project_memberships pm WHERE pm.project_id = agent_sessions.project_id
    AND pm.principal_id = nullif(current_setting('app.principal_id', true), '')::uuid
));
CREATE POLICY project_member_read ON threads AS RESTRICTIVE FOR SELECT USING (EXISTS (
  SELECT 1 FROM project_memberships pm WHERE pm.project_id = threads.project_id
    AND pm.principal_id = nullif(current_setting('app.principal_id', true), '')::uuid
));

GRANT USAGE ON SCHEMA public TO engram_app, engram_maintenance;
GRANT SELECT ON tenants, principals, projects, project_memberships, actors,
  actor_delegations, agent_sessions, threads, events, event_recipients TO engram_app;
GRANT INSERT ON events, event_recipients TO engram_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO engram_maintenance;

CREATE TABLE schema_migrations (
  version text PRIMARY KEY, checksum_sha256 text NOT NULL CHECK (checksum_sha256 ~ '^[0-9a-f]{64}$'),
  applied_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON schema_migrations FROM engram_app;

-- Trusted founder authority is keyed only by the authenticated principal. It is
-- deliberately separate from caller-supplied setup payloads.
CREATE TABLE founder_authorities (
  principal_id uuid PRIMARY KEY,
  scopes text[] NOT NULL CHECK (cardinality(scopes) > 0),
  expires_at timestamptz NOT NULL
);
CREATE TABLE bootstrap_establishments (
  principal_id uuid PRIMARY KEY REFERENCES founder_authorities(principal_id),
  tenant_id uuid NOT NULL UNIQUE,
  project_id uuid NOT NULL UNIQUE,
  established_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE OR REPLACE FUNCTION resolve_founder_authority(p_principal_id uuid)
RETURNS TABLE(principal_id uuid, scopes text[], expires_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT f.principal_id, f.scopes, f.expires_at
  FROM founder_authorities f
  WHERE f.principal_id = p_principal_id
$$;

CREATE OR REPLACE FUNCTION bootstrap_workspace(
  p_principal_id uuid, p_tenant_id uuid, p_project_id uuid, p_slug text, p_name text
) RETURNS TABLE(tenant_id uuid, project_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE authority founder_authorities%ROWTYPE;
BEGIN
  SELECT * INTO authority FROM founder_authorities WHERE founder_authorities.principal_id = p_principal_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='founder authority not found'; END IF;
  PERFORM set_config('app.tenant_id', p_tenant_id::text, true);
  INSERT INTO bootstrap_establishments(principal_id, tenant_id, project_id)
    VALUES (p_principal_id, p_tenant_id, p_project_id);
  IF current_setting('app.test_bootstrap_pause', true) = 'true' THEN PERFORM pg_sleep(2); END IF;
  INSERT INTO tenants(id, slug, name) VALUES (p_tenant_id, p_slug, p_name);
  INSERT INTO principals(id, tenant_id, kind, external_issuer, external_subject, display_name)
    VALUES (p_principal_id, p_tenant_id, 'human', 'bootstrap', p_principal_id::text, p_name);
  INSERT INTO projects(id, tenant_id, slug, name) VALUES (p_project_id, p_tenant_id, p_slug, p_name);
  INSERT INTO project_memberships(tenant_id, project_id, principal_id, role)
    VALUES (p_tenant_id, p_project_id, p_principal_id, 'owner');
  RETURN QUERY SELECT p_tenant_id, p_project_id;
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION USING ERRCODE='23505', MESSAGE='founder bootstrap already established';
END $$;

REVOKE ALL ON founder_authorities, bootstrap_establishments FROM PUBLIC, engram_app;
GRANT EXECUTE ON FUNCTION resolve_founder_authority(uuid), bootstrap_workspace(uuid, uuid, uuid, text, text) TO engram_maintenance;

COMMIT;
