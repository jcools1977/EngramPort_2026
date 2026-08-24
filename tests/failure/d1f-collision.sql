\set ON_ERROR_STOP on
TRUNCATE custody_audit,minted_references,custody_rows;

SET SESSION AUTHORIZATION engram_maintenance;
SELECT set_config('app.principal_id','11000000-0000-0000-0000-000000000001',false);
SELECT set_config('app.session_id','15000000-0000-0000-0000-000000000008',false);
SELECT set_config('app.tenant_id','10000000-0000-0000-0000-000000000001',false);
DO $$
DECLARE natural_ref text; forced_ref constant text:='epr:credential:01a01bb2-8135-7000-8000-000000000001';
BEGIN
  PERFORM set_config('app.d1f_stage','',false);
  PERFORM set_config('app.d1f_forced_reference','',false);
  natural_ref:=mint_custody_reference('3.3','credential','B','d1f-natural','{}');
  IF natural_ref=forced_ref OR natural_ref !~ '^epr:credential:[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN RAISE EXCEPTION 'natural reference differential failed: %',natural_ref; END IF;
  RAISE NOTICE 'PASS natural UUIDv7 reference generated without forced-reference control';
END $$;
RESET SESSION AUTHORIZATION;
TRUNCATE custody_audit,minted_references,custody_rows;

SET SESSION AUTHORIZATION engram_maintenance;
SELECT set_config('app.principal_id','11000000-0000-0000-0000-000000000001',false);
SELECT set_config('app.session_id','15000000-0000-0000-0000-000000000008',false);
SELECT set_config('app.tenant_id','10000000-0000-0000-0000-000000000001',false);
DO $$
DECLARE forced_ref constant text:='epr:credential:01a01bb2-8135-7000-8000-000000000001'; actual text; msg text;
BEGIN
  PERFORM set_config('app.d1f_forced_reference',forced_ref,false);
  actual:=mint_custody_reference('3.12','credential','A',NULL,'{}');
  IF actual<>forced_ref THEN RAISE EXCEPTION 'forced reference differential failed: %',actual; END IF;
  BEGIN
    PERFORM mint_custody_reference('3.3','credential','B','d1f-reference-collision','{}');
    RAISE EXCEPTION 'duplicate reference accepted';
  EXCEPTION WHEN unique_violation THEN
    GET STACKED DIAGNOSTICS msg=MESSAGE_TEXT;
    IF msg<>'REFERENCE_COLLISION' THEN RAISE EXCEPTION 'wrong reference collision mapping %',msg; END IF;
  END;
  PERFORM set_config('app.d1f_forced_reference','',false);
  BEGIN
    PERFORM mint_custody_reference('3.12','credential','A',NULL,'{}');
    RAISE EXCEPTION 'second active identity accepted';
  EXCEPTION WHEN unique_violation THEN
    GET STACKED DIAGNOSTICS msg=MESSAGE_TEXT;
    IF msg<>'CUSTODY_IDENTITY_ACTIVE' THEN RAISE EXCEPTION 'wrong active identity mapping %',msg; END IF;
  END;
  RAISE NOTICE 'PASS forced-reference differential and distinct REFERENCE_COLLISION/CUSTODY_IDENTITY_ACTIVE outcomes';
END $$;
RESET SESSION AUTHORIZATION;

CREATE UNIQUE INDEX d1f_unknown_unique ON custody_rows ((1));
SET SESSION AUTHORIZATION engram_maintenance;
SELECT set_config('app.principal_id','11000000-0000-0000-0000-000000000001',false);
SELECT set_config('app.session_id','15000000-0000-0000-0000-000000000008',false);
SELECT set_config('app.tenant_id','10000000-0000-0000-0000-000000000001',false);
DO $$
DECLARE msg text; cname text;
BEGIN
  BEGIN
    PERFORM mint_custody_reference('3.3','credential','B','d1f-unknown-23505','{}');
    RAISE EXCEPTION 'unknown uniqueness violation accepted';
  EXCEPTION WHEN unique_violation THEN
    GET STACKED DIAGNOSTICS msg=MESSAGE_TEXT,cname=CONSTRAINT_NAME;
    IF cname<>'d1f_unknown_unique' OR msg NOT LIKE 'duplicate key value violates unique constraint%' THEN RAISE EXCEPTION 'unknown 23505 was remapped: % / %',cname,msg; END IF;
  END;
  RAISE NOTICE 'PASS unknown 23505 re-raised unchanged';
END $$;
RESET SESSION AUTHORIZATION;
DROP INDEX d1f_unknown_unique;

DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='minted_references'::regclass AND conname='minted_references_pkey' AND contype='p') THEN RAISE EXCEPTION 'minted_references_pkey missing before mutation'; END IF; END $$;
ALTER TABLE minted_references DROP CONSTRAINT minted_references_pkey;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='minted_references'::regclass AND conname='minted_references_pkey') THEN RAISE EXCEPTION 'minted_references_pkey drop did not apply'; END IF; END $$;
SET SESSION AUTHORIZATION engram_maintenance;
SELECT set_config('app.principal_id','11000000-0000-0000-0000-000000000001',false);
SELECT set_config('app.session_id','15000000-0000-0000-0000-000000000008',false);
SELECT set_config('app.tenant_id','10000000-0000-0000-0000-000000000001',false);
SELECT set_config('app.d1f_forced_reference','epr:credential:01a01bb2-8135-7000-8000-000000000001',false);
SELECT mint_custody_reference('3.3','credential','B','d1f-pkey-dropped','{}');
DO $$ DECLARE n bigint; BEGIN SELECT count(*) INTO n FROM minted_references WHERE reference='epr:credential:01a01bb2-8135-7000-8000-000000000001'; IF n<>2 THEN RAISE EXCEPTION 'dropped pkey did not permit duplicate, got %',n; END IF; END $$;
RESET SESSION AUTHORIZATION;
DELETE FROM custody_audit WHERE credential_class='3.3' AND reference='epr:credential:01a01bb2-8135-7000-8000-000000000001';
DELETE FROM minted_references r USING custody_rows c WHERE r.custody_row_id=c.id AND c.key_locator='d1f-pkey-dropped';
DELETE FROM custody_rows WHERE key_locator='d1f-pkey-dropped';
ALTER TABLE minted_references ADD CONSTRAINT minted_references_pkey PRIMARY KEY(reference);
DO $$ DECLARE n bigint; BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='minted_references'::regclass AND conname='minted_references_pkey' AND contype='p') THEN RAISE EXCEPTION 'minted_references_pkey not restored'; END IF; SELECT count(*) INTO n FROM minted_references WHERE reference='epr:credential:01a01bb2-8135-7000-8000-000000000001'; IF n<>1 THEN RAISE EXCEPTION 'pkey restore cleanup expected one reference, got %',n; END IF; RAISE NOTICE 'PASS pkey present, dropped, duplicate accepted, and restored'; END $$;
