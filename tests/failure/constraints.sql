\set ON_ERROR_STOP on
CREATE OR REPLACE FUNCTION pg_temp.expect_error(label text, sql_text text, wanted_state text, message_fragment text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE got_state text; got_message text;
BEGIN
  BEGIN
    EXECUTE sql_text;
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
SELECT pg_temp.expect_error('cross-tenant INSERT WITH CHECK', $q$
 INSERT INTO events(id,tenant_id,project_id,project_seq,schema_version,kind,actor_id,principal_id,occurred_at,correlation_id,idempotency_key,visibility,trust,payload,hash_profile,content_sha256,chain_hash)
 VALUES('25000000-0000-0000-0000-000000000099','20000000-0000-0000-0000-000000000002','23000000-0000-0000-0000-000000000002',99,1,'message.published','24000000-0000-0000-0000-000000000002','22000000-0000-0000-0000-000000000002',now(),gen_random_uuid(),'cross-tenant','project','trusted_agent','{}','engramport-event-v1',decode(repeat('aa',32),'hex'),decode(repeat('bb',32),'hex'))$q$, '42501','row-level security policy');
SELECT pg_temp.expect_error('application UPDATE denied', $$UPDATE events SET payload='{"changed":true}' WHERE id='14000000-0000-0000-0000-000000000001'$$, '42501','permission denied');
SELECT pg_temp.expect_error('application DELETE denied', $$DELETE FROM events WHERE id='14000000-0000-0000-0000-000000000001'$$, '42501','permission denied');
SELECT pg_temp.expect_error('duplicate idempotency conflict', $q$
 INSERT INTO events(id,tenant_id,project_id,project_seq,schema_version,kind,actor_id,principal_id,occurred_at,correlation_id,idempotency_key,visibility,trust,payload,hash_profile,content_sha256,chain_hash)
 VALUES(gen_random_uuid(),'10000000-0000-0000-0000-000000000001','12000000-0000-0000-0000-000000000001',2,1,'message.published','13000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',now(),gen_random_uuid(),'seed-a','project','trusted_agent','{"different":true}','engramport-event-v1',decode(repeat('ca',32),'hex'),decode(repeat('cb',32),'hex'))$q$, '23505','events_principal_id_project_id_idempotency_key_key');
SELECT pg_temp.expect_error('missing delegation rejected', $q$
 INSERT INTO events(id,tenant_id,project_id,project_seq,schema_version,kind,actor_id,principal_id,occurred_at,correlation_id,idempotency_key,visibility,trust,payload,hash_profile,content_sha256,chain_hash)
 VALUES(gen_random_uuid(),'10000000-0000-0000-0000-000000000001','12000000-0000-0000-0000-000000000001',3,1,'message.published','13000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000099',now(),gen_random_uuid(),'disabled','project','trusted_agent','{}','engramport-event-v1',decode(repeat('da',32),'hex'),decode(repeat('db',32),'hex'))$q$, '23514','principal is disabled');
SELECT pg_temp.expect_error('undelegated actor rejected', $q$
 INSERT INTO events(id,tenant_id,project_id,project_seq,schema_version,kind,actor_id,principal_id,occurred_at,correlation_id,idempotency_key,visibility,trust,payload,hash_profile,content_sha256,chain_hash)
 VALUES(gen_random_uuid(),'10000000-0000-0000-0000-000000000001','12000000-0000-0000-0000-000000000001',3,1,'message.published','13000000-0000-0000-0000-000000000099','11000000-0000-0000-0000-000000000001',now(),gen_random_uuid(),'undelegated','project','trusted_agent','{}','engramport-event-v1',decode(repeat('dc',32),'hex'),decode(repeat('dd',32),'hex'))$q$, '23514','valid actor delegation');
SELECT pg_temp.expect_error('nonexistent in_reply_to rejected', $q$
 INSERT INTO events(id,tenant_id,project_id,project_seq,schema_version,kind,actor_id,principal_id,occurred_at,in_reply_to,correlation_id,idempotency_key,visibility,trust,payload,hash_profile,content_sha256,chain_hash)
 VALUES(gen_random_uuid(),'10000000-0000-0000-0000-000000000001','12000000-0000-0000-0000-000000000001',4,1,'message.published','13000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',now(),'ffffffff-ffff-ffff-ffff-ffffffffffff',gen_random_uuid(),'bad-reply','project','trusted_agent','{}','engramport-event-v1',decode(repeat('ea',32),'hex'),decode(repeat('eb',32),'hex'))$q$, '23503','events_in_reply_to_fkey');
SELECT pg_temp.expect_error('short content_sha256 rejected', $q$
 INSERT INTO events(id,tenant_id,project_id,project_seq,schema_version,kind,actor_id,principal_id,occurred_at,correlation_id,idempotency_key,visibility,trust,payload,hash_profile,content_sha256,chain_hash)
 VALUES(gen_random_uuid(),'10000000-0000-0000-0000-000000000001','12000000-0000-0000-0000-000000000001',5,1,'message.published','13000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',now(),gen_random_uuid(),'short-content','project','trusted_agent','{}','engramport-event-v1',decode('aa','hex'),decode(repeat('eb',32),'hex'))$q$, '23514','events_content_sha256_check');
SELECT pg_temp.expect_error('short chain_hash rejected', $q$
 INSERT INTO events(id,tenant_id,project_id,project_seq,schema_version,kind,actor_id,principal_id,occurred_at,correlation_id,idempotency_key,visibility,trust,payload,hash_profile,content_sha256,chain_hash)
 VALUES(gen_random_uuid(),'10000000-0000-0000-0000-000000000001','12000000-0000-0000-0000-000000000001',6,1,'message.published','13000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001',now(),gen_random_uuid(),'short-chain','project','trusted_agent','{}','engramport-event-v1',decode(repeat('ea',32),'hex'),decode('eb','hex'))$q$, '23514','events_chain_hash_check');

RESET ROLE;
SET ROLE engram_migrator;
SELECT set_config('app.tenant_id','10000000-0000-0000-0000-000000000001',false);
SELECT set_config('app.principal_id','11000000-0000-0000-0000-000000000001',false);
SELECT pg_temp.expect_error('migration owner UPDATE trigger', $$UPDATE events SET payload='{"changed":true}' WHERE id='14000000-0000-0000-0000-000000000001'$$, '55000','events is append-only');
SELECT pg_temp.expect_error('migration owner DELETE trigger', $$DELETE FROM events WHERE id='14000000-0000-0000-0000-000000000001'$$, '55000','events is append-only');
RESET ROLE;
