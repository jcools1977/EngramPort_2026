BEGIN;

-- A database scheduler may invoke the expiry routine without a founder GUC.
-- The policy permits only the one-way expired tombstone transition; application
-- roles retain no direct table privilege.
CREATE POLICY setup_session_expiry_sweep_read ON setup_session_delegations
  FOR SELECT
  USING (
    (terminal_state IS NULL AND terminal_at IS NULL AND expires_at<=clock_timestamp())
    OR terminal_state='expired'
  );
CREATE POLICY setup_session_expiry_sweep ON setup_session_delegations
  FOR UPDATE
  USING (terminal_state IS NULL AND terminal_at IS NULL AND expires_at<=clock_timestamp())
  WITH CHECK (terminal_state='expired' AND terminal_at IS NOT NULL);

CREATE FUNCTION transition_setup_session_delegation(
  p_session_id uuid,
  p_terminal_state text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  principal uuid:=nullif(current_setting('app.principal_id',true),'')::uuid;
  row_terminal_state text;
  transition_clock timestamptz:=clock_timestamp();
BEGIN
  SELECT s.terminal_state INTO row_terminal_state
  FROM setup_session_delegations s
  WHERE s.session_id=p_session_id AND s.founder_principal_id=principal
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SETUP_SESSION_NOT_OWNED' USING ERRCODE='42501';
  END IF;
  IF row_terminal_state IS NOT NULL THEN
    RAISE EXCEPTION 'SETUP_SESSION_ALREADY_TERMINAL' USING ERRCODE='55000';
  END IF;

  UPDATE setup_session_delegations
  SET terminal_state=p_terminal_state,terminal_at=transition_clock
  WHERE session_id=p_session_id AND founder_principal_id=principal;
  RETURN p_session_id;
END $$;

CREATE FUNCTION complete_setup_session_delegation(p_session_id uuid) RETURNS uuid
LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  SELECT transition_setup_session_delegation(p_session_id,'completed')
$$;

CREATE FUNCTION abandon_setup_session_delegation(p_session_id uuid) RETURNS uuid
LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  SELECT transition_setup_session_delegation(p_session_id,'abandoned')
$$;

CREATE FUNCTION sweep_expired_setup_session_delegations() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  sweep_clock timestamptz:=clock_timestamp();
  swept integer;
BEGIN
  UPDATE setup_session_delegations
  SET terminal_state='expired',terminal_at=sweep_clock
  WHERE terminal_state IS NULL AND terminal_at IS NULL
    AND expires_at<=sweep_clock;
  GET DIAGNOSTICS swept=ROW_COUNT;
  RETURN swept;
END $$;

CREATE FUNCTION inspect_setup_session_delegation(p_session_id uuid)
RETURNS TABLE(
  session_id uuid,
  founder_principal_id uuid,
  scopes text[],
  expires_at timestamptz,
  terminal_state text,
  terminal_at timestamptz,
  effective_state text,
  active boolean,
  evaluated_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  principal uuid:=nullif(current_setting('app.principal_id',true),'')::uuid;
  snapshot_clock timestamptz:=clock_timestamp();
BEGIN
  RETURN QUERY
  SELECT s.session_id,s.founder_principal_id,s.scopes,s.expires_at,
    s.terminal_state,s.terminal_at,
    CASE
      WHEN s.terminal_state IS NOT NULL THEN s.terminal_state
      WHEN s.expires_at<=snapshot_clock THEN 'expired'
      WHEN authority.principal_id IS NULL OR revoked.principal_id IS NOT NULL THEN 'authority_inactive'
      ELSE 'active'
    END AS effective_state,
    s.terminal_state IS NULL AND s.terminal_at IS NULL
      AND s.expires_at>snapshot_clock
      AND authority.principal_id IS NOT NULL
      AND revoked.principal_id IS NULL AS active,
    snapshot_clock AS evaluated_at
  FROM setup_session_delegations s
  LEFT JOIN resolve_founder_authority(principal) authority
    ON authority.principal_id=s.founder_principal_id
  LEFT JOIN founder_authorities revoked
    ON revoked.principal_id=s.founder_principal_id AND revoked.revoked_at IS NOT NULL
  WHERE s.session_id=p_session_id AND s.founder_principal_id=principal;
END $$;

REVOKE ALL ON FUNCTION transition_setup_session_delegation(uuid,text)
  FROM PUBLIC,engram_app,engram_maintenance;
REVOKE ALL ON FUNCTION complete_setup_session_delegation(uuid),
  abandon_setup_session_delegation(uuid),
  sweep_expired_setup_session_delegations(),
  inspect_setup_session_delegation(uuid)
  FROM PUBLIC,engram_app;
GRANT EXECUTE ON FUNCTION complete_setup_session_delegation(uuid),
  abandon_setup_session_delegation(uuid),
  sweep_expired_setup_session_delegations(),
  inspect_setup_session_delegation(uuid)
  TO engram_maintenance;

COMMIT;
