# Project constraints register

Status: current
Date: 2026-08-14
Purpose: record standing constraints that shape sequencing, so they are decided once rather than rediscovered each session.

## C1. No Docker or PostgreSQL host is available to either agent

**Recorded:** 2026-08-14, confirmed independently by both actors.

Neither agent environment has `docker`, Docker Compose, PostgreSQL, or `psql`. agent-b confirmed this on thread `priority`; agent-a confirmed the same absence on this machine while reviewing migration `0001_canonical_core`.

**Consequences, all currently in force:**

- Migration `0001_canonical_core` has never been executed. Its isolation and immutability suites are unrun. Per this project's standard, unexecuted code is not evidence of a working control, so the v0.1 gate in specification section 27 is **not met**.
- The three code-level review findings on thread `v0.1-event-service` are editable without a host, but cannot be proven without one. They stay queued.
- Wizard phase W2, onboarding T2, and Re:PORT R3 onward are all blocked on the same host.

**Unblocking this is the highest-leverage action available to the project.** One Docker-capable host closes the v0.1 gate and unblocks three separate workstreams at once. It requires operator-provided infrastructure or authority; neither agent can obtain it.

**Working rule while C1 holds:** prefer tasks provable on Node alone. Do not stack further unproven database work on unproven database work.

## C2. Work-in-progress limit of one

**Recorded:** 2026-08-14, proposed by agent-b on thread `priority` and adopted.

agent-b holds **one** active implementation item at a time. Further items may sit visible in the inbox as a queue, but are not claimed or started until the active item is returned and independently reviewed.

Current state as of 2026-08-14T13:35Z: **W0-1 is closed and accepted.** **PW1 is the sole eligible implementation item.** The three executable v0.1 code findings are queued behind PW1; their live run stays blocked by C1. Re:PORT R1 and onboarding T1.5 are specified and undispatched.

The coordinator's obligation under this rule is to keep the queue ordered and to say plainly which single item is eligible, rather than appending work and letting priority be inferred from arrival order.

## C3. Approval digests must bind the step list, not a summary

**Recorded:** 2026-08-14, raised by agent-b as a W0-1 design finding, promoted to a constraint on ADR 0012 decision 5.

ADR 0012 chose coarse approval grouping over per-step approval, arguing that thirty approvals train a founder to approve without reading. That argument holds **only** if the group approval binds the ordered `(step_id, action_digest)` list and surfaces per-step parameter diffs. A digest taken over a prose summary of a plan would conceal material change while appearing to satisfy specification section 6.3, which would convert a real control into a comfortable one.

This is now binding on wizard phase W1 and is not an open question.

## C4. Re:PORT is specified and undispatched

**Recorded:** 2026-08-14, operator instruction.

The Re:PORT design is complete and committed. No R-task may be handed to agent-b until the queue above clears and capacity is confirmed. R1 is fully specified so that dispatch requires no further design work.

**No Re:PORT feasibility or cost finding exists.** agent-b stated on thread `priority` that it has not inspected the Re:PORT design, because R1 is not dispatched and it will not work from repository design artifacts alone. That is correct behavior under C2 and should not be mistaken for a finding. Any future Re:PORT cost consideration must originate from agent-b reviewing bound inputs under an eligible handoff.

---

# Open follow-up findings

Findings that are real, accepted as non-blocking, and deliberately not fixed in the task that surfaced them. Each names the task that must close it, so it cannot be lost by being merely mentioned once.

## F1. The workspace-setup JSON Schema is not used at runtime

**Raised:** W0-1 review, 2026-08-14. **Confirmed by:** agent-a and agent-b independently. **Closes in:** wizard phase W1.

`schemas/workspace-setup-v0.schema.json` is referenced by no code path. The shipped validation is the hand-rolled `validateSetup` in `packages/git-adapter/src/workspace-setup.mjs`. The two can drift and nothing will fail.

Partially mitigated, and worth recording so the mitigation is not mistaken for a fix: the kind-compatibility table is a genuine second gate. A founder who lists a trust value the schema enum would have rejected, such as `superuser`, in `assignable_trust` still has that participant refused with `TRUST_KIND_INCOMPATIBLE`. Verified by probe. So the unwired schema is a drift risk rather than an open hole today.

**To close:** either validate against the schema at runtime, or state in the file that the hand-rolled validator is normative and the schema is documentation. The current ambiguity is the defect.

## F2. `action_digest` does not bind `step_id` or `kind`

**Raised:** W0-1 review, 2026-08-14. **Related:** C3. **Closes in:** wizard phase W1, alongside grouped approval.

`action_digest` is computed over step `parameters` only. Two steps with identical parameters would carry identical digests, so a digest alone does not say which step an approval authorizes.

Not exploitable in the current step set, since each consequential step's parameters differ in practice, and step digests are correctly isolated: changing one participant leaves every other step's digest untouched, verified by probe. It becomes load-bearing the moment grouped approval exists, which is exactly what C3 constrains.

**To close:** digest `{step_id, kind, parameters}` rather than `parameters`, and have grouped approval bind the ordered `(step_id, action_digest)` list with per-step parameter diffs.

## F3. `founder.assignable_trust` is a breaking change to the setup document format

**Raised:** W0-1 revision review, 2026-08-14. **Closes in:** no action required before W1.

The authority-ceiling fix made `founder.assignable_trust` a required field. Any `workspace.setup.yaml` written against the earlier shape now fails validation. Correct and acceptable at v0 pre-release, recorded so it is not rediscovered as a surprise once documents exist in the wild. A `schema_version` bump is required if the format changes again after first external use.

## F4. A failed run advances the cursor past its work, with no retry or dead letter

**Raised:** PW1 review, 2026-08-14, by agent-a probe. **Closes in:** PW5.

`complete(status:"failed")` advances the cursor by `Math.max(cursor, run.project_seq)`, identically to `status:"completed"`. The failed work is therefore never re-delivered.

This is consistent with the letter of the PW1 criterion, since `run.failed` is a terminal state, and the failure is recorded rather than silent: a `run.failed` event is emitted and a `{run_id, event_id, status}` entry is appended to `completions`. It is nonetheless a gap between recorded and retried. Port Watch design section 4.7 places retry, backoff, and dead-lettering in PW5, so nothing is lost provided PW5 consumes those completion records.

**To close:** PW5 must retry failed runs with backoff and dead-letter the poisonous ones, using the recorded `completions` entries. Until then, a failed run is skipped permanently.

Distinct from a crash: a crash before durable completion correctly leaves the cursor unmoved and re-delivers. Verified by probe.

## F5. `FileWatchStore` serializes within one process only

**Raised:** PW1 review, 2026-08-14, by agent-a probe. **Closes in:** PW3.

`FileWatchStore.transaction` serializes through a per-instance `this.pending` promise chain. Two `PortWatch` instances sharing one store file do not serialize against each other. Probed directly: two instances ticking concurrently on the same file both woke on the same handoff, producing two owners of one unit of work.

**This is deferred scope, not a defect in PW1.** The handoff placed real claims, leases, and fencing in PW3, and `docs/port-watch-pw1.md` states the same. Within a single process, WIP=1 and single-claim both hold correctly, verified by probe.

It is recorded loudly because the store *looks* durable and atomic. It writes to a temp file and renames, which is exactly the shape that invites someone to point two supervisors at one file and assume it holds.

**To close:** PW3 supplies database-backed atomic claims with fencing tokens. Until then, `FileWatchStore` should refuse or detect concurrent writers rather than silently interleaving.

---

# Milestone register

## Port Watch milestone: remaining work after PW1

**Recorded:** 2026-08-14, on acceptance of PW1.

No artifact in this repository is named `M1`; the operator's reference to "M1's remaining work" is recorded here against the Port Watch milestone, which is the only milestone PW1 belongs to. If `M1` denotes something else, this entry should be renamed rather than duplicated.

PW1 delivered the decision core only. Accepting it does **not** mean any of the following exists:

| Remaining | Task | Note |
|---|---|---|
| Server-side authorized inbox predicate | PW2, PW3 | PW1's branded interface prevents local filtering but cannot prove a future server truthfully applies authorization. agent-b stated this; it is correct. |
| Webhook receipt and signature verification | PW2 | Polling recovery exists only as a decision function today |
| Database-backed atomic claims, lease expiry scheduling, fencing tokens | PW3 | See F5 |
| Real provider adapters, worktree and branch isolation, no-default-branch-push control | PW4 | Adapters are recording stubs |
| Concurrency caps, retry, backoff, dead letter, schedules, budgets | PW5 | See F4 |
| Approval gates, blocking rather than defaulting | PW6 | |
| Cooperation-free termination and documented revocation latency | PW7 | PW1 models lease revocation in state only; no process is terminated because none is started |
| Metrics and the adversarial suite | PW8 | |
