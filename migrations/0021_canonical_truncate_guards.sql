BEGIN;

-- Row-level UPDATE/DELETE triggers do not fire for TRUNCATE. Keep the same
-- named append-only refusal at the statement boundary for both canonical
-- tables, independently of the role's current TRUNCATE privilege.
CREATE TRIGGER events_truncate_immutable
  BEFORE TRUNCATE ON events
  FOR EACH STATEMENT EXECUTE FUNCTION reject_canonical_mutation();

CREATE TRIGGER event_recipients_truncate_immutable
  BEFORE TRUNCATE ON event_recipients
  FOR EACH STATEMENT EXECUTE FUNCTION reject_canonical_mutation();

COMMIT;
