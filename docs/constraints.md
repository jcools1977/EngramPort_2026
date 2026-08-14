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

**Required environment, exactly:** PostgreSQL **16** with the **pgvector** extension, reachable by `scripts/run-db-tests`. The local stack in `deploy/docker-compose.yml` targets `pgvector/pgvector:pg16`. Any host providing that combination clears this constraint; nothing less does, since the migration declares `create extension vector` and the suites assert extension version output.

**Failure signature when absent:** `npm run db:test` exits **127** at `docker: command not found`, before any database interaction. That is the environmental signature. A run that fails later, or that reports results without a live server, is not this constraint and must be investigated rather than attributed to it.

**Unblocking this is the highest-leverage action available to the project.** One Docker-capable host closes the v0.1 gate and unblocks three separate workstreams at once. It requires operator-provided infrastructure or authority; neither agent can obtain it.

**Working rule while C1 holds:** prefer tasks provable on Node alone. Do not stack further unproven database work on unproven database work.

## C2. Work-in-progress limit of one

**Recorded:** 2026-08-14, proposed by agent-b on thread `priority` and adopted.

agent-b holds **one** active implementation item at a time. Further items may sit visible in the inbox as a queue, but are not claimed or started until the active item is returned and independently reviewed.

Current state as of 2026-08-14T15:50Z: W0-1, W0-2, PW1, W1-1 and W1-3 are closed and accepted. C3, F2 and F7 are closed. **No implementation item is currently eligible; the WIP slot is free.** W1-2 is assigned to agent-a. Open: F8. Undispatched: Re:PORT R1, onboarding T1.5, PW2 onward. Blocked by C1: B1's live verification and v0.1 findings two and three.

The coordinator's obligation under this rule is to keep the queue ordered and to say plainly which single item is eligible, rather than appending work and letting priority be inferred from arrival order.

## C3. Approval digests must bind the step list, not a summary

**CLOSED 2026-08-14 by W1-3.** Grouped approval now records the `plan_digest` and the ordered `(step_id, action_digest)` list, and execution verifies the presented plan against the session-stored approval. Verified by probe. Retained for the reasoning.

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

**CLOSED 2026-08-14 by W1-3.** `engramport-action-v2` covers `step_id`, `kind` and `parameters`. Verified by probe: identical parameters under a different `step_id` or `kind` now produce different digests.

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

## F6. The static grant harness misses plausible regressions

**Raised:** app-role grant review, 2026-08-14, by agent-a probe. **Closes in:** whenever the grants are next touched, and no later than the section 8.1 append-transaction task.

`tests/app-role-grants-static.test.mjs` guards the corrected grants with regexes over the migration text. It catches the exact regression it was written against. Probed against plausible variants, it misses three:

| Future statement | Caught |
|---|---|
| `GRANT SELECT, INSERT ON ALL TABLES ... TO engram_app` | yes, the original regression |
| `GRANT ALL ON ALL TABLES ... TO engram_app` | **no** |
| `GRANT INSERT ON ALL TABLES ... TO engram_app` | **no** |
| `GRANT INSERT ON actor_delegations TO engram_app` | yes |
| `GRANT UPDATE ON projects TO engram_app` | **no** |

The last is the one that matters. Constraint C5 records that the append transaction will need `projects.next_seq`, so `GRANT UPDATE ON projects TO engram_app` is the single most likely future regression, and it is exactly what this guard does not see.

Not blocking: the delivered grants are correct today, and the live controls in `tests/failure/app-role-grants.sql` would catch any of these once C1 clears. But a guard that passes while missing the likeliest regression is the shape of check this project has agreed is worthless.

**To close:** assert on the privilege set rather than on statement wording. A deny-by-default check that enumerates every `engram_app` grant and fails on anything outside the expected set is both shorter and complete.

## F7. A compiled plan's identity is object identity, so it cannot cross a process boundary

**CLOSED 2026-08-14 by W1-3.** `engramport-plan-v1` gives a plan a content-derived `plan_digest`; `serializeSetupPlan` and `loadSetupPlan` round-trip it with full recomputation. Verified by probe: a reloaded plan executes against an approval issued before serialization.

**Raised:** W0-2 review, 2026-08-14, by agent-a probe. **Related:** C3, F2. **Closes in:** wizard phase W1.

`compileSetup` brands its output by adding the returned array to a module-private `WeakSet`, and `executeDryRun` refuses anything unbranded. This is a strong compiler-bypass gate and it works: a hand-built step list is refused, and so is a structurally identical one.

The consequence, verified by probe: `JSON.parse(JSON.stringify(plan))` is refused with `UNCOMPILED_PLAN_REFUSED`. A plan cannot be compiled, written down, reviewed, and then executed later or elsewhere. Plan identity lives in object identity, which does not survive serialization, a process restart, or an approval that happens between the two.

That is correct and sufficient for W0-2, where compile and dry run are one in-process call. It is insufficient for W1, whose whole shape is compile, present for human approval, then execute, with a boundary in the middle by design.

**To close:** the durable equivalent of the brand is a digest over the ordered plan, verified on load, not object identity. C3 already requires the grouped approval to bind the ordered `(step_id, action_digest)` list, and F2 already requires each digest to bind `step_id` and `kind`. Taken together those three give a plan a portable identity, and the approval becomes the brand. Solve them as one piece of work rather than three.

## F8. Step metadata a founder reads is not covered by the approval

**Raised:** W1-3, disclosed by agent-b, confirmed concretely by agent-a probe, 2026-08-14. **Closes in:** before any review UI ships, and no later than W4.

`engramport-action-v2` covers `step_id`, `kind` and `parameters`. It does **not** cover `consequential` or `depends_on`.

Demonstrated: taking an approved plan, flipping every step's `consequential` from `true` to `false`, and changing nothing else leaves every action digest and the `plan_digest` unchanged, and the modified plan executes as `authorized`. A founder who approved a plan presenting four consequential steps can have a plan executed that presents zero.

**Currently inert.** `consequential` drives only the dry-run transcript label and nothing execution-bearing. `depends_on` determines compiled order, and order *is* covered by `plan_digest`, so a dependency change that alters ordering is caught; one that does not alter ordering has no execution consequence today.

**Why it still matters.** `consequential` is precisely the field a review surface would render as "these are the dangerous ones." ADR 0012 decision 5 rests on a founder reviewing a grouped plan; a label inside that review which the approval does not bind is a gap between what was read and what was authorized. That is the same class of defect as approving a prose summary, which C3 exists to forbid.

**Requirements until closed:**

1. A review UI MUST NOT present `consequential`, `depends_on`, or any other uncovered field as approved content.
2. If either field becomes execution-bearing, the action profile MUST be revised to cover it, with a version bump per specification section 5.2.
3. The safest close is to widen `engramport-action-v3` to cover the whole step record, so the covered surface and the reviewable surface are the same set by construction rather than by discipline.

---

# Blocked work

Work whose implementation is complete and reviewed, but whose verification cannot run. Listed separately from findings, because a finding is something to fix and this is something to run.

## B1. v0.1 finding one, application-role grants

**Static portion accepted:** 2026-08-14. **Live verification:** `UNVERIFIED — ENVIRONMENT_UNAVAILABLE`. **Blocked by:** C1.

`migrations/0001_canonical_core.sql` now grants `engram_app` explicit `SELECT` on the ten policy and trigger tables and `INSERT` only on `events` and `event_recipients`. Identity and authorization writes belong to `engram_maintenance`. Reviewed by inspection and by a six-test static harness. New migration checksum `e6fac07bc56f3e6b5b14143af153b22cb5636fa0360686dbc6948c842c3ee63a`.

**The parent finding is open, not closed.** No PostgreSQL statement in this change has ever executed. The controls in `tests/failure/app-role-grants.sql` assert SQLSTATE `42501` per table with positive controls and are wired into `scripts/run-db-tests`, ready to run unmodified.

**To close:** run `npm run db:test` on PostgreSQL 16 + pgvector and confirm every control passes, including the positive path proving the reduced grant did not break the append. Only then may this finding be described as closed. Findings two and three, the `TRUNCATE` guard and the delegation-trigger comment, remain queued and unstarted.

---

# Task status

## Port Watch

The Port Watch task plan is `docs/design/port-watch.md` section 6, PW1 through PW8. **That document is the single source of truth for what remains.** This register records status and findings only, and deliberately does not restate the plan.

**PW1 is complete and accepted**, 2026-08-14. It delivered the decision core only: the wake or skip decision, durable per-agent cursors, opt-in with pause and stop state, WIP=1, and a recording adapter stub. Accepting PW1 does not mean any later PW item exists. PW2 through PW8 remain as written in the design document, unchanged and unrenamed.

Open findings assigned into that plan: **F4 closes in PW5**, **F5 closes in PW3**.

## On "M1"

`M1` is external roadmap shorthand for a future end-to-end unattended fleet proof. It is **not** a repository artifact, not an authoritative milestone identifier, and not a container for existing work.

**No canonical work may be renamed, duplicated, or re-filed under it.** The eight remaining Port Watch items stay under the existing PW plan. If a formal milestone document is later accepted, this entry should be replaced by a reference to it rather than grown in place.

Recorded because an earlier version of this file created a parallel milestone table restating the PW plan. Two registers describing one set of work is how they start disagreeing, which is the same failure the Re:PORT design forbids for event taxonomies.

---

# Additional constraints

## C5. The append transaction may not regain blanket application writes

**Recorded:** 2026-08-14, raised by agent-b as a design finding on the app-role grant work. **Binding on:** the specification section 8.1 append-transaction task.

Section 8.1 step 2 requires the append transaction to lock the project row `FOR UPDATE` and allocate `project_seq`. Under the corrected least-privilege grants, `engram_app` holds no `UPDATE` on `projects`, and PostgreSQL requires `UPDATE` privilege for a `FOR UPDATE` row lock. The append transaction therefore cannot execute that step as direct `engram_app` SQL.

**The wrong fix is to grant `engram_app` write access to `projects`**, because that reopens the finding this work just closed and does so through the one path that will look justified at the time.

**The correct fix** is a narrowly scoped, audited boundary: a `SECURITY DEFINER` function owned by a role that may allocate the sequence, callable by `engram_app`, doing nothing else. Whoever implements section 8.1 must take that route or explicitly reopen this constraint with an argument.

## C6. Expiry must be enforced by the durable authority-bearing datastore

**Recorded:** 2026-08-14, on acceptance of W1-1. **Raised by:** agent-b design finding, confirmed by agent-a probe. **Binding on:** every durable or multi-process implementation of setup sessions, delegations, approvals, and any other expiring authority.

W1-1's in-memory `SetupSessionManager` enforces absolute session expiry by sweeping expired sessions at every public entry point, which structurally deletes the record before any observation or authorization can use it. Verified by differential probe: the same assertions fail against the pre-sweep implementation and pass against this one.

**That correctness is a property of one live process, and it does not survive being made durable.** Entry-point sweeping depends on a particular application process being alive and reaching the sweep. A record sitting in a database after its `expires_at` is authority that has outlived its session, whether or not any application happens to look at it.

**Requirement.** Any durable store holding sessions, delegations, approvals, invitations, welcome packages, agent-session tokens, or leases MUST enforce expiry at the store or authorization service, not in application memory:

1. Every authorization read MUST filter on `expires_at` in the query itself, so an expired row cannot be returned even if a sweep never ran.
2. Deletion or tombstoning of expired rows MUST be a server-side scheduled operation, not a side effect of application traffic. A workspace nobody touches for a month must not retain live-looking authority for a month.
3. Introspection and audit paths MUST NOT report expired authority as active. This is the specific failure W1-1 was returned for, and it is easier to reintroduce in SQL than in memory, because a `SELECT` that forgets the expiry predicate looks correct.
4. Expiry MUST be evaluated against the database clock, not an application clock, so a skewed or hostile application host cannot extend authority.
5. A negative control MUST exist that inserts a row already past its expiry and asserts every read path excludes it, with a paired positive control on an unexpired row.

Related: this is the durable counterpart of Port Watch's documented revocation latency, and of the onboarding design's rule that revocation is effective immediately for new requests while in-flight sessions are bounded by short-lived tokens.
