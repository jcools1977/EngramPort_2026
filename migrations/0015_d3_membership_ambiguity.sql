BEGIN;

CREATE OR REPLACE FUNCTION derive_mint_membership(p_principal uuid)
RETURNS TABLE(tenant_id uuid,project_id uuid)
LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  SELECT eligible.tenant_id,eligible.project_id
  FROM (
    SELECT pm.tenant_id,pm.project_id,count(*) OVER () AS membership_count
    FROM project_memberships pm
    WHERE pm.principal_id=p_principal
  ) eligible
  WHERE eligible.membership_count=1
$$;

REVOKE ALL ON FUNCTION derive_mint_membership(uuid) FROM PUBLIC,engram_app;
GRANT EXECUTE ON FUNCTION derive_mint_membership(uuid) TO engram_migrator,engram_maintenance;

COMMIT;
