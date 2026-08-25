# F59 canonical TRUNCATE guard results

Bound handoff: `01a03647-1f25-7c80-bbfd-8df9bb0d94ff`

## Implemented boundary

- Forward-only migration `0021_canonical_truncate_guards.sql` adds `BEFORE TRUNCATE ... FOR EACH STATEMENT` triggers to `events` and `event_recipients`.
- Both triggers reuse `reject_canonical_mutation()`, preserving SQLSTATE `55000` and the existing `<table> is append-only` refusal surface.
- The migration changes no table privileges. SHA-256: `0a850f0560a6ef103733afb52dafbccd41dbcaadba5b4813537df9c1c70aaefd`.

## Live control

`tests/failure/canonical-truncate.sql` runs inside a rolled-back transaction and deliberately grants `engram_maintenance` `TRUNCATE` on both canonical tables and every relation needed for the `events CASCADE` probe. It confirms the canonical privileges are present before testing either refusal, so a missing privilege cannot satisfy the control.

The paired positive inserts one canonical event and one recipient with both statement triggers installed. The negative observations are:

```text
PASS maintenance holds deliberate TRUNCATE grants
PASS canonical event and recipient append with TRUNCATE guards installed
PASS event recipients TRUNCATE trigger matched SQLSTATE 55000: event_recipients is append-only
PASS events TRUNCATE trigger matched SQLSTATE 55000: events is append-only
```

Fixture SHA-256: `94938072a842462c703b778fc3b51d46ed92a63adee24f3b84bff443bf776a47`.

## Discrimination

One mutation drops both new statement triggers. The same live fixture then reaches a forbidden successful `TRUNCATE event_recipients` and exits nonzero rather than accepting a wrong-reason refusal:

```text
F59_TRUNCATE_GUARD baseline=0 applied=t after=3 restored=0
D1 mutation harness: all controls discriminate (executed=71)
```

The no-op negative remains rejected:

```text
NOOP baseline=0 applied=f after=0 restored=0
NOOP false discrimination correctly rejected
```

## Verification

- `npm run db:test`: exit 0; full live suite and mutation harness green at `executed=71`.
- `npm test`: exit 0; 236 passed, 0 failed, 0 skipped.
- `npm run kms:test`: exit 0; live Vault differential green.
- `npm run lint`: exit 0.
- `npm run session:async-negative`: exit 0; `failed=21 passed=16 enumerated=t`.
- `bash scripts/run-d1-mutation-harness --negative`: expected exit 1 with the no-op rejected.

The first two development probes were correctly rejected: one stopped at the `events` foreign-key dependency and the next at a missing cascade-target privilege. Neither was counted. The final probe grants every required cascade privilege and reaches the named `events` trigger.
