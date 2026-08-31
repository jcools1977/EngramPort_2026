# Terminal append result

## Change

The append CLI now converts the exact `--next null` sentinel to JavaScript `null` before calling `appendEvent`. The event core and canonical intent hash remain unchanged. Consequently, the value hashed for a terminal event is the same value serialized as `next: null` and later parsed by the verifier.

The new CLI control covers three paths:

- `--next null` appends a terminal event and the resulting log verifies;
- `--next agent-b` still appends an addressed event; and
- an undeclared next actor is refused without writing an event.

The mutation `V1_TERMINAL_NEXT` restores the old literal-string behavior. The control kills that mutation because the candidate event's serialized `next: null` no longer matches the intent hash computed from the string `"null"`.

## Optional-flag audit

The other append flags whose omission changes input construction were audited:

- `--reply` omitted means a thread root. Its documented value is an event UUID; the literal string `null` is not a valid reply identity and should remain refused rather than gain another sentinel path.
- `--id` omitted generates a UUIDv7. The literal string `null` is invalid and is correctly refused.
- `--schema-version` omitted selects the current writer version. The literal string `null` converts to a non-version value and is correctly refused.
- `--artifacts ""` intentionally means no artifact references and already has a positive control.
- `--bounded-context`, `--completion-criteria`, and `--criteria-results` are file-valued flags. Omission means the envelope field is absent; a value of `null` names a file and is not an absence sentinel.

No hash function, event envelope, verifier, actor record, or protocol rule changed.

## Verification

- `node --test --test-reporter=tap --test-name-pattern='CLI terminal append normalizes --next null before hashing and preserves next validation' tests/git-v0.test.mjs`: pass.
- `npm test -- --runInBand`: pass when run with the repository's required Docker access; 53 Git-v0 tests passed, including the new control, and the full non-database suite completed successfully.
- `npm run db:test`: pass; the canonical mutation harness reports `V1_TERMINAL_NEXT baseline=0 applied=t after=1 forbidden=t restored=0` and `D1 mutation harness: all controls discriminate (executed=148)`, up from the observed 147.
- `npm run proof:verify`: pass before the implementation event is appended, verifying 424 events across 77 threads and 3 actors.
