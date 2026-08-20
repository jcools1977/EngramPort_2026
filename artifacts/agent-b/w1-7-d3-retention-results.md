# W1-7 D3 durable retention results

## Scope

This bounded D3 slice converts retention evaluation for durable custody rows while preserving the existing synthetic `retentionDue` control. It adds `evaluateCustodyRetention(reference, session)` to the accepted principal-session boundary and forward-only migration `0013_d3_retention_evaluation.sql`. Migrations `0001` through `0012`, accepted D1/D1F/D2/D3/Vault controls, revision 8, production seeds, and historical artifacts are unchanged.

No canary, W1-8, W3, AEGIS, or A7/A8/B5 closure is claimed.

## Durable boundary

The caller supplies only a reference and verified session. Tenant, project, principal, policy, duration, and timestamps are not request fields. The Node method retains the D2 maintenance-role check, transaction-local principal binding, rollback, `DISCARD ALL`, and dirty-client destruction behavior.

The database function is `SECURITY DEFINER`, owned by `engram_migrator`, pinned to `search_path=public`, denied to PUBLIC and `engram_app`, and executable by `engram_maintenance`. It derives tenant/project through the authenticated principal, sets tenant context transaction-locally, reads the row's `retention_policy`, and evaluates against `clock_timestamp()`.

Clock derivation is database-resident:

- `RET-CONFIG-400`: `coalesce(rotated_at, issued_at)`;
- `RET-GRANT-400`: `terminal_at`; and
- `RET-AUDIT-400`: the successful mint audit's `accepted_at`.

Migration SHA-256: `195c1497927852c4ad60c1b092ca44fd8d5340c0c592423c2eb9014929a90c36`.

## Live PostgreSQL evidence

PostgreSQL 16.15 with pgvector 0.8.6 produced:

```text
W1_7_DURABLE_RETENTION config=false/true grant=false/true audit=false/true revoked_due=false revoked_clock=true unknown=null malformed=null foreign=null policy=RET-GRANT-400 rows=1/1/2 boundary=true
```

Each policy was measured both not due and due. The `RET-CONFIG-400` not-due case was issued 401 days ago but rotated 399 days ago, the disagreement window in which an issuance-clock defect would incorrectly report due. Moving the same row's rotation to 401 days made it due. `RET-GRANT-400` likewise remained not due with issuance 500 days old and terminal state 399 days old, then became due when the same policy's terminal state moved to 401 days. `RET-AUDIT-400` used the mint audit's accepted timestamp at 399 and 401 days.

The revoked-row check began with issuance 500 days old, then used the accepted database revocation path. The returned retention clock exactly matched the durable custody `revoked_at`, `terminal_at`, reference `revoked_at`, and revocation result timestamp, and remained not due. This proves the terminal clock came from durable revocation state rather than issuance.

Unknown, malformed, and genuinely foreign-tenant references all returned the same `null` result. The database emits one internal `RETENTION_UNRESOLVED` refusal across these paths, so neither grammar nor existence nor tenant membership is disclosed.

## Executable discrimination and carried evidence correction

The scratch harness executes fourteen controls, one more than the accepted thirteen:

```text
D3_RESOLUTION_ISOLATION baseline=0 rls_only=0 predicate_only=0 applied=t combined=1 forbidden=t restored=0
D3_RETENTION_CLOCK baseline=0 applied=t after=1 forbidden=t restored=0
D1 mutation harness: all controls discriminate (executed=14)
```

`D3_RETENTION_CLOCK` verifies and replaces only the stored function's `coalesce(rotated_at,issued_at)` branch with `issued_at`. The not-due rotated configuration then reports `config=true/true`, the live assertion fails, and rebuilding restores `false/true`. The source anchor and its removal are both checked before behavior is credited.

The accepted `D3_RESOLUTION_ISOLATION` mutation is unchanged. Its output now makes the two-layer structure explicit: opening RLS alone passes, weakening the function predicate alone passes, and weakening both exposes the foreign row and fails. It remains one combined control, not two.

The no-op negative control remains separate and exits 1. No tracked migration or production source is edited by mutation execution.

## Verification

- `npm test`: exit 0, 233 passed, 0 failed, 0 skipped; W1-7 without live configuration remains 3/3 synthetic controls.
- `npm run db:test`: exit 0; D2 live 7/7, W1-7 live 8/8, mutation harness `executed=14`.
- mutation harness negative control: exit 1 as required.
- `npm run kms:test`: exit 0, live Vault 1/1, 0 skipped.
- `npm run lint`: exit 0.
- `npm run verify:all`: exit 0 and independently repeated the complete Node/site, database, Vault, and lint graph.
- Proof before publication: 175 events across 29 threads and 2 actors.
- Task-owned containers, volumes, networks, scratch databases, mutation directories, and temporary files after normal and injected-failure runs: zero.

Only synthetic principals, references, locators, and local PostgreSQL/Vault containers were used.
