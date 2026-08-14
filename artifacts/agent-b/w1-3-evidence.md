# W1-3 evidence: grouped approval and portable plan identity

Scope: canonical W1-3 only. No W1-2, real execution, provider, network, database, migration, Port Watch, Re:PORT, onboarding, or queued work was touched.

## Environment and reproduction

- Node: `v26.5.0`
- Focused: `npm run approval:test`
- Full: `npm run setup:test && npm run dry-run:test && npm run session:test && npm run watch:test && npm run welcome:test && npm run db:static-test && npm run proof`
- Static: `npx eslint packages/git-adapter/src/cli.mjs packages/git-adapter/src/workspace-setup.mjs packages/git-adapter/src/workspace-approval.mjs packages/git-adapter/src/workspace-session.mjs packages/git-adapter/src/workspace-dry-run.mjs tests/workspace-setup.test.mjs tests/workspace-dry-run.test.mjs tests/workspace-session.test.mjs tests/workspace-approval.test.mjs && git diff --check`

No dependency, network, database, or secret is used. Credential text is explicitly `fixture-only-founder-credential`.

## Focused output

```text
approval:test
ok digests and portable plan identity survive serialization and another process
ok compiled serialized reloaded plan executes under its genuine grouped approval
ok grouped approval authorizes all five steps in approved order
ok diffing a plan against itself is empty
ok reordered steps are refused with paired genuine-plan control
ok inserted step is refused with paired genuine-plan control
ok removed step is refused with paired genuine-plan control
ok substituted step is refused with paired genuine-plan control
ok modified parameters are refused with paired genuine-plan control
ok forged but self-consistent plan is not authorized by a genuine approval
ok cross-plan approval is refused with paired approved-plan control
ok action v2 digest binds step id and kind
ok tampered serialized plan is refused on load with paired round trip
ok verified plan parameters are deeply immutable
ok hand-built step list is refused at approval and execution
ok structured diff reports all classes and parameter paths
tests 16; pass 16; fail 0
```

## Adversarial controls and named errors

| Control | Refusal | Paired positive |
|---|---|---|
| reordered steps | `PLAN_STEPS_REORDERED` | genuine five-step plan authorizes all steps |
| inserted step | `PLAN_STEP_INSERTED` | genuine five-step plan authorizes all steps |
| removed step | `PLAN_STEP_REMOVED` | genuine five-step plan authorizes all steps |
| substituted step | `PLAN_STEP_SUBSTITUTED` | genuine five-step plan authorizes all steps |
| modified parameter | `PLAN_STEP_MODIFIED` | unchanged exact parameters authorize |
| forged, self-consistent plan | `PLAN_STEP_MODIFIED` | forgery successfully loads first; genuine approved plan executes |
| cross-plan approval | `PLAN_STEP_MODIFIED` | approval with its own plan executes |
| tampered serialization | `ACTION_DIGEST_MISMATCH` | unchanged serialization reloads |
| raw hand-built list at approval/execution | `UNCOMPILED_PLAN_REFUSED` | compiled plan approves and executes |
| identical parameters, different id/kind | digests assert unequal | identical id/kind/parameters asserts equal |

The headline forgery recomputes both its matching action digest and its matching plan digest and passes `loadSetupPlan`. Execution still refuses it because its plan digest differs from the genuine approval stored in the live session. Self-consistency is therefore never the authorization anchor.

## Example structured diff

```json
{
  "added": [{"step_id":"fixture.added","index":1}],
  "removed": [{"step_id":"repository.connect","index":1}],
  "reordered": [{"step_id":"repository.connect","approved_index":1,"presented_index":0}],
  "substituted": [{"index":1,"approved_step_id":"repository.connect","presented_step_id":"fixture.substituted"}],
  "modified": [{
    "step_id":"repository.connect",
    "kind_before":"repository.connect",
    "kind_after":"repository.connect",
    "parameters":[{"path":"owner","before":"acme","after":"mallory"}]
  }]
}
```

Each array is produced independently for the corresponding presented variant; diffing a plan with itself returns five empty arrays.

## Digest changes

There were no literal expected SHA-256 fixture constants in the repository. The changed test expectations are exhaustive:

1. `ACTION_PROFILE`: `engramport-action-v1` -> `engramport-action-v2` in the compiler and CLI assertions, because the covered value changes from `parameters` to `{step_id, kind, parameters}`.
2. The W0 compiler test formerly expected no digest on the non-consequential group step; every ordered step now has an action digest so the plan identity binds its exact parameters.
3. The W0-2 transcript test formerly expected no digest on a non-consequential step; it now expects every transcript step's digest to equal its compiled step digest.
4. `PLAN_PROFILE=engramport-plan-v1` and `plan_digest` are new expectations, covering the action profile and ordered `(step_id, kind, action_digest)` sequence.

For the exact five-step W1-3 fixture, the prior parameters-only digest and new action-v2 digest are:

```text
participant.agent   af85bf3cd7f610b8e5be9773d3e6e13f4716863d2496a4bc79c3f82f916fac1c -> 4e783381e7dfc0790ea9a8648db829885d86515e6de2db0bdf0359739499fce3
repository.connect  890a5bd016c27932e4e1460f9d88316bddd872b5de207f58ba054064a386aeaf -> 63388f5930b19366cde8a19534a07b832721cbbea6f2f00c288dda70f811ce4f
database.configure  913e7db6ad51a51478364bd77287192149e1b5f30094cf60a7ad7fb8a4dd5311 -> 9fffaf9f3dba8cd88c1384595aed836540af4bdf8fc5184ec9b726ba1ac021e1
history.import       a4d21e907d6e740818e34238760d0bdfe0cd2ca326bba3b72e64ae180b68be29 -> 7aea1fcd9022612a0d4c4cff95f4b4e1cef2ee04cb6ebbf6ffa1ba0e6f7ccf0f
welcome.defaults     0ab9a38c7b09ff43d866a81868b34f6484eda9da285df11b1e1098a44e6cb6c4 -> ed95208849ef1986c78e6b01eab96933b140012005b6c07cf5e80bc1c4c2145a
plan_digest (new)    918105133bbdc208faa907e7038f723c8a60532c20184a836c936974a6d26cec
```

All v1 action digest bytes necessarily change, even when parameters do not, because step identity is now inside the canonicalized covered value.

## Full suite output

```text
approval:test    tests 16; pass 16; fail 0
setup:test       tests 22; pass 22; fail 0
dry-run:test     tests 6;  pass 6;  fail 0
session:test     tests 12; pass 12; fail 0
watch:test       tests 16; pass 16; fail 0
welcome:test     tests 19; pass 19; fail 0
db:static-test   tests 6;  pass 6;  fail 0
proof:verify     verified 33 events across 11 threads and 2 actors
proof:test       tests 11; pass 11; fail 0
targeted ESLint  pass
git diff --check pass
```

## Manual inspection and design findings

Binding the approval to the plan digest and ordered step/action sequence is sufficient for the covered execution identity only because execution also resolves the approval ID in the live session, verifies the presented approval against that stored record, verifies the presented plan brand, compares its plan digest, and matches the requested step at its approved position. Compiled and loaded plan parameters are deeply frozen, closing post-verification nested mutation.

The founder must actually read the ordered step identity and exact parameters that are covered. `consequential` labels and dependency declarations are not separately included in action-v2 or plan-v1; approved order captures their execution consequence, and every step is now digest-bound, but those metadata fields must not be represented by a future review UI as independently approved content. If they become execution-bearing inputs, the hash profiles must be revised before use.
