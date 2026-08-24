# W1-1 async migration finding: the permissive-manager expectation is 19 failures, not 18

Parent handoff: `01a035d5-bfc3-7e28-b163-12642ce7d43e`

This is a pre-implementation reading on ADR 0023's mandatory safeguard. No manager, test, script, mutation, migration, or accepted control changed.

## Finding

The accepted suites do contain **18 source lines** with `assert.throws`, but “source lines” are not executable control count:

- `tests/workspace-session.test.mjs` has 5 such lines containing 6 assertions.
- `tests/workspace-approval.test.mjs` has 13 such lines containing 14 assertions.
- The approval helper at line 19 contains one source assertion but expands into **five separately named tests** at lines 27–31.
- Session line 16 has two manager refusals in one test, and approval line 45 has two manager refusals in one test.
- Approval lines 42–44 are refusal controls for `loadSetupPlan` and deep immutability. They do not call `SetupSessionManager`, so a deliberately permissive manager cannot disarm them.

The executable accounting is therefore:

| Category | Runtime tests |
|---|---:|
| Manager-dependent refusal tests in `session:test` | 5 |
| Manager-dependent refusal tests in `approval:test` | 14 |
| Non-manager refusal tests in `approval:test` | 3 |
| Other positive controls | 15 |
| **Total** | **37** |

A manager with every refusal removed, while preserving successful returned values as ADR 0023 requires, must make **19 tests fail and 18 pass**. The three non-manager refusals must remain green; if they failed, the variant would be broader than a permissive manager and would no longer isolate the async manager migration.

## The 19 expected failures

Session controls:

1. `completion structurally removes identity, delegation, approval, and credential`
2. `expired session refuses approved execution and leaves no identity`
3. `torn-down session cannot authorize and replayed approval is refused`
4. `approval from session A cannot execute under session B`
5. `abandonment leaves no partial authority`

Approval controls:

6. `reordered steps are refused with paired genuine-plan control`
7. `inserted step is refused with paired genuine-plan control`
8. `removed step is refused with paired genuine-plan control`
9. `substituted step is refused with paired genuine-plan control`
10. `modified parameters are refused with paired genuine-plan control`
11. `forged but self-consistent plan is not authorized by a genuine approval`
12. `one consequential flag change is self-consistent but refused by genuine approval`
13. `all consequential flags changed is the refused F8 control`
14. `added dependency is self-consistent but refused by genuine approval`
15. `removed dependency is self-consistent but refused by genuine approval`
16. `wire dependency order is verified verbatim and never normalized`
17. `cross-plan approval is refused with paired approved-plan control`
18. `a future wire field is preserved, covered, diffed, and refused without an exclusion`
19. `hand-built step list is refused at approval and execution`

The three refusal tests that must remain green under a manager-only variant are:

- `v2 wire is refused with a specific profile error and differs from v3 plan identity`
- `tampered serialized plan is refused on load with paired round trip`
- `verified plan parameters are deeply immutable`

ADR 0023's stated expectation of exactly 18 failures comes from counting lines containing `assert.throws`; it both collapses the five generated refusal tests into one and includes three refusals outside the manager. Those effects do not cancel: the correct manager-dependent runtime count is 19.

## Decision required

The async migration itself can preserve every value and error code. The blocker is the mandatory evidence gate: implementing a variant engineered to produce 18 failures would require either leaving one manager refusal intact, merging accepted controls, or weakening a test so it passes permissively. Each would falsify the safeguard.

Correct ADR 0023 and the handoff expectation to **19 failures / 18 passes**, with the 19 names above, then the migration can proceed exactly as authorized. No broader permissive module graph is recommended: removing `loadSetupPlan` and immutability refusals would test unrelated W1-3 guards rather than whether async manager rejections are awaited.

## Evidence and scope

The unchanged baseline was run to verify executable totals:

- `npm run session:test`: exit 0; 12 tests, 12 pass, 0 fail/skipped.
- `npm run approval:test`: exit 0; 25 tests, 25 pass, 0 fail/skipped.
- Combined: 37 tests, all green.
- `npm run proof:verify`: exit 0 at 233 events across 31 threads before publication.

Files changed in this slice: this finding artifact and its event only. Accepted-control changes: none. New simulator: none. `executed=` remains quoted at 63. PostgreSQL/store convergence, the permissive variant, criterion 5's durable negatives, W3, OIDC, and AEGIS were not begun. C6 requirement 2's accepted closure is untouched.
