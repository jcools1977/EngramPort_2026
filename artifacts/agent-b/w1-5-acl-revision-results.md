# W1-5 bounded ACL revision evidence

Implementation commit: `f8a8b86c0174338125adc54ffe32ba9ee8c946f3`

## ACL and pause boundary

The migration now explicitly executes:

```sql
REVOKE EXECUTE ON FUNCTION resolve_founder_authority(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION bootstrap_workspace(uuid, uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION resolve_founder_authority(uuid), bootstrap_workspace(uuid, uuid, uuid, text, text) TO engram_maintenance;
```

The live controls read `pg_proc.proacl` and use `aclexplode` plus `has_function_privilege`, not migration text. Both functions have no grantee-0 EXECUTE ACL; `has_function_privilege('engram_app', ...)` is false for both and true for `engram_maintenance`.

Direct `engram_app` calls to both functions fail with SQLSTATE `42501` before the SECURITY DEFINER body runs. The maintenance role resolves authority and bootstraps successfully. A discrimination control temporarily restores PUBLIC EXECUTE and demonstrates the app resolver succeeds, proving the negative is caused by the revoke rather than an unrelated guard.

`app.test_bootstrap_pause` remains in the function only when `session_user = 'engram_maintenance'`; `engram_app` cannot execute the function or cause the pause. The bounded revision did not authorize redesign beyond that role boundary.

## Preserved controls

Database-clock expiry, valid-authority positive control, production overlapping race, weakened-schema two-winner discrimination, complete residue inventory, and all F16 controls remain passing. The production race runs as `engram_maintenance` so the pause is available only to the intended role.

Database totals:

- isolation 11/11
- app grants 14/14
- constraints 9/9
- F16 discrimination 21/21
- bootstrap, expiry, ACL, denial, and positive controls 12/12
- production race/residue 2/2
- weakened-barrier discrimination 1/1
- `npm run db:test`: exit 0

Server-read versions: PostgreSQL 16.15, pgvector 0.8.6, pgcrypto 1.3. Migration checksum: `1ffe7e5ffa65d231c7f7ebe16f645246f4f2912de9c473f4cf408723e57f9539`.

Regression totals remain: proof 33/33, report 54/54, R2 8/8, welcome 19/19, setup 22/22, watch 16/16, session 12/12, approval 25/25, dry-run 6/6, DB static 6/6, dispatch 6/6, lint exit 0.

A3–A9 remain absent and W3-1 remains ineligible. A1, A2, F12, and F13 remain open pending independent acceptance. Scope was limited to function ACLs, pause role gating, and live controls. W1-6, W1-7, W2-1, onboarding T2, Re:PORT R3, Port Watch, providers, credentials, publishing, and parked records were untouched. Docker cleanup left no containers or persistent volumes; only default networks remain. The unrelated PNG remains untouched and untracked.
