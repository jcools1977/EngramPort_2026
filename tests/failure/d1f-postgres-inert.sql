\set ON_ERROR_STOP on
SELECT set_config('app.principal_id','11000000-0000-0000-0000-000000000001',false);
SELECT set_config('app.d1f_stage','after_custody_row',false);
DO $$
DECLARE ref text; n bigint;
BEGIN
  ref:=mint_custody_reference('3.3','credential','B','d1f-postgres-inert','{}');
  IF ref !~ '^epr:credential:[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN RAISE EXCEPTION 'postgres inert mint returned malformed reference %',ref; END IF;
  SELECT count(*) INTO n FROM custody_rows WHERE key_locator='d1f-postgres-inert'; IF n<>1 THEN RAISE EXCEPTION 'postgres stage variable was not inert'; END IF;
  SELECT count(*) INTO n FROM minted_references WHERE reference=ref; IF n<>1 THEN RAISE EXCEPTION 'postgres inert reference missing'; END IF;
  SELECT count(*) INTO n FROM custody_audit WHERE reference=ref; IF n<>1 THEN RAISE EXCEPTION 'postgres inert audit missing'; END IF;
  RAISE NOTICE 'PASS postgres stage variable is inert and normal mint commits';
END $$;
SELECT set_config('app.d1f_stage','',false);
