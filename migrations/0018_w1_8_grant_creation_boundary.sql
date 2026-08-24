BEGIN;

-- Grant creation is the only write surface for invocation grants. The caller
-- supplies the requested grant, but authority and project context come from
-- the principal already bound to this transaction.
CREATE POLICY invocation_grant_create ON invocation_grants FOR INSERT WITH CHECK (
  tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  AND project_id = nullif(current_setting('app.project_id', true), '')::uuid
);

CREATE FUNCTION create_invocation_grant(
  p_grant_id uuid,
  p_provider text,
  p_capability text,
  p_granted_to_principal_id uuid,
  p_granted_to_actor_id uuid,
  p_granting_event_id uuid,
  p_scopes text[],
  p_installation_ref text,
  p_credential_ref text,
  p_expires_at timestamptz,
  p_asserted_granted_by_principal_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  principal uuid:=nullif(current_setting('app.principal_id',true),'')::uuid;
  t uuid;
  p uuid;
  authority_principal uuid;
  authority_scopes text[];
  authority_expires_at timestamptz;
BEGIN
  IF principal IS NULL THEN
    RAISE EXCEPTION 'GRANT_AUTHORITY_REFUSED' USING ERRCODE='42501';
  END IF;

  SELECT r.principal_id,r.scopes,r.expires_at
    INTO authority_principal,authority_scopes,authority_expires_at
    FROM resolve_founder_authority(principal) r;
  IF NOT FOUND OR EXISTS (
    SELECT 1 FROM founder_authorities f
    WHERE f.principal_id=principal AND f.revoked_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'GRANT_AUTHORITY_REFUSED' USING ERRCODE='42501';
  END IF;

  SELECT d.tenant_id,d.project_id INTO t,p FROM derive_mint_membership(principal) d;
  IF t IS NULL THEN
    RAISE EXCEPTION 'TENANT_PROJECT_REFUSED' USING ERRCODE='42501';
  END IF;

  IF NOT (p_scopes <@ authority_scopes) THEN
    RAISE EXCEPTION 'GRANT_SCOPE_EXCEEDS_AUTHORITY' USING ERRCODE='42501';
  END IF;
  IF p_expires_at > authority_expires_at THEN
    RAISE EXCEPTION 'GRANT_EXPIRY_EXCEEDS_AUTHORITY' USING ERRCODE='42501';
  END IF;

  PERFORM set_config('app.tenant_id',t::text,true);
  PERFORM set_config('app.project_id',p::text,true);
  INSERT INTO invocation_grant_contexts(grant_id,tenant_id,project_id)
    VALUES(p_grant_id,t,p);
  INSERT INTO invocation_grants(
    grant_id,tenant_id,project_id,provider,capability,
    granted_to_principal_id,granted_to_actor_id,granted_by_principal_id,
    granting_event_id,scopes,installation_ref,credential_ref,expires_at
  ) VALUES(
    p_grant_id,t,p,p_provider,p_capability,
    p_granted_to_principal_id,p_granted_to_actor_id,authority_principal,
    p_granting_event_id,p_scopes,p_installation_ref,p_credential_ref,p_expires_at
  );
  RETURN p_grant_id;
END $$;

REVOKE ALL ON FUNCTION create_invocation_grant(uuid,text,text,uuid,uuid,uuid,text[],text,text,timestamptz,uuid)
  FROM PUBLIC,engram_app;
GRANT EXECUTE ON FUNCTION create_invocation_grant(uuid,text,text,uuid,uuid,uuid,text[],text,text,timestamptz,uuid)
  TO engram_maintenance;

COMMIT;
