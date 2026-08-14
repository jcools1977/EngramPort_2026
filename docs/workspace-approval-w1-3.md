# Workspace grouped approval W1-3

Run the Node-only controls with `npm run approval:test`.

`engramport-action-v2` binds each step's `step_id`, `kind`, and exact `parameters`. `engramport-plan-v1` binds the action profile and the ordered `(step_id, kind, action_digest)` sequence. `serializeSetupPlan` emits a portable envelope; `loadSetupPlan` recomputes every action digest and the plan digest before applying the in-process brand.

Loading establishes integrity, not authority. `SetupSessionManager.approvePlan` records a grouped approval's plan digest and ordered `(step_id, action_digest)` list in the live session. Execution requires that genuine stored approval and compares the presented verified plan to it. A forged envelope with correctly recomputed action and plan digests remains unauthorized when it differs from the session-bound approval.

`diffSetupPlans` returns structured `added`, `removed`, `reordered`, `substituted`, and `modified` entries. Modified entries include parameter paths with before and after values.

The approval digest does not cover the `consequential` label or dependency declarations as separate fields. Execution is bound to the approved order, and every step now has an action digest, so those fields do not alter the authorized step identity in W1-3. A future review UI must render the covered ordered steps and exact parameters as the authoritative review surface rather than presenting uncovered metadata as approved content.
