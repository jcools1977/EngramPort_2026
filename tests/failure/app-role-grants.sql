\set ON_ERROR_STOP on
BEGIN;
CREATE OR REPLACE FUNCTION pg_temp.expect_error(label text, sql_text text, wanted_state text, message_fragment text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE got_state text; got_message text;
BEGIN
  BEGIN EXECUTE sql_text;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS got_state = RETURNED_SQLSTATE, got_message = MESSAGE_TEXT;
    IF got_state <> wanted_state OR position(message_fragment in got_message) = 0 THEN
      RAISE EXCEPTION '%: expected SQLSTATE % containing %, got %: %', label, wanted_state, message_fragment, got_state, got_message;
    END IF;
    RAISE NOTICE 'PASS % matched SQLSTATE %: %', label, got_state, got_message;
    RETURN;
  END;
  RAISE EXCEPTION '%: statement unexpectedly succeeded', label;
END $$;

SET ROLE engram_app;
SELECT set_config('app.tenant_id','10000000-0000-0000-0000-000000000001',false);
SELECT set_config('app.principal_id','11000000-0000-0000-0000-000000000001',false);
SELECT pg_temp.expect_error('app actor_delegations INSERT denied', $$INSERT INTO actor_delegations(actor_id,principal_id,scopes) VALUES ('13000000-0000-0000-0000-000000000099','11000000-0000-0000-0000-000000000001',ARRAY['*'])$$, '42501', 'permission denied for table actor_delegations');
SELECT pg_temp.expect_error('app project_memberships INSERT denied', $$INSERT INTO project_memberships(tenant_id,project_id,principal_id,role) VALUES ('10000000-0000-0000-0000-000000000001','12000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000099','reader')$$, '42501', 'permission denied for table project_memberships');
SELECT pg_temp.expect_error('app actors INSERT denied', $$INSERT INTO actors(id,tenant_id,project_id,kind,slug,display_name,trust) VALUES ('13000000-0000-0000-0000-000000000088','10000000-0000-0000-0000-000000000001','12000000-0000-0000-0000-000000000001','agent','forbidden','Forbidden','untrusted_agent')$$, '42501', 'permission denied for table actors');
SELECT pg_temp.expect_error('app principals INSERT denied', $$INSERT INTO principals(id,tenant_id,kind,display_name) VALUES ('11000000-0000-0000-0000-000000000088','10000000-0000-0000-0000-000000000001','human','Forbidden')$$, '42501', 'permission denied for table principals');
DO $$
DECLARE table_name text; row_count bigint;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['tenants','principals','projects','project_memberships','actors','actor_delegations','agent_sessions','threads'] LOOP
    EXECUTE format('SELECT count(*) FROM %I',table_name) INTO row_count;
    RAISE NOTICE 'PASS app SELECT on % returned % tenant-visible rows',table_name,row_count;
  END LOOP;
END $$;
INSERT INTO events(id,tenant_id,project_id,project_seq,schema_version,kind,actor_id,principal_id,occurred_at,correlation_id,idempotency_key,visibility,trust,payload,hash_profile,content_sha256,chain_hash)
VALUES ('14000000-0000-0000-0000-000000000099','10000000-0000-0000-0000-000000000001','12000000-0000-0000-0000-000000000001',99,1,'message.published','13000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',now(),gen_random_uuid(),'grant-positive','project','trusted_agent','{}','engramport-event-v1',decode(repeat('aa',32),'hex'),decode(repeat('bb',32),'hex'));
DO $$ BEGIN RAISE NOTICE 'PASS app valid event INSERT'; END $$;

RESET ROLE;
SET ROLE engram_maintenance;
SELECT set_config('app.tenant_id','10000000-0000-0000-0000-000000000001',false);
SELECT set_config('app.principal_id','11000000-0000-0000-0000-000000000001',false);
INSERT INTO principals(id,tenant_id,kind,display_name) VALUES ('11000000-0000-0000-0000-000000000088','10000000-0000-0000-0000-000000000001','human','Provisioned');
INSERT INTO actors(id,tenant_id,project_id,kind,slug,display_name,trust) VALUES ('13000000-0000-0000-0000-000000000088','10000000-0000-0000-0000-000000000001','12000000-0000-0000-0000-000000000001','agent','provisioned','Provisioned','untrusted_agent');
INSERT INTO actor_delegations(actor_id,principal_id,scopes) VALUES ('13000000-0000-0000-0000-000000000088','11000000-0000-0000-0000-000000000088',ARRAY['events:append']);
INSERT INTO project_memberships(tenant_id,project_id,principal_id,role) VALUES ('10000000-0000-0000-0000-000000000001','12000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000088','reader');
DO $$ BEGIN RAISE NOTICE 'PASS maintenance identity and authorization INSERT controls'; END $$;
RESET ROLE;
ROLLBACK;
