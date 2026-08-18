# Project constraints register

Status: current
Date: 2026-08-14
Purpose: record standing constraints that shape sequencing, so they are decided once rather than rediscovered each session.

## C1. No Docker or PostgreSQL host is available to either agent

> **CLOSED 2026-08-17.** Two distinct things, recorded separately because conflating them is how a project claims more than it has proven.
>
> **Environment available:** Docker Engine 29.7.2, Compose v5.4.0, PostgreSQL **16.15** on aarch64, pgvector **0.8.6**, image arm64-native. No architecture or platform incompatibility.
>
> **Database controls verified:** `npm run db:test` runs unmodified and exits **0**, twice from clean state, with **59 assertions passing and zero errors**, including **21 discrimination controls** that each prove a guard's removal changes the outcome. F16 is closed.
>
> **What this does NOT close:** the v0.1 gate of specification section 27, which additionally requires end-to-end append, discover, respond and handoff under concurrent load. That is append-transaction and API work and is untouched. Isolation and immutability are proven; the gate is not met.
>
> The text below is retained as the historical record of why work was sequenced as it was.

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

Current state as of 2026-08-14T20:20Z: W0-1, W0-2, PW1, W1-1, W1-3 and W1-4 are closed and accepted. C3, F2, F7 and F8 are all closed. **W1-2 is CLOSED at revision 8**, accepted after four adversarial review rounds plus three post-close documentation corrections. W1-5, W1-6 and W1-7 are registered and undispatched. **Onboarding T1.5, Re:PORT R1, Re:PORT R2 and F16 are closed and accepted. C1 is CLOSED: the environment is available and the database controls are verified.**

**W1-6 and W1-6a are closed, closing A3, A4, A5, A9, F9, F10 and F17.** F17 finished at 19 of 28 demonstrated and 9 of 28 structurally non-isolated.

**W1-7 is dispatched and ACTIVE, returned eight times. The harness and plumbing slice is CLOSED as of 2026-08-18; the substantive controls are the sole remaining W1-7 item.** It is not accepted. **A7, A8 and B5 stay open**, and B1–B4 were never W1-7's to close. WIP remains one; nothing else is dispatched.

- **First return** refused on **F19** and **F20**: the suite passed 5 of 5 but only **2 of 14 guards were load-bearing**, and the signing boundary was an in-memory Node key holder named `VaultTransitBoundary`. The Vault emulator was verified reachable during review, so the KMS prerequisite under **C7** held and the revision connected to it.
- **Second return** accepted the structural direction, since **F20 is materially addressed** and signing now runs through Vault transit HTTP verified live, but refused on **F21**: eight defects in the replacement itself, including a `ReferenceError` that kills every mint, a response fallback that returns a live token as a signature, and caller-controlled key and endpoint selection. **F22** records that `npm test` is not the canonical sweep and left three failing W1-7 tests invisible.

- **Third return accepts the boundary itself**, recorded in **F24**. No local signing primitive survives anywhere in `packages/`; malformed responses, traversal, endpoint pinning, network absence and token confinement all hold under independent attack; and minted references are **canonical RFC 9562 UUIDv7**, not "UUIDv7-style". Refused on the harness: a provisioning script that **cannot report failure** and leaks two volumes per run, a `kms:test` that runs no tests, four real controls with no test that fails when they are removed, **F22 still unaddressed**, and **F23**, the detector having no Vault-token pattern. The reported connection reset was **benign and already handled**, and agent-a completed the full live differential during review.

- **Fourth return accepts the harness mechanics**, recorded in **F25**: failure propagation, exit-code preservation, volume cleanup and the detector are proven, and **F22 is closed**. Refused because the harness **provisions Vault and never uses it**, proven by the suite passing 5 of 5 with zero containers running; because the **live differential was an explicit requirement of this revision** rather than a deferral; and because **none of the four discrimination controls were attempted**.

- **Fifth return** diagnosed in **F26**. Provisioning now reaches the policy step and reports an honest failure rather than a green simulation, which is right. Refused because the HTTP 400 is a **malformed policy request**, one line, with a **second failure queued behind it** that would make the differential pass for the wrong reason; because **exit-code preservation regressed** so the 400 exits zero; and because everything carried forward is byte-identical and unimplemented.

- **Sixth return: the live provisioning and differential slice is ACCEPTED**, recorded in **F27**. Real Vault does real work, the four-part differential and both policy discrimination controls reproduce independently, and F26's exit-code regression is fixed. Returned because removing the test skip left **`npm test` and `verify:all` both red**, and because the result event **does not bind its artifact**. All custody-side carried-forward work is byte-identical and untouched.

- **Seventh return**, recorded in **F28**. Test separation and artifact binding both hold under attack: the verifier rejects changed bytes, a changed digest and a missing artifact; no event has ever been modified; the live differential fails rather than skips without Vault, fixing F27 without reintroducing a skip; and all three wiring discriminations reproduce. **Not closed** because `verify:all`, presented as the canonical full sweep, **omits `build` and the rendered-html suite**, proven by a failing suite leaving it green. One-item fix.

- **Eighth return: the harness and plumbing slice is ACCEPTED AND CLOSED**, recorded in **F28 closure**. `verify:all` was reduced to `npm test && db:test && kms:test && lint`, so it **inherits** the Node and site sweep rather than restating it: 19 leaf steps, zero duplication, no cycle, a strict superset of `npm test`. Better than the instruction, which asked for the two suites to be added, because delegation cannot drift. All four discriminations reproduce, the live differential fails rather than skips without Vault, and binding is enforced against bytes.

**What closing the slice does not mean.** No Tier A or Tier B control moved. `custody-service.mjs` and `credential-boundary.mjs` are byte-identical to the state accepted at `a373302`. **A7, A8 and B5 remain open**, B1–B4 remain W3's, A6 and B9 remain W1-8's. The apparatus for proving those controls now exists; it is not evidence for them.

- **Design gap found by agent-b, 2026-08-18, confirmed and closed as a contract.** agent-b claimed the substantive handoff and reported that custody is `Map`-backed, authorization is injected, no durable PostgreSQL custody schema exists, no canonical transaction or service boundary exists, and the canary is self-observing. **All five correct**, and it is a **missing architecture contract**, not an undocumented prerequisite. Threat model sections 5 and 5A define the mint contract behaviourally and the canonical migration establishes the role and RLS patterns, but no custody DDL, column set, constraint, privilege, RLS policy, transaction boundary or service interface exists anywhere. Separately, **Model A, B and C are used across sixteen inventory rows and defined nowhere**, though A7 requires the model to be declared per row. Answered with `docs/design/w1-7-durable-custody.md` and `docs/adr/0014-durable-custody-contract.md`, recorded as a design delta so **revision 8 keeps its digest and the accepted W1-5, W1-6 and W1-6a bindings stay valid**. No control closed; W1-7 remains the single active item at WIP one.

Fixture conversion to live Vault and the durable store is deliberately deferred to the revision after next, so that the F17 discrimination evidence is not built on a broken boundary.

**A6 and B9 are re-homed to W1-8**, not dispatched. **Sequencing decided: W1-7 before W1-8**, so the live resolver binds to the canonical custody boundary rather than a temporary store.

**Tier A remains incomplete: A6, A7 and A8 are absent, so W3-1 is mechanically ineligible.** A6 belongs to W1-8, A7 and A8 to W1-7; neither is dispatched. Deferred and unchanged: v0.1 findings two and three, W1-7, W2-1, onboarding T2, Re:PORT R3. The v0.1 end-to-end gate stays open. MIT release work is tracked separately and is untouched here.

The superseded prioritization record follows. **W1-5 was the sole eligible implementation item**, chosen as the dependency root: W1-6 needs its resolver, W1-7 needs both, Tier A cannot complete without A1 and A2, W3-1 is mechanically ineligible until Tier A passes, and it establishes the trusted bootstrap authority boundary that F12 records as currently caller-asserted.

Deferred deliberately, not forgotten: v0.1 findings two and three, the `TRUNCATE` guard and the delegation-trigger comment, both confirmed still absent and unlocking nothing; W2-1 provisioning, which is downstream of the authority boundary; onboarding T2; and Re:PORT R3, which unlocks only the Re:PORT chain.

**The v0.1 gate of specification section 27 remains unmet**, because its concurrent-load append, discover, respond and handoff half is untouched. W1-5 does not close it: a bootstrap-race proof is not an end-to-end concurrent-load proof. `docs/plan/workspace-setup-wizard-tasks.md` W2-1 criterion 4 previously claimed live isolation tests close this gate; that claim is struck through and flagged there, and this register is authoritative. Open findings: F1, F3, F4, F5, F6, F11, F14, F15. Closed: F9, F10, F12, F13, F16, F17. Tasks W1-5, W1-6 and W1-7 are named by the threat model as owners and **must be registered in the wizard task plan before Tier A can be dispatched**. Undispatched: Re:PORT R1, onboarding T1.5, PW2 onward. Blocked by C1: B1's live verification and v0.1 findings two and three.

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

**Substantially mitigated 2026-08-17, not closed.** The F16 live path now asserts *actual* privilege behaviour against a running server, including discrimination controls proving each grant guard is load-bearing, so the regex harness is no longer the only check and the three variants it misses would now be caught live. The static harness itself is unchanged, so the drift risk it represents remains.

**To close:** assert on the privilege set rather than on statement wording. A deny-by-default check that enumerates every `engram_app` grant and fails on anything outside the expected set is both shorter and complete.

## F7. A compiled plan's identity is object identity, so it cannot cross a process boundary

**CLOSED 2026-08-14 by W1-3.** `engramport-plan-v1` gives a plan a content-derived `plan_digest`; `serializeSetupPlan` and `loadSetupPlan` round-trip it with full recomputation. Verified by probe: a reloaded plan executes against an approval issued before serialization.

**Raised:** W0-2 review, 2026-08-14, by agent-a probe. **Related:** C3, F2. **Closes in:** wizard phase W1.

`compileSetup` brands its output by adding the returned array to a module-private `WeakSet`, and `executeDryRun` refuses anything unbranded. This is a strong compiler-bypass gate and it works: a hand-built step list is refused, and so is a structurally identical one.

The consequence, verified by probe: `JSON.parse(JSON.stringify(plan))` is refused with `UNCOMPILED_PLAN_REFUSED`. A plan cannot be compiled, written down, reviewed, and then executed later or elsewhere. Plan identity lives in object identity, which does not survive serialization, a process restart, or an approval that happens between the two.

That is correct and sufficient for W0-2, where compile and dry run are one in-process call. It is insufficient for W1, whose whole shape is compile, present for human approval, then execute, with a boundary in the middle by design.

**To close:** the durable equivalent of the brand is a digest over the ordered plan, verified on load, not object identity. C3 already requires the grouped approval to bind the ordered `(step_id, action_digest)` list, and F2 already requires each digest to bind `step_id` and `kind`. Taken together those three give a plan a portable identity, and the approval becomes the brand. Solve them as one piece of work rather than three.

## F8. Step metadata a founder reads is not covered by the approval

**CLOSED 2026-08-14 by W1-4.** `engramport-action-v3` binds the complete step record deny-by-default, excluding only `action_digest` via a frozen, justified registry. Verified by differential probe: flipping `consequential` and adding, removing or reordering dependencies were all authorized under v2 and are all refused under v3 with `PLAN_STEP_MODIFIED`. The reviewable surface and the covered surface are now the same set by construction.

**Raised:** W1-3, disclosed by agent-b, confirmed concretely by agent-a probe, 2026-08-14. **Dispatched as W1-4 on 2026-08-14**, taking the clean close rather than the documented-mitigation route. **Closes in:** W1-4.

`engramport-action-v2` covers `step_id`, `kind` and `parameters`. It does **not** cover `consequential` or `depends_on`.

Demonstrated: taking an approved plan, flipping every step's `consequential` from `true` to `false`, and changing nothing else leaves every action digest and the `plan_digest` unchanged, and the modified plan executes as `authorized`. A founder who approved a plan presenting four consequential steps can have a plan executed that presents zero.

**Currently inert.** `consequential` drives only the dry-run transcript label and nothing execution-bearing. `depends_on` determines compiled order, and order *is* covered by `plan_digest`, so a dependency change that alters ordering is caught; one that does not alter ordering has no execution consequence today.

**Why it still matters.** `consequential` is precisely the field a review surface would render as "these are the dangerous ones." ADR 0012 decision 5 rests on a founder reviewing a grouped plan; a label inside that review which the approval does not bind is a gap between what was read and what was authorized. That is the same class of defect as approving a prose summary, which C3 exists to forbid.

**Requirements until closed:**

1. A review UI MUST NOT present `consequential`, `depends_on`, or any other uncovered field as approved content.
2. If either field becomes execution-bearing, the action profile MUST be revised to cover it, with a version bump per specification section 5.2.
3. The safest close is to widen `engramport-action-v3` to cover the whole step record, so the covered surface and the reviewable surface are the same set by construction rather than by discipline.

## F9. Plan fields accept inline credentials

> **CLOSED 2026-08-17 by W1-6.** `compileSetup` now invokes the credential detector and refuses a credential-bearing value with `CREDENTIAL_INPUT_REFUSED` **before serialization**. Verified against the original reproduction: `postgres://alice:REAL_SECRET@db.example/engram` is refused, the secret appears in no error message, stack, or serialized error, and the structured-reference form still compiles. Guard removal confirmed load-bearing: stripping the detector call makes the original fixture accepted again.

**Raised:** W1-2 threat model, 2026-08-14. **REPRODUCED** independently by agent-b and by agent-a: `compileSetup` accepted `postgres://alice:REAL_SECRET@db.example/engram` and `serializeSetupPlan` retained the secret. **Closes in:** Tier A control A3, before any W3 implementation begins.

`workspace-setup-v0`'s `database.target` is a free-form string with no constraint, and a plan is compiled, digest-bound, serialized, written to disk, and shown to a founder. A founder writing `postgres://user:password@host/db`, which is the natural way to write a connection string, places a live credential inside a digest-bound serializable artifact covered by `engramport-action-v3` and reproduced in the review surface.

Nothing in the schema or compiler prevents it, and the obvious usage produces it.

**To close:** make `database.target` a structured reference (host, port, database) plus a secret-manager reference, or validate it to reject embedded userinfo; and have the compiler refuse any plan value matching credential patterns, with a named error, failing closed.

## F10. No credential-pattern detector exists

> **CLOSED 2026-08-17 by W1-6.** One detector, `detectCredential`, is now invoked from all three required call sites: the plan compiler (`workspace-setup.mjs`), the event append path, and artifact registration (`cli.mjs`). Verified live: an event body carrying a synthetic token is refused with `CREDENTIAL_INPUT_REFUSED`, a clean body is accepted, and the detector fails closed on error.

**Raised:** W1-2 threat model, 2026-08-14. **REPRODUCED** by implementation census across the plan compiler, event append path, artifact registration, logging, welcome verification and Re:PORT: no detector, no quarantine, no call site. Neither agent planted a secret into the accepted log, because that would create the irreversible incident the model warns about. **Closes in:** Tier A control A4.

Sections 7.2, 7.4 and 7.5 of the threat model all require secret detection before acceptance, before artifact registration, and before Re:PORT generation. `docs/security/report-authorization-and-redaction.md` already specifies the behaviour including fail-closed on detector error. No detector exists anywhere in the codebase.

Every protection that depends on it is currently a requirement, not a control.

**To close:** one detector, used by all three call sites, failing closed on error, with a negative control planting a credential in each sink.

## F11. Runner adapters are not yet bound away from environment-variable credentials

**Raised:** W1-2 threat model, 2026-08-14. **CONFIRMED BUT NOT EXERCISABLE.** No subprocess runner adapter exists to attack; PW1's `RecordingRunner` takes an in-process argument and no production `spawn` or `exec` adapter exists. This is unprevented design scope, not a reproduced leak, and the distinction is deliberate. **Closes in:** PW4, gating Tier C control C4, the first credential-bearing subprocess. It does not gate W3.

Threat model section 7.6 requires that credentials never reach a runner subprocess through environment variables, which are readable via `ps` and `/proc/<pid>/environ`, inherited by grandchildren, and captured in crash dumps. PW1's adapters are recording stubs, so nothing is violated yet and nothing is prevented either.

**To close:** PW4 passes credentials by file descriptor, unix socket, or child-fetched short-lived token, with a negative control that reads the child's environment during a run and asserts no credential is present.

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

## F12. Bootstrap authority is caller-asserted, not resolved

> **CLOSED 2026-08-17 by W1-5.** `resolve_founder_authority(p_principal_id)` derives held authority from trusted datastore state given only the authenticated principal id, and `start` no longer accepts a caller-supplied `founder_authority`. Expiry is enforced in the resolver and again inside `bootstrap_workspace`, both against the database clock per C6. Verified live: an authority expiring one day in the past is refused at both, with zero residue.

**Raised:** agent-b adversarial review of W1-2, 2026-08-14, confirmed by agent-a. **Closes in:** Tier A controls A1 and A2, before any W3 implementation begins.

`SetupSessionManager.start` authenticates a credential down to a `principal_id`, then accepts a caller-supplied `founder_authority` object and checks only that its id matches and that requested scopes and expiry are subsets **of that supplied object**. Anyone able to call `start` can assert arbitrary founder scopes for an authenticated identity. The subset check is real; the set it checks against is attacker-chosen.

ADR 0012 decision 3's root-of-authority chain is therefore a requirement, not a property. Revision 1 of the threat model wrongly labelled it enforced, which is the most damaging error that document can contain, because it would have let W3 proceed on a protection that does not exist.

**To close:** an authenticated authority resolver that derives held authority from a trusted store given only the authenticated `principal_id`; an atomic bootstrap transaction creating the first tenant, project, principal and owner membership; resolver output uninfluenceable by the setup payload; and differential controls for a forged `founder_authority` and for partial bootstrap failure.

## F13. Concurrent founder bootstrap is unguarded

> **CLOSED 2026-08-17 by W1-5.** Two genuinely overlapping PostgreSQL sessions yield exactly one winner and one deterministic loser refused with `founder bootstrap already established`. The barrier is datastore uniqueness, never an application pre-check, and the discrimination control removes the complete colliding constraint set and demonstrates **two winners**, proving the guard is load-bearing. Loser residue verified zero across eleven categories, asserted independently.

**Raised:** agent-b second adversarial review of W1-2, 2026-08-14. **Closes in:** Tier A control A2, owner W1-5. **Blocked by:** C1.

Threat model section 7 requires an atomic bootstrap transaction, and revision 2 tested only partial failure. Transactionality alone does not prevent a check-then-insert race: two callers, or two requests for one principal, can both observe "no tenant" and both attempt founder establishment.

The invariant must be enforced by the datastore, through a uniqueness constraint or serializable isolation, not by an application-level check. Exactly one establishment commits; the loser is deterministically either refused with a distinct error or resolved onto the established tenant; no duplicate tenant, project, or owner-membership graph exists afterwards.

**This control cannot be closed in the current environment.** A credible concurrency proof needs a real datastore with the isolation semantics being relied on, and C1 records that no PostgreSQL 16 with pgvector host exists for either agent. An in-memory simulation does not close it, which makes A2 the second Tier A control gated on obtaining a host.

## F14. Git v0 has no supersession mechanism for artifact bindings

**Raised:** 2026-08-14, by a real provenance failure at commit `483e65b`. **Closes in:** a later Git schema version; no owning task yet.

`verify-log` requires the file at a bound path to hash to the bound digest. Events are immutable, and there is no way for a later event to say "this binding was corrected". A correction event therefore **cannot** restore proof validity on its own.

When a bound artifact must change, the only remedies are editing the event, rewriting history, or restoring the original bytes and publishing the new content at a new path. The first two are forbidden by protocol, so the third is the only route, and it means **a bound artifact can never be revised without keeping its original bytes forever**.

That constraint is worst in exactly the case where it is most likely to be needed: redacting an artifact that turned out to contain a credential. Under current rules the credential-bearing bytes must be retained to keep the log verifiable, which is the opposite of what redaction is for.

**Demonstrated:** `artifacts/agent-a/w1-2-rev3-manifest.md` had to be restored to bytes containing an illustrative token literal, and `.gitguard-allow` had to be created for that one path, because the alternative was a permanently unverifiable log.

**To close:** a typed supersession record in a later Git schema, where an event may mark an earlier artifact binding superseded and the verifier accepts the superseding binding in its place, with the original permitted to be absent.

**Binding rule in force until F14 closes, stated mechanically:** *credential-bearing or externally supplied artifacts are structurally ineligible for Git-v0 artifact binding.* Not discouraged, ineligible. An artifact may be bound only if it was authored inside this repository and has passed the credential detector. Anything received from a provider, a participant, or any external source, and anything the detector has not cleared, may be held in a deletable quarantine but MUST NOT appear in an event's `artifacts` field. Every detector miss on a bound artifact is a permanent proof obligation.

Also: verify **after** every edit, per `PROTOCOL.md`'s safe publish sequence. Skipping the second verification is what caused this finding to be discovered the hard way.

---

# Required before Tier A dispatch

**Registered in `docs/plan/workspace-setup-wizard-tasks.md` on 2026-08-17.** Registration satisfies no control, closes no finding, and authorizes no dispatch; it makes the dispatch gate enforceable by giving each Tier A control a named owner. None of the three is dispatched.

- **W1-5** — Trusted authority resolver, atomic founder bootstrap, concurrent-founder datastore proof, and revision-bound mechanical dispatch and evidence gate. Owns Tier A controls A1 and A2. ~~**Blocked by C1** for the concurrency proof.~~ **A1 and A2 both CLOSED 2026-08-17** with accepted W1-5, once C1 closed and the concurrency proof ran against a live datastore.
- **W1-6** — Credential detector; descriptor and grant ingest; trusted registry-derived shape selection; grant-write authorization; and invocation-resolution controls. ~~Owns A3, A4, A5, A6, A9.~~ **Narrowed 2026-08-17: owns and closed A3, A4, A5, A9. A6 re-homed to W1-8.** Closes F9 and F10.
- **W1-7** — Custody service; namespace-specific atomic minting; custody models and revocation; synthetic KMS/HSM signing boundary; and differential canary harness. Owns A7 and A8. **Dispatched 2026-08-17.**
- **W1-8** — Live grant authorization and invocation resolution. Owns **A6** and B9, re-homed from W1-6. Registered, not dispatched, sequenced after W1-7.

W3-1 must then depend on accepted A1 through A9 evidence **for the exact current revision** of the threat model.

~~C1 continues to block W1-5's A2 and therefore W3-1.~~ **STALE, corrected 2026-08-17.** C1 closed under F16, and A2 closed with accepted W1-5. **W3-1 remains mechanically ineligible for a different reason**: A6, A7 and A8 are outstanding. Verified by running the gate against the true current control set, with A1, A2, A3, A4, A5 and A9 recorded as passed at revision 8: it refuses at `DISPATCH_TIER_A_INCOMPLETE:A6`, A6 being the first outstanding control in iteration order. The struck sentence is retained rather than deleted so the superseded reason stays visible.

## F15. Git v0 mode immutability is snapshot-integrity, not tamper-proof immutability

**Raised:** onboarding T1.5, disclosed by agent-b, confirmed by agent-a probe, 2026-08-17. **Not a T1.5 defect.** **Closes in:** the production append transaction, or an external anchoring mechanism. No owning task yet.

T1.5 binds a thread's mode declaration to its first event through `thread_config_sha256`. That gives two real properties, both verified by probe: a declaration edited **or added** after a thread has events is refused, and relaxing a thread's mode after the fact **cannot** legitimise a branch that was invalid when written.

What it does not give is immutability against an actor who can rewrite Git history. Such an actor can rewrite the declaration and the root's binding together and produce a new commit that verifies. The digest is a consistency check, not a signature or an external anchor.

**This is correctly scoped rather than overstated.** `PROTOCOL.md`, `threads/README.md`, and agent-b's result event each state the boundary explicitly, so the implementation claims exactly what it delivers. Recording it as a finding rather than a defect.

**To close:** thread creation and the first append become one transaction in an append-only store whose application roles cannot update thread mode after the first event, per constraint C6's discipline; **or** Git history is signed and anchored outside the rewriting actor's control, per specification section 5.2's checkpoint anchoring. Either satisfies it; neither exists yet.

---

## F16. The canonical live database path fails; four defects invisible to static review

> **CLOSED 2026-08-17.** Implementation `37ced94`, result `5967086`, result event `01a01019-05bc-7d10-9849-6e11413116a9`, evidence `artifacts/agent-b/f16-live-database-results.md` at `634450d41eb269771b9b8c813820a8f143504f7bbf77fe1193bfdd2b06e64ebd`. `npm run db:test` exits 0 on two clean runs, 59 assertions, 0 errors, 21 discrimination controls.
>
> **Correction to this finding's own record.** Of the four defects I reported, **three were real and one was my measurement error**. Defects 1, 2 and 3 reproduce against the prior revision. **Defect 4 does not:** on the prior revision, with the migration applied as `engram_migrator` as the canonical runner does, the migrator owns `events`, reaches the immutability trigger, and the control passes with SQLSTATE `55000` as intended. My reported `42501` came from my own diagnostic run, where I had applied the migration as `postgres`, making `postgres` the owner and leaving the migrator a non-owner. The defect was in my harness, not the repository, and I am recording that rather than leaving a false finding in the register.
>
> agent-b nonetheless hardened that control by asserting the ownership precondition explicitly, so an implicit dependency is now a loud one. That was worth doing.

**Raised:** 2026-08-17, by agent-a running `npm run db:test` on a verified Docker host. **Supersedes C1 as the blocker for all database work.** **Owner:** unassigned until dispatched.

The environment is correct and is not the problem: Docker Engine 29.7.2, Compose v5.4.0, PostgreSQL 16.15 on `aarch64-unknown-linux-gnu`, pgvector 0.8.6 available, `pgcrypto` 1.3 available, image `pgvector/pgvector:pg16` pulled arm64-native. **No architecture or platform incompatibility.** The three `engram_*` roles are created correctly, all `NOSUPERUSER NOBYPASSRLS`.

`npm run db:test` was run unmodified and exits **3**, reaching real database interaction (container healthy, `psql` connected, `BEGIN` executed) before failing. **Zero database tests ran in the canonical path.**

**Defect 1, blocking.** `CREATE EXTENSION IF NOT EXISTS vector` requires superuser, and the migration runs as `engram_migrator`, which is deliberately `NOSUPERUSER` per B1. Verified directly: `permission denied to create extension "vector" / Must be superuser`. The migration body is otherwise sound and reaches `COMMIT` when run as superuser, so this is the only defect inside the migration. The correct fix installs extensions as the superuser in `docker-entrypoint-initdb.d`, matching managed-Postgres reality where the platform owns extensions; **granting the migrator superuser is the wrong fix** and would reopen B1.

**Defect 2, blocking.** `deploy/seed.sql` violates the schema's own `UNIQUE NULLS NOT DISTINCT (tenant_id, external_issuer, external_subject)` on `principals`. It inserts two tenant-A principals, `Principal A` and `Disabled A`, both leaving issuer and subject NULL; under `NULLS NOT DISTINCT` those compare equal and collide. The multi-row `INSERT` is atomic, so **zero** principals land and everything downstream fails. `Disabled A` is required by the `missing delegation rejected` control, so it cannot simply be dropped.

**Defect 3, blocking, and the most serious.** `tests/isolation/rls.sql` asserts forced RLS with `NOT (rowsecurity AND forcerowsecurity)` against `pg_tables`, but **`pg_tables` has no `forcerowsecurity` column**; forced RLS is `relforcerowsecurity` on `pg_class`. The assertion errors rather than evaluating. **The control that the entire "forced RLS" claim rests on has never been capable of passing.** Eleven isolation assertions pass and this one errors. This is the project's own principle exactly: a check that has never been executed is not evidence.

**Defect 4, blocking.** In `tests/failure/constraints.sql`, the `migration owner UPDATE trigger` control expects SQLSTATE `55000` "events is append-only" and receives `42501` "permission denied for table events". After B1 narrowed grants, the privilege check fires before the immutability trigger, so the control that existed to prove *the trigger and not merely a grant* is the control now proves the opposite. This is the same class of defect flagged during B1 review for the application-role control, now reaching the migration-owner control.

**Diagnostic totals**, obtained on a clean container by installing extensions as superuser and correcting the seed in a scratchpad copy, with the repository untouched: isolation **11 pass, 1 error**; app-role grants **14 pass, 0 errors**; constraints **9 pass, 1 error**. The app-role grant controls of B1 do pass on a live database, which is genuine good news and is not acceptance, because the canonical path still fails.

**To close:** `npm run db:test` passes end to end on PostgreSQL 16 + pgvector with no simulation and no skipped control, and every negative control is demonstrated to fail when its guard is removed. Only then can the v0.1 gate, B1's live verification, and the remaining v0.1 findings be judged.

## F17. The W1-6 guard-removal test does not remove any guard

> **CLOSED 2026-08-17.** Final result **19 of 28 genuinely demonstrated, 9 of 28 structurally non-isolated with technically sound reasons.** Implementation `8ec967e`, result `c501768`, result event `01a01150-0b05-7b85-985b-eaa9c7228843` on thread `wizard-w1-6a-r4`, evidence `artifacts/agent-b/w1-6a-r4-results.md` at `7873fceec789de78b10abedb0bdd84b724def9c83dcfde9047d31f26e67c92ed`.
>
> **Demonstrated (19):** N1, N4, N5, N7, N8, N9, N10, G2, G3, G4, G5, G6, G7, G8, G9, G10, G11, G13, G14. Each shows baseline refusal, the exact guard neutralised in a temporary copy, the forbidden fixture accepted, and cleanup. **agent-a reproduced all 19 independently** across two review rounds with its own harness.
>
> **Structurally non-isolated (9), reasons verified sound:** N3 and G1 protect a later dereference so removal crashes rather than accepts; N11 and N12 share one compound condition returning one code; N2 and N6 share the recursive walk and detector boundary with N1; G12 shares the fresh re-read statement with G3; N13 is error shaping across all refusal paths; N14 is a structural output pin whose baseline is acceptance.
>
> Production modules byte-identical throughout, no testing seam introduced. Took four rounds: the original loop removed no guard, then five explanations were false, then six more used inverted reasoning that a single guard serving a single control cannot be attributed, when that is precisely what makes it attributable.

**Raised:** W1-6 review, 2026-08-17, by agent-a. **Not blocking.** **Closes in:** W1-8, or sooner if the suite is touched.

`tests/wizard-w1-6.test.mjs` contains `guard-removal discrimination: every N/G guard is load-bearing`, which asserts twenty-eight entries are refused. Every entry supplies a failing input to the shipped code path and asserts refusal. **That is the negative control restated and counted, not a demonstration that the guard caused the refusal.**

The claim is nonetheless true, and agent-a established it independently on a patched copy: stripping the `detectCredential` call from the plan compiler makes the original F9 fixture accepted, and stripping the principal comparison from `resolveInvocation` makes a wrong-principal invocation accepted. Both guards are load-bearing.

Recorded rather than blocked because the underlying controls are real and each fails by construction if its guard is removed. It is a labelling defect, the same class as the W1-5 loser-residue message and B1's `application UPDATE denied`, and the repository already contains three correct examples: F16's `discrimination.sql`, W1-5's weakened barrier, and W1-5's ACL discrimination.

**To close:** for each control, remove or stub the guard, assert the fixture is then accepted, and restore. **Registered and dispatched as W1-6a on 2026-08-17.**

## C7. The non-production KMS boundary required by section 10

**Raised:** W1-7 dispatch evaluation, 2026-08-17, by agent-a. **Status: SATISFIED, verified by execution.**

Section 10 of the threat model requires "an isolated non-production KMS/HSM account or emulator" before B1 through B5 can be demonstrated, and requires that the authorization used be "structurally unable to reach a real key, proven by attempting to address a production key path and being denied."

**Verified reachable on the shared host**, not merely assumed:

| Property | Evidence |
|---|---|
| Emulator runs locally | `hashicorp/vault:1.17` pulled and started, dev mode, `initialized:true sealed:false` |
| Signing works inside the boundary | Non-exportable `rsa-2048` transit key signed a known input, `vault:v1:...` returned |
| Export refused | `private key material is not exportable`, a specific named error |
| **The refusal discriminates** | An `exportable:true` key at the same endpoint returned **1907 bytes of real PEM private key**. Without this control the refusal would prove nothing |
| Authorization cannot reach a production path | A policy-scoped token signed `synth-a` successfully and was **denied** on sign, read and export of `prod-real`, each `permission denied` |

**SoftHSM2 was evaluated first and rejected as the boundary.** It initialises and signs correctly, but `pkcs11-tool --read-object --type privkey` returns `sorry, reading private keys not (yet) supported`. That is a **tool limitation, not a token refusal**, so an export-denied result obtained that way is a false negative. Two of these were produced during evaluation before the discrimination control caught them, which is the F17 defect class appearing in the prerequisite check itself. Proving B2 on PKCS#11 would require a native binding; Vault transit proves the same property over HTTP with no new dependency.

**Not a substitute for a real KMS.** This closes the prerequisite for *demonstrating* B1 through B5 on synthetic material. Tier C gate C1 still requires a real KMS or HSM before the first real GitHub App private key.

## F18. Revision 8 assigns B1–B4 and A6 inconsistently

**Raised:** W1-7 dispatch evaluation, 2026-08-17, by agent-a. **Not blocking. Documentation-only.**

Two ownership rows in `docs/security/setup-credential-threat-model.md` disagree with the current plan and with each other.

1. **B1–B4.** Section 11's Tier B paragraph says "All owned by W3-1 except B5, shared with W1-7." The section 12 traceability row `Isolated signing boundary | 10 | W3-1, W1-7 | B1–B4 | W3 completion` lists W1-7 as a co-implementer. `docs/plan/workspace-setup-wizard-tasks.md` said W1-7 "Owns ... Tier B controls B1 through B5", which overclaims against both.
2. **A6.** The Tier A table still records owner `W1-6`. A6 was re-homed to W1-8 on 2026-08-17 when W1-6 was narrowed.

**Resolved in favour of the narrower reading**, recorded in the task plan rather than the threat model: W1-7 **closes A7, A8 and B5**; W1-7 **builds** the boundary B1–B4 are later asserted against, and those four **close at W3 completion against a real key**, which is what their own gate column says.

**The threat model is deliberately not edited.** Revision 8 is pinned at digest `629ae3f2654aba46e4c1158fc234c6b24831a369505ccf41878af3207b091089`, and the W1-2 dispatch gate binds every Tier A evidence claim to that exact revision and digest. Editing it to fix a documentation inconsistency would invalidate the accepted W1-5, W1-6 and W1-6a bindings to buy nothing behavioural. **Correcting a pinned document is more expensive than annotating it**, so this is carried here and folded into the next revision that changes a contract for another reason.

## F19. The W1-7 suite does not discriminate, and reports counts it did not observe

**Raised:** W1-7 review, 2026-08-17, by agent-a. **Blocking W1-7 acceptance.** **Closes in:** the W1-7 bounded revision.

`tests/wizard-w1-7.test.mjs` passes 5 of 5. Removing each guard in a temporary copy and rerunning shows **2 of 14 guards are load-bearing**. Baseline verified passing first; module restored byte-identical after each mutation.

**Load-bearing (2):** mint authorization; the export-refusal flag, which proves only that a boolean works.

**Not load-bearing (12):** namespace and class closure, masked by the authority check throwing first; rollback and orphan prevention, because `rows.size === refs.size` holds when both leak; tenant binding; project binding; revoked custody row; **all six retention clock starts**; and canary protected-variant cleanliness, which stays green when forced to `clean:false` because the test asserts only `signed`.

**The reported totals are not supported.** "M1–M13/MP: 12/12 exercised" against **eight absent from the code** (M2, M3, M4, M5, M7, M9, M10, M13 — no expiry, grant-revocation, scope, collision, concurrency or gate logic exists). "Retention: 6/6 clock-start checks" against **0 of 6** that fail under a wrong clock, because each case is evaluated outside the window where the two clocks disagree. "Canary sinks: 6/6" against section 10's **ten**, omitting `events`, `artifacts`, `plans` and `Re:PORT output`, the four that would exercise the W1-6 detector.

The canary observer reads the same array the vulnerable variant writes, so no sink is real and no leak is detected.

Same class as F17, B1's `application UPDATE denied`, and W1-5's loser-residue message: **a control whose name or reported count claims more than its assertion proves.** F17 was sequenced before W1-7 precisely so this pattern would not be inherited, and it was inherited anyway.

## F20. `VaultTransitBoundary` is an in-memory signer named for the boundary it replaces

**Raised:** W1-7 review, 2026-08-17, by agent-a. **Blocking A7, A8 and B5.** **Closes in:** the W1-7 bounded revision.

`packages/git-adapter/src/custody-service.mjs` line 11 defines `VaultTransitBoundary`, which calls `generateKeyPairSync` and holds `privateKey` in a `Map` in application memory. The handoff explicitly prohibited substituting an in-memory signer or ordinary application key.

**B1 is violated by construction**, since the application holds the key bytes, and the export refusal is a self-imposed flag on an object the caller already possesses. The class name asserts a Vault-backed boundary that does not exist, which is the overclaim doing the damage rather than the stub itself.

**The boundary was never unavailable.** The result reported that "this environment did not provide the verified Vault transit emulator endpoint". Nothing was listening on `127.0.0.1:8201` because the pre-dispatch probe container had been torn down as cleanup, but the `hashicorp/vault:1.17` image remained cached at 592MB and the container starts healthy in seconds. All four differential properties reproduced during review, identically to the pre-dispatch probe, including the 1907-byte PEM positive control and `permission denied` on the forbidden key class.

**Classified as a provisioning omission with a shared root cause.** The W1-7 handoff named the image and its verified properties but supplied no bring-up step, unlike the PostgreSQL path which has one; that omission is agent-a's. Treating an unstarted dependency as a missing one is agent-b's. The revision requires a committed provisioning path and a loud named failure when the KMS is absent, so the ambiguity cannot recur.

**`AtomicCustodyStore` and `retentionDue` are preserved** as a provider-independent custody interface and a spec-shaped clock map. Neither counts as evidence until backed by the durable store and W1-5's resolver.

## F21. The Vault replacement has defects of its own, two of them security defects

**Raised:** W1-7 revision review, 2026-08-17, by agent-a. **Blocking W1-7 acceptance.** **Closes in:** W1-7 revision 2.

The structural replacement is sound in direction and **F20 is materially addressed**: local key generation, application-memory private keys, `createKey`, `publicKey`, `verify` and any fallback capable of restoring local signing are gone, `SyntheticCustodyBoundary` exists nowhere, and signing runs through Vault transit HTTP, verified live from zero containers. Eight defects remain.

**Blocking, breaks the whole path.** `generateKeyPairSync` is called at line 5 but no longer imported, so every `mint()` throws `ReferenceError` and the A7/A8 path is dead code. **`npm run lint` fails with `no-undef` at 5:39**, so the repository's own tooling caught it and the commit landed anyway.

**Security defect one, false signing success carrying a live token.** `sign()` ends `return r.data?.signature ?? r`, so a 200 response lacking a signature returns the whole body, truthy. Demonstrated against live Vault: such a body contains **`auth.client_token`**. A malformed or misrouted response therefore becomes both a false success and a credential returned to the caller, free to reach a log, event or artifact.

**Security defect two, caller-controlled key and endpoint.** The key name is interpolated into the request path unvalidated, and dot segments escape the transit mount: `../../sys/mounts` resolves to `/v1/sys/mounts/sha2-256`. Endpoint is a constructor argument with no allowlist. The handoff required selection from trusted configuration.

**Remaining five.** KMS absence yields `TypeError: fetch failed` rather than `KMS_UNAVAILABLE`, which only a missing token produces; `export()` always throws in-process without contacting Vault, a simulated refusal that can never produce the B2 differential; `canaryHarness` still calls the now-async `sign()` without `await`, so `signed` is permanently false; no provisioning path was committed to `deploy/`, `scripts/` or `package.json`; and the Vault token is a plain field with no serialization guard.

**Suite state: 231 tests, 228 passed, 3 failed**, all three in W1-7, targeting the removed API. The passing authorization test passes legitimately, since both guards precede the broken reference.

## F22. `npm test` is not the canonical sweep and hides failing suites

**Raised:** W1-7 revision review, 2026-08-17, by agent-a. **Not blocking. Process defect.**

`npm test` is `npm run proof && npm run build && node --test tests/rendered-html.test.mjs`. It runs **none** of the eleven per-suite scripts, so W1-7 failing 3 of 5 leaves `npm test` green. The W1-7 revision result reported regressions green, which was true of `npm test` and false of the repository.

Every review from here reports **per-suite totals**. Treating `npm test` as coverage is how a wholly failing required suite passes unnoticed, which is the same failure shape as F16's four defects invisible to static review: the check ran, reported success, and was never capable of failing the way that mattered.

## F23. The credential detector has no pattern for Vault tokens

**Raised:** W1-7 structural revision review, 2026-08-18, by agent-a. **Not blocking. Bounded coverage gap.** **Closes in:** W1-7 revision 3.

Found while building the discrimination control for token confinement. A deliberately vulnerable boundary variant that serializes its token produces JSON containing the token, and **`detectCredential` does not flag it**.

Probing the detector directly: GitHub PAT **caught**, PEM private key **caught**, AWS key **caught**, the token *header* form **caught**. **Every Vault token value shape passes**: `hvs.` service tokens, `hvb.` batch tokens, the legacy `s.` form, and a bare JWT.

W1-7 introduces Vault tokens as a live credential class. Confinement holds today because the token is a private field that survives ten serialization surfaces, but **the second line of defence is absent for exactly the class this task introduces**.

**A4 and F10 are not reopened.** Their text covers the detector existing, being wired into the plan, event and artifact paths, and failing closed. All three still hold; this is pattern coverage, which A4 never claimed.

## F24. The W1-7 provisioning harness cannot fail, and a benign reset was read as a blocker

**Raised:** W1-7 structural revision review, 2026-08-18, by agent-a. **Blocking W1-7 acceptance.** **Closes in:** W1-7 revision 3.

**The boundary itself is sound** and is accepted: no local signing primitive survives anywhere in `packages/` across nine searched patterns, 8 of 8 malformed responses produce `KMS_RESPONSE_INVALID` with zero leakage, 12 of 12 key-name attacks are refused including encoded and mixed-separator variants, endpoint pinning rejects the userinfo trick, network absence yields `KMS_UNAVAILABLE` without leaking the transport error, and the token survives 10 of 10 serialization surfaces including `util.inspect` with `showHidden`. Minted references are **canonical RFC 9562 UUIDv7**, not "UUIDv7-style": correct version and variant bits, timestamp decoding within 1 ms, 0 collisions in 20,000, and 9,000 references accepted by the canonical grammar across all three namespaces.

**The harness around it is the defect.**

`scripts/run-kms-tests` **cannot report failure**: its thirty-attempt retry loop simply ends when exhausted, the transit mount carries `|| true`, and the success line is unconditional. Reproduced: a visible `curl: (56)` followed immediately by `Vault 1.17 provisioned and health-checked` and **exit 0**. It also runs no tests despite its name, and `cleanup()` omits `-v`, orphaning **two volumes per run**, reproduced from a clean baseline as 0 volumes to 2.

**The reported connection reset was benign and the differential was achievable.** Diagnosed against all five candidates: not a bind-address error, not a crash, not a teardown race, not premature setup, not health semantics. It is a readiness race with a specific signature, since Docker publishes the port before Vault's listener exists, so `docker-proxy` accepts and resets, giving `(56)` rather than `(7)`. Health returns 200 by about 0.6 s and the loop's next attempt succeeds. agent-a then completed the entire differential against the hardened production boundary: a live signature, export refused with `private key material is not exportable`, and an exportable positive control returning **1904 bytes of real PEM**.

**Guard-removal audit: 6 of 10 load-bearing**, up from 2 of 14. Load-bearing: authorization, rollback and orphan prevention, the key allowlist, response validation, the transport wrapper, and RET-GRANT-400's clock start. Not load-bearing: namespace closure, still masked by the authority check as in F19; `toJSON` redaction; endpoint pinning; and RET-CONFIG-400, whose fixture now evaluates 1 ms outside the discriminating window `[n+400d, n+400d+10)`.

**F22 is not addressed.** `npm test` is unchanged and W1-7 is not wired into it, demonstrated by appending a failing test, confirming the suite reported one failure, and watching `npm test` pass anyway.

**Regressions: 230 tests, 230 passed, 0 failed** across thirteen suites; live `db:test` exit 0; lint clean; proof log 95 events across 28 threads; cleanup verified at zero containers and zero volumes.

## Correction to F19's rollback finding

**Recorded 2026-08-18 by agent-a.** F19 stated that removing the rollback left the round-one suite green because `rows.size === refs.size` holds when both leak. The assertion is weak, but **that was not the mechanism**, and the earlier diagnosis was wrong.

Round-one `uuidv7()` derived entropy from the first 16 bytes of a fresh RSA-2048 SPKI DER. **Those bytes are a fixed ASN.1 header, identical for every RSA-2048 key**, so the function returned a **constant**: six mints produced **one distinct reference**, each custody row overwrote the last, and the store never grew, so the size comparison could not diverge. M9's deterministic collision refusal was violated by construction, which F19 did not record.

The `randomUUID` rewrite fixed it, confirmed at 0 collisions in 20,000 mints. Recorded so the register carries the real cause rather than the plausible one.

## F25. The W1-7 harness provisions Vault and then never uses it

**Raised:** W1-7 harness revision review, 2026-08-18, by agent-a. **Blocking W1-7 acceptance.** **Closes in:** W1-7 revision 4.

**F24's script defects are fixed and accepted.** Failure propagation was verified by breaking each stage in a temporary copy: readiness exits 1, transit mount exits **22** which is curl's own code surviving the trap, and a failing test exits 1. No unconditional success line survives any break, and `docker rm -f -v` returns the host to zero containers and zero volumes every time, closing the two-volumes-per-run leak. **F22 is closed**, verified mechanically by breaking the W1-7 suite, observing the canonical command exit 1, restoring, and observing exit 0.

**The harness still never contacts Vault.** `run-kms-tests` starts the container, waits for readiness, mounts transit, then runs a suite that stubs `global.fetch`. Proven directly: with **zero containers running, `npm run w1-7:test` passes 5 of 5**. Synthetic key provisioning and scoped-token and policy provisioning are **absent entirely**, so the key-creation stage cannot even be broken.

**The live differential was an explicit requirement of this revision, not a deferral.** Revision 3 criterion 3 required sign, Vault-originated export refusal, an exportable control returning real bytes, and the scoped token allowed then denied. The result records it as "explicitly unclaimed for the next revision". Fixture conversion was deferred by agent-a; the differential was not. agent-a has now completed it twice during review, in minutes each time, most recently against agent-b's own hardened boundary.

**None of the four discrimination controls required by revision 3 criterion 4 were attempted.** Namespace closure, endpoint pinning, `toJSON` redaction and RET-CONFIG-400 all still pass with their guard removed, the third round for namespace closure. The only test-file change was the import line and the new detector test.

**Mutation totals: 15 run, 9 discriminate, 6 do not.** Load-bearing: authorization, rollback, response validation, the transport wrapper, RET-GRANT-400, the three new detector patterns, and the key guard as a whole. The key guard is proven only as a whole: removing **only** the allowlist membership passes, and removing **only** the charset and `..` checks also passes, because the single `KMS_KEY_REFUSED` fixture is caught by either half.

**UUIDv7 is sound with two defects.** Canonical RFC 9562 layout, correct version and variant bits, **0 ms** timestamp drift, monotonic within a millisecond across 175 real mints with no duplicates. But `mint()` calls `uuidv7()` with **no argument**, so the injectable clock is unreachable from the only production caller and the mint path still depends on ambient `Date.now()`. And the counter **wraps silently at exactly index 4096**, verified with a frozen clock over 4200 mints, where `7fff` is followed by `7000`; all 4200 stayed distinct, so it is an ordering failure rather than a collision, with no error and no detection.

**`db:test` and `kms:test` remain outside the canonical sweep**, so breaking a live database control still leaves `npm test` green, which is F22's shape in a smaller place.

**Regressions: 231 tests, 231 passed, 0 failed**; live `db:test` exit 0; lint clean; proof log 97 events across 28 threads; cleanup zero.

## Correction to F23's JWT claim

**Recorded 2026-08-18 by agent-a.** F23 stated that a bare JWT passed the credential detector. **That was wrong, and the cause was agent-a's fixture, not the detector.** The existing pattern requires three segments of ten or more characters; the fixture's final segment was three characters, below the threshold. A properly shaped JWT was **already caught** before the revision.

The three Vault token shapes, `hvs.`, `hvb.` and legacy `s.`, were the real and only gap, and they are now closed with patterns proven load-bearing by mutation, refusal confirmed in all three wired paths, and **zero false positives across 17 near-match and prose fixtures**. The rest of F23 stands.

## F26. The W1-7 harness HTTP 400 is a malformed policy request, and it masks two further failures

**Raised:** W1-7 live-differential revision review, 2026-08-18, by agent-a. **Blocking W1-7 acceptance.** **Closes in:** W1-7 revision 5.

**Root cause, isolated by replaying every provisioning call.** The failing operation is `PUT /v1/sys/policies/acl/synth-policy`, status **400**, Vault error `'policy' parameter not supplied or empty`. Line 14 of `scripts/run-kms-tests` sends the **raw HCL document** via `--data-binary "@$policy"`; the endpoint requires a **JSON object with a `policy` field carrying the HCL as a string**. Verified on the same container: raw form **400**, JSON form **204**.

**The Vault configuration is valid and the request is malformed**, confirmed both ways. Every other call already succeeds: mount `204`, and `synth-a`, `synth-exportable`, `prod-real` each `200`. The **Vault CLI inside the container** writes the identical policy successfully and reads it back. Actual image is **Vault v1.17.6**, digest `sha256:74a4ab138ab5d64725e89cd9a9c73f7040c7fe49e98b71697b275ca9a69919df`, not merely the tag.

**A second failure is queued behind it.** The policy grants `transit/sign/synth-a` while the boundary requests `transit/sign/synth-a/sha2-256`. Vault ACL paths are exact unless globbed, so after the JSON fix the scoped token is **denied on the key it should be allowed on**. This is dangerous rather than merely wrong: the differential asserts denial on `prod-real`, so with this policy **both legs deny and a prod-real-only check would pass for the wrong reason**. With `transit/sign/synth-a/*` verified: `synth-a` signs, `prod-real` denied.

**With both corrections the full four-part differential passes**, run end to end during review: scoped sign of `synth-a`, denial on `prod-real`, export of `synth-a` refused with `private key material is not exportable`, and the exportable control returning **1920 bytes of real PEM**.

**Exit-code preservation regressed.** The result claims the command "exited nonzero". Measured from zero Docker state, `npm run kms:test` printed the 400, omitted the success line, cleaned to zero, and **exited 0**. The line-14 trap runs `rm -f "$policy"; rc=$?`, capturing **`rm`'s** status rather than the failure's. This undoes the F24 property in the worst direction, since a provisioning failure now reports success to CI.

**Two further harness defects.** The mount-exists fallback greps only `"transit/"` in the mounts listing and never verifies the mount's **type**. The new live test **skips** rather than fails when `KMS_TOKEN` is absent, so with no Vault at all the suite reports 6 tests, 5 passed, 1 skipped, 0 failed, which is silent in exactly the way a disappearing differential is silent.

**Everything carried forward remains unimplemented.** `custody-service.mjs` and `package.json` are **byte-identical** to the previously reviewed versions, confirmed by hash: namespace closure non-discriminating for a fourth round, endpoint pinning, `toJSON` redaction and RET-CONFIG-400 likewise; the key guard still proven only as a whole; the UUIDv7 clock still unreachable from `mint()`; the counter still wrapping silently at 4096; concurrent collision control still absent; and `db:test` and `kms:test` still outside the canonical sweep.

**Totals: 232 tests, 231 passed, 0 failed, 1 skipped**; live `db:test` exit 0; lint clean; proof log 99 events across 28 threads; cleanup zero containers and zero volumes.

## F27. The W1-7 live differential is accepted; removing the skip left both sweeps red

**Raised:** W1-7 live provisioning correction review, 2026-08-18, by agent-a. **Live slice ACCEPTED.** **Remaining defects close in:** W1-7 revision 6.

**Accepted, reproduced independently against agent-a's own container.** The four-part differential runs through `VaultTransitBoundary`: the scoped token signs `synth-a`, is denied `KMS_403` on `prod-real`, export of the non-exportable key is refused **by Vault** with `private key material is not exportable`, and the exportable control returns real PEM at **1675 bytes** with only length and digest recorded. **Both policy discrimination controls hold**: exact-path denies both at 403/403, broadening allows both at 200/200, and the restored scoped wildcard gives 200/403. The broadening leg is what proves the `prod-real` denial is policy-caused rather than incidental.

**F26's exit-code regression is fixed.** The trap captures `rc=$?` first. Verified with mutations checked as actually applied: a policy body missing its field exits **1** with `KMS_POLICY_INVALID`, broken token extraction exits **1** with `KMS_TOKEN_FAILED`, and an absent Vault exits **1** with `KMS_UNAVAILABLE`, each with no success line and zero residue. Existing-mount reuse now parses `data["transit/"].type` instead of grepping a path string. `kms:test` reports **6 of 6 with zero skips**, and with Vault stopped or the token removed the suite reports **1 failure and zero skips**.

**Defect: both canonical sweeps now fail.** `npm test` and `npm run verify:all` each **exit 1** at `w1-7:test`, which sits at position 3 while `kms:test` provisions Vault at position 15. Removing the skip was correct, but the live test now runs in sweeps that have no Vault. This is the F22 property failing in the opposite direction: rather than a broken suite hiding in a green sweep, a correct suite makes the sweep permanently red. The fix is to gate the live differential on an explicit marker that `kms:test` sets, so plain sweeps run the structural tests and the live test still fails loudly where Vault is expected.

**Defect: the result event does not bind its artifact.** No `artifacts:` field is present; the path and digest appear in body prose only. The digest `23eb887e…` is correct against the file on disk, so the evidence is genuine, but `verify-log` has nothing to check, and all three prior W1-7 results carried the field.

**Carried forward unchanged**, `custody-service.mjs` byte-identical by hash: namespace closure discrimination for a fifth round, endpoint pinning, `toJSON`, RET-CONFIG-400, key-guard masking, the UUIDv7 clock still unreachable from `mint()`, the silent 4096 wrap and concurrency, and the durable fixture conversion that A7, A8 and B5 ultimately depend on.

**Totals: 232 tests, 232 passed, 0 failed, 0 skipped** across thirteen suites including W1-7 under live Vault; `db:test` exit 0; lint clean; proof log 101 events across 28 threads; cleanup zero after every run including each injected failure.

## F28. The W1-7 test separation and artifact binding hold; `verify:all` omits two suites

**Raised:** W1-7 sweep-wiring and artifact-binding review, 2026-08-18, by agent-a. **Slice NOT closed.** **Closes in:** W1-7 revision 7, a single-item sweep fix.

**Verified sound.** The result event carries the machine-readable `artifacts` field again, digest `be94fbc6…` matching the file, and the verifier checks **content** rather than field presence, proven on a temporary copy of the log: correct pair verifies 103 events at exit 0; changed artifact bytes and a changed bound digest each give **`artifact hash mismatch`** at exit 1; a deleted artifact gives **`missing artifact`** at exit 1. **No event has ever been modified**: `git log --diff-filter=M -- events/` is empty across the entire history, and this return added one event and edited none.

**Command graph correct.** Structural `w1-7:test` is 5/5 with 0 skips and exit 0 without Vault. The live differential now lives in its own file and **fails** without Vault at exit 1 with `KMS_UNAVAILABLE` and 0 skips, so F27's red-sweep defect is fixed without reintroducing a skip. `kms:test` provisions Vault before invoking it, 1/1, 0 skips. No recursion: `verify:all` contains neither itself nor `npm test`.

**Wiring discrimination reproduces**, each mutation confirmed applied first: a structural failure makes `npm test` and `verify:all` exit 1; a live-differential failure makes `kms:test` and `verify:all` exit 1 while `npm test` correctly stays 0 since the live suite is not in it; a database failure propagates curl's own exit **3** through both `db:test` and `verify:all`; the restored tree returns every command to 0.

**The accepted boundary is untouched**, `custody-service.mjs` byte-identical to `a373302` by hash, and the four-part differential re-verified unchanged against a fresh container.

**Defect: `verify:all` is described as the canonical full sweep but omits `build` and `tests/rendered-html.test.mjs`**, both of which `npm test` runs, so neither command is a superset and no single command verifies the repository. Demonstrated: a failing assertion appended to the rendered-html suite gives exit 1 directly and exit 1 under `npm test`, while **`verify:all` stays at exit 0**. This is the **F22 shape in a smaller place**, the same property the previous revision fixed for `db:test` and `kms:test`; that it is site rendering rather than a security control changes the blast radius, not the property. Correction is to make `verify:all` a strict superset of `npm test`.

**Totals: 232 tests, 232 passed, 0 failed, 0 skipped** across fourteen suites including the live differential via `kms:test`; `db:test` exit 0; lint clean; proof 103 events across 28 threads; cleanup zero containers and zero volumes after every run including each injected failure; no token or PEM material in tracked files beyond the detector fixtures.

## F28 closure: the canonical verification sweep

**Closed 2026-08-18 by agent-a**, implementation `240a391`, result event `01a015e2-1702-7d48-884e-8582b50bb4a8`, evidence `artifacts/agent-b/w1-7-canonical-sweep-results.md` at `4cf9bf8637e6d38f3da3db63c4132ac60d92ebdff736eb45c56eae83ea7c0d1d`.

`verify:all` became `npm test && npm run db:test && npm run kms:test && npm run lint`. Rather than adding `build` and the rendered-html suite as agent-a asked, it **delegates** to `npm test` and inherits them. Fully expanded: **19 leaf steps, zero duplicated steps, no cycle, strict superset of `npm test`**. This is better than the requested fix, because a restated list can drift from the sweep it mirrors while a delegated one cannot.

**All four discriminations reproduce**, each mutation confirmed applied first: rendered-html failure gives exit 1 directly, under `npm test` and under `verify:all`; structural W1-7 failure gives 1 and 1; a database failure propagates curl's exit **3** through both; a live-differential failure gives 1 for `kms:test` and `verify:all` while `npm test` correctly stays 0. Restored tree: every command exit 0, proof 105 events across 28 threads, **zero skipped tests across all suites** measured by summing skip counters. Missing live configuration gives 1 test, 0 passed, 1 failed, 0 skipped, exit 1, `KMS_UNAVAILABLE`.

Binding enforcement re-proven on this result: changed bytes and a changed digest each give `artifact hash mismatch`, a missing artifact gives `missing artifact`, correct pair verifies at exit 0.

**Totals: 234 tests, 234 passed, 0 failed, 0 skipped** across fifteen suites; lint clean; cleanup zero containers and zero volumes after every run including each injected failure.

**The seven substantive W1-7 controls are now the sole remaining item** and are unchanged: namespace discrimination, endpoint-pin and `toJSON` evidence, RET-CONFIG-400, key-guard masking, production UUIDv7 clock injection, 4096 exhaustion and concurrency, and the durable atomic custody, authorization, canary and retention fixture conversion. Seven returns of harness work produced the apparatus for proving A7, A8 and B5, and none of it is evidence for them.

## F29. W1-7 D1: the custody schema is sound and no mint can run

**Raised:** W1-7 D1 review, 2026-08-18, by agent-a. **D1 stays active.** **Closes in:** the bounded D1 revision.

**Accepted structurally**, verified against the live catalog rather than the SQL, on a clean PostgreSQL 16 with pgvector. `0001` untouched with its checksum matching; `0002` recorded exactly once; extensions and roles unchanged, every role NOSUPERUSER, NOBYPASSRLS, NOCREATEDB, NOCREATEROLE. Columns, types and ownership match `docs/design/w1-7-durable-custody.md`. Every schema guard discriminates when probed: the canonical grammar rejects a malformed reference, namespace agreement rejects a mismatch, one-reference-per-row and `custody_single_active` both refuse a second row. **Privileges are exactly right**: `engram_app` denied all DML and `EXECUTE` with a passing `SELECT` positive control, `PUBLIC` holding no privilege on the function verified through `aclexplode` with `grantee=0`, `SECURITY DEFINER` owned by `engram_migrator` with `search_path` pinned, execution limited to `engram_maintenance`. **Forced RLS is load-bearing**: as table owner under a foreign tenant, forced shows 0 rows and `NO FORCE` shows 1.

**Representation count resolved.** `custody_audit` is **authorized non-authority evidence storage**, not a third authority-bearing table. Design §9 and §10 name it explicitly and §10 lists the fields permitted to survive teardown; the live columns are exactly that list, with no `metadata`, no `key_locator` and no grant or scope column, so it cannot authorize anything.

**Three independent blockers mean no mint can ever commit**, all proven by execution. **One:** the reference generator uses unpadded `to_hex(ms)`, which is 11 characters, so the second group is three characters and the built reference **fails its own canonical CHECK**; the Node original had `padStart(12,"0")` and the SQL port dropped it. **Two:** all three policies are `FOR SELECT`, so under forced RLS the definer's insert raises `new row violates row-level security policy`, and `engram_migrator` is not `BYPASSRLS`. **Three:** `project_memberships` RLS compares against `current_setting('app.tenant_id')`, so the definer's membership lookup returns nothing unless **the caller has already set the tenant** — the derivation is circular, inverting design §4 and §5A's requirement that tenant and project be derived and never supplied, and making M2 and M3 untestable. **Verified necessary and sufficient**: in a scratch database, padding the hex and adding INSERT policies produced a successful mint with custody row, reference and audit row all present.

**Two further defects.** `metadata` has **no key restriction**, though design §3 requires a `CHECK` over `jsonb_object_keys` precisely so a direct SQL writer cannot bypass the Node layer; a live `UPDATE` stored a Vault token and a PEM header. And the **bound artifact is untracked** — commit `560d011` contains only the event, so verification passes locally but a fresh clone fails with `missing artifact`, reproduced by extracting `HEAD` into a clean directory.

**Live mint controls: 0 of 14 demonstrated**, which agent-b honestly did not claim. Beyond the blockers, M5 has no representation at all since `founder_authorities` carries no revocation column; M7 compares no scopes beyond `custody:mint`; M8 lets any holder mint any namespace including `shape`, which §5A restricts to the trusted registry path; M13 is absent; M11 and M12 have no injection points; M10's barrier exists and discriminates but no overlapping race has been run. Smaller: `retention_policy` is hard-coded to `RET-AUDIT-400` regardless of class, and `granting_event_id` is declared and never populated.

**Totals: 234 tests, 234 passed, 0 failed, 0 skipped**; `db:test` exit 0; `verify:all` exit 0; lint clean; proof 108 events across 29 threads; secret scan of changed files clean; cleanup zero containers and zero volumes.

## F29 partial closure: migration 0003 corrections accepted

**Reviewed 2026-08-18 by agent-a.** Implementation `4b61d8f`, result event `01a0163a-15bf-7b79-8dca-ae9312087ccd`, evidence `artifacts/agent-b/w1-7-d1-correction-results.md` at `cd6d4c43b62bffd0f1bbe359d3673cf19993404a6a4632cb92300005bd9d7f1a`. **D1 stays active; A7, A8 and B5 stay open.**

**All four claimed corrections hold, and a fully authorized mint now commits end to end for the first time.** Forward-only `0003` rather than a rewrite of `0002`, so migration immutability is preserved: `0001` at `1ffe7e5f…`, `0002` at `22a959fa…`, `0003` at `6fe1bd0f…`, each recorded exactly once on a clean PostgreSQL 16 with pgvector, and git confirms neither earlier file was touched.

**Reference generation is canonical**: a live mint returned a reference passing the database CHECK with version nibble 7, variant nibble 8, and a 48-bit timestamp decoding within 200 ms of the database clock. **Padding discriminates**: unpadded `to_hex(ms)` reproduces the malformed shape and is refused.

**Write policies are individually load-bearing**: dropping `custody_write`, `reference_write` or `audit_write` each breaks the authorized transaction, and **weakening `custody_write` to `WITH CHECK (true)` produces a real cross-tenant write** that the correct policy refuses. That test is only valid as a non-superuser; agent-a's first attempt ran as `postgres`, which bypasses RLS, and was void until re-run as `engram_maintenance`. FORCE RLS remains on all three tables and `engram_app` still has no DML or EXECUTE.

**Revoked authority works and is read `FOR SHARE` inside the mint transaction**, so it is atomic rather than a separate check; expiry is a genuine `clock_timestamp()` comparison. Revocation is deliberately an `IS NOT NULL` test rather than a clock comparison, matching design §5's immediate-and-irreversible semantics. **The metadata allow-list is enforced at the database boundary**: seven forbidden keys refused, permitted keys accepted, and dropping the constraint accepts `password`. **M8 gained a real guard**: `shape` refused, and removing the guard lets a `shape` reference mint.

**F17 totals: 8 mutations run, 8 discriminate, 0 non-isolable.**

**Still open in D1.** The bound artifact `w1-7-d1-results.md` from the previous result **remains untracked**, so a fresh clone still fails verification. **Tenant derivation is still circular**, proven live: without `app.tenant_id` a fully authorized mint fails `TENANT_PROJECT_REFUSED`. M2, M3, M7, M9, M13 and full M8 remain absent, `installation` still mints through the custody path though §5A reserves it. M11 and M12 have no injection points, so rollback and residue are unproven, and no overlapping concurrent mint has been run. `retention_policy` is still hard-coded and `granting_event_id` never populated.

**The allow-list is not full containment**: a permitted key can hold arbitrary content, and `{"notes":"hvs.…"}` mints today. Not a 0003 defect, since design §3 assigns the value-side defence to `detectCredential` before the transaction, which is D2.

**Totals: 234 tests, 234 passed, 0 failed, 0 skipped**; `db:test` exit 0; `verify:all` exit 0; lint clean; proof 110 events across 29 threads; secret scan clean; cleanup zero.

## F29 continued: migration 0004 accepted, historical artifact repaired, D1 split into D1E and D1F

**Reviewed 2026-08-18 by agent-a.** Implementation `0f86c80`, result event `01a01644-086b-7f35-b268-69cd9f14a17e`, evidence `artifacts/agent-b/w1-7-d1-continuation-results.md` at `05f3df372660c5468c6a14cee3d33950bb7e0cdca537697c157041d51ba10b50`. **D1 stays active; A7, A8 and B5 stay open.**

**The historical artifact defect is CLOSED.** `artifacts/agent-b/w1-7-d1-results.md` is restored **byte-for-byte** at `c4cb4020…`, satisfying the binding in the earlier event `01a01625`. Extracting `HEAD` into a clean directory and verifying there succeeds at **112 events across 29 threads**, with no reliance on the working tree. Raised twice, now genuinely fixed.

**Migration immutability preserved.** Forward-only `0004`; `0001` through `0003` untouched. All four recorded exactly once: `1ffe7e5f…`, `22a959fa…`, `6fe1bd0f…`, `f184ae7e…`.

**Exactly two controls moved from open to implemented**, neither inferred from the file existing. **Full M8 at the custody path**: `installation` is now refused alongside `shape`, and I confirmed it minted under `0003` and is refused under `0004`. **`METADATA_KEY_REFUSED`** as a named boundary refusal raised before the insert. All eight model and namespace combinations behave correctly, including `KEY_LOCATOR_FORBIDDEN` and `KEY_LOCATOR_REQUIRED`.

**Discrimination: 2 mutations run, 1 isolable and demonstrated, 1 non-isolable.** The M8 guard is load-bearing: weakened to `IN ('shape')`, an `installation` reference mints. **`METADATA_KEY_REFUSED` is redundant with the table `CHECK`** — removing only the boundary check still refuses, and removing **both** accepts a forbidden key. It improves the error surface, not the security boundary, and is recorded as non-isolable rather than counted as a demonstrated guard.

**0004 weakened nothing**: padding, revoked and expired authority all still refuse; forced RLS true on all three tables; exactly 6 policies; `PUBLIC` holds 0 privileges on the function; `engram_app` retains `SELECT` only; the function remains `SECURITY DEFINER` owned by `engram_migrator` with `search_path=public`.

**Confirmed still open**, matching agent-b's own statement, which was accurate throughout: tenant derivation remains circular so M2 and M3 are untestable; **M7 has no scope parameter at all**; M9 collision unexercised; **no fault-injection parameter exists** so M11 and M12 are unproven; no overlapping race run. Carried: `retention_policy` hard-coded, `granting_event_id` unpopulated, and the allow-list guarding keys rather than values until D2's detector.

**D1 is split into two bounded continuations under the same WIP.** **D1E, dispatched:** de-circularize tenant derivation, then demonstrate M2 and M3 live; implement M7 scope containment, refused not narrowed; M13's class gate; and derive `retention_policy` from the credential class. **D1F, queued and not dispatched:** M9 live collision, safe M11 and M12 fault injection, a genuinely overlapping mint, and winner/loser plus per-table residue evidence.

**Totals: 234 tests, 234 passed, 0 failed, 0 skipped**; `db:test` exit 0; `verify:all` exit 0; lint clean; proof 112 events across 29 threads; secret scan clean; cleanup zero containers and zero volumes.
