\set ON_ERROR_STOP on
INSERT INTO founder_authorities(principal_id,scopes,expires_at) VALUES
 ('30000000-0000-0000-0000-000000000001',ARRAY['setup:bootstrap','setup:session'],clock_timestamp()+interval '1 hour');
INSERT INTO founder_authorities(principal_id,scopes,expires_at) VALUES
 ('30000000-0000-0000-0000-000000000002',ARRAY['setup:bootstrap'],clock_timestamp()+interval '1 hour');
INSERT INTO founder_authorities(principal_id,scopes,expires_at) VALUES
 ('30000000-0000-0000-0000-000000000005',ARRAY['setup:bootstrap'],clock_timestamp()+interval '1 hour');
SELECT * FROM resolve_founder_authority('30000000-0000-0000-0000-000000000001');
DO $$
DECLARE before_count bigint;
BEGIN
 SELECT count(*) INTO before_count FROM tenants;
 PERFORM bootstrap_workspace('30000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000011','30000000-0000-0000-0000-000000000012','atomic-a','Atomic A');
 IF (SELECT count(*) FROM project_memberships WHERE principal_id='30000000-0000-0000-0000-000000000001') <> 1 THEN RAISE EXCEPTION 'owner membership missing'; END IF;
 RAISE NOTICE 'PASS atomic bootstrap creates tenant/project/principal/owner membership';
END $$;
DO $$
BEGIN
 BEGIN
  PERFORM bootstrap_workspace('30000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000021','30000000-0000-0000-0000-000000000022','atomic-fail','Atomic Fail');
  RAISE EXCEPTION 'forced outer failure';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'forced outer failure' THEN NULL; ELSE RAISE; END IF;
 END;
 IF EXISTS (SELECT 1 FROM tenants WHERE id='30000000-0000-0000-0000-000000000021') OR EXISTS (SELECT 1 FROM projects WHERE id='30000000-0000-0000-0000-000000000022') OR EXISTS (SELECT 1 FROM principals WHERE id='30000000-0000-0000-0000-000000000002' AND tenant_id='30000000-0000-0000-0000-000000000021') OR EXISTS (SELECT 1 FROM project_memberships WHERE project_id='30000000-0000-0000-0000-000000000022') THEN RAISE EXCEPTION 'partial bootstrap residue'; END IF;
 RAISE NOTICE 'PASS partial bootstrap rollback leaves no tenant/project/principal/membership';
END $$;
DO $$ BEGIN
 IF (SELECT scopes FROM resolve_founder_authority('30000000-0000-0000-0000-000000000001')) <> ARRAY['setup:bootstrap','setup:session'] THEN RAISE EXCEPTION 'resolver changed by payload'; END IF;
 RAISE NOTICE 'PASS resolver depends only on authenticated principal id'; END $$;
INSERT INTO founder_authorities(principal_id,scopes,expires_at) VALUES
 ('30000000-0000-0000-0000-000000000003',ARRAY['setup:bootstrap'],clock_timestamp()-interval '1 second'),
 ('30000000-0000-0000-0000-000000000004',ARRAY['setup:bootstrap'],clock_timestamp()+interval '1 hour');
DO $$
BEGIN
 IF EXISTS (SELECT 1 FROM resolve_founder_authority('30000000-0000-0000-0000-000000000003')) THEN RAISE EXCEPTION 'expired authority resolved'; END IF;
 BEGIN
  PERFORM bootstrap_workspace('30000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000031','30000000-0000-0000-0000-000000000032','expired','Expired');
  RAISE EXCEPTION 'expired bootstrap succeeded';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'founder authority expired' THEN RAISE; END IF;
 END;
 IF EXISTS (SELECT 1 FROM tenants WHERE id='30000000-0000-0000-0000-000000000031') OR EXISTS (SELECT 1 FROM projects WHERE id='30000000-0000-0000-0000-000000000032') OR EXISTS (SELECT 1 FROM principals WHERE id='30000000-0000-0000-0000-000000000003') OR EXISTS (SELECT 1 FROM project_memberships WHERE project_id='30000000-0000-0000-0000-000000000032') OR EXISTS (SELECT 1 FROM bootstrap_establishments WHERE principal_id='30000000-0000-0000-0000-000000000003') THEN RAISE EXCEPTION 'expired authority residue'; END IF;
 RAISE NOTICE 'PASS expired authority refused at resolver and bootstrap with zero residue';
END $$;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM resolve_founder_authority('30000000-0000-0000-0000-000000000004')) THEN RAISE NOTICE 'PASS unexpired boundary control'; ELSE RAISE EXCEPTION 'valid authority refused'; END IF;
END $$;

DO $$
DECLARE fn oid; acl text;
BEGIN
 SELECT p.oid, p.proacl::text INTO fn, acl FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname='resolve_founder_authority' AND pg_get_function_identity_arguments(p.oid)='p_principal_id uuid';
 IF EXISTS (SELECT 1 FROM aclexplode(coalesce((SELECT proacl FROM pg_proc WHERE oid=fn), acldefault('f', (SELECT proowner FROM pg_proc WHERE oid=fn)))) x WHERE x.grantee=0 AND x.privilege_type='EXECUTE') OR has_function_privilege('engram_app', fn, 'EXECUTE') THEN RAISE EXCEPTION 'resolve function PUBLIC/app execute remains'; END IF;
 RAISE NOTICE 'PASS resolver ACL has no PUBLIC grant and app has no EXECUTE: %', acl;
 SELECT p.oid, p.proacl::text INTO fn, acl FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname='bootstrap_workspace' AND pg_get_function_identity_arguments(p.oid)='p_principal_id uuid, p_tenant_id uuid, p_project_id uuid, p_slug text, p_name text';
 IF EXISTS (SELECT 1 FROM aclexplode(coalesce((SELECT proacl FROM pg_proc WHERE oid=fn), acldefault('f', (SELECT proowner FROM pg_proc WHERE oid=fn)))) x WHERE x.grantee=0 AND x.privilege_type='EXECUTE') OR has_function_privilege('engram_app', fn, 'EXECUTE') THEN RAISE EXCEPTION 'bootstrap function PUBLIC/app execute remains'; END IF;
 RAISE NOTICE 'PASS bootstrap ACL has no PUBLIC grant and app has no EXECUTE: %', acl;
 IF NOT has_function_privilege('engram_maintenance', 'public.resolve_founder_authority(uuid)', 'EXECUTE') OR NOT has_function_privilege('engram_maintenance', 'public.bootstrap_workspace(uuid,uuid,uuid,text,text)', 'EXECUTE') THEN RAISE EXCEPTION 'maintenance EXECUTE missing'; END IF;
 RAISE NOTICE 'PASS maintenance has EXECUTE on both trusted functions';
END $$;

SET ROLE engram_app;
SELECT set_config('app.test_bootstrap_pause','true',false);
DO $$ BEGIN
 BEGIN PERFORM resolve_founder_authority('30000000-0000-0000-0000-000000000001'); RAISE EXCEPTION 'app resolver invocation unexpectedly succeeded';
 EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'PASS app resolver denied before SECURITY DEFINER body (42501)'; END;
 BEGIN PERFORM bootstrap_workspace('30000000-0000-0000-0000-000000000005','30000000-0000-0000-0000-000000000051','30000000-0000-0000-0000-000000000052','app-forbidden','App Forbidden'); RAISE EXCEPTION 'app bootstrap invocation unexpectedly succeeded';
 EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'PASS app bootstrap denied before SECURITY DEFINER body (42501)'; END;
END $$;
RESET ROLE;

SET ROLE engram_maintenance;
SELECT set_config('app.test_bootstrap_pause','true',false);
SELECT * FROM resolve_founder_authority('30000000-0000-0000-0000-000000000001');
SELECT * FROM bootstrap_workspace('30000000-0000-0000-0000-000000000005','30000000-0000-0000-0000-000000000051','30000000-0000-0000-0000-000000000052','maintenance-positive','Maintenance Positive');
RESET ROLE;
DO $$ BEGIN RAISE NOTICE 'PASS maintenance resolver and bootstrap positive controls'; END $$;

-- Discrimination: restoring the default PUBLIC grant makes the app invocation
-- succeed, proving the negative ACL control is not vacuous.
GRANT EXECUTE ON FUNCTION resolve_founder_authority(uuid), bootstrap_workspace(uuid, uuid, uuid, text, text) TO PUBLIC;
SET ROLE engram_app;
DO $$ BEGIN
 IF (SELECT count(*) FROM resolve_founder_authority('30000000-0000-0000-0000-000000000001')) <> 1 THEN RAISE EXCEPTION 'PUBLIC grant discrimination did not expose resolver'; END IF;
 RAISE NOTICE 'PASS ACL discrimination: removing PUBLIC revoke makes app resolver succeed';
END $$;
RESET ROLE;
