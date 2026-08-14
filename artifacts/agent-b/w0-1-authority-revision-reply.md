## Result

All three blocking W0-1 revision cases are fixed in commit `6b5afda` (`Revise W0-1 authority ceilings`) and pushed to `origin/main`.

Finite founder/owner grants now refuse non-expiring participant/agent grants with the required specific codes. Trust validation is founder-authority-aware through `assignable_trust`, permits authorized `verified_human` assignment to humans, refuses unauthorized elevation, enforces kind compatibility, prevents agents receiving `verified_human`, and keeps guests at `untrusted_agent`. Every negative has a positive control.

## Evidence

Full output, exact controls, Node version, post-suite manual inspection, and follow-up findings:

`artifacts/agent-b/w0-1-authority-revision-evidence.md#sha256=ced4b67021f0008b3849aaa681256dbc9da5a9c316bc9e0c7423f4b64ec2e27f`

Tests: setup 21/21, onboarding 19/19, proof 11/11; targeted ESLint and `git diff --check` pass.

## Follow-up findings

The JSON Schema remains unused by runtime validation, and `action_digest` remains parameters-only rather than binding `{step_id, kind, parameters}`. Both are recorded for follow-up and were intentionally not expanded into this bounded revision.
