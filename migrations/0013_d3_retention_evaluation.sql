BEGIN;

CREATE FUNCTION evaluate_custody_retention(p_reference text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  principal uuid:=nullif(current_setting('app.principal_id',true),'')::uuid;
  t uuid;
  p uuid;
  row_policy text;
  clock_start timestamptz;
  evaluated timestamptz;
BEGIN
  IF principal IS NULL THEN
    RAISE EXCEPTION 'RETENTION_UNRESOLVED' USING ERRCODE='42501';
  END IF;
  SELECT d.tenant_id,d.project_id INTO t,p FROM derive_mint_membership(principal) d;
  IF t IS NULL THEN
    RAISE EXCEPTION 'RETENTION_UNRESOLVED' USING ERRCODE='42501';
  END IF;
  PERFORM set_config('app.tenant_id',t::text,true);
  IF p_reference !~ '^epr:(installation|credential|shape):[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    RAISE EXCEPTION 'RETENTION_UNRESOLVED' USING ERRCODE='42501';
  END IF;
  SELECT c.retention_policy,
    CASE c.retention_policy
      WHEN 'RET-CONFIG-400' THEN coalesce(c.rotated_at,c.issued_at)
      WHEN 'RET-GRANT-400' THEN c.terminal_at
      WHEN 'RET-AUDIT-400' THEN (
        SELECT min(a.accepted_at) FROM custody_audit a
        WHERE a.reference=r.reference AND a.action='mint' AND a.outcome='success'
      )
      ELSE NULL
    END
  INTO row_policy,clock_start
  FROM minted_references r JOIN custody_rows c ON c.id=r.custody_row_id
  WHERE r.reference=p_reference AND r.tenant_id=t AND r.project_id=p;
  IF row_policy IS NULL OR clock_start IS NULL OR row_policy NOT IN ('RET-CONFIG-400','RET-GRANT-400','RET-AUDIT-400') THEN
    RAISE EXCEPTION 'RETENTION_UNRESOLVED' USING ERRCODE='42501';
  END IF;
  evaluated:=clock_timestamp();
  RETURN jsonb_build_object(
    'reference',p_reference,'policy',row_policy,'clock_start',clock_start,
    'evaluated_at',evaluated,'due',evaluated-clock_start>=interval '400 days'
  );
END $$;

REVOKE ALL ON FUNCTION evaluate_custody_retention(text) FROM PUBLIC,engram_app;
GRANT EXECUTE ON FUNCTION evaluate_custody_retention(text) TO engram_maintenance;

COMMIT;
