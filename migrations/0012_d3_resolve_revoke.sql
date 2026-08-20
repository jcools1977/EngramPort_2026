BEGIN;

ALTER TABLE minted_references ADD COLUMN revoked_at timestamptz;

CREATE POLICY custody_revoke ON custody_rows FOR UPDATE
  USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
CREATE POLICY reference_revoke ON minted_references FOR UPDATE
  USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

CREATE FUNCTION custody_revocation_irreversible() RETURNS trigger
LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF OLD.revoked_at IS NOT NULL AND NEW.revoked_at IS DISTINCT FROM OLD.revoked_at THEN
    RAISE EXCEPTION 'REVOCATION_IRREVERSIBLE' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER custody_revocation_irreversible BEFORE UPDATE OF revoked_at ON custody_rows
  FOR EACH ROW EXECUTE FUNCTION custody_revocation_irreversible();
CREATE TRIGGER reference_revocation_irreversible BEFORE UPDATE OF revoked_at ON minted_references
  FOR EACH ROW EXECUTE FUNCTION custody_revocation_irreversible();

CREATE FUNCTION resolve_custody_reference(p_reference text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  principal uuid:=nullif(current_setting('app.principal_id',true),'')::uuid;
  t uuid;
  p uuid;
  resolved jsonb;
BEGIN
  IF principal IS NULL THEN
    RAISE EXCEPTION 'REFERENCE_UNRESOLVED' USING ERRCODE='42501';
  END IF;
  SELECT d.tenant_id,d.project_id INTO t,p FROM derive_mint_membership(principal) d;
  IF t IS NULL THEN
    RAISE EXCEPTION 'REFERENCE_UNRESOLVED' USING ERRCODE='42501';
  END IF;
  PERFORM set_config('app.tenant_id',t::text,true);
  IF p_reference !~ '^epr:(installation|credential|shape):[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    RAISE EXCEPTION 'REFERENCE_UNRESOLVED' USING ERRCODE='42501';
  END IF;
  SELECT jsonb_build_object(
    'reference',r.reference,'tenant_id',r.tenant_id,'project_id',r.project_id,
    'namespace',r.namespace,'credential_class',c.credential_class,
    'custody_model',c.custody_model,'key_locator',c.key_locator,'metadata',c.metadata,
    'issued_at',c.issued_at,'expires_at',c.expires_at
  ) INTO resolved
  FROM minted_references r JOIN custody_rows c ON c.id=r.custody_row_id
  WHERE r.reference=p_reference AND r.tenant_id=t AND r.project_id=p
    AND r.revoked_at IS NULL AND c.revoked_at IS NULL
    AND (c.expires_at IS NULL OR c.expires_at>clock_timestamp());
  IF resolved IS NULL THEN
    RAISE EXCEPTION 'REFERENCE_UNRESOLVED' USING ERRCODE='42501';
  END IF;
  RETURN resolved;
END $$;

CREATE FUNCTION revoke_custody_reference(p_reference text) RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  principal uuid:=nullif(current_setting('app.principal_id',true),'')::uuid;
  t uuid;
  p uuid;
  row_id uuid;
  row_namespace epr_namespace;
  row_class text;
  revoked_time timestamptz;
  stage text:=CASE WHEN session_user='engram_maintenance' THEN nullif(current_setting('app.d3_stage',true),'') ELSE NULL END;
BEGIN
  IF principal IS NULL THEN
    RAISE EXCEPTION 'REFERENCE_UNRESOLVED' USING ERRCODE='42501';
  END IF;
  IF stage IS NOT NULL AND stage<>'after_custody_revoke' THEN
    RAISE EXCEPTION 'D3_STAGE_UNKNOWN' USING ERRCODE='42501';
  END IF;
  SELECT d.tenant_id,d.project_id INTO t,p FROM derive_mint_membership(principal) d;
  IF t IS NULL THEN
    RAISE EXCEPTION 'REFERENCE_UNRESOLVED' USING ERRCODE='42501';
  END IF;
  PERFORM set_config('app.tenant_id',t::text,true);
  IF p_reference !~ '^epr:(installation|credential|shape):[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    RAISE EXCEPTION 'REFERENCE_UNRESOLVED' USING ERRCODE='42501';
  END IF;
  SELECT c.id,c.namespace,c.credential_class INTO row_id,row_namespace,row_class
  FROM minted_references r JOIN custody_rows c ON c.id=r.custody_row_id
  WHERE r.reference=p_reference AND r.tenant_id=t AND r.project_id=p
    AND r.revoked_at IS NULL AND c.revoked_at IS NULL
  FOR UPDATE OF r,c;
  IF row_id IS NULL THEN
    RAISE EXCEPTION 'REFERENCE_UNRESOLVED' USING ERRCODE='42501';
  END IF;
  revoked_time:=clock_timestamp();
  UPDATE custody_rows SET revoked_at=revoked_time,terminal_at=coalesce(terminal_at,revoked_time) WHERE id=row_id;
  IF stage='after_custody_revoke' THEN
    RAISE EXCEPTION 'D3_FAULT_AFTER_CUSTODY_REVOKE' USING ERRCODE='42501';
  END IF;
  UPDATE minted_references SET revoked_at=revoked_time WHERE reference=p_reference;
  INSERT INTO custody_audit(tenant_id,project_id,namespace,credential_class,action,outcome,principal_id,accepted_at,reference)
    VALUES(t,p,row_namespace,row_class,'revoke','success',principal,revoked_time,p_reference);
  RETURN revoked_time;
END $$;

REVOKE ALL ON FUNCTION custody_revocation_irreversible() FROM PUBLIC,engram_app,engram_maintenance;
REVOKE ALL ON FUNCTION resolve_custody_reference(text),revoke_custody_reference(text) FROM PUBLIC,engram_app;
GRANT EXECUTE ON FUNCTION resolve_custody_reference(text),revoke_custody_reference(text) TO engram_maintenance;

REVOKE UPDATE ON custody_rows,minted_references FROM engram_maintenance;
GRANT UPDATE (metadata,rotated_at,expires_at,terminal_at) ON custody_rows TO engram_maintenance;

COMMIT;
