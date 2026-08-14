# Port Watch: canonical document manifest

Author: agent-a (Claude Architect)
Date: 2026-08-14

Binds the Port Watch design to a digest so an event can reference it verifiably. The canonical document lives in `docs/` per specification section 25; the Git v0 verifier hash-binds only paths under `artifacts/`, so this manifest carries the digest. Verify with `shasum -a 256 <path>`.

| Document | Path | SHA-256 |
|---|---|---|
| Port Watch design | `docs/design/port-watch.md` | `8bd8be8f97fc3d80ddc0c3986adfaf142523ba2c3d9ea0aacfadca206d3fa8bf` |
| Wizard plan, amended with phase W10 | `docs/plan/workspace-setup-wizard-plan.md` | `31059efce92a2dad3e5b3bb96b2a113311c4a2e9339cc8084f5fe61069b03707` |

## Reconciliation summary

Specification section 2.3 states EngramPort v1 is not "an autonomous-agent framework." Port Watch approaches that boundary, so the design fixes it explicitly: Port Watch decides **when** an agent runs and never **what** it does. It consumes the section 4.4 subscription contract, passes the section 9.3 context package through unmodified, and composes no prompt text of its own. An implementation writing prompt text inside Port Watch has violated the non-goal.

Delivery semantics are inherited from section 16 rather than reinvented: at-least-once, HMAC-signed webhooks, the fixed retry ladder, and version-checked claims where exactly one claimant wins.

## The security thesis

A supervisor that only reads looks low risk. That reading is wrong and it is the core of this design.

Port Watch converts "an attacker can append an event" into "an attacker can cause a model to run, unattended, on content they wrote." Three controls carry the boundary and none is optional:

1. **Authorization precedes wake.** The inbox delta MUST be computed server-side against authorized state. Client-side filtering means an unauthorized event already caused a wake. This is section 8's authorization-before-retrieval rule, one layer earlier.
2. **Waking grants nothing.** A woken agent holds exactly its actor's existing scopes. Port Watch holds no token more privileged than the agent it wakes.
3. **No invocation on an unchanged inbox.** Stated in the direction as a cost control, it is also the boundary that stops an attacker who cannot change the authorized inbox from causing any invocation. Proven by a control asserting zero runner calls.

## Design points that are decisions, not details

- **Fencing tokens on lease expiry.** Without them, an expired lease produces two owners rather than one, which is worse than no lease. Mandatory failure test 9 in section 22.2.
- **Polling continues while webhooks are healthy.** A silently broken webhook path is indistinguishable from an empty inbox, and that failure is invisible exactly when it matters.
- **Budgets are checked before invocation.** A budget discovered to be exceeded after the spend is an accounting record, not a control.
- **Approval blocks, never defaults.** An unattended agent awaiting approval must stop, not proceed on a timeout.
- **Emergency stop must not require the runner's cooperation.** A stop implemented as a flag the runner checks fails exactly when the runner is the problem. Stop revokes lease and token; revocation latency equals token lifetime and must be documented as such.
- **`watch.skipped` is emitted on every idle poll.** The record that the supervisor looked and correctly did nothing is what separates a healthy idle system from a dead one.
