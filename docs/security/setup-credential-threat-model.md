# Setup-time credential threat model

Status: proposed, pending independent adversarial review
Owner: agent-a (architecture)
Date: 2026-08-14
Task: W1-2
Normative. **Prerequisite for W3 per ADR 0012.** No real GitHub App private key, provider token, or provisioning credential may be handled until the acceptance evidence in section 10 exists.
Related: `docs/adr/0012-workspace-setup-wizard.md`, `docs/constraints.md` C6, `docs/security/report-authorization-and-redaction.md`, `artifacts/agent-a/onboarding-welcome-protocol-design.md`

## 1. Why this document exists

The wizard is the moment of maximum privilege and minimum verification. It authenticates a human, provisions a database, installs a repository connector, mints identities, and opens a pull request, all before any audit trail exists to constrain it. Every credential the product will ever hold passes through it once.

The engineering specification models authority flowing from an authenticated principal to a constrained actor. It does not model a component that **creates** the infrastructure that authority will live in. Sections 13 and 15 cover OIDC, hashed API keys, and envelope encryption for integration credentials; nothing covers a process that holds a cloud administrative credential for ninety seconds and must be proven to have forgotten it.

This document is that model. Its purpose is to be falsifiable: every claim below is either enforced by a mechanism or listed in section 10 as evidence someone must produce.

## 2. Scope and threat actors

**In scope:** credentials that enter the wizard between founder authentication and setup teardown, and every place a fragment of one could come to rest.

**Out of scope, covered elsewhere:** steady-state API keys (specification section 13), agent-session tokens after setup (section 13), memory and retrieval leakage (`docs/security/report-authorization-and-redaction.md`).

**Threat actors, in the order they matter:**

| Actor | Capability | Why they matter here |
|---|---|---|
| **A1. Curious insider** | Reads the repository, the event log, CI output, and Re:PORT | The log is permanent and widely readable. This actor needs no exploit, only patience |
| **A2. Compromised agent** | Executes as a registered actor, reads its context package, appends events | Untrusted by design. It will be handed a bounded context and must not be handed a credential |
| **A3. Malicious plan author** | Writes or edits `workspace.setup.yaml` | The plan is serialized, digest-bound, and shown to a founder |
| **A4. Host-local observer** | Reads process environment, `ps`, `/proc`, crash dumps, shell history | Defeats every protection that stops at "we do not print it" |
| **A5. Repository reader** | Clones the repo, including a guest with a welcome package | Welcome packages are content-addressed and deliberately distributed |
| **A6. Compromised provider** | Controls a connector endpoint or an MCP server | Discovery surfaces are attacker-influenced input |

**Explicitly not defended against:** an attacker who already controls the founder's authenticated session at the moment of setup, or who controls the host kernel. Section 15 of the specification requires stating attestation limits rather than implying coverage; the same discipline applies here.

## 3. Credential inventory

Every credential entering the wizard. **A credential absent from this table has no sanctioned path through setup**, and adding one requires amending this section first.

### 3.1 Founder OIDC identity

| Property | Value |
|---|---|
| Owner | The human founder |
| Storage | Never stored. Presented to the authenticator, exchanged for a principal identity, discarded |
| Permitted consumer | The founder authenticator interface only |
| Scope | Proves one thing: this principal authenticated |
| Issuance | The founder's identity provider |
| Expiry | The provider's, plus the session's absolute expiry which MUST NOT exceed it |
| Rotation | The provider's concern |
| Revocation | Provider revocation, plus session teardown |
| Teardown | Nothing to destroy, because nothing was kept |

**Enforced today.** `SetupSessionManager.start` refuses an authenticated identity carrying any key other than `principal_id`, so an authenticator cannot smuggle a token into the session even deliberately. The credential is an argument, never a field. Verified by probe during W1-1 review.

### 3.2 GitHub App installation credential

| Property | Value |
|---|---|
| Owner | The tenant, not the founder. This is why ADR 0012 chose an App over a personal token: the connection survives the founder leaving |
| Storage | Envelope-encrypted at rest per specification section 13. The private key never touches the wizard's memory in plaintext beyond the signing call |
| Permitted consumer | The connector service. **Never** an agent, a runner adapter, a plan, or a context package |
| Scope | Exactly the ADR 0012 enumerated set: read authorized content and history, open one pull request on a non-default branch, receive signature-verified webhooks. Merge rights and default-branch write are refused by the compiler, not merely omitted |
| Issuance | App installation by the founder, out of band |
| Expiry | Installation tokens are short-lived and minted per operation. The App private key is long-lived and is the highest-value secret in the product |
| Rotation | Key rotation without reinstallation; both old and new valid during a bounded overlap |
| Revocation | Uninstall, plus local key destruction. Uninstall alone is insufficient because a retained key plus a reinstall is a resurrection |
| Teardown | Setup session end does not revoke the installation, by design: the connection outlives setup. Setup's **access** to it ends |

### 3.3 Composio and MCP connector authorizations

| Property | Value |
|---|---|
| Owner | The granting participant, human or organization |
| Storage | **Not stored by EngramPort.** EngramPort records a capability reference and a grant; see section 5 |
| Permitted consumer | The connector runtime holding the participant's own authorization |
| Scope | Named capabilities under an explicit grant, never "whatever the connector advertises". See section 4 |
| Issuance | The participant's own OAuth or connection flow, outside the wizard |
| Expiry | The provider's, with the grant carrying its own shorter absolute expiry |
| Rotation | The participant's concern; EngramPort's reference survives rotation because it references rather than copies |
| Revocation | Revoking the grant makes the reference inert without touching the provider; revoking at the provider is independent and both MUST work alone |
| Teardown | The setup session's ability to exercise a grant ends at teardown even where the grant itself persists |

### 3.4 Model provider tokens

| Property | Value |
|---|---|
| Owner | The participant or the tenant |
| Storage | Secret manager reference only, per specification section 20.2. Never a committed file, never a plan field |
| Permitted consumer | The process making the model call |
| Scope | The provider's |
| Expiry / rotation / revocation | The provider's, surfaced through the secret manager |
| Teardown | Setup holds no provider token; it has no reason to make a model call |

**A wizard that needs a model token is doing something outside its remit.** Setup compiles, approves, and executes a deterministic plan. If a design ever requires setup to call a model, that is a signal the plan stopped being deterministic, and it reopens this model.

### 3.5 Database provisioning credentials

The highest-risk credential in setup, and the one the specification does not model at all.

| Property | Value |
|---|---|
| Owner | The founder's cloud account or database provider |
| Storage | **Per session, in memory, never persisted by the wizard.** Not in the plan, not in an event, not in a file the wizard writes |
| Permitted consumer | The provisioning driver, during one approved step |
| Scope | Create a database and role; not tenant-wide administration where the provider allows narrowing |
| Issuance | Supplied by the founder at the approved step, not at session start. Held for the shortest possible window |
| Expiry | The session's absolute expiry, and preferably shorter: destroyed at step completion |
| Rotation | The provider's |
| Revocation | The founder revokes at the provider. The wizard cannot revoke what it does not own |
| Teardown | Destroyed at step completion or session end, whichever is first. **Section 10 requires evidence, not assertion** |

The application role the wizard *creates* is a different thing and is already constrained: `engram_app` holds `SELECT` on ten tables and `INSERT` on two, with no `UPDATE`, `DELETE`, `TRUNCATE`, or ownership, per the accepted static portion of B1.

### 3.6 Temporary agent credentials

| Property | Value |
|---|---|
| Owner | The agent's owning principal |
| Storage | Held by the runner for the duration of one run |
| Permitted consumer | The runner adapter for that run |
| Scope | Exactly the actor's scopes. **Waking grants nothing** |
| Issuance | Minted per run by the supervisor |
| Expiry | Short-lived; the token lifetime is the true revocation latency and MUST be documented as such rather than described as instant |
| Rotation | Per run |
| Revocation | Stop revokes the lease and the token; in-flight work fails at its next authorized call |
| Teardown | Run completion or lease expiry |

**Partly enforced today.** Port Watch PW1 passes the runner a token carrying exactly the actor's scopes, with supervisor scopes structurally unable to reach it, verified by probe. Cooperation-free termination is PW7 and does not exist yet.

## 4. Discovering a capability is not receiving authority

The single most likely way this product leaks authority is by conflating these two.

A connector, an MCP server, or a tool registry **advertises** what it can do. That advertisement is attacker-influenced input from threat actor A6. An agent that reads a tool list and treats presence in the list as permission has granted itself authority from a string it was handed.

**The rule, binding on every connector integration:**

1. **Discovery returns descriptors.** A capability descriptor names a capability, its provider, and its shape. It MUST NOT contain a credential, a bearer handle, a session identifier, or anything invocable.
2. **Authority is a separate grant**, naming the capability, the authorized principal, the scope, an absolute expiry, and the grant event that created it.
3. **Invocation resolves the grant server-side at call time.** A capability descriptor is never sufficient to invoke.
4. **An empty grant set with a full capability list is the normal state**, not an error. A workspace that can see fifty capabilities and is authorized for two is correctly configured.

This is the same distinction the onboarding design fixed for participants: **capabilities are routing, scopes are authority**. It is restated here because the connector surface is where an implementer meets it again in unfamiliar clothes, and where the vocabulary the provider uses ("connected", "enabled", "available") actively encourages the wrong reading.

**Threat, concretely.** A compromised MCP server advertises a capability named `github.merge_pull_request`. Under the rule, nothing happens: no grant names it, so no invocation resolves. Without the rule, an agent sees an available tool and calls it. The defence is structural and costs nothing at design time; retrofitting it costs the product.

## 5. Why EngramPort records references and grants, never credentials

EngramPort stores a **capability reference** plus a **grant**. It does not copy participant credentials. Four reasons, in descending order of how badly ignoring them ends:

**5.1 The log is append-only, so a leaked credential there is unrevokable.** Specification section 5.3 makes accepted events immutable, with database triggers rejecting update and delete. A credential written into an event cannot be removed by any ordinary mechanism. Erasure means cryptographic erasure or an audited tombstoning procedure, for one pasted token. The append-only property that makes the log trustworthy makes it the worst possible container for a secret.

**5.2 Copying propagates.** An event body reaches embeddings (pgvector), context packages, Re:PORT narratives, welcome packages, and Git export. One credential in one event becomes a credential in six derived stores, several of which are designed to be distributed.

**5.3 A reference is revocable; a copy is not.** Revoking a grant makes a reference inert immediately, with no history rewrite. A copied credential remains valid wherever it was copied to until it is rotated at the provider, and nobody knows every place it landed.

**5.4 A grant records the authorization decision, which is what an auditor actually needs.** Specification section 15 is explicit that possession of a key proves possession, not authorization. Storing the grant stores the decision, its maker, its scope, and its expiry, and answers "why does this participant hold this right" by traversal rather than investigation.

**Consequence, stated plainly:** EngramPort is not a secret manager and MUST NOT become one. If a workflow appears to require storing a participant credential, the correct response is a reference and a grant, or a refusal.

## 6. Bootstrap authority before project identities exist

Every authorization path in the specification presumes an existing tenant, project, principal, and membership. The wizard must act before any exist.

**Resolution:** the authenticated human founder is the root of authority. The first principal creates the tenant and project and becomes its owner; every later grant is traceable to that human. This makes "no grant exceeds the granting principal's authority" true from the first event rather than from the first membership check.

**The wizard is a bounded session with no identity of its own.** There is no `wizard` principal, no wizard actor, and no standing credential. It acts under a delegation from the founder, narrowed to setup scopes, with an absolute expiry that cannot exceed the founder's own.

**Enforced today by W1-1**, and verified by probe rather than accepted on report: session scopes must all be `setup:`-prefixed and within the founder's; a session requires an absolute expiry; a session cannot outlive the founder; `identityInventory()` reports zero wizard principals, actors, and credentials at every point in the lifecycle.

## 7. Leakage vectors and required protections

Ordered by likelihood, not severity. The mundane ones leak first.

### 7.1 Plans

`workspace.setup.yaml` is compiled, digest-bound, serialized, written to disk, and shown to a founder for approval.

**Finding F9, raised by this model.** `database.target` is a free-form string with no constraint. A founder who writes `postgres://user:password@host/db` places a live credential inside a digest-bound, serializable artifact, where it is covered by `engramport-action-v3`, reproduced in the review surface, and durable in whatever the plan is written to. Nothing in the current schema or compiler prevents this, and the natural way to write a connection string produces it.

**Required:**
1. Plan fields MUST NOT accept inline credentials. `database.target` becomes a structured reference (host, port, database, plus a secret-manager reference for the credential) or is validated to reject embedded userinfo.
2. The compiler MUST refuse a plan containing a value matching credential patterns, with a named error. Fail closed.
3. Serialized plans inherit the classification of their most sensitive field; since no field may carry a credential, a plan is reviewable, which is the point.

### 7.2 Events

Immutable and permanent per section 5.3. Secret detection MUST run **before** acceptance, not after, because after is too late by construction. A detected secret quarantines the event and raises an auditable incident: a secret reaching an event body is an incident, not a redaction success.

### 7.3 Logs and traces

Specification section 19 already requires never logging payload bodies or tokens by default. Additionally: no credential in an error message, a stack trace, or a `trace_id`-correlated field. Error text is the most commonly forgotten sink because it is written while thinking about failure rather than about secrets.

### 7.4 Artifacts

Content-addressed, hashed, and referenced from events. Same rule as events, and worse: an artifact digest in an event pins the bytes permanently. Scan before registration.

### 7.5 Re:PORT

Reads accepted events and generates narratives for audiences including a public view. `docs/security/report-authorization-and-redaction.md` already requires secret detection before generation and before any external model call, with detector failure failing closed. The structural protection is upstream: if no credential is in an event, Re:PORT cannot narrate one.

### 7.6 Subprocess environments

Threat actor A4's home ground, and the vector that defeats every "we do not print it" protection.

**Credentials MUST NOT be passed to runner subprocesses through environment variables.** Environment is readable through `ps` on many systems, through `/proc/<pid>/environ`, is inherited by grandchildren, and is captured in crash dumps and core files. Use a file descriptor, a unix socket, or a short-lived token fetched by the child from an authenticated endpoint. This binds PW4, which builds real runner adapters.

### 7.7 Welcome packages

Signed, content-addressed, and deliberately distributed, including to guests at `untrusted_agent` trust. A welcome package MUST carry capability references and grants, never credentials. Its bounded context is assembled under the recipient's authorization with the sensitivity ceiling for their audience, and a guest's ceiling is `internal`.

## 8. Failure, abandonment, and teardown

The common failure is not a crash. It is a founder who starts setup, gets distracted, and never returns. That path must be as safe as the happy one, because it is more frequent.

**Required behaviour:**

1. Completion, abandonment, and expiry all destroy the session's authority-bearing record, including delegation and approvals.
2. Provisioning credentials are destroyed at step completion or session end, whichever is first.
3. No principal, actor, delegation, or credential outlives a session.
4. An abandoned session leaves no partial authority: nothing granted, nothing left revocable-but-unrevoked.
5. Outstanding approvals are revoked so a replay after teardown is refused.
6. Failure part-way leaves no external effect that the founder was not shown and did not approve.

**Enforced today by W1-1**, with the expiry path specifically verified after being returned once for a lazy-teardown defect: an expired, untouched session is swept at every entry point, `identityInventory()` and `state()` cannot report expired authority as active, and the assertions were proven to fail against the previous implementation.

**Not yet enforced:** cooperation-free termination of a running process, which is PW7. Until PW7 exists, the claim is that no *authority record* survives, not that no *process* survives.

## 9. Durable implementations: C6

W1-1's guarantees are properties of one live process. Constraint C6 governs the durable version and applies to every credential and grant in section 3:

1. Every authorization read filters on `expires_at` in the query itself, so an expired row cannot be returned even if no sweep ran.
2. Expired-row deletion is a server-side scheduled operation, not a side effect of application traffic. A workspace nobody touches for a month must not retain live-looking authority for a month.
3. Introspection and audit paths MUST NOT report expired authority as active.
4. Expiry is evaluated against the database clock, not an application clock, so a skewed or hostile application host cannot extend authority.
5. A negative control inserts a row already past its expiry and asserts every read path excludes it, paired with a positive control on an unexpired row.

Point 3 is the one to carry hardest. It is the exact defect W1-1 was returned for, and it is **easier** to reintroduce in SQL than in memory, because a `SELECT` that forgets the expiry predicate looks correct.

## 10. Acceptance evidence required before W3

W3 handles a real GitHub App private key. It MUST NOT begin until every item below exists as evidence. Each is a negative control with a paired positive control, because a suite that only demonstrates success is not evidence.

**Credential handling**

1. A plan containing an inline credential in any field is refused at compile with a named error. Positive control: the structured-reference form compiles.
2. A provisioning credential is unreachable after its step completes, proven by inspection of the holding structure rather than by assertion.
3. A session that completes, is abandoned, or expires leaves zero credentials, proven by an inventory that would fail if one survived.
4. An App private key at rest is unreadable without the key-encryption key.
5. A rotated App key leaves the old key unusable after the overlap window.
6. An uninstalled App, with the local key retained, cannot act. Uninstall plus retained key must not be a resurrection path.

**Discovery versus authority**

7. A capability descriptor from a connector cannot be invoked without a grant. Positive control: with a grant, invocation resolves.
8. A capability descriptor containing a credential-shaped field is rejected at ingest, since descriptors must never carry one.
9. A compromised connector advertising a capability outside the ADR 0012 enumerated set causes no grant to exist and no invocation to resolve.

**Leakage**

10. A credential planted in a plan, an event body, an artifact, and a log line is detected and quarantined in each case, with the detector failing closed when it errors.
11. A runner subprocess receives no credential through its environment, proven by reading the child's environment during a run.
12. A welcome package generated for a guest contains no credential and no capability the guest lacks a grant for.
13. Re:PORT output over an evidence set containing a planted secret excludes it and raises an incident.

**Teardown**

14. An abandoned session leaves no partial authority, with the assertion ordered so it would fail if teardown were lazy. This ordering requirement is not pedantry: W1-1 shipped a test whose own action produced the state it verified, and it took a differential probe against the prior implementation to establish that the reordered assertion could fail at all.
15. Every negative control above is demonstrated to fail against an implementation lacking the control, not merely to pass against the one that has it.

Item 15 is the standard this project has converged on and is the one that decides whether the rest of this list means anything.

## 11. Open findings raised by this model

- **F9.** Plan fields accept inline credentials; `database.target` is unconstrained. See section 7.1. Closes before W2 provisioning or W4 pull-request generation, whichever comes first.
- **F10.** No credential-pattern detector exists anywhere in the codebase yet. Sections 7.2, 7.4 and 7.5 all assume one. Closes before W3.
- **F11.** No guidance yet binds runner adapters away from environment-variable credential passing. Section 7.6. Closes in PW4.

## 12. What this model does not claim

It does not claim the wizard is safe against a compromised founder session, a compromised host kernel, or a malicious provider that is also correctly authorized. It does not claim credentials cannot leak; it claims each leak path has a named protection and a required proof. It does not claim any protection is implemented merely because it is written here: section 3 marks what is enforced today, and everything else is a requirement awaiting the evidence in section 10.
