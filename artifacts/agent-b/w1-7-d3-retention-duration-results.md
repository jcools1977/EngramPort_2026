# W1-7 D3 retention policy-duration results

## Scope

This bounded slice derives durable retention duration from the custody row's policy. It adds one forward-only migration, `0014_d3_retention_policies.sql`, and changes only the live retention fixture, database runner, and mutation registry/harness needed to prove the mapping. Migrations `0001` through `0013`, accepted D1/D1F/D2/D3/Vault controls, revision 8, production seeds, historical artifacts, and the synthetic `retentionDue` control are unchanged.

No canary, signing-demo, AEGIS, W1-8, W3, or A7/A8/B5 closure is claimed.

## Migration-owned policy mapping

`custody_retention_policies` holds all six section 3.0 policies as migration-owned trusted data:

| Policy | Duration | Durable clock source |
|---|---:|---|
| `RET-SESSION` | 1 day | `session_start`, explicitly not on `custody_rows` |
| `RET-OPS-90` | 90 days | `terminal_at` |
| `RET-AUDIT-400` | 400 days | successful mint `custody_audit.accepted_at` |
| `RET-GRANT-400` | 400 days | `terminal_at` |
| `RET-CONFIG-400` | 400 days | `coalesce(rotated_at, issued_at)` |
| `RET-VERIFY-104` | 104 days | `expires_at` |

The mapping forces RLS, grants no writes to `engram_app` or `engram_maintenance`, and is referenced by a new custody-row foreign key. The database function joins the mapping and evaluates `clock_timestamp() - clock_start >= duration`; duration is no longer an inline constant. The accepted CONFIG, GRANT, and AUDIT clock selections are unchanged. OPS and VERIFY add the two durable custody-row clock selections requested by the handoff.

All six policy names and durations are now storage-valid and foreign-key enforced. An unknown policy cannot be stored, so the old unsupported-policy branch is unreachable. `RET-SESSION` is mapped but deliberately evaluates to the same non-disclosing `RETENTION_UNRESOLVED`, because section 3.0 explicitly places session start outside `custody_rows`; inventing a custody timestamp would be false evidence.

Migration SHA-256: `a498bde593bb6976bc575f184b110d69e40c47c51db33c78fa06b8d9fb3f48db`.

## Live PostgreSQL evidence

PostgreSQL 16.15 with pgvector 0.8.6 produced:

```text
W1_7_DURABLE_RETENTION config=false/true grant=false/true audit=false/true ops=false/true verify=false/true session=null durations=6 trusted=true revoked_due=false revoked_clock=true unknown=null malformed=null foreign=null policy=RET-GRANT-400 rows=1/1/2 boundary=true
```

The fixture asserts the exact six-row mapping, exact duration seconds and clock-source labels, forced RLS, and denial of app/maintenance writes. The accepted three 400-day clock controls still pass. `RET-OPS-90` is not due at terminal minus 89 days and due at terminal minus 91 days. This is the load-bearing disagreement window: the derived 90-day duration says due while the former 400-day constant says not due. `RET-VERIFY-104` is likewise not due at expiry minus 103 days and due at expiry minus 105 days. The OPS result reports duration 7,776,000 seconds from `terminal_at`; VERIFY reports 8,985,600 seconds from `expires_at`.

The accepted revoked-state, tenant isolation, unknown/malformed non-disclosure, per-table state, and function boundary checks remain green.

## Executable discrimination

The scratch harness executes fifteen controls:

```text
D3_RETENTION_DURATION baseline=0 applied=t after=1 forbidden=t restored=0
D1 mutation harness: all controls discriminate (executed=15)
```

The new mutation verifies and replaces only `evaluated-clock_start>=retention_window` in the stored function with the former 400-day constant. The accepted OPS row changes from `false/true` to `false/false`, the live assertion fails, and a scratch rebuild restores `false/true`. Both presence of the mutation marker and absence of the derived-duration anchor are checked before behavior is credited.

The no-op negative remains a separate invocation and exits 1.

## Verification

- `npm test`: exit 0; every reported suite passes with zero skips, including synthetic W1-7 3/3.
- `npm run db:test`: exit 0; D2 live 7/7, W1-7 live 8/8, mutation harness `executed=15`.
- mutation harness negative control: exit 1 as required.
- `npm run kms:test`: exit 0; live Vault 1/1, 0 skipped.
- `npm run lint`: exit 0.
- `npm run verify:all`: exit 0 and repeats the complete Node/site, database, Vault, and lint graph.
- Proof before publication: 177 events across 29 threads and 2 actors.
- Task-owned containers, volumes, networks, scratch databases, mutation directories, and temporary files after normal and negative runs: zero.

Only synthetic principals, references, locators, and local containers were used.
