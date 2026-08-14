# Workspace grouped approval W1-3

Run the Node-only controls with `npm run approval:test`.

`engramport-action-v3` binds the entire reviewable step record, including `step_id`, `kind`, exact `parameters`, `consequential`, and `depends_on` in stored order. Coverage is deny-by-default: the action digest hashes every enumerable step field except entries in `ACTION_DIGEST_EXCLUSIONS`. That exclusion registry is the only legitimate location for an uncovered step field and currently contains only `action_digest`, with the reason that a digest cannot cover itself. A future field is covered automatically unless a deliberate, justified exclusion is added there.

`engramport-plan-v1` binds the action profile and the ordered `(step_id, kind, action_digest)` sequence. `serializeSetupPlan` emits a portable envelope; `loadSetupPlan` recomputes every action digest over the wire representation verbatim and then the plan digest before applying the in-process brand. Compilation sorts dependencies; loading never sorts, defaults, coerces, or otherwise normalizes covered fields.

Loading establishes integrity, not authority. `SetupSessionManager.approvePlan` records a grouped approval's plan digest and ordered `(step_id, action_digest)` list in the live session. Execution requires that genuine stored approval and compares the presented verified plan to it. A forged envelope with correctly recomputed action and plan digests remains unauthorized when it differs from the session-bound approval.

`diffSetupPlans` returns structured `added`, `removed`, `reordered`, `substituted`, and `modified` entries. Modified entries include parameter paths with before and after values.

Every field presented to a founder as authorization-relevant must be digest-bound. Action-v3 covers the complete current step record except its digest. Approval-record authority additionally depends on the server/session-held approval ID and session binding; those are not step fields and are validated against stored state rather than folded into the action digest. This document defines the review contract only; it does not implement a UI.
