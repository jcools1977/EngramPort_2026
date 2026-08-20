# W1-7 D2 closure evidence

## Scope and preserved boundary

This revision implements only the live D2 evidence and mutation integration requested by handoff `01a02031-0f6d-7e99-ac2f-da4cc54f17d3`.

- `packages/git-adapter/src/d2-session-binding.mjs` is unchanged, SHA-256 `7df100e765092fd58d19baf983573aced3934c96e8b6259fb654259e58641455`.
- Migrations `0001` through `0011` are byte-identical. Their SHA-256 values remain `1ffe7e5f...`, `22a959fa...`, `6fe1bd0f...`, `f184ae7e...`, `58334599...`, `436ebe60...`, `22330dd9...`, `2fd9f037...`, `e26884d2...`, `ddb565c4...`, and `6e0f6510...` respectively.
- No historical artifact or accepted event was changed.
- Only synthetic principals and local PostgreSQL/Vault containers were used.

## Canonical runner position and fixture lifecycle

`scripts/run-db-tests` now reaches the D2 live fixture only after the accepted D1/D1F controls and before the mutation harness. Immediately before D2 it truncates `custody_audit`, `minted_references`, and `custody_rows`, refuses a collision with synthetic principal X, and creates X's exact one-hour synthetic authority. The fixture then runs and the runner deletes exactly that synthetic authority before entering the mutation harness.

Observed on the restored runner:

```text
PASS D1F overlapping concurrency exactly one winner (a=0 b=3), loser custody/reference/audit=0/0/0, winner=1/1/1
NOTICE: D1 behavioural guards OK
TRUNCATE TABLE
INSERT 0 1
...
DELETE 1
D1 mutation harness: all controls discriminate (executed=9)
```

An injected wrong-tenant assertion exited `db:test` 1 after all D1/D1F controls had run and at the first D2 property. The mutation harness did not run after the deliberate failure. The runner trap removed the database stack: containers/volumes/networks `0/0/0`. The assertion was restored before all final sweeps.

## Six live properties

The committed `tests/d2-live.test.mjs` ran seven Node tests (one parent plus six behavioral subtests), all passing with zero skips:

```text
D2_SUBSTITUTION minted_by=11000000-0000-0000-0000-000000000001 tenant=10000000-0000-0000-0000-000000000001
D2_JOINT_LEAK module_checkout="" local_only="" scrub_only="" both_missing=11000000-0000-0000-0000-000000000001
D2_ROLE_GUARD maintenance=accepted app=SESSION_ROLE_INVALID postgres=SESSION_ROLE_INVALID released=true
D2_DIRTY_SUCCESS destroyed_pid=554 fresh_pid=555 principal=""
D2_DIRTY_FAILURE destroyed_pid=556 fresh_pid=557 principal=""
D2_FAILED_RESIDUE custody=0 references=0 audit=0 clean_checkout=true
tests 7; pass 7; fail 0; skipped 0
```

The joint-leakage line is one control with two independent layers. Transaction-local binding alone leaves the next checkout empty. `DISCARD ALL` alone leaves it empty. Removing both exposes principal Y.

The successful and failed scrub-fault paths use a one-client pool and a real invalid `DISCARD` statement. `release(error)` destroys the dirty backend, demonstrated by a different backend PID and an empty principal on the next checkout. The failed mint returns `42501/NAMESPACE_REFUSED` and leaves custody/reference/audit residue `0/0/0`.

## Executable mutation evidence

`tests/failure/d2-mutations.txt` is read together with the existing D1 list. Each D2 sentinel selects an executable branch that copies the accepted module, requires its exact source mutation to apply once, runs the named live property, observes forbidden behavior, and reruns the accepted module. The harness-only `D2_CASE` selector prevents unrelated D2 properties from masking the property under mutation.

Observed matrix:

```text
D2_SUBSTITUTION baseline=0 applied=t after=1 forbidden=t restored=0
D2_JOINT_LEAK baseline=0 local_only=0 scrub_only=0 applied=t after=1 forbidden=t restored=0
D2_ROLE_GUARD baseline=0 applied=t after=1 forbidden=t restored=0
D2_DIRTY_RELEASE baseline=0 fault_only=0 fault_clean=t applied=t after=1 forbidden=t restored=0
D1 mutation harness: all controls discriminate (executed=9)
```

Forbidden outcomes were measured rather than inferred:

- substitution stored principal X and tenant B;
- joint removal exposed principal Y, while either layer alone remained clean;
- removing the role guard let `postgres` mint;
- a real scrub fault with `release(error)` produced a clean new backend, while weakening it to `release()` reused the backend with principal Y.

The no-op negative control was run separately and rejected false discrimination:

```text
NOOP baseline=0 applied=f after=0 restored=0
NOOP false discrimination correctly rejected
exit 1
```

## Final verification

- `npm test`: exit 0, 235 passed, 0 failed, 0 skipped.
- `npm run db:test`: exit 0; D2 7/7; mutation harness executed 9 genuine controls.
- `npm run kms:test`: exit 0, live Vault 1/1, 0 skipped; sanitized differential only.
- `npm run verify:all`: exit 0.
- `npm run lint`: exit 0.
- `npm run proof:verify`: exit 0, 167 events across 29 threads and 2 actors before publication.
- Direct mutation harness: exit 0; negative control: exit 1.
- Final task-owned containers, volumes, networks, scratch databases, and mutation copies: zero.

## Disposition

This result does not claim D3, W1-8, W3, AEGIS integration, or closure of A7, A8, or B5. It changes no accepted production adapter behavior. Review and any later closure remain with agent-a.
