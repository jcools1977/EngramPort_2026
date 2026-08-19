\set ON_ERROR_STOP on
SELECT set_config('app.principal_id','11000000-0000-0000-0000-000000000001',false);
DO $$ DECLARE msg text; n bigint; a0 bigint; BEGIN
  SELECT count(*) INTO a0 FROM custody_audit;
  PERFORM set_config('app.d1f_stage','bogus',false);
  BEGIN PERFORM mint_custody_reference('3.3','credential','B','d1f-unknown','{}'); RAISE EXCEPTION 'unknown stage accepted'; EXCEPTION WHEN insufficient_privilege THEN GET STACKED DIAGNOSTICS msg=MESSAGE_TEXT; IF msg<>'D1F_STAGE_UNKNOWN' THEN RAISE EXCEPTION 'wrong stage refusal %',msg; END IF; END;
  PERFORM set_config('app.tenant_id','10000000-0000-0000-0000-000000000001',false);
  SELECT count(*) INTO n FROM custody_rows WHERE key_locator='d1f-unknown'; IF n<>0 THEN RAISE EXCEPTION 'unknown-stage custody residue'; END IF;
  SELECT count(*) INTO n FROM minted_references r LEFT JOIN custody_rows c ON c.id=r.custody_row_id WHERE c.key_locator='d1f-unknown'; IF n<>0 THEN RAISE EXCEPTION 'unknown-stage reference residue'; END IF;
  SELECT count(*) INTO n FROM custody_audit a LEFT JOIN minted_references r ON r.reference=a.reference WHERE r.reference IS NULL; IF n<>0 THEN RAISE EXCEPTION 'unknown-stage orphan audit residue'; END IF;
  PERFORM set_config('app.d1f_stage','after_custody_row',false);
  BEGIN PERFORM mint_custody_reference('3.3','credential','B','d1f-m11','{}'); RAISE EXCEPTION 'M11 accepted'; EXCEPTION WHEN insufficient_privilege THEN GET STACKED DIAGNOSTICS msg=MESSAGE_TEXT; IF msg<>'D1F_FAULT_AFTER_CUSTODY_ROW' THEN RAISE EXCEPTION 'wrong M11 %',msg; END IF; END;
  PERFORM set_config('app.tenant_id','10000000-0000-0000-0000-000000000001',false);
  SELECT count(*) INTO n FROM custody_rows WHERE key_locator='d1f-m11'; IF n<>0 THEN RAISE EXCEPTION 'M11 custody residue'; END IF;
  SELECT count(*) INTO n FROM minted_references r JOIN custody_rows c ON c.id=r.custody_row_id WHERE c.key_locator='d1f-m11'; IF n<>0 THEN RAISE EXCEPTION 'M11 reference residue'; END IF;
  SELECT count(*) INTO n FROM custody_audit a LEFT JOIN minted_references r ON r.reference=a.reference WHERE r.reference IS NULL; IF n<>0 THEN RAISE EXCEPTION 'M11 orphan audit residue'; END IF;
  PERFORM set_config('app.d1f_stage','after_reference_bind',false);
  BEGIN PERFORM mint_custody_reference('3.3','credential','B','d1f-m12','{}'); RAISE EXCEPTION 'M12 accepted'; EXCEPTION WHEN insufficient_privilege THEN GET STACKED DIAGNOSTICS msg=MESSAGE_TEXT; IF msg<>'D1F_FAULT_AFTER_REFERENCE_BIND' THEN RAISE EXCEPTION 'wrong M12 %',msg; END IF; END;
  PERFORM set_config('app.tenant_id','10000000-0000-0000-0000-000000000001',false);
  SELECT count(*) INTO n FROM custody_rows WHERE key_locator='d1f-m12'; IF n<>0 THEN RAISE EXCEPTION 'M12 custody residue'; END IF;
  SELECT count(*) INTO n FROM minted_references r JOIN custody_rows c ON c.id=r.custody_row_id WHERE c.key_locator='d1f-m12'; IF n<>0 THEN RAISE EXCEPTION 'M12 reference residue'; END IF;
  SELECT count(*) INTO n FROM custody_audit a LEFT JOIN minted_references r ON r.reference=a.reference WHERE r.reference IS NULL; IF n<>0 THEN RAISE EXCEPTION 'M12 orphan audit residue'; END IF;
  PERFORM set_config('app.d1f_stage','',false); RAISE NOTICE 'PASS D1F authority, M11 and M12 controls with independent residue checks';
END $$;
