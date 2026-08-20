# W1-7 D3 durable resolution and revocation results

## Scope

This bounded D3 slice adds the production `resolveCustodyReference` and `revokeCustodyReference` Node boundaries to the accepted principal-session adapter and a forward-only migration, `0012_d3_resolve_revoke.sql`. It does not convert retention or canary evidence and does not claim A7, A8, or B5 closed.

Migrations `0001` through `0011`, the accepted mint method, revision 8, production M13 seeds, and historical artifacts remain unchanged.

## Durable boundary

The Node methods accept only a reference and a verified session. Tenant, project, principal, namespace authority, and custody state cannot be supplied by the caller. Both methods retain the D2 role check, transaction-local principal binding, `DISCARD ALL`, and dirty-client destruction behavior.

Migration `0012` adds:

- a `revoked_at` state to `minted_references` so the row and reference have independently observable invalidation state;
- forced-RLS-compatible update policies scoped to the derived tenant;
- `SECURITY DEFINER`, `search_path=public` resolve/revoke functions owned by `engram_migrator` and executable only by `engram_maintenance`;
- maintenance-role denial for direct updates to both revocation columns; and
- irreversible revocation triggers that reject any attempt to clear or alter an existing revocation timestamp.

The migration SHA-256 is `b05b65a08a9901db2f0143c9ca43c218e276ba117a18ccf7307bd45b58dd034f`.

## Live PostgreSQL evidence

PostgreSQL 16.15 with pgvector 0.8.6 produced:

```text
W1_7_DURABLE_RESOLVE live=resolved unknown=null malformed=null foreign=null revoked=null
W1_7_DURABLE_REVOKE fault=D3_FAULT_AFTER_CUSTODY_REVOKE failure=0/0/0 custody=<database timestamp> reference=<same database timestamp> audit=1 resolve=null repeat=REFERENCE_UNRESOLVED irreversible=REVOCATION_IRREVERSIBLE clock=true boundary=true
```

Resolution returns the live row only for the authenticated principal's derived tenant and project. Unknown, malformed, foreign-tenant, and revoked inputs all return the same `null` result. The database function uses the same internal `REFERENCE_UNRESOLVED` refusal for every condition, so neither the Node result nor the database error distinguishes existence, grammar, tenancy, or revocation.

Revocation uses one `clock_timestamp()` value for the custody row, reference row, and success audit record. The value was between database-clock observations immediately before and after the call. Resolution failed immediately after revocation, a repeated revoke returned `REFERENCE_UNRESOLVED`, and a superuser attempt to clear the timestamp was rejected as `REVOCATION_IRREVERSIBLE`.

The injected `after_custody_revoke` failure occurs after the custody-row update and before reference invalidation. PostgreSQL rolled the transaction back without a `SAVEPOINT`: custody revoked state, reference revoked state, and revoke-audit count remained `0/0/0`. The test seam is read only when `session_user='engram_maintenance'` and unknown stages fail closed.

The live boundary assertion verified both functions are security definers owned by `engram_migrator`, pinned to `search_path=public`, denied to PUBLIC and `engram_app`, granted to `engram_maintenance`, backed by forced RLS, and protected from direct maintenance writes to revocation fields.

## Executable discrimination

The canonical scratch harness now executes thirteen controls: the previous eleven plus two in this slice.

```text
D3_RESOLUTION_ISOLATION baseline=0 applied=t after=1 forbidden=t restored=0
D3_REVOCATION_ATOMICITY baseline=0 applied=t after=1 forbidden=t restored=0
D1 mutation harness: all controls discriminate (executed=13)
```

- The isolation mutation verifies and then weakens both custody/reference read policies plus the function's tenant/project predicate. A tenant-B principal then resolves tenant A's reference (`foreign=resolved`). Rebuilding the scratch database restores `foreign=null`.
- The revocation mutation verifies and then removes only the reference-row update from the scratch function. Revoke reports success with custody and audit state changed but the reference timestamp absent (`clock=false`). Rebuilding restores one identical database timestamp across all three records.

The no-op negative control remains separate and exits 1. Every mutation checks its catalog/source anchor before trusting behavior; neither mutation edits a tracked migration or production module.

## Verification

- `npm test`: exit 0, 233 passed, 0 failed, 0 skipped; W1-7's no-database portion remains 3/3 synthetic controls.
- `npm run db:test`: exit 0; live W1-7 7/7, D2 7/7, mutation harness `executed=13`.
- mutation harness negative control: exit 1 as required.
- `npm run kms:test`: exit 0, live Vault 1/1, 0 skipped.
- `npm run lint`: exit 0.
- `npm run verify:all`: exit 0.
- Proof before publication: 173 events across 29 threads and 2 actors.
- Task-owned containers, volumes, networks, scratch databases, mutation directories, and temporary files after normal and injected-failure runs: zero.

Only synthetic principals, references, locators, and local containers were used. No retention conversion, canary work, W1-8, W3, AEGIS integration, or A7/A8/B5 closure is claimed.
