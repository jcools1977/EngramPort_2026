# W0-1 workspace setup compiler evidence

## Result

All completion criteria are met. The implementation adds the strict workspace setup schema, JSON-compatible YAML parser, deterministic compiler, stable dependency ordering, `engramport-action-v1` action digests, authority ceilings, guest/agent constraints, GitHub permission refusals, CLI command, documentation, and paired controls.

Node version: `v26.5.0`.

Exact reproduction command:

```sh
npm run setup:test && npm run welcome:test && npm run proof
```

No dependency, network access, database access, provisioning, executor, or secret was added.

## Full output

```text
> engramport@0.1.0 setup:test
> node --test tests/workspace-setup.test.mjs

✔ schema rejects unknown fields with positive control
✔ cyclic dependencies refused
✔ unsatisfiable dependency refused
✔ scope exceeding founder refused
✔ grant outliving founder refused
✔ guest defaults enforced
✔ agent scope exceeding owner refused
✔ agent expiry exceeding owner refused
✔ unapproved GitHub permission refused
✔ merge permission refused
✔ self-asserted elevated trust refused
✔ dependency order is stable and consequential digests are complete
✔ comments and key order do not affect digests; material parameters do
✔ CLI compiles JSON-compatible workspace.setup.yaml
ℹ tests 14
ℹ suites 0
ℹ pass 14
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 71.778

> engramport@0.1.0 welcome:test
> node --test tests/welcome-package.test.mjs

ℹ tests 19
ℹ suites 0
ℹ pass 19
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 370.556875

> engramport@0.1.0 proof
> npm run proof:verify && npm run proof:test

✓ verified 12 events across 6 thread(s) and 2 actors
ℹ tests 11
ℹ suites 0
ℹ pass 11
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 146.60175
```

The changed JavaScript files pass targeted ESLint, both JSON schemas parse, and `git diff --check` passes.

## Named refusals and positive controls

Every refusal test first compiles the corrected baseline successfully, then asserts the exact error code:

- cycle → `CYCLIC_DEPENDENCY`
- unknown dependency → `UNSATISFIABLE_DEPENDENCY`
- founder scope ceiling → `SCOPE_EXCEEDS_FOUNDER`
- founder expiry ceiling → `GRANT_OUTLIVES_GRANTER`
- guest one-project/untrusted/14-day ceiling → `GUEST_GRANT_EXCEEDS_DEFAULTS`
- agent scope and expiry ceiling → `AGENT_GRANT_EXCEEDS_OWNER`
- GitHub permissions outside the ADR set, including merge/default write → `GITHUB_PERMISSION_REFUSED`
- participant-asserted elevated trust → `SELF_ASSERTED_TRUST_REFUSED`
- unknown schema field → `SETUP_SCHEMA_UNKNOWN_FIELD`

Determinism controls prove byte-equal step lists across repeated compilation, changed top-level key order, and changed full-line comments. Changing the repository name changes only the repository step action digest.

## Design findings

Coarse approval grouping does not inherently hide material changes because each consequential step retains its own action digest. The future approval layer must bind the ordered list of `(step_id, action_digest)` pairs, present per-step parameter diffs when that group digest changes, and invalidate the entire approval on any pair change. Binding only a coarse prose summary would trade away the control described by ADR 0012.

The no-dependency constraint led v0 to define `workspace.setup.yaml` as JSON-compatible YAML plus full-line comments. This is deterministic and valid YAML, but intentionally excludes YAML anchors, implicit typing, and other parser-dependent features.
