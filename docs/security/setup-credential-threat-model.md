# Setup-time credential threat model

Status: revision 3, pending final read-only adversarial review
Owner: agent-a (architecture)
Date: 2026-08-14
Task: W1-2
Revision basis: agent-b second adversarial review, `artifacts/agent-b/w1-2-rev2-adversarial-review.md`, digest `a308c6fe1eb97ffaffb319a12538d4085b6ccc5ca704ade1eb0f145c8695acce`. Verdict: tightly bounded revision required, not yet accepted.
Related: `docs/adr/0012-workspace-setup-wizard.md`, `docs/constraints.md` C6, `docs/schemas/capability-reference-v1.schema.json`

## 0. Status language

| Label | Meaning |
|---|---|
| **[IMPLEMENTED]** | Code exists, is tested, and the specific property has been verified by probe. The scope of the claim is stated, not implied |
| **[TEST-GATED]** | A prerequisite that must be demonstrated with named evidence before a specific transition. Not yet true |
| **[FUTURE]** | A requirement on work not yet begun, with an owning task. Not yet true, not yet gating |

**Nothing is enforced because it is written here.** Labels appear on rows in section 3 and on each requirement in the section 12 traceability matrix. Revision 2 claimed every protection carried a label while many normative paragraphs did not; the matrix is now the place where that claim is actually true, and prose elsewhere is explanatory.

**Owning tasks named below are not all in the canonical register yet.** W1-5 (authority resolver and bootstrap), W1-6 (credential detector and ingest layer), and W1-7 (custody service) are named here so requirements have owners. **They must be registered in `docs/plan/workspace-setup-wizard-tasks.md` before Tier A can be dispatched.** Registration is not part of W1-2.

## 1. Purpose

The wizard is the moment of maximum privilege and minimum verification. It authenticates a human, provisions a database, installs a repository connector, mints identities, signs welcome packages, and opens a pull request, all before any audit trail exists to constrain it. Every credential the product will ever hold passes through it once.

This document is that model, and its purpose is to be falsifiable.

## 2. Threat actors

| Actor | Capability |
|---|---|
| **A1** Curious insider | Reads the repository, event log, CI output, backups, Re:PORT |
| **A2** Compromised agent | Executes as a registered actor, reads its context, appends events |
| **A3** Malicious plan author | Writes or edits `workspace.setup.yaml` |
| **A4** Host-local observer | Process environment and arguments, `ps`, `/proc`, dumps, shell history, editor state, temp files |
| **A5** Repository reader | Clones the repo, including a guest holding a welcome package |
| **A6** Compromised provider | Controls a connector endpoint or MCP server. Supplies descriptor bytes |
| **A7** Caller of the setup API | Invokes setup entry points with chosen arguments |
| **A8** Concurrent caller | Races another caller through an unguarded check-then-act. Added in revision 3 |

Not defended against: an attacker controlling the founder's authenticated session at setup time, or the host kernel.

## 3. Credential inventory

Fourteen classes. Every row maps to a Tier C gate in section 11. A credential absent from this table has no sanctioned path through setup.

| # | Credential | Owner | Custody | Consumer | Status | Tier C gate |
|---|---|---|---|---|---|---|
| 3.1 | Founder OIDC transients (auth code, PKCE verifier, ID token) | Founder / IdP | Never stored; memory for one exchange | Token exchange, identity verification | **[IMPLEMENTED]** narrowly, see below | C8 |
| 3.2 | OIDC client secret | Tenant | Model B | Token exchange service | **[FUTURE]** W1-5 | C8 |
| 3.3 | GitHub App private key | Tenant | Model B, KMS/HSM only | Connector signing service | **[TEST-GATED]** section 10 | C1 |
| 3.4 | **GitHub installation access token** | GitHub, minted per operation | Model C, never at rest | Connector API caller | **[FUTURE]** W3-1 | C9 |
| 3.5 | GitHub webhook secret | Tenant | Model B | Webhook receiver, HMAC verification only | **[FUTURE]** W3-1 | C10 |
| 3.6 | KMS/HSM authorization (workload identity) | Tenant | Held by the platform, not the app | Custody service only | **[FUTURE]** W1-7 | C11 |
| 3.7 | Key-encryption key | Tenant, in KMS | Never in the application | Custody service | **[FUTURE]** W1-7 | C11 |
| 3.8 | Welcome-package signing key | Tenant | Model B, KMS or signing service | Package issuer | **[FUTURE]** W1-7 | C12 |
| 3.9 | **Welcome invitation token** | Tenant, issued to invitee | Hashed at rest (`token_sha256`), plaintext shown once | Redemption endpoint | **[FUTURE]** W4 | C13 |
| 3.10 | Database provisioning credential | Founder's provider | Model C, one step | Provisioning driver | **[FUTURE]** W2-1 | C2 |
| 3.11 | Database runtime credential | Tenant | Model B, secret manager | Application runtime | **[FUTURE]** W2-1 | C3 |
| 3.12 | Connector authorization (Composio/MCP) | Granting participant | Model A, reference only | Connector runtime | **[FUTURE]** W3-1 | C14 |
| 3.13 | Model provider token | Participant or tenant | Model A | Process making the call | **[FUTURE]** | C15 |
| 3.14 | Temporary agent credential | Agent's owning principal | Model C | Runner adapter, one run | **[IMPLEMENTED]** narrowly, see below | C4 |

### 3.1 detail

Setup requests **identity, not delegated access**: no refresh token is requested, so there is nothing to store or destroy. **[IMPLEMENTED]** `SetupSessionManager.start` refuses an authenticated identity carrying any key other than `principal_id`, verified by probe. **Scope:** the session object only. It says nothing about the OIDC client, the exchange, or state outside that interface, which is **[FUTURE]** W1-5.

### 3.4 detail: GitHub installation access token

The actual bearer credential used for GitHub API calls, absent from revision 2 which mentioned it only inside the private-key row.

| Property | Value |
|---|---|
| Issuer | GitHub, in exchange for a JWT signed by the App private key |
| Owner | GitHub; the tenant holds it only transiently |
| Custody | **Model C.** Held in memory for one operation. Never written to disk, an event, a plan, a log, or a process environment |
| Consumer | The connector's API caller, in-process |
| Scope | The installation's permissions, narrowed by the ADR 0012 enumerated set |
| Issuance | Minted per operation, immediately before use |
| Expiry | GitHub-defined, at most one hour. Setup MUST NOT extend or cache beyond a single operation |
| Rotation | Not rotated; re-minted |
| Revocation | Uninstalling the App invalidates outstanding tokens; local destruction is still required so a cached token cannot outlive its purpose |
| Teardown | Destroyed at operation completion, before the calling frame returns |

### 3.9 detail: welcome invitation token

A real credential already in the design: `schemas/invitation-v0.schema.json` requires `token_sha256`, and the welcome protocol states the plaintext token is never stored. Setup issues welcome packages, so its lifecycle belongs here.

| Property | Value |
|---|---|
| Issuer | The inviting principal, through EngramPort |
| Owner | The invitee once delivered |
| Custody | High-entropy, **hashed at rest**, plaintext displayed exactly once and never persisted by EngramPort |
| Consumer | The redemption endpoint, which compares a hash |
| Scope | The right to **attempt** redemption. It never carries the grant; the grant is resolved from the invitation record |
| Issuance | At package generation, bound to one invitation |
| Expiry | Absolute, at most fourteen days for guests per the onboarding defaults |
| Reissue | A new invitation with a new token. Tokens are never re-sent, because a re-send implies retention |
| Revocation | `invitation.revoked` flips projected status; redemption checks status, so a leaked token fails even though its bytes remain valid |
| Teardown | Offboarding the issuer expires every invitation they issued that is still open |

### 3.14 detail

**[IMPLEMENTED], narrowly.** PW1 passes the runner an object carrying exactly the actor's scopes; supervisor scopes structurally cannot reach it, verified by probe. **What does not exist:** a token value, minting, expiry, an authorized-call check, or revocation. The property is **scope separation**, nothing more. The rest is **[FUTURE]** PW4 and PW7.

## 4. Discovery is not authority

A connector advertises what it can do. Those are bytes from A6.

1. **Discovery returns descriptors.** A descriptor carries no credential, no provider locator, and no reference of any kind. It cannot address anything.
2. **Authority is a separate grant.**
3. **Invocation resolves the grant server-side at call time** and derives every locator from the custody store, never from descriptor bytes.
4. **An empty grant set beside a full capability list is the normal state.**

**Status: [FUTURE]**, owned by W1-6 and W3-1. No ingest validator, grant store, or resolver exists.

## 5. Minted references replace pattern-matched locators

Revisions 1 and 2 tried to distinguish an opaque reference from an opaque secret by its characters. Two reviews found four bypasses of successively tighter grammars, and the second review predicted the fifth without needing to find it: **an opaque provider token containing no forbidden punctuation is syntactically indistinguishable from a legitimate locator.** `ghp_<36-char-opaque-body>` is a real GitHub token and a perfectly ordinary identifier. No grammar admitting provider-chosen strings can reject it without rejecting valid references.

**Revision 3 removes the premise.** EngramPort **mints** every reference it stores, in the format `epr:<namespace>:<uuidv7>` with a closed namespace. A provider-supplied bearer token cannot be a minted reference, not because it looks wrong but because minting requires an authorized custody write that a provider cannot perform.

Provider locators, installation identifiers, and credentials live **only behind the custody boundary**, keyed by the minted reference. A grant document names `epr:installation:…` and `epr:credential:…`; the invoking code never receives the provider's real identifier or the credential.

Verified: the revised schema rejects the JWT, the GitHub token shape in both fields, the opaque high-entropy bearer that was predicted, the revision-2 `{manager, locator}` form, PEM, and a userinfo URL; and it rejects a descriptor carrying any reference at all. Namespaces are pinned per field after my own probe found an installation reference validating in the credential field.

**A minted reference is not proof of resolution.** Structural validity says only that EngramPort could have minted it. Section 6 covers what makes it authority.

## 6. Grant resolution: a grant-shaped document is not authority

Revision 2 permitted a forged but schema-valid grant to satisfy the documented invocation shape. Structural placement of a locator inside a grant payload is necessary and not sufficient.

**Required, [TEST-GATED] before W3, owner W1-6:**

1. A presented grant MUST resolve to a **live server-side record** by `grant_id`. The presented document is compared to the stored record and never trusted in its place.
2. The stored record MUST be `active`, unexpired against the **database clock** per C6, and bound to the invoking tenant, project, provider, and capability.
3. `granted_by_principal_id` is **never** accepted as proof. At grant creation the granting principal's authority is derived from the resolver of section 7, and the grant MUST NOT exceed or outlive it.
4. `installation_ref` and `credential_ref` resolve through the custody service at call time, for the authorized consumer only.
5. A grant-shaped document with no live stored record is refused with a distinct error, and the refusal is audited.

## 7. Bootstrap authority: resolver and the concurrent race

`SetupSessionManager.start` authenticates down to a `principal_id`, then accepts a caller-supplied `founder_authority` object and checks only that its id matches and that requested scopes and expiry are subsets **of that supplied object**. A7 can assert arbitrary founder scopes. Recorded as **F12**.

**Required, [TEST-GATED] before W3, owner W1-5:**

1. **Authority resolver.** Given an authenticated `principal_id` and nothing else from the request, held authority is read from a trusted store. `start` takes no `founder_authority` argument.
2. **Atomic bootstrap transaction.** Where no tenant exists, one operation creates tenant, project, principal, and owner membership. Partial failure leaves nothing.
3. **Concurrent bootstrap safety.** New in revision 3. Transactionality alone does not prevent a check-then-insert race: two callers, or two requests for one principal, can both observe "no tenant" and both attempt establishment. The invariant MUST be enforced by the datastore, through a uniqueness constraint or serializable isolation, not by an application-level check.
   - **Exactly one** establishment commits.
   - The loser is **deterministically** either refused with a distinct error or resolved onto the established tenant. Which of the two is a design choice; being nondeterministic is not.
   - No duplicate tenant, project, or owner-membership graph exists afterwards, and no principal holds two owner memberships for one project.
4. **Resolver independence.** The resolver's answer is uninfluenceable by the setup payload, including through a tenant hint, project slug, or scope request.

**Environment dependency, stated because the second review is right that it is not currently satisfiable:** a credible concurrency proof needs a real datastore with the isolation semantics being relied on. Constraint C1 records that no PostgreSQL 16 with pgvector host exists for either agent. **Tier A control A2 is therefore blocked on C1**, and cannot be closed by an in-memory simulation.

## 8. The credential ingestion interface

Revision 2 stated ingest obligations as prose inside an unreferenced `$defs` block, which a validator never evaluates. This section makes it an interface with named controls.

```
ingestCredentialBearingRecord(record, context) -> {ok: true, record} | {ok: false, code}
```

**It MUST fail closed before any of:** logging the record or any field of it, serialization to disk, wire or cache, event append, artifact registration, context package generation, subprocess launch, and provider invocation. "Fail closed" means the record is refused and nothing downstream observes it, including in an error path.

**Obligations:**

1. Recursively scan every string at any depth with the credential detector. Reject the whole record on any hit; never strip and continue.
2. Reject any string parsing as a URL carrying authority: userinfo, credential-named query or fragment parameters, or a scheme outside `https`.
3. Enforce a 64 KiB record ceiling and a maximum nesting depth of 16, so scanning cannot be exhausted.
4. Resolve every minted reference against the custody store; unresolvable, foreign-tenant, or revoked references are refused.
5. Resolve `shape_ref` against the **local** registry only. Provider bytes may neither register nor shadow an entry. Entries are immutable and versioned, and resolution pins a revision.
6. Fail closed on any detector, resolver, or registry error.

**Named negative controls, all owned by W1-6, gating A4 and A5:**

| Control | Expected |
|---|---|
| N1 | Nested secret at depth 5 in a descriptor `description` → refused, nothing logged |
| N2 | Secret in an unexpected field a future schema adds → refused |
| N3 | Unknown `shape_ref` → refused |
| N4 | Provider attempts to register a shape → refused |
| N5 | Provider `shape_ref` shadowing a local entry → refused, local entry wins |
| N6 | Detector throws → refused, fail closed |
| N7 | Registry resolver throws → refused |
| N8 | 65 KiB record → refused before scanning completes |
| N9 | Nesting depth 17 → refused |
| N10 | Userinfo URL in any string → refused |
| N11 | Minted reference from another tenant → refused |
| N12 | Revoked minted reference → refused |
| N13 | Refusal path emits no field value into logs or error text | verified by inspecting both |
| N14 | Time-of-check to time-of-use: registry entry mutated between resolve and use → refused or pinned revision used |
| **P** | Clean record with a resolvable local `shape_ref` → accepted, pinned to a registry revision |

## 9. Leakage sinks

| Sink | Control | Remediation |
|---|---|---|
| Plans | Compiler refuses credential-shaped values, fails closed | Delete with session |
| Events | Detection **before** acceptance | Immutable: provider rotation plus cryptographic erasure or audited tombstoning |
| Artifacts | Scan before registration | Digest pins bytes; as events |
| Logs, traces, **error text** | No credential in messages, error paths, or stack traces | Rotation, log purge |
| Re:PORT | Detection before generation and before any external model call, failing closed | Upstream: if no event holds it, none can narrate it |
| **Process arguments** | Never pass a credential as an argv element; visible in `ps` | Process lifetime |
| Process environment | Never. Readable via `/proc/<pid>/environ`, inherited by grandchildren | Process lifetime |
| CI logs, artifacts, caches | CI secret scanning, masked variables | Purge and rotate |
| Git object database and reflog | A committed then amended secret **remains reachable**; only pre-commit scanning is effective | Rewrite, force-push, and rotate. Assume compromised |
| Backups and snapshots | Inherit source classification | Rotation only; a backup cannot be selectively edited |
| Core and crash dumps | Disable or restrict for credential-handling processes | Purge |
| Shell history, editor swap, temp files | Never instruct a founder to paste a credential into a file or command line | Outside product control |

**Quarantine is not safety** unless the quarantine is itself a narrower secret store with defined deletion. **Rotation is the only reliable remediation** for any sink above.

## 10. Falsifiable synthetic custody harness

Revision 2 required "inspect logs, error paths, core dumps, backups and process environment". The second review is right that this proves nothing: no core dump means no bytes to inspect, an HSM-generated key has unknown plaintext so a string search cannot prove absence, and a backup not taken during the operation cannot test the backup path.

**The harness is built around a canary.** A synthetic secret whose exposure is observable, because we chose its bytes.

**Setup:** an isolated non-production KMS/HSM account or emulator, and a test tenant. **The authorization used for B2 through B5 must itself be non-production and structurally unable to reach a real key**, proven by attempting to address a production key path and being denied.

**Canary procedure:**

1. Generate a synthetic key material whose plaintext contains a unique high-entropy canary string, chosen by the harness so it is searchable.
2. Perform a permitted signing operation through the custody service, and **prove it succeeds**: a valid signature over a known digest, verifiable with the public key. A confinement test that also breaks the signer proves nothing useful.
3. **Prove absence** of the canary from every sink, each with a fault injected so the check could fail:

| Sink | Fault injected to prove the check can fail |
|---|---|
| Logs | Raise log level to trace during the operation |
| Events | Attempt an append carrying the canary; must be refused by section 8 |
| Artifacts | Attempt registration carrying the canary |
| Plans | Attempt compilation with the canary in a plan field |
| Re:PORT output | Generate over an evidence set seeded with the canary |
| Process arguments | Enumerate `argv` of the signing process during the operation |
| Process environment | Read `/proc/<pid>/environ` during the operation |
| Core dumps | **Force a crash** during a signing operation and search the dump |
| Backups | **Take a backup during** the operation and search it |
| Error surfaces | **Force an exception** inside the signing path and search the serialized error and stack |

4. **Prove denial** for four identities: the wizard, an agent, a runner, and the application's general identity each attempt to sign and each is denied, with IAM policy evidence showing the deny and the connector's allow.
5. **Prove export denial:** an export attempt on the synthetic key fails.
6. **Prove revocation:** revoking the connector identity's authorization renders existing ciphertext unusable by it immediately.
7. **Bind the signer narrowly:** the connector identity is authorized for one tenant, one key, one purpose, and one signing algorithm, so it is not a general cross-tenant signing oracle. Proven by attempting each of the four out-of-binding variants and being denied.

**Counterfactual requirement:** each check above must be demonstrated to fail when its control is removed. A confinement claim that has never been observed failing is an assumption.

## 11. Control gates

**W3-1 may begin after Tier A, using synthetic and non-production credentials only.** Tier B gates W3-1 completion, also synthetic. **No real credential of any class may exist before its own Tier C gate passes, and no real credential of any class may exist before the section 10 falsifiable custody evidence passes**, because every class either lives behind the custody boundary or is protected by controls the harness is what verifies. Passing a synthetic Tier B control never authorizes a real credential.

### Tier A: before any W3 implementation begins

| # | Control | Owner |
|---|---|---|
| A1 | Forged `founder_authority` refused; resolver output independent of request | W1-5 |
| A2 | Atomic bootstrap; **and concurrent bootstrap: exactly one commits, loser deterministic, no duplicate graph.** Blocked on C1 | W1-5 |
| A3 | Plan compiler refuses credential-shaped values, named error; structured form compiles | F9, W1-6 |
| A4 | Credential detector exists, used by plan, event and artifact paths, fails closed | F10, W1-6 |
| A5 | Ingest interface of section 8 implemented for **descriptor and grant**, with controls N1–N14 and P | W1-6 |
| A6 | Grant-write authorization: granter authority from the resolver, ceilings and C6 expiry enforced, caller-asserted `granted_by_principal_id` never trusted | W1-6 |
| A7 | Custody model declared per inventory row, with resolving service, tenant binding, and revocation atomicity | W1-7 |

### Tier B: W3 acceptance, synthetic non-production credentials only

B1 signing boundary, application never receives key bytes. B2 export disabled, export attempt fails. B3 connector-only signing identity; wizard, agents, runners, general identity each denied. B4 KEK controller distinct. B5 **section 10 canary harness in full**, including forced crash, forced backup, and forced exception. B6 rotation invalidates the old key after overlap. B7 uninstall plus retained key cannot act. B8 webhook verification rejects unsigned, wrongly signed and replayed, failing closed. B9 descriptor cannot invoke without a grant, and the grant resolves per section 6. All owned by W3-1 except B5, shared with W1-7.

### Tier C: before the first real credential of each class

| # | Gate | Class | Inventory row |
|---|---|---|---|
| C1 | Tier A and Tier B complete, section 10 harness passed | GitHub App private key | 3.3 |
| C2 | Provisioning credential destroyed at step completion, proven by inspecting the holder | Provisioning | 3.10 |
| C3 | Runtime credential reaches the secret manager without traversing plan, log, artifact, argv, or environment | DB runtime | 3.11 |
| C4 | Child process argv and environment contain no credential, read during a live run | Agent credential | 3.14 |
| C5 | Guest package contains no credential and no ungranted capability | Package contents | 3.8, 3.9 |
| C6 | Re:PORT excludes a planted secret and raises an incident | Report generation | all |
| C7 | Durable authority store meets all five C6 constraint requirements | Durable grants | 3.12 |
| C8 | OIDC client secret in Model B custody; no refresh token requested; transients destroyed at exchange | OIDC | 3.1, 3.2 |
| C9 | Installation token never persisted, destroyed before the calling frame returns, never cached across operations | Installation access token | 3.4 |
| C10 | Webhook secret in Model B custody; rotation overlap works; stale secret fails closed rather than accepting unsigned | Webhook secret | 3.5 |
| C11 | Workload identity and KEK separated from every application identity; section 10 denial evidence | KMS identity, KEK | 3.6, 3.7 |
| C12 | Signing key never in wizard memory as plaintext; verification reports `revoked_after_signing` honestly | Package signing key | 3.8 |
| C13 | Invitation token high-entropy, hashed at rest, shown once, never re-sent; revoked status refuses redemption | Invitation token | 3.9 |
| C14 | Participant connector authorization stored as reference and grant only; provider revocation and grant revocation each work alone | Connector authorization | 3.12 |
| C15 | Model provider token by secret-manager reference; setup holds none | Provider token | 3.13 |

## 12. Traceability matrix

| Requirement | Section | Implementing task | Executable control | Transition gated | Status |
|---|---|---|---|---|---|
| Authority resolver | 7.1 | W1-5 | A1 | W3 start | [TEST-GATED] |
| Atomic bootstrap | 7.2 | W1-5 | A2 | W3 start | [TEST-GATED] |
| Concurrent bootstrap race | 7.3 | W1-5 | A2, blocked on C1 | W3 start | [TEST-GATED] |
| Resolver independence | 7.4 | W1-5 | A1 | W3 start | [TEST-GATED] |
| Plan credential refusal | 9, F9 | W1-6 | A3 | W3 start | [TEST-GATED] |
| Credential detector | 9, F10 | W1-6 | A4 | W3 start | [TEST-GATED] |
| Ingest interface, N1–N14 | 8 | W1-6 | A5 | W3 start | [TEST-GATED] |
| Grant-write authorization | 6.3 | W1-6 | A6 | W3 start | [TEST-GATED] |
| Grant resolution at invocation | 6.1, 6.2 | W1-6 | B9 | W3 completion | [TEST-GATED] |
| Minted references | 5 | W1-7 | A7 | W3 start | [TEST-GATED] |
| Custody models declared | 3, 5 | W1-7 | A7 | W3 start | [TEST-GATED] |
| Isolated signing boundary | 10 | W3-1, W1-7 | B1–B4 | W3 completion | [TEST-GATED] |
| Canary confinement harness | 10 | W1-7 | B5 | first real key, C1 | [TEST-GATED] |
| Signer narrow binding | 10.7 | W1-7 | B5 | first real key | [TEST-GATED] |
| Rotation and uninstall | 3.3 | W3-1 | B6, B7 | W3 completion | [TEST-GATED] |
| Webhook verification | 3.5 | W3-1 | B8, C10 | first real secret | [FUTURE] |
| Installation token lifecycle | 3.4 | W3-1 | C9 | first real token | [FUTURE] |
| Invitation token lifecycle | 3.9 | W4 | C13 | first real invitation | [FUTURE] |
| Provisioning credential destruction | 3.10 | W2-1 | C2 | first real provisioning | [FUTURE] |
| Runtime credential delivery | 3.11 | W2-1 | C3 | first real runtime credential | [FUTURE] |
| Subprocess argv and env exclusion | 9, F11 | PW4 | C4 | first credential-bearing subprocess | [FUTURE] |
| Re:PORT secret exclusion | 9 | R-phase | C6 | first generation over real events | [FUTURE] |
| Durable expiry, C6 constraint | 3, 6.2 | W2-1 | C7 | first durable grant | [FUTURE] |
| Founder identity minimisation | 3.1 | W1-1 | verified by probe | done | **[IMPLEMENTED]** narrowly |
| Agent scope separation | 3.14 | PW1 | verified by probe | done | **[IMPLEMENTED]** narrowly |
| Session teardown and expiry sweep | 13 | W1-1 | verified differentially | done | **[IMPLEMENTED]** narrowly |

## 13. Failure, abandonment, teardown

**[IMPLEMENTED]** for the in-memory session: completion, abandonment and expiry destroy the authority record including delegation and approvals; expired sessions are swept at every entry point; outstanding approvals are revoked so replay is refused; the identity inventory reports zero wizard principals, actors and credentials. Verified by probe, and the expiry path differentially against the pre-sweep implementation after being returned once for a lazy-teardown defect.

**[FUTURE]**, owned by the phase that first creates an external effect: step-scoped destruction of a provisioning credential, rollback or compensation for partial external effects, and "no unapproved external effect survives".

## 14. Findings

**Reproduced:** F9, credential-bearing `database.target` survives compilation and serialization, reproduced by both agents twice. F10, no credential detector exists anywhere, by implementation census.

**Confirmed but not exercisable:** F11, no subprocess adapter exists to attack; unprevented design scope, not a demonstrated leak. Gates C4, not W3.

**Confirmed:** F12, bootstrap authority is caller-asserted.

**New in revision 3:** **F13**, concurrent founder bootstrap is unguarded, and its control A2 is blocked on constraint C1 because a credible proof needs a real datastore.

## 15. What this model does not claim

It does not claim safety against a compromised founder session, host kernel, or a malicious but correctly authorized provider. It does not claim credentials cannot leak. It claims every path has a named protection, an accurate status label, an owning task, an executable control, and a transition it gates.

**It does not claim that passing Tier A makes the system ready for a real credential.** Tier A permits W3-1 to begin with synthetic credentials. Tier B, the section 10 canary harness, and the class's own Tier C gate are what permit a real one.
