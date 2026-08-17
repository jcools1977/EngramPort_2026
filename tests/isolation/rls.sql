\set ON_ERROR_STOP on
CREATE OR REPLACE FUNCTION pg_temp.assert_count(label text, sql_text text, expected bigint) RETURNS void LANGUAGE plpgsql AS $$
DECLARE actual bigint;
BEGIN
  EXECUTE sql_text INTO actual;
  IF actual <> expected THEN RAISE EXCEPTION '%: expected %, got %', label, expected, actual; END IF;
  RAISE NOTICE 'PASS % (count=%)', label, actual;
END $$;

SET ROLE engram_app;
SELECT set_config('app.tenant_id','10000000-0000-0000-0000-000000000001',false);
SELECT set_config('app.principal_id','11000000-0000-0000-0000-000000000001',false);
SELECT pg_temp.assert_count('positive chronological tenant A', 'SELECT count(*) FROM events', 1);
SELECT pg_temp.assert_count('positive known UUID tenant A', $$SELECT count(*) FROM events WHERE id='14000000-0000-0000-0000-000000000001'$$, 1);
SELECT pg_temp.assert_count('positive GIN full-text tenant A', $$SELECT count(*) FROM events WHERE search_document @@ plainto_tsquery('english','alpha')$$, 1);
SELECT pg_temp.assert_count('positive GIN labels tenant A', $$SELECT count(*) FROM events WHERE labels @> ARRAY['alpha']$$, 1);
SELECT pg_temp.assert_count('cross-tenant chronological hidden', $$SELECT count(*) FROM events WHERE id='25000000-0000-0000-0000-000000000002'$$, 0);
SELECT pg_temp.assert_count('cross-tenant guessed UUID hidden', $$SELECT count(*) FROM events WHERE id='25000000-0000-0000-0000-000000000002'$$, 0);
SELECT pg_temp.assert_count('cross-tenant GIN full-text hidden', $$SELECT count(*) FROM events WHERE search_document @@ plainto_tsquery('english','beta')$$, 0);
SELECT pg_temp.assert_count('cross-tenant GIN labels hidden', $$SELECT count(*) FROM events WHERE labels @> ARRAY['beta']$$, 0);

SELECT set_config('app.tenant_id','20000000-0000-0000-0000-000000000002',false);
SELECT set_config('app.principal_id','22000000-0000-0000-0000-000000000002',false);
SELECT pg_temp.assert_count('positive chronological tenant B', 'SELECT count(*) FROM events', 1);
SELECT pg_temp.assert_count('positive known UUID tenant B', $$SELECT count(*) FROM events WHERE id='25000000-0000-0000-0000-000000000002'$$, 1);
SELECT pg_temp.assert_count('positive GIN full-text tenant B', $$SELECT count(*) FROM events WHERE search_document @@ plainto_tsquery('english','beta')$$, 1);

RESET ROLE;
DO $$ BEGIN
 IF (SELECT rolbypassrls FROM pg_roles WHERE rolname='engram_app') THEN RAISE EXCEPTION 'engram_app has BYPASSRLS'; END IF;
 IF (SELECT rolsuper FROM pg_roles WHERE rolname='engram_app') THEN RAISE EXCEPTION 'engram_app is superuser'; END IF;
 IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relname IN
   ('tenants','principals','projects','project_memberships','actors','actor_delegations','agent_sessions','threads','events','event_recipients')
   AND c.relkind='r' AND NOT (c.relrowsecurity AND c.relforcerowsecurity)) THEN RAISE EXCEPTION 'tenant table lacks forced RLS'; END IF;
 RAISE NOTICE 'PASS application role is NOSUPERUSER NOBYPASSRLS and all tenant tables have forced RLS';
END $$;
