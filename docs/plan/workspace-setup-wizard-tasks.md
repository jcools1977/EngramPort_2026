# Bounded tasks: workspace setup wizard

Status: proposed
Date: 2026-08-14
Related: `docs/plan/workspace-setup-wizard-plan.md`, `docs/adr/0012-workspace-setup-wizard.md`

Each task is independently verifiable and carries one verification story. Acceptance criteria are written so that a reviewer can tell from evidence alone whether the task is done. Every task inherits the definition of done in specification section 31 and this project's standard: it works, it was proven to work, it was proven to fail when it should, it is committed and pushed.

`Runnable now` means Node only, no Docker, no database, no network. That distinction is load-bearing while the project has no PostgreSQL host.

---

## W0-1: Workspace setup plan schema and deterministic compiler

Phase W0. Runnable now. **This is the first handoff.**

Define `workspace.setup.yaml` and compile it into an ordered, typed, idempotent step list with an action digest per consequential step.

Acceptance criteria:
1. Schema rejects unknown fields, as `event-v0.schema.json` does.
2. Compilation is deterministic: identical input yields an identical step list and identical digests across runs and machines.
3. Every step declares whether it is consequential, and every consequential step carries a digest over its exact parameters using the canonicalization named in the task.
4. Changing any material parameter changes that step's digest; changing a comment or key order does not.
5. Steps declare dependencies, and the compiler refuses a plan whose dependencies are cyclic or unsatisfiable, with a named error.
6. Negative controls, each asserting the specific error: cyclic dependencies; a step granting a scope the founder does not hold; a grant outliving its granting principal; a guest grant exceeding the defaults in the onboarding design; an agent grant exceeding its owner's; a plan requesting a GitHub permission outside the ADR 0012 enumerated set.
7. A positive control accompanies each negative.

## W0-2: Dry-run executor

Phase W0. Runnable now. Depends on W0-1.

Execute a compiled plan in dry-run mode, producing the complete step transcript with no side effect.

Acceptance criteria:
1. Dry run performs no filesystem write outside a temporary directory, opens no network connection, and touches no database. Proven by a test that fails if any is attempted.
2. Transcript names every step, its digest, its consequential flag, and its declared effect.
3. Dry run and real run produce the same step sequence for the same plan.
4. A plan refused by the compiler cannot be dry run.

## W1-1: Setup session, delegation, and teardown

Phase W1. Runnable now for the session state machine; founder OIDC may be stubbed behind an interface.

Acceptance criteria:
1. A session binds to an authenticated founder principal and carries scopes narrowed to setup with an absolute expiry.
2. No standing wizard principal or actor exists in any code path. Proven by a test asserting no identity outlives a session.
3. An expired or revoked session cannot execute an approved step, with a named error.
4. Teardown revokes delegation and retains no credential; an abandoned session leaves no partial authority.
5. Negative controls: expired session; revoked session; step executed under a different session than the one approved; replayed approval after teardown.

## W1-2: Setup-time credential threat model

Phase W1. Document, not code. Prerequisite for W3 per ADR 0012.

Acceptance criteria: covers provisioning credentials, GitHub App private key, and webhook secret; states storage, lifetime, encryption, and revocation for each; names what an attacker gains at each compromise point; reviewed and accepted through an EngramPort event before W3 begins.

## W1-3: Grouped approval, digest scope, and portable plan identity

Phase W1. Runnable now. Resolves C3, F2 and F7 as one unit, because they are one problem seen from three angles.

Bind a grouped approval to the ordered `(step_id, action_digest)` sequence, widen each action digest to cover `step_id`, `kind` and `parameters`, and give a compiled plan a deterministic identity that survives serialization so the approval can be the plan's durable brand.

Acceptance criteria:
1. Every `action_digest` covers `step_id`, `kind` and `parameters` under a canonicalization whose profile name reflects the changed field list.
2. A compiled plan carries a `plan_digest` over its ordered `(step_id, kind, action_digest)` sequence, identical across processes and serialization round-trips.
3. A serialized plan can be reloaded, and reloading verifies the digest rather than trusting it.
4. A grouped approval records the ordered `(step_id, action_digest)` list and the `plan_digest`.
5. Approval and execution both verify the presented plan's identity against the approval's, and refuse on mismatch. Self-consistency of a plan is never accepted as verification.
6. Per-step parameter differences are surfaced between an approved plan and a presented one.
7. Adversarial controls for reordered, inserted, removed, substituted and modified steps, each refused with a specific error, each with a paired positive control.
8. A hand-built step list still cannot be approved or executed.

## W1-4: engramport-action-v3, full reviewable-record coverage

Phase W1. Runnable now. Closes F8.

Widen the action digest to bind the complete reviewable step record, so the surface a founder reviews and the surface an approval covers are the same set by construction rather than by discipline.

Acceptance criteria:
1. `engramport-action-v3` binds `step_id`, `kind`, `parameters`, `consequential`, and `depends_on` in its exact stored order.
2. Coverage is deny-by-default: the profile is defined as the whole step record minus an explicit, enumerated exclusion list. A field added to the step record later is covered unless someone deliberately excludes it.
3. Only `action_digest` itself is excluded. Any future presentation-only exclusion is named in the profile definition and justified there.
4. `engramport-plan-v1` continues to bind the action profile name, so a v2 plan and a v3 plan of otherwise identical steps have different plan digests and cannot be confused.
5. A serialized plan carrying `engramport-action-v2` is refused at load with a specific error.
6. The loader digests exactly what the wire carries and MUST NOT normalize, sort, or default any covered field, since normalizing would launder a forgery into validity.
7. Adversarial controls for altered `consequential`, and for added, removed and reordered dependencies, each rebuilt with fully self-consistent action and plan digests, each loading as internally valid and each refused against the genuine session-bound approval.
8. The structured diff names the field that changed, including `consequential` and `depends_on`. A diff reporting a step as modified without saying what differs is not acceptable.
9. Paired positive controls throughout, plus serialization round-trips.
10. Every changed fixture digest is explained exactly.

## W1-5: Trusted authority resolver, atomic bootstrap, concurrency proof, and dispatch gate

Phase W1. **COMPLETE AND ACCEPTED 2026-08-17**, after three bounded revisions. Implementation `f8a8b86` plus residue correction `4683345`, result event `01a01098-1570-7af5-b9df-7e1838c917d8`, evidence `artifacts/agent-b/w1-5-acl-transaction-results.md` at `67abf71a8cc864d0bd9533a8b9cd0a8610ece99f7fe4ad17ab1594417e9ff2c5`. `npm run db:test` exits 0 twice from clean state with **77 assertions, 0 errors**.

**Closes A1, A2, F12 and F13.** **A3 through A9 remain absent**, so Tier A is incomplete and **W3-1 stays mechanically ineligible**, verified: today's registry refuses at `DISPATCH_TIER_A_INCOMPLETE:A3`.

Scope below is retained as the acceptance contract it was judged against.

Scope, established by W1-2 and unchanged here: trusted authority resolver deriving held authority from a trusted store given only an authenticated `principal_id`; atomic founder bootstrap creating tenant, project, principal and owner membership in one transaction; a concurrent-founder datastore proof; and the revision-bound mechanical dispatch and evidence gate.

Owns Tier A controls **A1** and **A2**. Closes finding **F12**; **F13** closes with A2. Depends on: the live database path, now available.

**Why W1-5 outranks the other newly unblocked work.** Five workstreams became eligible when C1 closed, and this one was chosen because it is the **dependency root**, not because it is the smallest or the newest:

- **W1-6** needs W1-5's resolver before A6 can derive granter authority rather than accept it.
- **W1-7** needs both, since minting resolves authority through the resolver and its sealed rows must be detector-clean.
- **Tier A completion** requires A1 and A2, which only W1-5 owns; without them no Tier A control set can be complete for any revision.
- **W3** is mechanically ineligible until every Tier A control passes, so W3-1 cannot begin at all until this lands.
- It establishes the **trusted bootstrap authority boundary**, the point at which authority stops being caller-asserted. F12 records that `start` currently accepts a caller-supplied `founder_authority` object, so every downstream authority claim in the wizard presently rests on an assertion. Nothing built on top of that is sound until it is resolved.

The alternatives were ranked and deferred deliberately: **v0.1 findings two and three** are small and real but unlock nothing; **W2-1** provisioning is downstream of the boundary and would build on caller-asserted authority; **onboarding T2** is a schema task that no other task is waiting on; **Re:PORT R3** is valuable and orthogonal, unlocking only the Re:PORT chain. W1-5 unlocks the largest dependency chain in the plan.

**The v0.1 end-to-end gate remains open** and W1-5 does not close it. Specification section 27 requires append, discover, respond and handoff end to end under concurrent load, which is append-transaction and API work that no current task covers.

## W1-6: Credential detector, ingest boundary, shape selection, and grant authorization

Phase W1. **NARROWED AND CLOSED 2026-08-17 for its Node boundary.** Implementation `58c48e2` plus revision, result event `01a010cb-a942-75c1-a662-ea14f9924f4e`, evidence `artifacts/agent-b/w1-6-revision-results.md` at `9d547253e24dbee9b03cd9c5f6c4b18ca189dc81e4705517bc7e9149c12fe1e0`.

**Closes A3, A4, A5, A9, F9 and F10**, each independently verified. **A6 and B9 are NOT closed** and are re-homed to **W1-8** below, because they require live grant and custody tables that this work does not provide. W1-6's registered scope is therefore **not** complete as originally written; it is narrowed, and the remainder is named and owned rather than quietly dropped.

Scope, established by W1-2 and unchanged here: the credential detector; the executable ingest boundary `ingestCredentialBearingRecord` with its fail-closed points and controls N1–N14 plus P; trusted registry-derived shape selection; grant-write authorization; and the twelve invocation-resolution comparisons with controls G1–G14 plus GP.

Owns, as narrowed: Tier A controls **A3**, **A4**, **A5**, **A9**, and findings **F9** and **F10**, all closed. **A6 and Tier B control B9 moved to W1-8.**

**Why W1-6 is next.** It owns five of the seven outstanding Tier A controls, so it is the largest single step toward Tier A completion and therefore toward W3-1 becoming eligible at all. Only W1-7's A7 and A8 remain behind it. It is also where F9 and F10 close, the two reproduced findings that have been open longest: a plan field accepting an inline credential, and the absence of any credential detector despite three specifications assuming one.

## W1-8: Live grant authorization and invocation resolution

Phase W1. **Not dispatched.** Split out of W1-6 on 2026-08-17 because it requires a live datastore that W1-6's Node boundary does not provide.

**Sequenced after W1-7, decided 2026-08-17.** W1-8 binds the live resolver to grant and custody rows, and W1-7 is what defines the canonical custody boundary: the custody service, namespace-specific atomic minting, and custody-row revocation semantics. Running W1-8 first would bind the resolver to a temporary custody store and then require rebinding once W1-7 lands, which is rework and, worse, would let an interim custody shape harden into the thing the resolver was proven against. **W1-7 before W1-8.**

Scope: back the injected `deps.store` of `packages/git-adapter/src/credential-boundary.mjs` with real PostgreSQL grant and custody tables; derive `serverNow()` from the **database** clock rather than a constant; and prove, against live rows under `npm run db:test`, grant existence, tenant and project ownership, principal, actor and scope comparison, expiry, revocation with an invocation-time re-read, and custody-row state.

Owns Tier A control **A6** and Tier B control **B9**, both re-homed from W1-6. Depends on: W1-5's resolver, available; and a live PostgreSQL path, available since C1 closed.

**The logic already exists and is tested against synthetic stores.** What is missing is the datastore behind it, so this is an integration task rather than a design task. `resolveInvocation` already performs an invocation-time re-read and calls a `serverNow()` abstraction, which is the correct shape to bind to a real store.

## W1-6a: Genuine guard-removal mutations for the 28 N/G controls

Phase W1. Runnable now, Node only. **COMPLETE AND ACCEPTED 2026-08-17.** Closes **F17** at **19 of 28 demonstrated, 9 of 28 structurally non-isolated**. Implementation `8ec967e`, result event `01a01150-0b05-7b85-985b-eaa9c7228843`.

Replace the `guard-removal discrimination` loop in `tests/wizard-w1-6.test.mjs`, which supplies failing inputs and asserts refusal, with genuine executable mutations: for each of N1–N14 and G1–G14, remove or disable that control's specific guard, demonstrate the previously refused fixture is then **accepted**, and restore.

**Evidence-integrity task, not a security-behaviour task.** It changes no accepted production behaviour and reopens nothing. It is sequenced first because W1-7 and W1-8 will add security controls whose evidence rests on this suite's discrimination pattern, and a pattern that does not discriminate should not be inherited.

Acceptance criteria:
1. Each of the 28 controls has a mutation naming the specific guard removed.
2. Each mutation demonstrates the fixture is **accepted** with the guard gone, not merely refused with it present.
3. Every mutation is reverted, and a post-suite assertion proves the shipped module is unmutated.
4. Where a control cannot be mutated in isolation, that is stated per control with the reason, rather than counted as demonstrated.
5. Production behaviour is unchanged: A3, A4, A5, A9, F9 and F10 stay closed and are not reopened.

## W1-7: Custody service, atomic minting, signing boundary, canary harness, and retention

Phase W1. **DISPATCHED 2026-08-17** as the sole eligible item, after the section 10 KMS prerequisite was verified reachable under **C7**. Sequenced before W1-8 so the live resolver binds to the canonical custody boundary.

Scope, established by W1-2 and unchanged here: the custody service and its three custody models; namespace-specific atomic reference minting per the section 5A contract with controls M1–M13 plus MP; the synthetic KMS or HSM signing boundary; the differential canary harness with a vulnerable variant per sink; and retention enforcement for the **six** named policies RET-SESSION, RET-OPS-90, RET-AUDIT-400, RET-GRANT-400, RET-CONFIG-400 and RET-VERIFY-104.

**Control ownership, corrected 2026-08-17 under F18.** This entry previously read "Owns Tier A controls A7 and A8, and Tier B controls B1 through B5", which overclaims.

- **Closes A7 and A8**, the two remaining Tier A controls not owned by W1-5 or W1-8.
- **Closes B5**, the section 10 canary harness, shared with W3-1 and demonstrable now on synthetic material.
- **Builds, but does not close, B1 through B4.** Section 11 assigns them to W3-1 and their gate column reads "W3 completion". W1-7 produces the boundary they are later asserted against, against a real key, in W3-1. Demonstrating them on a synthetic key is evidence the boundary behaves, not closure of the control.
- **Does not touch A6 or B9**, which belong to W1-8. The Tier A table still records A6's owner as W1-6; that row is stale and is carried in F18 rather than corrected, because revision 8 is digest-pinned.

Depends on: W1-5's resolver and W1-6's detector, since minting resolves authority and sealed rows must be detector-clean. Both available and accepted.

---

**Registration is not satisfaction.** Recording these three tasks satisfies no Tier A control, closes no finding, and authorizes no dispatch. Their presence here makes the W1-2 dispatch gate enforceable: W3-1 fails closed unless the evidence registry reports every Tier A control passed for the exact current revision of `docs/security/setup-credential-threat-model.md`. ~~while C1 blocks A2 that condition cannot be met.~~ **Corrected 2026-08-17: C1 closed and A2 closed with accepted W1-5.** The condition still cannot be met, because **A6, A7 and A8 are outstanding**; the gate refuses at `DISPATCH_TIER_A_INCOMPLETE:A6`. The gate treats their absence, and their unmet controls, as reasons Tier A cannot be dispatched rather than as waivers.

---

## W2-1: PostgreSQL and pgvector provisioning driver

Phase W2. Blocked on a Docker-capable host.

Acceptance criteria:
1. Driver interface with connect-existing and provision-managed implementations.
2. Startup validates pgvector availability and embedding dimensions, and refuses a mismatch per specification section 20.2.
3. `0001_canonical_core` applies with checksum verification.
4. The v0.1 isolation and immutability failure tests pass against a live database, with actual server and extension versions recorded. ~~This closes the outstanding v0.1 gate.~~ **STALE CLAIM, FLAGGED 2026-08-17 and not relied upon.** Isolation and immutability passing live does **not** close the v0.1 gate. Those tests already pass, closed under F16 on 2026-08-17, and the gate is still open. Specification section 27 additionally requires end-to-end append, discover, respond and handoff **under concurrent load**, which no current task covers. `docs/constraints.md` states this correctly and is authoritative; this criterion's final sentence was written before the distinction was understood and is retained struck through rather than deleted, so the error is visible rather than erased.
5. The three review findings on the open v0.1 thread are resolved: identity and authorization tables not writable by the append role, a `TRUNCATE` guard with a negative control, and a comment recording that the delegation trigger's early return depends on RLS.
6. Portability proven on standard PostgreSQL and on a managed distribution.

## W3-1: GitHub App connector

Phase W3. Blocked on W1-2 and network access.

Acceptance criteria:
1. Requested permissions match the ADR 0012 enumerated set exactly, and a test fails if the manifest requests more.
2. Merge rights and default-branch write are absent.
3. Webhook signature verification rejects unsigned, wrongly signed, and replayed payloads, each with a named error.
4. Fetching is SSRF-safe per specification section 14.5, with negative controls for private address ranges and dangerous URI schemes.
5. Private key and webhook secret are envelope-encrypted and unreadable without the key-encryption key.
6. A revoked installation stops working immediately.

## W4-1: Bootstrap pull request generator

Phase W4. Generation runnable now; delivery blocked on W3-1.

Acceptance criteria:
1. Generates `AGENTS.md`, `PROTOCOL.md`, `engramport.yaml`, actor records, and CI verification, byte-identical for identical input.
2. Delivered on a new branch as a pull request, never merged.
3. Content bound to an approval digest; a changed file invalidates it, proven by a negative control.
4. Pushing to a default branch is refused by the wizard even when the token would permit it.
5. CI on the branch runs the verifier and fails on a malformed log.

## W5-1: Participant registration and grant assignment

Phase W5. Depends on onboarding T1 through T4.

Acceptance criteria:
1. Registers humans, Claude, Codex, friends, and external agents through one code path with no first-party privilege.
2. Trust is assigned, never read from participant-supplied or provider metadata, proven by a negative control supplying `trusted_agent` and observing `untrusted_agent`.
3. Capabilities and groups are routing only; a negative control proves a capability grants no authority.
4. Guest defaults enforced: one project, `untrusted_agent`, at most fourteen days.
5. An agent's grant neither exceeds nor outlives its owner's.
6. Every grant traceable to a granting event.

## W5-2: Expiring welcome package issuance

Phase W5. Depends on onboarding T1 and T4.

Acceptance criteria: packages verify through the T1 verifier; expiry is absolute and enforced at verification; issuance records manifest digest, part digests, and every included event id per specification section 14.9; a revoked participant's package fails verification.

## W6-1: MCP and CLI configuration generation

Phase W6.

Acceptance criteria:
1. No generated file contains a credential; secrets are displayed once and referenced by name thereafter, proven by a scan asserting no secret material in output.
2. Generated configuration satisfies specification section 18 safe defaults: no implicit project, no hidden writes, visible idempotency.
3. A participant completes a real append using only generated configuration.
4. Revoking the participant makes the configuration stop working.

## W7-1: Authorized history import

Phase W7.

Acceptance criteria:
1. Import scope bounded by the installing principal's read authorization, not the App's reach; a negative control proves unauthorized content is refused.
2. Imported events carry `trust=imported` with source repository, commit, and path preserved.
3. No fabricated historical sequence numbers, per specification section 17.4.
4. Planted secrets are detected and quarantined before any embedding or external model call.
5. Embedding failure does not roll back an import.
6. Imported prose containing instructions is stored as inert data; an adversarial fixture proves no privileged action results.

## W8-1: Verified test relay with denial control

Phase W8.

Acceptance criteria:
1. Two registered participants complete publish, discover, respond, and complete with no human copying a message body.
2. The mandatory denial control runs: an unauthorized append is refused with the expected error.
3. Setup reports success only when both are observed; a test proves that suppressing the denial control causes setup to fail rather than pass.

## W9-1: Resumability, idempotency, and audit

Phase W9.

Acceptance criteria:
1. Re-running a completed setup is idempotent and produces no duplicate grants.
2. An interrupted setup resumes from its last committed step; a negative control interrupts between approval and execution and proves no partial authority.
3. An audit query returns the complete grant chain for every participant.
4. The metrics of specification section 19 relevant to setup are emitted, including authorization denials.
