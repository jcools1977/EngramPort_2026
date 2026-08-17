\set ON_ERROR_STOP on
INSERT INTO founder_authorities(principal_id,scopes,expires_at) VALUES
 ('30000000-0000-0000-0000-000000000001',ARRAY['setup:bootstrap','setup:session'],clock_timestamp()+interval '1 hour');
INSERT INTO founder_authorities(principal_id,scopes,expires_at) VALUES
 ('30000000-0000-0000-0000-000000000002',ARRAY['setup:bootstrap'],clock_timestamp()+interval '1 hour');
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
