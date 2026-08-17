# W1-5 final bounded residue correction

## Scope and implementation

Implementation commit: `4683345`.

Only `tests/bootstrap/bootstrap.sql` changed. The temporary PUBLIC EXECUTE discrimination is now enclosed by one `BEGIN`/`ROLLBACK`; no success, failure, or early-exit path can commit that grant. After rollback, the test performs live catalog/privilege assertions and direct app calls.

## Evidence

- Clean live PostgreSQL suite: 2 consecutive runs, both exit 0.
- PostgreSQL: 16.15 (aarch64-unknown-linux-gnu).
- pgvector: 0.8.6.
- Migration checksum: `1ffe7e5ffa65d231c7f7ebe16f645246f4f2912de9c473f4cf408723e57f9539`.
- F16 suite: 21/21 discrimination controls; isolation 11/11; app grants 14/14; constraints 9/9.
- Bootstrap/W1-5 controls: 16/16, including transactional ACL discrimination, final live ACL state, and two post-rollback denials.
- Production concurrent bootstrap: exactly one winner (`a=0 b=3`); complete loser residue inventory passed.
- Weakened-barrier discrimination: two winners.
- Existing regressions: proof 33/33, Re:PORT R1 54/54, R2 8/8, welcome 19/19, setup 22/22, Port Watch 16/16, session 12/12, approval 25/25, dry-run 6/6, DB static 6/6, dispatch 6/6, lint passed.

## ACL and transaction proof

The exact function signatures were granted to PUBLIC only inside the discrimination transaction. The in-transaction positive proved `engram_app` could invoke the resolver. The transaction then rolled back.

Final live state, read from `pg_proc.proacl`/`aclexplode` and `has_function_privilege`:

- `resolve_founder_authority(uuid)`: PUBLIC EXECUTE absent; `engram_app` EXECUTE false; `engram_maintenance` EXECUTE true.
- `bootstrap_workspace(uuid,uuid,uuid,text,text)`: PUBLIC EXECUTE absent; `engram_app` EXECUTE false; `engram_maintenance` EXECUTE true.

After rollback, direct calls as `engram_app` to both functions failed with SQLSTATE `42501` before the SECURITY DEFINER body. Maintenance positive resolver and bootstrap controls remained successful. Transaction discipline was one BEGIN + one ROLLBACK around the temporary mutation, with zero committed PUBLIC grants.

## Scope statement

Production ACL migration, database-clock expiry, valid-authority positive control, session-user maintenance-only pause gate, genuine one-winner race, weakened-barrier discrimination, complete denial/loser-residue assertions, and all F16 controls are unchanged and passing. W1-5, A1, A2, F12, and F13 remain open pending independent acceptance; A3–A9 remain absent and W3-1 remains ineligible. No other work was touched or dispatched.

Docker cleanup completed after both runs: no containers, volumes, or project networks remained (only default `bridge`, `host`, and `none` networks). Worktree is synchronized except the pre-existing unrelated untracked `ONE PROJECT WHOLE FLEET.png`.
