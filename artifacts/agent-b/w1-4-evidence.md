# W1-4 evidence: action-v3 full reviewable-record coverage

Scope is canonical W1-4 only. W1-2, UI work, onboarding, Re:PORT, Port Watch, database and migration work, and all queued items are untouched.

## Environment and reproduction

- Node: `v26.5.0`
- Focused: `npm run approval:test`
- Full: `npm run setup:test && npm run dry-run:test && npm run session:test && npm run watch:test && npm run welcome:test && npm run db:static-test && npm run proof`
- Static: `npx eslint packages/git-adapter/src/workspace-setup.mjs packages/git-adapter/src/workspace-approval.mjs tests/workspace-setup.test.mjs tests/workspace-approval.test.mjs && git diff --check`

No dependency, network, database, or secret is used.

## Focused output

```text
approval:test
ok digests and portable plan identity survive serialization and another process
ok compiled serialized reloaded plan executes under its genuine grouped approval
ok grouped approval authorizes all five steps in approved order
ok diffing a plan against itself is empty
ok source dependency order is normalized only during compilation
ok reordered steps are refused with paired genuine-plan control
ok inserted step is refused with paired genuine-plan control
ok removed step is refused with paired genuine-plan control
ok substituted step is refused with paired genuine-plan control
ok modified parameters are refused with paired genuine-plan control
ok forged but self-consistent plan is not authorized by a genuine approval
ok one consequential flag change is self-consistent but refused by genuine approval
ok all consequential flags changed is the refused F8 control
ok added dependency is self-consistent but refused by genuine approval
ok removed dependency is self-consistent but refused by genuine approval
ok wire dependency order is verified verbatim and never normalized
ok cross-plan approval is refused with paired approved-plan control
ok action v3 digest preserves step id and kind coverage
ok action v3 coverage is deny-by-default with only its self digest excluded
ok a future wire field is preserved, covered, diffed, and refused without an exclusion
ok v2 wire is refused with a specific profile error and differs from v3 plan identity
ok tampered serialized plan is refused on load with paired round trip
ok verified plan parameters are deeply immutable
ok hand-built step list is refused at approval and execution
ok structured diff reports all classes, covered fields, and parameter paths
tests 25; pass 25; fail 0
```

## Adversarial controls and rejection anchors

Every altered-plan control except the intentionally invalid tampered-wire loader control is rebuilt with new action-v3 digests, a new plan-v1 digest, and passed through `loadSetupPlan`. Thus every altered plan is internally valid before execution and only the genuine session-held approval rejects it.

| Control | Internally loads | Execution/load refusal | Paired positive |
|---|---:|---|---|
| one `consequential` flip | yes | `PLAN_STEP_MODIFIED` | genuine plan executes five steps |
| every `consequential` flip (F8) | yes | `PLAN_STEP_MODIFIED` | genuine plan executes five steps |
| dependency added | yes | `PLAN_STEP_MODIFIED` | genuine plan executes five steps |
| dependency removed | yes | `PLAN_STEP_MODIFIED` | genuine plan executes five steps |
| wire dependencies reordered | yes, preserved verbatim | `PLAN_STEP_MODIFIED` | approved dependency order executes |
| steps reordered | yes | `PLAN_STEPS_REORDERED` | genuine plan executes five steps |
| step inserted | yes | `PLAN_STEP_INSERTED` | genuine plan executes five steps |
| step removed | yes | `PLAN_STEP_REMOVED` | genuine plan executes five steps |
| step substituted | yes | `PLAN_STEP_SUBSTITUTED` | genuine plan executes five steps |
| parameter modified | yes | `PLAN_STEP_MODIFIED` | genuine plan executes five steps |
| forged self-consistent plan | yes | `PLAN_STEP_MODIFIED` | genuine plan executes five steps |
| cross-plan approval | yes | `PLAN_STEP_MODIFIED` | approval's own plan executes |
| future step field added | yes, field preserved | `PLAN_STEP_MODIFIED` | unchanged plan executes |
| v2 profile wire | v2 digests are self-consistent | `ACTION_PROFILE_UNSUPPORTED` | v3 wire loads |
| byte-tampered wire without recomputation | no, deliberately | `ACTION_DIGEST_MISMATCH` | unchanged wire loads |
| raw hand-built list | not branded | `UNCOMPILED_PLAN_REFUSED` | compiled plan approves/executes |

## Normalize-at-compile / verify-verbatim evidence

Two setup sources with `welcome.depends_on` in opposite orders compile to identical sorted `depends_on`, identical action digests, and identical plan digests. Separately, a wire with the same dependencies reversed is hashed in that exact order, loads with that exact order preserved, and is refused against the approval. `brandPlan` clones the complete wire step verbatim; it does not spread, sort, default, or coerce `depends_on`.

## Structured diff examples

```json
{
  "step_id": "participant.agent",
  "fields": [
    {"field": "consequential", "before": true, "after": false}
  ],
  "parameters": []
}
```

```json
{
  "step_id": "welcome.defaults",
  "fields": [
    {
      "field": "depends_on",
      "before": ["participant.agent"],
      "after": ["participant.agent", "repository.connect"]
    }
  ],
  "parameters": []
}
```

The W1-3 parameter detail remains:

```json
{"path":"owner","before":"acme","after":"mallory"}
```

## Fixture digest changes and causes

No literal SHA-256 expected constants existed in the tests. The exhaustive expectation changes are:

1. Compiler and CLI profile assertions change from `engramport-action-v2` to `engramport-action-v3`.
2. Every action digest changes because `consequential` and the exact stored `depends_on` array are newly covered. Empty dependency arrays still change the covered canonical object because the field itself is now present.
3. Every plan digest changes because plan-v1 binds both the action-profile name and every changed action digest. Plan-v1's own covered field list is unchanged, so its name remains v1.
4. Source dependency reorderings do not change compiled fixture digests because compilation deliberately sorts them before action-v3 hashing. Wire dependency reorderings do change action and plan digests because loading verifies exact array order.

Exact v2 -> v3 values for the five-step acceptance fixture:

```text
participant.agent   4e783381e7dfc0790ea9a8648db829885d86515e6de2db0bdf0359739499fce3 -> 8e6d50bdd05c515257482c335280a2852ce086ad602dd36291c569c0766d5540  caused by consequential=true, depends_on=[]
repository.connect  63388f5930b19366cde8a19534a07b832721cbbea6f2f00c288dda70f811ce4f -> a1a6c004caa0105571bce3e4548210325816d203b65ee5ad0308459df57c244c  caused by consequential=true, depends_on=[]
database.configure  9fffaf9f3dba8cd88c1384595aed836540af4bdf8fc5184ec9b726ba1ac021e1 -> 0e65ef5060f83bb6758c3488144d5b1b9ac79da319592a17be38abfdaf4c7edf  caused by consequential=true, depends_on=["repository.connect"]
history.import       7aea1fcd9022612a0d4c4cff95f4b4e1cef2ee04cb6ebbf6ffa1ba0e6f7ccf0f -> b917d68c69c7ea71881f318186852669fe99b4aeeacd612a20a24e3a3f1478ea  caused by consequential=true, depends_on=["repository.connect"]
welcome.defaults     ed95208849ef1986c78e6b01eab96933b140012005b6c07cf5e80bc1c4c2145a -> bdd5759ef76739a57aa627ad99fa37b57894d3ad9abbe32558d12f706ad4b93a  caused by consequential=true, depends_on=["participant.agent"]
plan_digest          918105133bbdc208faa907e7038f723c8a60532c20184a836c936974a6d26cec -> a795f51bdf6c919c556ef55742f9843833d78f30ec196a877101b2d29023af40  caused by action profile v3 plus all five changed action digests
```

## Full suite results

```text
approval:test    tests 25; pass 25; fail 0
setup:test       tests 22; pass 22; fail 0
dry-run:test     tests 6;  pass 6;  fail 0
session:test     tests 12; pass 12; fail 0
watch:test       tests 16; pass 16; fail 0
welcome:test     tests 19; pass 19; fail 0
db:static-test   tests 6;  pass 6;  fail 0
proof:verify     verified 36 events across 12 threads and 2 actors
proof:test       tests 11; pass 11; fail 0
targeted ESLint  pass
git diff --check pass
```

## Design findings

Deny-by-default holds for the JSON step-record model, not merely today's five fields. `actionDigest` enumerates all own enumerable wire fields and removes only names owned by the frozen `ACTION_DIGEST_EXCLUSIONS` registry. Tests prove an ordinary future field and a prototype-named field both change the digest; a future field survives loading, appears in the structured diff, and is refused against the old approval. Only `action_digest` is excluded, with its self-reference justification.

JSON cannot carry symbol or non-enumerable properties, so those cannot enter the serialized reviewable record. The envelope's self-digests are necessarily outside their own covered bytes. In the approval record, `approval_id` is the session-store lookup key; `session_id`, `plan_digest`, and the ordered steps are compared against that stored record. They are authorization-bound by genuine session state rather than by the action digest. No current enumerable step field sits outside action-v3 coverage.
