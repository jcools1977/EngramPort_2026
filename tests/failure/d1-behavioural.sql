\set ON_ERROR_STOP on
DO $$ DECLARE n integer; msg text; ns text; BEGIN
PERFORM set_config('app.principal_id','11000000-0000-0000-0000-000000000001',false); PERFORM set_config('app.tenant_id','10000000-0000-0000-0000-000000000001',false);
SELECT count(*) INTO n FROM project_memberships WHERE principal_id<>'11000000-0000-0000-0000-000000000001'; IF n<>0 THEN RAISE EXCEPTION 'G1 membership leak'; END IF;
SELECT count(*) INTO n FROM project_memberships; IF n<>1 THEN RAISE EXCEPTION 'G1 own membership missing'; END IF;
PERFORM set_config('app.tenant_id','10000000-0000-0000-0000-000000000001',false);
BEGIN INSERT INTO custody_rows(id,tenant_id,project_id,namespace,credential_class,custody_model,inventory_model,required_scope,minted_by_principal_id,retention_policy) VALUES(gen_random_uuid(),'10000000-0000-0000-0000-000000000001','12000000-0000-0000-0000-000000000001','credential','G2-UNMAPPED','A','A','x','11000000-0000-0000-0000-000000000001','RET-CONFIG-400'); RAISE EXCEPTION 'G2 FK did not refuse'; EXCEPTION WHEN foreign_key_violation THEN NULL; WHEN insufficient_privilege THEN RAISE EXCEPTION 'G2 masked by RLS'; END;
PERFORM set_config('app.tenant_id','',false);
BEGIN PERFORM mint_custody_reference('3.2','credential','B','vault:transit/g3','{}'::jsonb); RAISE EXCEPTION 'G3 scope did not refuse'; EXCEPTION WHEN insufficient_privilege THEN GET STACKED DIAGNOSTICS msg=MESSAGE_TEXT; IF msg<>'SCOPE_EXCEEDED' THEN RAISE EXCEPTION 'G3 masked'; END IF; END;
FOREACH ns IN ARRAY ARRAY['shape','installation'] LOOP BEGIN PERFORM mint_custody_reference('3.12',ns::epr_namespace,'A',NULL,'{}'::jsonb); RAISE EXCEPTION 'G4 namespace accepted'; EXCEPTION WHEN insufficient_privilege THEN GET STACKED DIAGNOSTICS msg=MESSAGE_TEXT; IF msg<>'NAMESPACE_REFUSED' THEN RAISE EXCEPTION 'G4 masked'; END IF; END; END LOOP;
RAISE NOTICE 'D1 behavioural guards OK'; END $$;
