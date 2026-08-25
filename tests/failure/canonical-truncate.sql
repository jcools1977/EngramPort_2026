\set ON_ERROR_STOP on
BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.expect_error(
  label text,
  sql_text text,
  wanted_state text,
  message_fragment text
) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  got_state text;
  got_message text;
BEGIN
  BEGIN
    EXECUTE sql_text;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS
      got_state = RETURNED_SQLSTATE,
      got_message = MESSAGE_TEXT;
    IF got_state <> wanted_state OR position(message_fragment in got_message) = 0 THEN
      RAISE EXCEPTION '%: expected SQLSTATE % containing %, got %: %',
        label, wanted_state, message_fragment, got_state, got_message;
    END IF;
    RAISE NOTICE 'PASS % matched SQLSTATE %: %', label, got_state, got_message;
    RETURN;
  END;
  RAISE EXCEPTION '%: statement unexpectedly succeeded', label;
END $$;

-- The negative control must reach the trigger. A refusal observed without this
-- explicit grant would prove only that the role lacks TRUNCATE privilege.
GRANT TRUNCATE ON events, event_recipients, custody_rows, minted_references,
  invocation_grants TO engram_maintenance;
SET ROLE engram_maintenance;
DO $$
BEGIN
  IF NOT has_table_privilege(current_user, 'events', 'TRUNCATE')
     OR NOT has_table_privilege(current_user, 'event_recipients', 'TRUNCATE') THEN
    RAISE EXCEPTION 'truncate grant control did not reach engram_maintenance';
  END IF;
  RAISE NOTICE 'PASS maintenance holds deliberate TRUNCATE grants';
END $$;

SELECT set_config('app.tenant_id','10000000-0000-0000-0000-000000000001',false);
SELECT set_config('app.principal_id','11000000-0000-0000-0000-000000000001',false);

-- Paired positive: statement-level TRUNCATE guards leave the canonical append
-- path intact for both the event and its recipient.
INSERT INTO events(
  id,tenant_id,project_id,project_seq,schema_version,kind,actor_id,principal_id,
  occurred_at,correlation_id,idempotency_key,visibility,trust,payload,
  hash_profile,content_sha256,chain_hash
) VALUES (
  '14000000-0000-0000-0000-000000000059',
  '10000000-0000-0000-0000-000000000001',
  '12000000-0000-0000-0000-000000000001',
  59,1,'message.published',
  '13000000-0000-0000-0000-000000000001',
  '11000000-0000-0000-0000-000000000001',
  clock_timestamp(),'14000000-0000-0000-0000-000000000059',
  'f59-truncate-positive','project','trusted_agent','{}',
  'engramport-event-v1',decode(repeat('f5',32),'hex'),decode(repeat('59',32),'hex')
);
INSERT INTO event_recipients(event_id,tenant_id,address_type,address_value)
VALUES(
  '14000000-0000-0000-0000-000000000059',
  '10000000-0000-0000-0000-000000000001',
  'actor','agent-b'
);
DO $$
BEGIN
  IF (SELECT count(*) FROM events WHERE id='14000000-0000-0000-0000-000000000059') <> 1
     OR (SELECT count(*) FROM event_recipients WHERE event_id='14000000-0000-0000-0000-000000000059') <> 1 THEN
    RAISE EXCEPTION 'paired canonical append did not persist both rows';
  END IF;
  RAISE NOTICE 'PASS canonical event and recipient append with TRUNCATE guards installed';
END $$;

SELECT pg_temp.expect_error(
  'event recipients TRUNCATE trigger',
  'TRUNCATE event_recipients',
  '55000',
  'event_recipients is append-only'
);
SELECT pg_temp.expect_error(
  'events TRUNCATE trigger',
  'TRUNCATE events CASCADE',
  '55000',
  'events is append-only'
);

RESET ROLE;
ROLLBACK;
