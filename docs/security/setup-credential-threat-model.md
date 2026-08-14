# Setup-time credential threat model

Status: revision 2, pending second independent adversarial review
Owner: agent-a (architecture)
Date: 2026-08-14
Task: W1-2
Revision basis: agent-b adversarial review `artifacts/agent-b/w1-2-adversarial-review.md`, digest `99b8c616e8fde93bed8adbc819281626f5e8bc22bc0d2aa9871d954cadd3b52e`. Its verdict was **not sufficient as the W3 prerequisite**, and I verified its three most damaging findings myself before revising.
Related: `docs/adr/0012-workspace-setup-wizard.md`, `docs/constraints.md` C6, `docs/schemas/capability-reference-v1.schema.json`

## 0. Status language

Revision 1 used "enforced" for things that were partly true, aspirational, or true only of an in-memory object. That is the most damaging error this document can contain, because it would let W3 proceed on a protection that does not exist. Every protection below now carries exactly one label:

| Label | Meaning |
|---|---|
| **[IMPLEMENTED]** | Code exists, is tested, and I have verified the specific property by probe. The scope of the claim is stated, not implied |
| **[TEST-GATED]** | A prerequisite that must be demonstrated, with named evidence, before a specific transition. Not yet true |
| **[FUTURE]** | A requirement on work not yet begun, with an owning task. Not yet true, and not yet gating |

**Nothing in this document is enforced because it is written here.** Where revision 1 said "enforced", the claim has been narrowed to the exact property that holds or demoted.

## 1. Why this document exists

The wizard is the moment of maximum privilege and minimum verification. It authenticates a human, provisions a database, installs a repository connector, mints identities, signs welcome packages, and opens a pull request, all before any audit trail exists to constrain it. Every credential the product will ever hold passes through it once.

The engineering specification models authority flowing from an authenticated principal to a constrained actor. It does not model a component that **creates** the infrastructure that authority will live in.

This document is that model, and its purpose is to be falsifiable.

## 2. Scope and threat actors

**In scope:** credentials that enter the wizard between founder authentication and setup teardown, and every place a fragment of one comes to rest.

**Threat actors:**

| Actor | Capability |
|---|---|
| **A1. Curious insider** | Reads the repository, the event log, CI output, backups, and Re:PORT |
| **A2. Compromised agent** | Executes as a registered actor, reads its context package, appends events |
| **A3. Malicious plan author** | Writes or edits `workspace.setup.yaml` |
| **A4. Host-local observer** | Reads process environment, `ps`, `/proc`, crash dumps, shell history, editor state, temporary files |
| **A5. Repository reader** | Clones the repo, including a guest with a welcome package |
| **A6. Compromised provider** | Controls a connector endpoint or MCP server. **Supplies descriptor bytes** |
| **A7. Caller of the setup API** | Can invoke setup entry points with chosen arguments. Added in revision 2; see section 6 |

**Explicitly not defended against:** an attacker controlling the founder's authenticated session at setup time, or the host kernel.

## 3. Credential inventory

Eleven credentials. A credential absent from this table has no sanctioned path through setup; adding one requires amending this section first. Revision 1 listed six and the review found five missing, all of which are real.

### 3.1 Founder OIDC identity and its protocol transients

Revision 1 treated "founder OIDC" as one credential. It is a flow producing several, each needing its own consumer and teardown rule.

| Artifact | Owner | Storage | Consumer | Teardown |
|---|---|---|---|---|
| Authorization code | Founder | Never stored | Token exchange only, once | Consumed or expires in seconds |
| PKCE verifier | Wizard client | Memory, one flow | Token exchange only | Destroyed at exchange |
| ID token | Founder's IdP | Never stored | Identity verification only | Discarded after `principal_id` extraction |
| Access / refresh token | Founder's IdP | **Not requested.** Setup needs identity, not delegated API access | None | Nothing to destroy |
| OIDC client secret | Tenant | Secret manager reference | Token exchange service only | Outlives setup; setup's access ends |

**Not requesting a refresh token is a design decision, not an omission.** Setup proves who the founder is; it never acts as them at their IdP.

**[IMPLEMENTED]** `SetupSessionManager.start` refuses an authenticated identity carrying any key other than `principal_id`, so an authenticator cannot place a token into session state. Verified by probe. **Scope of the claim:** this covers the session object only. It says nothing about the OIDC client, the exchange, or any state held outside that interface. **[FUTURE]** covering those is owned by the W3-adjacent auth work.

### 3.2 GitHub App private key

| Property | Value |
|---|---|
| Owner | The tenant, not the founder |
| Storage | **[TEST-GATED]** Inside a KMS or HSM boundary. See section 9 |
| Consumer | The connector signing service only. Never the wizard, an agent, a runner, a plan, or a context package |
| Scope | Exactly the ADR 0012 enumerated set. Merge rights and default-branch write refused at compile |
| Expiry | The key is long-lived and is the highest-value secret in the product; installation tokens are short-lived and minted per operation |
| Rotation | Without reinstallation, both keys valid during a bounded overlap |
| Revocation | Uninstall **plus** key destruction. Uninstall alone is insufficient: a retained key plus reinstall is a resurrection path |
| Teardown | The installation outlives setup by design; setup's access to it ends at teardown |

### 3.3 GitHub webhook secret

Missing from revision 1 despite ADR 0012 requiring signature verification.

| Property | Value |
|---|---|
| Owner | Tenant |
| Storage | **[TEST-GATED]** Encrypted under the KEK of section 3.4, alongside but separable from the App key |
| Consumer | The webhook receiver only, for HMAC verification |
| Scope | Verify inbound signatures. It is not an outbound credential and must never be sent anywhere |
| Rotation | Independent of the App key, with an overlap window during which both verify |
| Revocation | Rotate at GitHub and locally; a stale secret must fail closed, never fall back to accepting unsigned payloads |

### 3.4 Key-encryption key and KMS authorization

Missing from revision 1. Without it, "encrypted at rest" only moves the root secret.

| Property | Value |
|---|---|
| Owner | Tenant, held in a KMS or HSM |
| Storage | **Never in the application.** The application holds an authorization to *request* operations, not the key |
| Consumer | The signing and decryption service, under an identity distinct from the wizard's |
| Scope | Decrypt or sign specific labelled material. Not export. **Key export MUST be disabled where the provider allows it** |
| Rotation | KMS-native, with re-encryption of dependent material |
| Revocation | Revoke the service's KMS authorization; this must render existing ciphertext unusable by that service immediately |
| Separation | The KEK's controller MUST NOT be the same identity as the wizard or any agent. Otherwise envelope encryption is decoration |

### 3.5 Welcome-package signing key

Missing from revision 1, though setup issues signed packages and the existing verifier already uses Ed25519.

| Property | Value |
|---|---|
| Owner | Tenant |
| Storage | **[TEST-GATED]** In the same KMS boundary as 3.4, or a separate signing service. Plaintext private key MUST NOT exist in wizard memory |
| Consumer | The welcome-package issuer only |
| Scope | Sign a package manifest digest. Nothing else |
| Rotation | New key registered with a validity interval before use; verification reports `unknown_key` or `revoked_after_signing` honestly per specification section 15 |
| Revocation | Key revocation invalidates future signing; previously signed packages report `revoked_after_signing`, not `invalid` |

### 3.6 Database provisioning credential

| Property | Value |
|---|---|
| Owner | Founder's cloud or database provider |
| Storage | **[FUTURE]** Per session, in memory, never persisted. Not in the plan, an event, or a wizard-written file |
| Consumer | The provisioning driver, during one approved step |
| Scope | Create a database and role; narrowed below tenant administration where the provider allows |
| Issuance | Supplied at the approved step, not at session start |
| Teardown | Destroyed at step completion or session end, whichever is first |

**No holder exists.** W1-1 has no provisioning credential holder and performs no external effects. Every claim in this row is a requirement owned by W2-1.

### 3.7 Database runtime credential

Missing from revision 1. Distinct from 3.6: this is the credential the provisioned `engram_app` role uses, created *by* setup and handed *to* the runtime.

| Property | Value |
|---|---|
| Owner | Tenant |
| Storage | **[FUTURE]** Secret manager, written by the provisioning step, never by the plan |
| Consumer | The application runtime only |
| Scope | The reduced grant set accepted in B1: `SELECT` on ten tables, `INSERT` on two, no `UPDATE`, `DELETE`, `TRUNCATE`, or ownership |
| Delivery | The riskiest moment. It is generated, must reach the secret manager, and must not pass through the plan, a log, an artifact, or a process environment |

### 3.8 Composio and MCP connector authorizations

| Property | Value |
|---|---|
| Owner | The granting participant |
| Storage | Not stored. EngramPort records a capability reference and a grant; see sections 5 and 7 |
| Consumer | The connector runtime holding the participant's own authorization |
| Scope | Named capabilities under an explicit grant |
| Revocation | Revoking the grant makes the reference inert; provider-side revocation is independent, and **both MUST work alone** |

### 3.9 Model provider tokens

Owner: participant or tenant. Storage: secret manager reference only. Setup holds none, because setup compiles and executes a deterministic plan and has no reason to call a model. If a design requires one, the plan stopped being deterministic and this model reopens.

### 3.10 Temporary agent credentials

| Property | Value |
|---|---|
| Owner | The agent's owning principal |
| Consumer | The runner adapter for one run |
| Scope | Exactly the actor's scopes |
| Expiry | Short-lived; **token lifetime is the true revocation latency** and must be documented as such, never described as instant |

**[IMPLEMENTED], narrowly.** PW1 passes the runner an object carrying exactly the actor's scopes, and supervisor scopes structurally cannot reach it. Verified by probe. **What is not implemented:** there is no token value, no minting, no expiry, no authorized-call check, and no revocation behaviour; the recording stub deliberately retains what it is given. The property that holds is **scope separation**, nothing more. **[FUTURE]** the rest is owned by PW4 and PW7.

### 3.11 Setup session delegation

The wizard's own derived authority.

**[IMPLEMENTED]** Session scopes must be `setup:`-prefixed and within the supplied founder authority; an absolute expiry is required; a session cannot outlive its granter; expired sessions are swept at every entry point so introspection cannot report expired authority as active; completion, abandonment and expiry destroy the authority record. All verified by probe, including differentially against the pre-sweep implementation.

**Scope of the claim, corrected:** these are properties of one in-memory object relative to **an authority assertion supplied by the caller**. See section 6, which is where revision 1 was wrong.

## 4. Discovering a capability is not receiving authority

A connector advertises what it can do. That advertisement is bytes from threat actor A6. An agent that reads a tool list and treats presence in it as permission has granted itself authority from a string it was handed.

**Rules, binding on every connector integration:**

1. **Discovery returns descriptors.** A descriptor names a capability and its shape. It MUST NOT contain a credential, a bearer handle, a session identifier, a URL carrying authority, or anything invocable.
2. **Authority is a separate grant**, naming the capability, the authorized principal, the scope, an absolute expiry, and the granting event.
3. **Invocation resolves the grant server-side at call time**, and **derives its installation locator and credential reference from the grant store, never from descriptor bytes.** This clause is new in revision 2 and is the one that matters.
4. **An empty grant set beside a full capability list is the normal state**, not an error.

**The attack revision 1 permitted.** The review constructed it and I confirmed it: `provider_installation_ref` was an unconstrained provider-supplied string. An implementer following revision 1 could receive that value from a compromised provider, pass schema validation, and hand it to a provider SDK as an invocable handle. Discovery would have conferred practical authority through a field named "reference". Rule 3 above closes it by forbidding the invocation path from reading any locator out of descriptor bytes, and the revised schema removes the field.

**Status:** **[FUTURE]** in its entirety. No ingest validator, grant store, or invocation resolver exists. The schema alone can reject some shapes; it cannot authorize or deny anything, because nothing consumes it.

## 5. Three custody models, because "we never store credentials" was not true

Revision 1 asserted EngramPort is not a secret manager while also requiring it to store the App private key encrypted. The review is right that those are different custody models and collapsing them hid the question of who can decrypt.

**Model A: participant-owned external reference.** EngramPort stores a reference and a grant. It never holds the credential in any form. Applies to 3.8 and 3.9. Revocation of the grant makes the reference inert without touching the provider.

**Model B: tenant-owned secret under external custody.** The credential exists as ciphertext EngramPort can point at, but the key that opens it lives in a KMS the application does not control, and the identity permitted to request use is **not** the wizard. Applies to 3.2, 3.3 and 3.5. EngramPort is a custodian of ciphertext and a recorder of authorization, never a holder of plaintext.

**Model C: operation-scoped fetched token.** Minted for one operation, never at rest, destroyed at completion. Applies to 3.6 and 3.10.

For each, an implementation MUST define: which service may resolve or use the reference, its tenant and project binding, confused-deputy prevention, resistance to reference enumeration, revocation atomicity, and audit behaviour. **[FUTURE]**, owned by W2-1 and W3-1.

**What remains true:** no credential is ever written into an event, an artifact, a plan, a context package, or a welcome package. The append-only log is the worst possible container for a secret, because specification section 5.3 immutability means a credential written there cannot be removed by any ordinary mechanism, and it propagates to embeddings, context packages, Re:PORT, welcome packages, and Git export.

## 6. Bootstrap authority: the resolver

**Revision 1 claimed the founder root of authority was enforced. It is not, and this was its worst error.**

`SetupSessionManager.start` authenticates a credential down to a `principal_id`, then accepts a caller-supplied `founder_authority` object and checks only that its `principal_id` matches and that requested session scopes and expiry are subsets **of that supplied object**. Threat actor A7, anyone able to call `start`, can assert arbitrary founder scopes for an authenticated identity. The subset check is real; the set it checks against is attacker-chosen.

**Required correction, [TEST-GATED] before W3:**

1. **An authenticated authority resolver.** Given an authenticated `principal_id` and nothing else from the request, the resolver returns that principal's held authority from a trusted store. `start` takes no `founder_authority` argument. Held authority is looked up, never asserted.
2. **A bootstrap transaction.** When no tenant exists, one atomic operation creates the first tenant, project, principal, and owner membership, and returns the resolved authority. Partial failure leaves nothing: no tenant without an owner, no principal without a membership.
3. **Resolver independence.** The resolver's answer MUST NOT be influenceable by the setup payload, including through a tenant hint, a project slug, or a scope request.
4. **Evidence:** a forged `founder_authority` for a correctly authenticated principal is refused; a partial bootstrap failure leaves no orphaned tenant, project, or membership; the resolver returns identical authority regardless of what the request asks for.

Until this exists, what holds is narrower and should be stated exactly: **session narrowing relative to an input assertion, absence of a wizard identity within the in-memory manager, and teardown.** ADR 0012 decision 3's root-of-authority chain is a requirement, not a property.

## 7. Leakage vectors and durable operational copies

Revision 1 listed seven vectors and missed the durable copies. Pre-write scanning does not remove a secret already in a Git object, a CI artifact, or a backup.

| Sink | Control | Retention and invalidation |
|---|---|---|
| Plans | Compiler refuses credential-shaped values, fails closed | Plan artifacts deleted with the session |
| Events | Detection **before** acceptance; after is too late by construction | Immutable. A secret here is an incident, and remediation is provider rotation plus cryptographic erasure or audited tombstoning |
| Artifacts | Scan before registration | Digest pins bytes permanently; same remediation as events |
| Logs and traces | No credential in messages, error text, or stack traces. **Error text is the most forgotten sink**, written while thinking about failure | Log retention window; rotation required on incident |
| Re:PORT | Detection before generation and before any external model call, failing closed | Upstream protection: if no event holds a secret, none can be narrated |
| Subprocess environments | **Never pass credentials via environment.** Readable through `ps` and `/proc/<pid>/environ`, inherited by grandchildren, captured in core dumps. Use a file descriptor, unix socket, or child-fetched short-lived token | Process lifetime; core dump policy must exclude |
| Welcome packages | References and grants only; bounded context under the recipient's ceiling, `internal` for guests | Package expiry |
| **CI logs, artifacts, caches** | Secret scanning in CI; masked variables; artifacts never contain plan or provisioning output | CI retention policy; purge and rotate on incident |
| **Git object database and reflog** | A secret committed then amended or reset **remains reachable**. Pre-commit scanning is the only effective control | Rewrite plus force-push plus provider rotation. Assume the value is compromised |
| **Backups and snapshots** | Inherit the classification of their source | Rotation at the provider is the only reliable remediation; a backup cannot be selectively edited |
| **Core and crash dumps** | Disable or restrict for processes handling credentials | Purge on incident |
| **Shell history, editor swap and autosave, temp files** | Founder-side guidance; never instruct a founder to paste a credential into a file or a command line | Out of the product's control, which is the reason for the guidance |

**Quarantine is not safety.** Where a detector quarantines a value, the quarantine MUST itself be a secret store with narrower access and defined deletion. Moving a secret into a differently-named table is not remediation.

**Rotation is the only reliable remediation for any sink above.** Every control here reduces exposure probability; none makes an exposed credential safe again.

## 8. Failure, abandonment, and teardown

The common failure is a founder who starts setup, gets distracted, and never returns. That path must be as safe as the happy one, because it is more frequent.

**[IMPLEMENTED]** for the in-memory session: completion, abandonment and expiry destroy the session's authority record including delegation and approvals; expired sessions are swept at every entry point; outstanding approvals are revoked so replay after teardown is refused; `identityInventory()` reports zero wizard principals, actors and credentials. Verified by probe, including the expiry path after it was returned once for a lazy-teardown defect and proven differentially against the prior implementation.

**[FUTURE]**, owned by the phase that first creates an external effect: step-scoped destruction of a provisioning credential, rollback or compensation for partial external effects, and "no unapproved external effect survives". W1-1 creates no external effects, so revision 1's claim that section 8 was enforced by W1-1 was true only of what W1-1 does, which is not the interesting part.

## 9. Custody and signing boundary: prerequisite before a real App key

**New in revision 2, and the review is right that its absence was disqualifying.**

Envelope encryption proves ciphertext at rest. It does not prove who can decrypt, that the wizard cannot, or that plaintext is confined. Before a **real** GitHub App private key exists in any environment, the following must be implemented and independently tested **with a synthetic, non-production key**:

1. **An isolated signing boundary.** A KMS, HSM, or isolated signing service holds the private key. The application requests signatures; it never receives key bytes.
2. **Key export disabled** where the provider supports it, and evidence that an export attempt fails.
3. **A connector-only identity** authorized to request signing. The wizard, agents, runners, and the application's general identity are **not** authorized, proven by each attempting and failing.
4. **KEK separation.** The identity controlling the key-encryption key is distinct from every identity above, so no single compromised identity both holds ciphertext and can open it.
5. **Plaintext confinement.** Evidence that key plaintext appears in no log, no error path, no core dump, no backup, and no process environment, checked by inspection of those sinks during a signing operation rather than by assertion.
6. **Revocation effectiveness.** Revoking the connector identity's KMS authorization renders existing ciphertext unusable by that identity immediately.

**Until all six are demonstrated with a synthetic key, no real GitHub App private key may be introduced to any environment.** This is the single hardest gate in the document and it is deliberately placed before, not inside, W3.

## 10. Control gate, reconciled with task ordering

Revision 1 required all fifteen controls before W3 began. Several belong to W3 itself and others to W4, PW4 and the R-phase, making the gate unsatisfiable and therefore likely to be waived on paper. The review is right, and this is the correction.

Three tiers, each with an enforceable transition.

### Tier A: before any W3 implementation begins

| # | Control | Owning task |
|---|---|---|
| A1 | Authenticated authority resolver: forged `founder_authority` refused; resolver output independent of request | W1 auth work, section 6 |
| A2 | Bootstrap transaction atomic: partial failure leaves no orphaned tenant, project, or membership | W1 auth work |
| A3 | Plan compiler refuses credential-shaped values with a named error; structured reference form compiles | F9 |
| A4 | Credential detector exists, is used by the plan, event, and artifact paths, and fails closed on detector error | F10 |
| A5 | Descriptor ingest contract implemented: `kind` coupled to payload, no invocable locator accepted, recursive string scan before ingest | Section 4, revised schema |
| A6 | Custody model declared per credential in section 3, with resolving service, tenant binding, and revocation atomicity specified | Section 5 |

### Tier B: W3 acceptance, with synthetic non-production credentials only

| # | Control | Owning task |
|---|---|---|
| B1 | Signing boundary: application requests signatures, never receives key bytes | W3-1, section 9 |
| B2 | Key export disabled; export attempt fails | W3-1 |
| B3 | Only the connector identity may request signing; wizard, agents and runners each attempt and fail | W3-1 |
| B4 | KEK controller distinct from all of the above | W3-1 |
| B5 | Plaintext confinement verified by inspecting logs, error paths, core dumps, backups and process environment during a signing operation | W3-1 |
| B6 | Rotation invalidates the old key after the overlap window | W3-1 |
| B7 | Uninstall plus retained key cannot act: no resurrection path | W3-1 |
| B8 | Webhook signature verification rejects unsigned, wrongly signed and replayed payloads, and fails closed rather than accepting unsigned | W3-1 |
| B9 | Descriptor cannot invoke without a grant; invocation derives its locator from the grant store, not descriptor bytes | W3-1 |

### Tier C: before the first real credential of a given class

| # | Control | Class |
|---|---|---|
| C1 | All of Tier A and Tier B demonstrated with synthetic credentials | GitHub App key |
| C2 | Provisioning credential destroyed at step completion, proven by inspecting the holder | Provisioning |
| C3 | Database runtime credential reaches the secret manager without passing through plan, log, artifact, or environment | Runtime |
| C4 | Child process environment contains no credential, read during a live run | First credential-bearing subprocess, PW4 |
| C5 | Guest welcome package contains no credential and no capability lacking a grant | First issued package, W4 |
| C6 | Re:PORT excludes a planted secret and raises an incident | First Re:PORT generation over real events |
| C7 | Durable authority store meets all five C6 requirements | First durable grant persistence |

**The pre-W3 subset is exactly Tier A.** Tier B gates W3 completion, not its start, and runs entirely on synthetic credentials. Tier C gates the introduction of each real credential class, at the point that class first exists.

### Counterfactual requirement

Every control above must be demonstrated to **fail** against an implementation lacking it, not merely to pass against the one that has it. Each owning task defines its counterfactual: the mutation, removed guard, or injected fault that must make the control fail, and the evidence retained.

The review is right that revision 1's "every negative control" wording did not fit controls that are positive confidentiality properties. For those, the counterfactual is a fault injection: remove the confinement and demonstrate the value appearing in the sink the control claims is clean.

**Provenance for this standard:** W1-1 shipped a test whose own action produced the state it verified, and establishing that the corrected assertion could fail at all required a differential probe against the prior implementation. That is why this requirement exists and why it is not pedantry.

## 11. Findings

**Reproduced, meaning I ran the demonstration myself:**

- **F9.** `compileSetup` accepted `database.target = postgres://alice:REAL_SECRET@db.example/engram`, and `serializeSetupPlan` retained the secret in the serialized plan. The action digest covers the credential-bearing value. Reproduced independently by agent-b and by me.
- **F10.** No credential detector exists anywhere in the codebase, confirmed by census across the plan compiler, event append path, artifact registration, logging, welcome verification, and Re:PORT. The F9 result is a live demonstration that compiler-side detection is absent. Neither of us planted a secret into the accepted event log, because doing so would create the irreversible incident this model warns about.

**Confirmed but not exercisable:**

- **F11.** There is no subprocess runner adapter to attack. PW1's `RecordingRunner` receives an in-process argument and no production `spawn` or `exec` adapter exists. F11 is confirmed as **unprevented design scope**, not as a reproduced leak, and the distinction matters: nothing is currently violated and nothing currently prevents it. Its closure is owned by PW4, and revision 1 wrongly implied it gated W3. It gates C4, the first credential-bearing subprocess.

**New:**

- **F12.** Bootstrap authority is caller-asserted, not resolved. See section 6. Closes in Tier A, controls A1 and A2.

## 12. What this model does not claim

It does not claim the wizard is safe against a compromised founder session, a compromised host kernel, or a malicious but correctly authorized provider. It does not claim credentials cannot leak; it claims each path has a named protection, an accurate status label, and required evidence. It does not claim any protection is implemented because it is written here.

**It specifically does not claim that passing the Tier A controls makes the system ready for a real credential.** Tier A permits W3 to begin. Tier B and the section 9 boundary, demonstrated on a synthetic key, are what permit a real one.
