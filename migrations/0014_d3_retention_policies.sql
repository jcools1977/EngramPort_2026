BEGIN;

CREATE TABLE custody_retention_policies (
  policy_name text PRIMARY KEY,
  duration interval NOT NULL CHECK (duration>interval '0'),
  clock_source text NOT NULL CHECK (clock_source IN ('session_start','terminal_at','audit_accepted_at','rotated_or_issued_at','expires_at'))
);
INSERT INTO custody_retention_policies(policy_name,duration,clock_source) VALUES
  ('RET-SESSION',interval '1 day','session_start'),
  ('RET-OPS-90',interval '90 days','terminal_at'),
  ('RET-AUDIT-400',interval '400 days','audit_accepted_at'),
  ('RET-GRANT-400',interval '400 days','terminal_at'),
  ('RET-CONFIG-400',interval '400 days','rotated_or_issued_at'),
  ('RET-VERIFY-104',interval '104 days','expires_at');
ALTER TABLE custody_retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE custody_retention_policies FORCE ROW LEVEL SECURITY;
CREATE POLICY retention_policy_read ON custody_retention_policies FOR SELECT USING(true);
REVOKE ALL ON custody_retention_policies FROM PUBLIC,engram_app,engram_maintenance;
ALTER TABLE custody_rows ADD CONSTRAINT custody_retention_policy_fk
  FOREIGN KEY(retention_policy) REFERENCES custody_retention_policies(policy_name);

CREATE OR REPLACE FUNCTION evaluate_custody_retention(p_reference text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  principal uuid:=nullif(current_setting('app.principal_id',true),'')::uuid;
  t uuid;
  p uuid;
  row_policy text;
  row_clock_source text;
  retention_window interval;
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
  SELECT c.retention_policy,policy.clock_source,policy.duration,
    CASE policy.clock_source
      WHEN 'rotated_or_issued_at' THEN coalesce(c.rotated_at,c.issued_at)
      WHEN 'terminal_at' THEN c.terminal_at
      WHEN 'audit_accepted_at' THEN (
        SELECT min(a.accepted_at) FROM custody_audit a
        WHERE a.reference=r.reference AND a.action='mint' AND a.outcome='success'
      )
      WHEN 'expires_at' THEN c.expires_at
      WHEN 'session_start' THEN NULL
    END
  INTO row_policy,row_clock_source,retention_window,clock_start
  FROM minted_references r
  JOIN custody_rows c ON c.id=r.custody_row_id
  JOIN custody_retention_policies policy ON policy.policy_name=c.retention_policy
  WHERE r.reference=p_reference AND r.tenant_id=t AND r.project_id=p;
  IF row_policy IS NULL OR clock_start IS NULL THEN
    RAISE EXCEPTION 'RETENTION_UNRESOLVED' USING ERRCODE='42501';
  END IF;
  evaluated:=clock_timestamp();
  RETURN jsonb_build_object(
    'reference',p_reference,'policy',row_policy,'clock_source',row_clock_source,
    'duration_seconds',extract(epoch FROM retention_window)::bigint,'clock_start',clock_start,
    'evaluated_at',evaluated,'due',evaluated-clock_start>=retention_window
  );
END $$;

REVOKE ALL ON FUNCTION evaluate_custody_retention(text) FROM PUBLIC,engram_app;
GRANT EXECUTE ON FUNCTION evaluate_custody_retention(text) TO engram_maintenance;

COMMIT;
