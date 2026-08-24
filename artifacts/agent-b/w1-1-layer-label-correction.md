# W1-1 two-layer label correction

Parent handoff: `01a03557-3c83-78d1-aa47-376228b56d61`

## Bounded change

Only `scripts/run-d1-mutation-harness` changed. The W1-1 non-setup control now follows the established convention that an `*_only` label names the layer removed:

- `boundary_only=` is the run with the creation-boundary guard removed, leaving the table constraint.
- `table_only=` is the run with the table constraint removed, leaving the creation-boundary guard.

The measurement sequence is unchanged. The assertions were renamed with their values: removing only the boundary guard still fails the named-outcome fixture (`boundary_only=1`), removing only the table constraint still leaves the named boundary refusal (`table_only=0`), and removing both still lands the forbidden row (`combined=1`, `forbidden=t`).

```text
W1_1_SETUP_NONSETUP baseline=0 boundary_only=1 table_only=0 applied=t combined=1 forbidden=t restored=0
D1 mutation harness: all controls discriminate (executed=55)
```

An audit of every new `*_only` label found no other inversion. `D2_JOINT_LEAK` (`local_only`, `scrub_only`), `D3_A8_M3_MEMBERSHIP_AMBIGUITY` (`derivation_only`, `context_only`), and `D3_RESOLUTION_ISOLATION` (`rls_only`, `predicate_only`) all name the layer removed.

No migration, production function, fixture, refusal, mutation anchor, seed, prior artifact, prior event, `actor_delegations`, or `agent_sessions` changed. The count remains 55 because this is a label correction to one accepted two-layer control, not a new control.

## Verification

- `npm run db:test`: exit 0; 83 existing SQL controls; D2 7/7, W1-7 13/13, D4 4/4, W1-8 positive/creation/G1-G14, W1-1 1/1; mutation harness 55/55.
- `bash scripts/run-d1-mutation-harness --negative`: expected exit 1; `NOOP baseline=0 applied=f after=0 restored=0`, false discrimination rejected.
- `npm test`: exit 0; 235 passed, 0 skipped.
- `npm run kms:test`: exit 0; live Vault differential 1/1 and nonexportability check passed.
- `npm run lint`: exit 0.
- `git diff --check`: exit 0 before publication.
- Cleanup: W1-7 measured container/volume/temp-path deltas `0/0/0`; final residue was 0 compose containers, 0 compose volumes, and 0 mutation temp paths.

## Disposition held

Nothing closes: not C17, criterion 1, or criterion 4. The trusted-session and external-authentication precondition remains on A6, A7, and A8. Teardown, expiry sweep, OIDC, W3, and AEGIS remain untouched. Threat-model revision 8 is unchanged and row 3.16 remains carried under F18.
