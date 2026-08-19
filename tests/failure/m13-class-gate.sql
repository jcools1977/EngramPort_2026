\set ON_ERROR_STOP on
SELECT set_config('app.principal_id','11000000-0000-0000-0000-000000000001',false);
DO $$ DECLARE r text; msg text; BEGIN
  r := mint_custody_reference('3.3','credential','B','vault:transit/synth-a','{}'::jsonb);
  IF r !~ '^epr:credential:' THEN RAISE EXCEPTION 'M13 positive reference invalid'; END IF;
  BEGIN
    PERFORM mint_custody_reference('3.2','credential','B','vault:transit/synth-a','{}'::jsonb);
    RAISE EXCEPTION 'M13 failed gate accepted';
  EXCEPTION WHEN insufficient_privilege THEN
    GET STACKED DIAGNOSTICS msg=MESSAGE_TEXT;
    IF msg <> 'CLASS_GATE_NOT_PASSED' THEN RAISE EXCEPTION 'M13 wrong refusal: %',msg; END IF;
  END;
  PERFORM set_config('app.principal_id','',false);
  BEGIN
    PERFORM mint_custody_reference('3.3','credential','B','vault:transit/synth-a','{}'::jsonb);
    RAISE EXCEPTION 'M13 unauthenticated accepted';
  EXCEPTION WHEN insufficient_privilege THEN
    GET STACKED DIAGNOSTICS msg=MESSAGE_TEXT;
    IF msg <> 'MINT_AUTHORITY_REFUSED' THEN RAISE EXCEPTION 'M13 disclosure: %',msg; END IF;
  END;
  RAISE NOTICE 'PASS M13 class gate positive, failed gate and nondisclosing authority ordering';
END $$;
