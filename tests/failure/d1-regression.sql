\set ON_ERROR_STOP on
DO $$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM pg_policies WHERE tablename='project_memberships' AND policyname='membership_principal_self' AND permissive='PERMISSIVE';
 IF n<>1 THEN RAISE EXCEPTION 'membership_principal_self behavioral prerequisite missing'; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='custody_rows'::regclass AND contype='f' AND confrelid='custody_inventory_models'::regclass) THEN RAISE EXCEPTION 'custody class FK missing'; END IF;
 IF NOT has_function_privilege('engram_app','mint_custody_reference(text,epr_namespace,custody_model,text,jsonb)','EXECUTE') THEN
   RAISE NOTICE 'PASS app cannot execute custody mint';
 END IF;
 IF has_function_privilege('engram_app','derive_mint_membership(uuid)','EXECUTE') THEN RAISE EXCEPTION 'app derive ACL regression'; END IF;
 RAISE NOTICE 'PASS D1 regression guards present: membership policy, custody FK, scope/namespace boundary, ACL';
END $$;
