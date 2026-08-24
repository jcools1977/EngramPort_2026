BEGIN;

-- Opaque grant ids are resolved to tenant/project context by a trusted helper.
-- The context registry contains no grant authority and is never readable by the
-- application or maintenance roles.
CREATE TABLE invocation_grant_contexts (
  grant_id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  project_id uuid NOT NULL,
  UNIQUE (grant_id, tenant_id, project_id),
  FOREIGN KEY (tenant_id, project_id) REFERENCES projects(tenant_id, id)
);

CREATE TABLE invocation_grants (
  grant_id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  project_id uuid NOT NULL,
  provider text NOT NULL CHECK (provider <> ''),
  capability text NOT NULL CHECK (capability <> ''),
  granted_to_principal_id uuid NOT NULL,
  granted_to_actor_id uuid,
  granted_by_principal_id uuid NOT NULL,
  granting_event_id uuid NOT NULL REFERENCES events(id),
  scopes text[] NOT NULL CHECK (cardinality(scopes) > 0),
  installation_ref text,
  credential_ref text,
  issued_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  retention_policy text NOT NULL DEFAULT 'RET-GRANT-400' CHECK (retention_policy = 'RET-GRANT-400'),
  FOREIGN KEY (grant_id, tenant_id, project_id)
    REFERENCES invocation_grant_contexts(grant_id, tenant_id, project_id),
  FOREIGN KEY (tenant_id, granted_to_principal_id) REFERENCES principals(tenant_id, id),
  FOREIGN KEY (tenant_id, granted_by_principal_id) REFERENCES principals(tenant_id, id),
  FOREIGN KEY (tenant_id, granted_to_actor_id) REFERENCES actors(tenant_id, id)
);

ALTER TABLE invocation_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE invocation_grants FORCE ROW LEVEL SECURITY;
CREATE POLICY invocation_grant_read ON invocation_grants FOR SELECT USING (
  tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  AND project_id = nullif(current_setting('app.project_id', true), '')::uuid
);

CREATE FUNCTION bind_invocation_grant_context(p_grant_id uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE resolved invocation_grant_contexts%ROWTYPE;
BEGIN
  SELECT * INTO resolved FROM invocation_grant_contexts WHERE grant_id=p_grant_id;
  IF NOT FOUND THEN RETURN false; END IF;
  PERFORM set_config('app.tenant_id',resolved.tenant_id::text,true);
  PERFORM set_config('app.project_id',resolved.project_id::text,true);
  RETURN true;
END $$;

CREATE FUNCTION invocation_granter_authorized(p_principal_id uuid,p_scopes text[]) RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS(
    SELECT 1 FROM founder_authorities f
    WHERE f.principal_id=p_principal_id
      AND f.revoked_at IS NULL
      AND f.expires_at>clock_timestamp()
      AND p_scopes<@f.scopes
  )
$$;

REVOKE ALL ON invocation_grant_contexts,invocation_grants FROM PUBLIC,engram_app,engram_maintenance;
GRANT SELECT ON invocation_grants TO engram_maintenance;
REVOKE ALL ON FUNCTION bind_invocation_grant_context(uuid),invocation_granter_authorized(uuid,text[]) FROM PUBLIC,engram_app;
GRANT EXECUTE ON FUNCTION bind_invocation_grant_context(uuid),invocation_granter_authorized(uuid,text[]) TO engram_maintenance;

COMMIT;
