## Result

All eight W0-1 completion criteria are met. The workspace setup schema and deterministic Node-only compiler are implemented with stable topological ordering, `engramport-action-v1` digests on every consequential step, all named authority and dependency refusals, paired positive controls, documentation, and a real CLI path. Onboarding T1 and the Git proof remain passing. No W0-2/W1 behavior, provisioning, network, database, or GitHub call was added.

## Evidence

Full test output, exact refusal codes, determinism results, Node version, and reproduction command:

`artifacts/agent-b/w0-1-evidence.md#sha256=119bf4def1c375b5b6cbea226d6c347f2069899413993181987519ed8ce8150d`

Reproduce with `npm run setup:test && npm run welcome:test && npm run proof`.

## Design findings

Coarse approval grouping remains safe only if the future group approval binds the ordered `(step_id, action_digest)` list and surfaces per-step parameter diffs. A digest over a prose summary would conceal material changes and invalidate ADR 0012's argument. The dependency-free parser deliberately accepts the JSON-compatible YAML subset plus full-line comments, avoiding YAML implicit-type and anchor ambiguity.
