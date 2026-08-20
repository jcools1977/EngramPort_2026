# W1-7 D3 durable custody conversion results

## Scope

This bounded D3 slice removes the in-memory `AtomicCustodyStore` and converts exactly the atomic-mint and authorization controls in `tests/wizard-w1-7.test.mjs` to the accepted durable PostgreSQL datastore through the unchanged `PrincipalSessionBinding`.

The five W1-7 controls now divide as follows:

- **durable:** atomic custody/canonical UUIDv7 mint; namespace and authorization refusals;
- **synthetic:** Vault boundary validation; retention clock starts; Vault-token detector coverage.

No canary or retention fixture was converted. No migration, accepted D2 session binding, M13 production seed, historical artifact, or revision-8 binding changed. A7, A8, and B5 remain open.

## Durable observations

The local PostgreSQL 16.15 / pgvector 0.8.6 run produced:

```text
W1_7_DURABLE_ATOMIC custody=1 references=1 audit=1 canonical=true
W1_7_DURABLE_AUTH MINT_AUTHORITY_REFUSED=MINT_AUTHORITY_REFUSED NAMESPACE_REFUSED=NAMESPACE_REFUSED SCOPE_EXCEEDED=SCOPE_EXCEEDED MODEL_DERIVATION_REFUSED=MODEL_DERIVATION_REFUSED CLASS_GATE_NOT_PASSED=CLASS_GATE_NOT_PASSED
```

The positive mint used authenticated principal Y, derived its tenant/project through the accepted database boundary, returned a canonical `epr:credential:<uuidv7>` reference whose timestamp decoded inside the observed database-call window, and committed exactly one linked custody row, minted reference, and success audit row.

The negative matrix used durable authority and the accepted 0005-0010 enforcement:

| Attempt | Durable result |
|---|---|
| principal X after its temporary D2 authority was removed | `MINT_AUTHORITY_REFUSED` |
| shape namespace for custody-bearing class 3.12 | `NAMESPACE_REFUSED` |
| class 3.5 without its required scope | `SCOPE_EXCEEDED` |
| class 3.3 requested as Model A | `MODEL_DERIVATION_REFUSED` |
| class 3.2 without a passed revision-8 class gate | `CLASS_GATE_NOT_PASSED` |

Every refusal carried SQLSTATE `42501`; the five failed attempts left custody/reference/audit counts at `0/0/0`. There is no caller-supplied `{authorized:true}` or equivalent.

## Executable source-copy discrimination

The accepted D1/D1F/D2 source-copy harness now executes eleven controls: the prior nine plus two D3 controls.

```text
D3_ATOMIC_ROWS baseline=0 applied=t after=1 forbidden=t restored=0
D3_AUTH_REFUSALS baseline=0 applied=t after=1 forbidden=t restored=0
D1 mutation harness: all controls discriminate (executed=11)
```

- `D3_ATOMIC_ROWS` changes the copied adapter's exact `COMMIT` to `ROLLBACK`; the returned UUID remains canonical but the forbidden observation is `custody=0 references=0 audit=0`, and restoring the accepted adapter returns all three rows.
- `D3_AUTH_REFUSALS` changes the copied adapter's exact refusal propagation into a fabricated accepted reference; the missing-authority case becomes `MINT_AUTHORITY_REFUSED=accepted`, and restoring the accepted adapter restores all five named refusals.

The harness verifies each anchor was changed before trusting the outcome. Its no-op negative control remains non-discriminating and exits 1.

An earlier candidate mutation that deleted the audit row after mint was rejected and receives no credit: under forced RLS the maintenance-role deletion affected zero rows, so the mutation was void.

## Preservation

- `AtomicCustodyStore` and its import surface are absent from tracked packages, tests, and scripts.
- Migrations `0001` through `0011` retain their accepted SHA-256 digests; the accepted D2 session binding remains `7df100e765092fd58d19baf983573aced3934c96e8b6259fb654259e58641455`.
- `PrincipalSessionBinding`, its endpoint, SCRAM credentials, timeouts, and behavior are unchanged.
- Production M13 seeds and historical bound artifacts are unchanged.
- Only synthetic locators and fixed synthetic principals were used.

## Verification

- `npm test`: exit 0, 233 passed, 0 failed, 0 skipped. Its W1-7 portion is the three synthetic controls because no live database is provisioned in that command.
- `npm run w1-7:test`: exit 0, 3 synthetic controls passed, 0 skipped.
- local `npm run db:test`: exit 0; live W1-7 is 5/5, 0 skipped; D2 is 7/7; mutation harness reports `executed=11`.
- `npm run kms:test`: exit 0, live Vault differential 1/1, 0 skipped.
- `npm run lint`: exit 0.
- `npm run verify:all`: exit 0.
- Proof before publication: 171 events across 29 threads and 2 actors.
- Task-owned containers, volumes, networks, scratch databases, and temporary mutation copies after success and injected failure: zero.

No claim is made for canary conversion, retention conversion, D3 completion, W1-8, W3, AEGIS integration, or closure of A7, A8, or B5.
