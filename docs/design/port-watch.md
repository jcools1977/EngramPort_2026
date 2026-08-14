# Port Watch: opt-in supervisor design

Status: proposed
Owner: agent-a (architecture)
Date: 2026-08-14
Related: `docs/product/workspace-setup-wizard-prd.md`, `docs/adr/0012-workspace-setup-wizard.md`, `artifacts/agent-a/onboarding-welcome-protocol-design.md`

## 1. What it is

Port Watch is an **opt-in supervisor** that polls EngramPort on a configurable cadence, defaulting to four minutes, and wakes an agent only when authorized work is available for it. It is off by default and enabled per agent.

It decides **when** an agent runs. It never decides **what** the agent does.

## 2. Reconciliation with the specification

Specification section 2.3 states EngramPort v1 is not "an autonomous-agent framework." Port Watch walks up to that line, and the boundary must be stated precisely or it will be crossed by accident during implementation.

**Port Watch is a delivery supervisor, not an agent framework.** It consumes the subscription contract of section 4.4, assembles the context package of section 9.3 without modification, and invokes a runner. It composes no prompts of its own, issues no instructions, chooses no objectives, and adds no tool authority. Everything it hands a runner is either the specification's context package or the handoff's own typed payload. If an implementation finds itself writing prompt text inside Port Watch, it has crossed the line and the non-goal has been violated.

Two further reconciliations:

- Section 4.4 requires a pull cursor and supports webhooks in v1. Webhook-first with polling recovery is consistent, with polling as the correctness floor rather than an optimization.
- Section 16 fixes delivery semantics: at-least-once, HMAC-signed webhooks, retry at 10s, 1m, 5m, 30m, 2h, 12h, then dead letter. Port Watch inherits these rather than inventing its own.

## 3. The security thesis

The naive reading is that a supervisor which only reads is low risk. That is wrong, and it is the most important thing in this document.

**Port Watch converts "an attacker can append an event" into "an attacker can cause a model to run, unattended, on content they wrote."** Waking is cheap; acting is not. Section 14 says stored content is untrusted and cannot become instruction. Port Watch is the mechanism by which untrusted content most readily reaches a model with no human in the loop, at three in the morning, with nobody reading the output.

Three controls carry this, and none is optional:

**3.1 Authorization precedes wake.** The inbox delta that triggers a wake MUST be computed against authorized state, server-side. A client that fetches broadly and filters locally has already lost: an unauthorized event still caused a wake and still entered the process. This mirrors section 8's rule that authorization precedes retrieval, and it is the same failure mode one layer earlier.

**3.2 Waking grants nothing.** A woken agent holds exactly the scopes its actor already held. Port Watch has no authority to lend and MUST NOT hold a token more privileged than the agent it wakes. An unattended run is subject to the identical authorization checks as an interactive one.

**3.3 No model invocation when the inbox is unchanged.** This is stated in the direction as a cost control. It is also a security boundary: an attacker who cannot change the authorized inbox cannot cause an invocation. It must therefore be enforced structurally and proven by a negative control that asserts **zero** runner calls, not merely a low count.

## 4. Components

### 4.1 Durable per-agent cursors

One cursor per `(agent, project)`, persisted, advanced only after a run reaches a terminal state. Cursor advance and run completion are one transaction; a crash between them must re-deliver rather than skip. Delivery is at-least-once per section 4.4, so runners MUST deduplicate by event id. A cursor never moves backward except by explicit operator action, which is itself an audited event.

### 4.2 Webhook-first with polling recovery

Webhooks are the low-latency path; polling is the correctness floor. The poll cadence defaults to 240 seconds, is configurable per agent, and carries jitter so that many agents do not synchronize. Polling continues at a reduced cadence while webhooks are healthy, because a webhook path that is silently broken is indistinguishable from an empty inbox, and that failure mode is invisible precisely when it matters. Webhook signature verification failures are audited and never fall back to trusting the payload.

### 4.3 Atomic handoff claims and leases

Claims follow section 16 exactly: `UPDATE ... WHERE version = $expected AND status = 'open'`, so exactly one claimant wins and losers receive a typed conflict rather than a retry loop. A claim creates a **time-bounded lease** and does not mutate the creation event, per section 5.5.

Lease expiry returns a handoff to claimable. The crashed or slow runner MUST NOT be able to complete after its lease expired: completion carries a **fencing token** from the claim, and a stale token is refused. Without fencing, lease expiry creates two owners rather than one, which is worse than no lease at all. This is mandatory failure test 9 in section 22.2.

### 4.4 Bounded context construction

Port Watch requests the section 9.3 context package with its documented budget defaults and passes it through unmodified. It does not summarize, re-rank, or edit. Provenance labels and the safety content that section 9.3 forbids truncating survive to the runner intact.

### 4.5 Provider-specific runner adapters

Adapters for Claude Code, Codex, and a generic subprocess runner. An adapter receives a bounded context package and a scoped, short-lived token, and nothing else. Adapters MUST NOT be able to widen scope, and provider identity confers no privilege, per section 13. Adding an adapter is adding a way to start a process, never a way to gain a right.

### 4.6 Branch and worktree isolation

Each claimed handoff runs in its own git worktree on its own branch, so concurrent runners cannot collide in the filesystem. Worktrees are removed on completion or lease expiry. Consistent with ADR 0012, a runner MUST NOT push to a default branch. Isolation is structural, not a convention the runner is asked to honor.

### 4.7 Concurrency and retry controls

A global cap and a per-agent cap, both configurable. Retries use exponential backoff with full jitter and reuse the same idempotency key, per section 16, so a retry cannot double-append. A poisonous handoff that fails repeatedly is dead-lettered with an audited reason rather than retried forever.

### 4.8 Schedules and cost budgets

Schedules constrain when an agent may be woken, expressed in a named timezone. Budgets are per agent and per project, cover tokens and invocations, and are checked **before** invocation, not reconciled after. Exhaustion halts and emits an auditable event; it never silently degrades. A budget that is discovered to be exceeded only after the spend is an accounting record, not a control.

### 4.9 Human approval gates

Consequential actions by a woken agent require approval per section 6.3, bound to an action digest. **Port Watch MUST NOT grant approvals**, and self-approval by the supervisor is prohibited. An unattended agent awaiting approval **blocks**; it MUST NOT proceed on a default, a timeout, or an assumption. Approvals expire per section 6.3, so an approval that arrives after expiry does not resurrect the action.

### 4.10 Pause and emergency stop

Pause halts new wakes and lets in-flight runs finish. Emergency stop halts new wakes and terminates in-flight work.

The critical property: **stop MUST be effective without the running agent's cooperation.** A stop implemented as a flag the runner is expected to check fails exactly when the runner is the problem. Stop therefore revokes the run's lease and scoped token, so in-flight work fails at its next authorized call, and terminates the runner process and its worktree. Revocation latency equals the token lifetime and MUST be documented as such rather than described as instant, per the honesty rule in section 15.

Stop is available to any project maintainer and takes effect without a deploy.

### 4.11 Auditable progress and completion events

Every decision is an event: `watch.enabled`, `watch.polled`, `watch.skipped` with reason, `watch.woke`, `run.started`, `run.progress`, `run.completed`, `run.failed`, `run.lease_expired`, `budget.exhausted`, `watch.paused`, `watch.stopped`. `watch.skipped` matters most: the record that the supervisor looked and correctly did nothing is what distinguishes a healthy idle system from a broken one, and its absence is why silent supervisors are trusted for weeks before anyone notices they stopped.

Metrics per section 19: poll count, skip rate, wake count, time to claim, lease expiries, retries, dead letters, budget consumption, approval waits, and invocations avoided by the unchanged-inbox rule.

## 5. Explicit non-goals

- Port Watch does not compose prompts, choose objectives, or plan work.
- It does not grant, hold, or broker authority.
- It is not a job scheduler for arbitrary tasks; it wakes agents for EngramPort work.
- It does not merge, deploy, or push to default branches.
- It is not on by default, ever.

## 6. Bounded tasks

This plan is the single source of truth for Port Watch scope. Status and open findings are tracked in `docs/constraints.md`; that register does not restate this list.

- **PW1. Watch decision loop, durable cursors, and the unchanged-inbox guarantee.** Runnable now with stubbed adapters. **Complete and accepted 2026-08-14.** Delivered the decision core only; every item below remains outstanding.
- **PW2. Webhook receiver with signature verification and polling recovery**, including a silently broken webhook path detected by polling. Also owns the server-side authorized-inbox predicate that PW1's branded interface cannot itself guarantee.
- **PW3. Atomic claims, leases, and fencing tokens.** Blocked on a database host. Closes finding F5, the single-process-only store.
- **PW4. Runner adapters and worktree isolation**, including the no-default-branch-push control.
- **PW5. Concurrency, retry, dead-letter, schedules, and budgets.** Closes finding F4, the cursor advancing past failed work with no retry.
- **PW6. Approval gates and the blocking-not-defaulting behavior.**
- **PW7. Pause and emergency stop, with cooperation-free termination.**
- **PW8. Audit events, metrics, and the adversarial suite**: an attacker-appended event that must not cause a privileged action, and an unauthorized event that must not cause a wake.
