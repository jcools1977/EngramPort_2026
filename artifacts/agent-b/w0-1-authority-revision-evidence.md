# W0-1 authority-ceiling revision evidence

## Result

The three blocking cases are fixed without expanding into the two non-blocking findings.

- A non-expiring participant under a finite founder now refuses `GRANT_OUTLIVES_GRANTER`; both non-expiring is accepted.
- A non-expiring agent under a finite owner now refuses `AGENT_GRANT_EXCEEDS_OWNER`; an agent expiring at or before its owner is accepted.
- Founder authority is explicit through `founder.assignable_trust`. A founder authorized for `verified_human` may assign it to a human. Unauthorized/unsupported elevation refuses `SELF_ASSERTED_TRUST_REFUSED`; incompatible kind assignment refuses `TRUST_KIND_INCOMPATIBLE`; agents cannot receive `verified_human`; guests remain `untrusted_agent`.

Node version: `v26.5.0`.

Exact command:

```sh
npm run setup:test && npm run welcome:test && npm run proof
```

## Full test output

```text
> engramport@0.1.0 setup:test
> node --test tests/workspace-setup*.test.mjs

✔ finite founder refuses non-expiring participant; both non-expiring is positive
✔ finite owner refuses non-expiring agent; bounded agent is positive
✔ authorized founder assigns verified_human to human
✔ participant cannot claim trust founder cannot assign
✔ agent cannot receive verified_human even when founder can assign it
✔ unsupported trust elevation is refused
✔ guest trust remains untrusted_agent
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
ℹ tests 21
ℹ suites 0
ℹ pass 21
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 74.728166

> engramport@0.1.0 welcome:test
> node --test tests/welcome-package.test.mjs

ℹ tests 19
ℹ suites 0
ℹ pass 19
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 400.166792

> engramport@0.1.0 proof
> npm run proof:verify && npm run proof:test

✓ verified 16 events across 6 thread(s) and 2 actors
ℹ tests 11
ℹ suites 0
ℹ pass 11
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 160.25975
```

Targeted ESLint and `git diff --check` also pass.

## Manual compiler inspection

After the suites passed, the compiler was inspected directly:

1. `outlives(grant, granter)` treats a null grant expiry as infinite only when the granter is finite, and permits both-null.
2. Agent-owner scope/expiry validation precedes the generic founder-expiry check, preserving the specific agent error.
3. Founder `assignable_trust` authorization precedes participant-kind compatibility.
4. Compatibility is explicit: humans accept `verified_human` or `untrusted_agent`; agents accept `trusted_agent`, `untrusted_agent`, or `imported`; guests accept only `untrusted_agent`.
5. No compiler step generation, ordering, or digest code changed.

## Follow-up findings

- `schemas/workspace-setup-v0.schema.json` remains unused by runtime validation; the hand-rolled validator is currently normative and schema drift remains possible.
- `action_digest` remains bound only to `parameters`, not `{step_id, kind, parameters}`. The future approval layer must bind step identity explicitly until this is revised.
