BEGIN;

CREATE TABLE port_watch_claims (
  agent text NOT NULL CHECK (length(agent) BETWEEN 1 AND 255),
  project text NOT NULL CHECK (length(project) BETWEEN 1 AND 255),
  event_id text NOT NULL CHECK (length(event_id) BETWEEN 1 AND 1024),
  run_id uuid NOT NULL,
  lease_token uuid NOT NULL,
  lease_status text NOT NULL CHECK (lease_status IN ('active','revoked')),
  claimed_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL CHECK (expires_at > claimed_at),
  termination_requested boolean NOT NULL DEFAULT false,
  PRIMARY KEY (agent,project)
);

CREATE FUNCTION acquire_port_watch_claim(
  p_agent text,p_project text,p_event_id text,p_run_id uuid,p_lease_token uuid,p_lease_ms integer
) RETURNS TABLE(
  agent text,project text,event_id text,run_id uuid,lease_token uuid,lease_status text,
  claimed_at timestamptz,expires_at timestamptz,termination_requested boolean,acquired boolean
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
BEGIN
  IF p_agent IS NULL OR p_agent='' OR p_project IS NULL OR p_project='' OR p_event_id IS NULL OR p_event_id='' THEN
    RAISE EXCEPTION 'PORT_WATCH_CLAIM_INCOMPLETE' USING ERRCODE='22023';
  END IF;
  IF p_lease_ms IS NULL OR p_lease_ms<=0 THEN
    RAISE EXCEPTION 'PORT_WATCH_LEASE_INVALID' USING ERRCODE='22023';
  END IF;
  RETURN QUERY
  WITH claimed AS (
    INSERT INTO port_watch_claims AS claims(
      agent,project,event_id,run_id,lease_token,lease_status,claimed_at,expires_at,termination_requested
    ) VALUES (
      p_agent,p_project,p_event_id,p_run_id,p_lease_token,'active',clock_timestamp(),
      clock_timestamp()+make_interval(secs=>p_lease_ms/1000.0),false
    )
    ON CONFLICT ON CONSTRAINT port_watch_claims_pkey DO UPDATE SET
      event_id=EXCLUDED.event_id,run_id=EXCLUDED.run_id,lease_token=EXCLUDED.lease_token,
      lease_status='active',claimed_at=EXCLUDED.claimed_at,expires_at=EXCLUDED.expires_at,
      termination_requested=false
    WHERE (claims.expires_at<=clock_timestamp() OR claims.lease_status<>'active') /* PORT_WATCH_POSTGRES_EXCLUSIVITY */
    RETURNING claims.*
  )
  SELECT c.agent,c.project,c.event_id,c.run_id,c.lease_token,c.lease_status,
    c.claimed_at,c.expires_at,c.termination_requested,true FROM claimed c;
  IF FOUND THEN RETURN; END IF;
  RETURN QUERY
  SELECT c.agent,c.project,c.event_id,c.run_id,c.lease_token,c.lease_status,
    c.claimed_at,c.expires_at,c.termination_requested,false
  FROM port_watch_claims c
  WHERE c.agent=p_agent AND c.project=p_project;
END $$;

CREATE FUNCTION read_port_watch_claim(p_agent text,p_project text)
RETURNS SETOF port_watch_claims
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$ SELECT * FROM port_watch_claims WHERE agent=p_agent AND project=p_project $$;

CREATE FUNCTION release_port_watch_claim(p_agent text,p_project text,p_run_id uuid)
RETURNS SETOF port_watch_claims
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE released port_watch_claims%ROWTYPE;
BEGIN
  DELETE FROM port_watch_claims c WHERE c.agent=p_agent AND c.project=p_project AND c.run_id=p_run_id
    RETURNING * INTO released;
  IF NOT FOUND THEN RAISE EXCEPTION 'RUN_NOT_ACTIVE' USING ERRCODE='55000'; END IF;
  RETURN NEXT released;
END $$;

CREATE FUNCTION expire_port_watch_claim(p_agent text,p_project text,p_lease_token uuid)
RETURNS SETOF port_watch_claims
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE released port_watch_claims%ROWTYPE;
BEGIN
  DELETE FROM port_watch_claims c WHERE c.agent=p_agent AND c.project=p_project AND c.lease_token=p_lease_token
    RETURNING * INTO released;
  IF NOT FOUND THEN RAISE EXCEPTION 'LEASE_TOKEN_MISMATCH' USING ERRCODE='55000'; END IF;
  RETURN NEXT released;
END $$;

CREATE FUNCTION revoke_port_watch_claim(p_agent text,p_project text)
RETURNS SETOF port_watch_claims
LANGUAGE sql SECURITY DEFINER SET search_path=public
AS $$
  UPDATE port_watch_claims SET lease_status='revoked',termination_requested=true
    WHERE agent=p_agent AND project=p_project RETURNING *
$$;

REVOKE ALL ON port_watch_claims FROM PUBLIC,engram_app,engram_maintenance;
REVOKE ALL ON FUNCTION
  acquire_port_watch_claim(text,text,text,uuid,uuid,integer),read_port_watch_claim(text,text),
  release_port_watch_claim(text,text,uuid),expire_port_watch_claim(text,text,uuid),
  revoke_port_watch_claim(text,text)
FROM PUBLIC;
GRANT EXECUTE ON FUNCTION
  acquire_port_watch_claim(text,text,text,uuid,uuid,integer),read_port_watch_claim(text,text),
  release_port_watch_claim(text,text,uuid),expire_port_watch_claim(text,text,uuid),
  revoke_port_watch_claim(text,text)
TO engram_app;

COMMIT;
