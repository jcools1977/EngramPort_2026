BEGIN;

-- C17's durable setup delegation is intentionally separate from both
-- actor_delegations and agent_sessions: setup has a founder, but no actor.
CREATE FUNCTION setup_scopes_only(p_scopes text[]) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path=public AS $$
  SELECT coalesce(cardinality(p_scopes),0)>0
    AND NOT EXISTS(SELECT 1 FROM unnest(p_scopes) scope WHERE scope !~ '^setup:')
$$;

CREATE TABLE setup_session_delegations (
  session_id uuid PRIMARY KEY,
  founder_principal_id uuid NOT NULL REFERENCES principals(id),
  scopes text[] NOT NULL CHECK (setup_scopes_only(scopes)),
  expires_at timestamptz NOT NULL,
  terminal_state text CHECK (terminal_state IN ('completed','abandoned','expired','revoked')),
  terminal_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK ((terminal_state IS NULL)=(terminal_at IS NULL))
);

ALTER TABLE setup_session_delegations ENABLE ROW LEVEL SECURITY;
ALTER TABLE setup_session_delegations FORCE ROW LEVEL SECURITY;
CREATE POLICY setup_session_founder ON setup_session_delegations
  USING (founder_principal_id=nullif(current_setting('app.principal_id',true),'')::uuid)
  WITH CHECK (founder_principal_id=nullif(current_setting('app.principal_id',true),'')::uuid);

CREATE FUNCTION create_setup_session_delegation(
  p_session_id uuid,
  p_scopes text[],
  p_expires_at timestamptz,
  p_asserted_founder_principal_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  principal uuid:=nullif(current_setting('app.principal_id',true),'')::uuid;
  authority_principal uuid;
  authority_scopes text[];
  authority_expires_at timestamptz;
  created_at_value timestamptz:=clock_timestamp();
  retention_window interval;
BEGIN
  IF principal IS NULL THEN
    RAISE EXCEPTION 'SETUP_SESSION_AUTHORITY_REFUSED' USING ERRCODE='42501';
  END IF;

  SELECT r.principal_id,r.scopes,r.expires_at
    INTO authority_principal,authority_scopes,authority_expires_at
    FROM resolve_founder_authority(principal) r;
  IF NOT FOUND OR EXISTS (
    SELECT 1 FROM founder_authorities f
    WHERE f.principal_id=principal AND f.revoked_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'SETUP_SESSION_AUTHORITY_REFUSED' USING ERRCODE='42501';
  END IF;

  SELECT duration INTO retention_window
    FROM custody_retention_policies
    WHERE policy_name='RET-SESSION';
  IF retention_window IS NULL THEN
    RAISE EXCEPTION 'SETUP_SESSION_RETENTION_UNRESOLVED' USING ERRCODE='42501';
  END IF;

  IF NOT setup_scopes_only(p_scopes) THEN
    RAISE EXCEPTION 'SETUP_SESSION_SCOPE_NOT_SETUP' USING ERRCODE='42501';
  END IF;
  IF NOT (p_scopes <@ authority_scopes) THEN
    RAISE EXCEPTION 'SETUP_SESSION_SCOPE_EXCEEDS_AUTHORITY' USING ERRCODE='42501';
  END IF;
  IF p_expires_at > authority_expires_at THEN
    RAISE EXCEPTION 'SETUP_SESSION_EXPIRY_EXCEEDS_AUTHORITY' USING ERRCODE='42501';
  END IF;
  IF p_expires_at > created_at_value+retention_window THEN
    RAISE EXCEPTION 'SETUP_SESSION_RETENTION_EXCEEDED' USING ERRCODE='42501';
  END IF;

  INSERT INTO setup_session_delegations(
    session_id,founder_principal_id,scopes,expires_at,created_at
  ) VALUES(
    p_session_id,authority_principal,p_scopes,p_expires_at,created_at_value
  );
  RETURN p_session_id;
END $$;

CREATE FUNCTION read_live_setup_session_delegation(p_session_id uuid)
RETURNS TABLE(
  session_id uuid,
  founder_principal_id uuid,
  scopes text[],
  expires_at timestamptz,
  created_at timestamptz
)
LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  SELECT s.session_id,s.founder_principal_id,s.scopes,s.expires_at,s.created_at
  FROM setup_session_delegations s
  JOIN resolve_founder_authority(
    nullif(current_setting('app.principal_id',true),'')::uuid
  ) authority ON authority.principal_id=s.founder_principal_id
  WHERE s.session_id=p_session_id
    AND s.founder_principal_id=nullif(current_setting('app.principal_id',true),'')::uuid
    AND NOT EXISTS (
      SELECT 1 FROM founder_authorities f
      WHERE f.principal_id=s.founder_principal_id AND f.revoked_at IS NOT NULL
    )
    AND s.terminal_state IS NULL
    AND s.terminal_at IS NULL
    AND s.expires_at>clock_timestamp()
$$;

REVOKE ALL ON setup_session_delegations FROM PUBLIC,engram_app,engram_maintenance;
REVOKE ALL ON FUNCTION setup_scopes_only(text[]) FROM PUBLIC,engram_app,engram_maintenance;
REVOKE ALL ON FUNCTION create_setup_session_delegation(uuid,text[],timestamptz,uuid)
  FROM PUBLIC,engram_app;
REVOKE ALL ON FUNCTION read_live_setup_session_delegation(uuid)
  FROM PUBLIC,engram_app;
GRANT EXECUTE ON FUNCTION create_setup_session_delegation(uuid,text[],timestamptz,uuid),
  read_live_setup_session_delegation(uuid) TO engram_maintenance;

COMMIT;
