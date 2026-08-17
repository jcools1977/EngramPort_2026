\set ON_ERROR_STOP on
-- Test-only mutations prove the live negative controls distinguish guarded from
-- deliberately unguarded state. Every transaction rolls its mutation back.
CREATE OR REPLACE FUNCTION pg_temp.expect_success(label text, sql_text text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE sql_text;
  RAISE NOTICE 'PASS discrimination %: forbidden operation succeeded after guard removal', label;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'discrimination % did not bypass guard: % %', label, SQLSTATE, SQLERRM;
END $$;
CREATE OR REPLACE FUNCTION pg_temp.expect_not_error(label text, sql_text text, guarded_state text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE sql_text;
  RAISE NOTICE 'PASS discrimination %: guarded SQLSTATE % no longer occurred', label, guarded_state;
EXCEPTION WHEN OTHERS THEN
  IF SQLSTATE = guarded_state THEN RAISE EXCEPTION 'discrimination % still produced guarded SQLSTATE %', label, guarded_state; END IF;
  RAISE NOTICE 'PASS discrimination %: guard removal changed SQLSTATE % to %', label, guarded_state, SQLSTATE;
END $$;

BEGIN;
ALTER ROLE engram_app BYPASSRLS;
SET ROLE engram_app;
SELECT set_config('app.tenant_id','10000000-0000-0000-0000-000000000001',false);
SELECT set_config('app.principal_id','11000000-0000-0000-0000-000000000001',false);
SELECT pg_temp.expect_success('cross-tenant chronological hidden', $$SELECT 1 / count(*)::int FROM events WHERE id='25000000-0000-0000-0000-000000000002'$$);
SELECT pg_temp.expect_success('cross-tenant guessed UUID hidden', $$SELECT 1 / count(*)::int FROM events WHERE id='25000000-0000-0000-0000-000000000002'$$);
SELECT pg_temp.expect_success('cross-tenant GIN full-text hidden', $$SELECT 1 / count(*)::int FROM events WHERE search_document @@ plainto_tsquery('english','beta')$$);
SELECT pg_temp.expect_success('cross-tenant GIN labels hidden', $$SELECT 1 / count(*)::int FROM events WHERE labels @> ARRAY['beta']$$);
RESET ROLE;
DO $$ BEGIN IF NOT (SELECT rolbypassrls FROM pg_roles WHERE rolname='engram_app') THEN RAISE EXCEPTION 'role bypass not active'; END IF; RAISE NOTICE 'PASS discrimination role flag assertion detects BYPASSRLS'; END $$;
ROLLBACK;

BEGIN;
CREATE TABLE public.rls_discrimination(id integer);
ALTER TABLE public.rls_discrimination ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='rls_discrimination' AND c.relrowsecurity AND NOT c.relforcerowsecurity)
 THEN RAISE EXCEPTION 'catalog fixture did not expose unforced RLS'; END IF;
 RAISE NOTICE 'PASS discrimination forced-RLS catalog assertion detects enabled-but-unforced table';
END $$;
ROLLBACK;

BEGIN;
GRANT INSERT ON actor_delegations, project_memberships, actors, principals TO engram_app;
SET ROLE engram_app;
SELECT set_config('app.tenant_id','10000000-0000-0000-0000-000000000001',false);
SELECT set_config('app.principal_id','11000000-0000-0000-0000-000000000001',false);
SELECT pg_temp.expect_success('app actor_delegations INSERT denied', $$INSERT INTO actor_delegations(actor_id,principal_id,scopes) VALUES ('13000000-0000-0000-0000-000000000099','11000000-0000-0000-0000-000000000001',ARRAY['*'])$$);
SELECT pg_temp.expect_success('app project_memberships INSERT denied', $$INSERT INTO project_memberships(tenant_id,project_id,principal_id,role) VALUES ('10000000-0000-0000-0000-000000000001','12000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000099','reader')$$);
SELECT pg_temp.expect_success('app actors INSERT denied', $$INSERT INTO actors(id,tenant_id,project_id,kind,slug,display_name,trust) VALUES ('13000000-0000-0000-0000-000000000088','10000000-0000-0000-0000-000000000001','12000000-0000-0000-0000-000000000001','agent','discrimination','Discrimination','untrusted_agent')$$);
SELECT pg_temp.expect_success('app principals INSERT denied', $$INSERT INTO principals(id,tenant_id,kind,external_issuer,external_subject,display_name) VALUES ('11000000-0000-0000-0000-000000000088','10000000-0000-0000-0000-000000000001','human','https://synthetic.invalid','discrimination','Discrimination')$$);
RESET ROLE;
ROLLBACK;

BEGIN;
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
SET ROLE engram_app;
SELECT set_config('app.tenant_id','10000000-0000-0000-0000-000000000001',false);
SELECT set_config('app.principal_id','11000000-0000-0000-0000-000000000001',false);
SELECT pg_temp.expect_success('cross-tenant INSERT WITH CHECK', $$INSERT INTO events(id,tenant_id,project_id,project_seq,schema_version,kind,actor_id,principal_id,occurred_at,correlation_id,idempotency_key,visibility,trust,payload,hash_profile,content_sha256,chain_hash) VALUES('25000000-0000-0000-0000-000000000099','20000000-0000-0000-0000-000000000002','23000000-0000-0000-0000-000000000002',99,1,'message.published','24000000-0000-0000-0000-000000000002','22000000-0000-0000-0000-000000000002',now(),gen_random_uuid(),'discrimination-cross','project','trusted_agent','{}','engramport-event-v1',decode(repeat('aa',32),'hex'),decode(repeat('bb',32),'hex'))$$);
RESET ROLE;
ROLLBACK;

BEGIN;
GRANT UPDATE, DELETE ON events TO engram_app;
SET ROLE engram_app;
SELECT set_config('app.tenant_id','10000000-0000-0000-0000-000000000001',false);
SELECT set_config('app.principal_id','11000000-0000-0000-0000-000000000001',false);
SELECT pg_temp.expect_not_error('application UPDATE denied', $$UPDATE events SET payload='{"changed":true}' WHERE id='14000000-0000-0000-0000-000000000001'$$, '42501');
SELECT pg_temp.expect_not_error('application DELETE denied', $$DELETE FROM events WHERE id='14000000-0000-0000-0000-000000000001'$$, '42501');
RESET ROLE;
ROLLBACK;

BEGIN;
ALTER TABLE events DROP CONSTRAINT events_principal_id_project_id_idempotency_key_key;
SET ROLE engram_app;
SELECT set_config('app.tenant_id','10000000-0000-0000-0000-000000000001',false);
SELECT set_config('app.principal_id','11000000-0000-0000-0000-000000000001',false);
SELECT pg_temp.expect_success('duplicate idempotency conflict', $$INSERT INTO events(id,tenant_id,project_id,project_seq,schema_version,kind,actor_id,principal_id,occurred_at,correlation_id,idempotency_key,visibility,trust,payload,hash_profile,content_sha256,chain_hash) VALUES(gen_random_uuid(),'10000000-0000-0000-0000-000000000001','12000000-0000-0000-0000-000000000001',2,1,'message.published','13000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',now(),gen_random_uuid(),'seed-a','project','trusted_agent','{}','engramport-event-v1',decode(repeat('ca',32),'hex'),decode(repeat('cb',32),'hex'))$$);
RESET ROLE;
ROLLBACK;

BEGIN;
ALTER TABLE events DISABLE TRIGGER events_actor_delegation;
SET ROLE engram_app;
SELECT set_config('app.tenant_id','10000000-0000-0000-0000-000000000001',false);
SELECT set_config('app.principal_id','11000000-0000-0000-0000-000000000001',false);
SELECT pg_temp.expect_success('missing delegation rejected', $$INSERT INTO events(id,tenant_id,project_id,project_seq,schema_version,kind,actor_id,principal_id,occurred_at,correlation_id,idempotency_key,visibility,trust,payload,hash_profile,content_sha256,chain_hash) VALUES(gen_random_uuid(),'10000000-0000-0000-0000-000000000001','12000000-0000-0000-0000-000000000001',3,1,'message.published','13000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000099',now(),gen_random_uuid(),'discrimination-disabled','project','trusted_agent','{}','engramport-event-v1',decode(repeat('da',32),'hex'),decode(repeat('db',32),'hex'))$$);
SELECT pg_temp.expect_success('undelegated actor rejected', $$INSERT INTO events(id,tenant_id,project_id,project_seq,schema_version,kind,actor_id,principal_id,occurred_at,correlation_id,idempotency_key,visibility,trust,payload,hash_profile,content_sha256,chain_hash) VALUES(gen_random_uuid(),'10000000-0000-0000-0000-000000000001','12000000-0000-0000-0000-000000000001',4,1,'message.published','13000000-0000-0000-0000-000000000099','11000000-0000-0000-0000-000000000001',now(),gen_random_uuid(),'discrimination-undelegated','project','trusted_agent','{}','engramport-event-v1',decode(repeat('dc',32),'hex'),decode(repeat('dd',32),'hex'))$$);
RESET ROLE;
ROLLBACK;

BEGIN;
ALTER TABLE events DROP CONSTRAINT events_in_reply_to_fkey;
SET ROLE engram_app;
SELECT set_config('app.tenant_id','10000000-0000-0000-0000-000000000001',false);
SELECT set_config('app.principal_id','11000000-0000-0000-0000-000000000001',false);
SELECT pg_temp.expect_success('nonexistent in_reply_to rejected', $$INSERT INTO events(id,tenant_id,project_id,project_seq,schema_version,kind,actor_id,principal_id,occurred_at,in_reply_to,correlation_id,idempotency_key,visibility,trust,payload,hash_profile,content_sha256,chain_hash) VALUES(gen_random_uuid(),'10000000-0000-0000-0000-000000000001','12000000-0000-0000-0000-000000000001',5,1,'message.published','13000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',now(),'ffffffff-ffff-ffff-ffff-ffffffffffff',gen_random_uuid(),'discrimination-reply','project','trusted_agent','{}','engramport-event-v1',decode(repeat('ea',32),'hex'),decode(repeat('eb',32),'hex'))$$);
RESET ROLE;
ROLLBACK;

BEGIN;
ALTER TABLE events DROP CONSTRAINT events_content_sha256_check;
SET ROLE engram_app;
SELECT set_config('app.tenant_id','10000000-0000-0000-0000-000000000001',false);
SELECT set_config('app.principal_id','11000000-0000-0000-0000-000000000001',false);
SELECT pg_temp.expect_success('short content_sha256 rejected', $$INSERT INTO events(id,tenant_id,project_id,project_seq,schema_version,kind,actor_id,principal_id,occurred_at,correlation_id,idempotency_key,visibility,trust,payload,hash_profile,content_sha256,chain_hash) VALUES(gen_random_uuid(),'10000000-0000-0000-0000-000000000001','12000000-0000-0000-0000-000000000001',5,1,'message.published','13000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',now(),gen_random_uuid(),'discrimination-content','project','trusted_agent','{}','engramport-event-v1',decode('aa','hex'),decode(repeat('eb',32),'hex'))$$);
RESET ROLE;
ROLLBACK;

BEGIN;
ALTER TABLE events DROP CONSTRAINT events_chain_hash_check;
SET ROLE engram_app;
SELECT set_config('app.tenant_id','10000000-0000-0000-0000-000000000001',false);
SELECT set_config('app.principal_id','11000000-0000-0000-0000-000000000001',false);
SELECT pg_temp.expect_success('short chain_hash rejected', $$INSERT INTO events(id,tenant_id,project_id,project_seq,schema_version,kind,actor_id,principal_id,occurred_at,correlation_id,idempotency_key,visibility,trust,payload,hash_profile,content_sha256,chain_hash) VALUES(gen_random_uuid(),'10000000-0000-0000-0000-000000000001','12000000-0000-0000-0000-000000000001',6,1,'message.published','13000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',now(),gen_random_uuid(),'discrimination-chain','project','trusted_agent','{}','engramport-event-v1',decode(repeat('ea',32),'hex'),decode('eb','hex'))$$);
RESET ROLE;
ROLLBACK;

BEGIN;
ALTER TABLE events DISABLE TRIGGER events_immutable;
SET ROLE engram_migrator;
SELECT set_config('app.tenant_id','10000000-0000-0000-0000-000000000001',false);
SELECT set_config('app.principal_id','11000000-0000-0000-0000-000000000001',false);
SELECT pg_temp.expect_success('migration owner UPDATE trigger', $$UPDATE events SET payload='{"changed":true}' WHERE id='14000000-0000-0000-0000-000000000001'$$);
SELECT pg_temp.expect_success('migration owner DELETE trigger', $$DELETE FROM events WHERE id='14000000-0000-0000-0000-000000000001'$$);
RESET ROLE;
ROLLBACK;
