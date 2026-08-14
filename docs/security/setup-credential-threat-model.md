# Setup-time credential threat model

Status: revision 5, lifecycle matrix complete
Owner: agent-a (architecture)
Date: 2026-08-14
Task: W1-2
Revision basis: agent-b final confirmation review, event `01a00215-b700-713a-8365-5dbd32a524e9`. Verdict: revision 4 accepted at the contract level, with one documentation-only blocker, the incomplete lifecycle matrix, plus two editorial defects. All three are corrected in revision 5. No architecture changed: A1–A9, B1–B9, C1–C17, F14 scope and task ownership are unchanged.
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

**Identifiers are `TA1`–`TA8`.** Revision 4 numbered them `A1`–`A8`, colliding with the Tier A controls `A1`–`A9`, so `A6` meant both a compromised provider and a shape-selection control. Renamed in revision 5; control identifiers are unchanged.

| Actor | Capability |
|---|---|
| **TA1** Curious insider | Reads the repository, event log, CI output, backups, Re:PORT |
| **TA2** Compromised agent | Executes as a registered actor, reads its context, appends events |
| **TA3** Malicious plan author | Writes or edits `workspace.setup.yaml` |
| **TA4** Host-local observer | Process environment and arguments, `ps`, `/proc`, dumps, shell history, editor state, temp files |
| **TA5** Repository reader | Clones the repo, including a guest holding a welcome package |
| **TA6** Compromised provider | Controls a connector endpoint or MCP server. Supplies descriptor bytes |
| **TA7** Caller of the setup API | Invokes setup entry points with chosen arguments |
| **TA8** Concurrent caller | Races another caller through an unguarded check-then-act. Added in revision 3 |

Not defended against: an attacker controlling the founder's authenticated session at setup time, or the host kernel.

## 3. Credential inventory

Sixteen classes. Every row maps to a Tier C gate in section 11. A credential absent from this table has no sanctioned path through setup.

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
| 3.13 | Model provider token | Participant or tenant | Model A | Process making the call | **[FUTURE]** runtime config, **outside setup** | C15 |
| 3.14 | Temporary agent credential | Agent's owning principal | Model C | Runner adapter, one run | **[IMPLEMENTED]** narrowly, see below | C4 |
| 3.15 | **GitHub App authentication JWT** | Tenant, signed by 3.3 | Model C, never at rest | Token-exchange caller only | **[FUTURE]** W3-1 | C16 |
| 3.16 | **Setup-session delegation authority** | Founder, derived | Model C, in-memory today | The setup session itself | **[IMPLEMENTED]** narrowly, see 3.16 detail | C17 |


### 3.0 Lifecycle matrix, all sixteen classes

Revision 4's inventory gave owner, custody, consumer, status and gate, and stated issuance, lifetime, rotation, revocation and teardown for only four rows. An inventory claiming complete lifecycles must state every field for every row, so here they are. Rows with a fuller narrative below are cross-referenced; the fields here are normative regardless.

| # | Issuer / issuance | Lifetime / expiry | Rotation / reissue | Revocation | Teardown |
|---|---|---|---|---|---|
| 3.1 OIDC transients | Founder's IdP, at the authorization request | Auth code and PKCE verifier seconds; ID token minutes | Not rotated; a new flow issues new ones | IdP session revocation | Code and verifier destroyed at exchange; ID token discarded after `principal_id` extraction. No refresh token is requested |
| 3.2 OIDC client secret | Tenant, at IdP client registration | Long-lived; no absolute ceiling imposed by us | Rotated at the IdP with an overlap window during which both authenticate | Delete at the IdP; local reference becomes inert | Outlives setup by design; setup's access ends at session teardown |
| 3.3 App private key | Tenant, generated inside the KMS/HSM boundary, never imported in plaintext | Long-lived; the highest-value secret in the product | Rotated without reinstallation, both valid during a bounded overlap, old destroyed at overlap end | Uninstall **plus** key destruction. Uninstall alone leaves a resurrection path | Never held by the wizard, so nothing to tear down; the signing identity's authorization is revoked at teardown |
| 3.4 Installation access token | GitHub, minted per operation from a 3.15 JWT | GitHub-defined, at most one hour; **never cached across operations** | Not rotated; re-minted per operation | Uninstall invalidates outstanding tokens | Destroyed at operation completion, before the calling frame returns |
| 3.5 Webhook secret | Tenant, at App configuration | Long-lived until rotated | Rotated independently of 3.3, with an overlap during which both verify | Rotate at GitHub and locally; a stale secret **fails closed**, never falls back to accepting unsigned | Outlives setup; setup's access ends at teardown |
| 3.6 KMS workload identity | Cloud platform, at service provisioning | Platform-managed, short-lived assertions | Platform-native rotation, no application involvement | Revoke the platform binding; must render existing ciphertext unusable by that identity immediately | Never held as a durable secret by the application |
| 3.7 Key-encryption key | Tenant, generated in the KMS | Long-lived | KMS-native rotation with re-encryption of dependent material | Revoke the custody service's KMS authorization | Never in the application, so nothing to destroy |
| 3.8 Package signing key | Tenant, generated inside the signing boundary | Long-lived, with a registered validity interval | New key registered with its interval before first use; overlap while both are valid | Key revocation; prior packages report `revoked_after_signing`, not `invalid` | Plaintext never in wizard memory; the issuer's authorization ends at teardown |
| 3.9 Invitation token | Inviting principal through EngramPort, at package generation | Absolute; at most fourteen days for guests | A new invitation with a new token. **Never re-sent**, because re-sending implies retention | `invitation.revoked` flips projected status; redemption checks status, so leaked bytes still fail | Plaintext shown once and never persisted; offboarding the issuer expires every open invitation they issued |
| 3.10 Provisioning credential | Founder's provider, supplied at the approved step rather than at session start | The shorter of the step and the session; destroyed at step completion | Provider-native; the wizard never rotates what it does not own | Founder revokes at the provider | Destroyed at step completion or session end, whichever is first |
| 3.11 DB runtime credential | Generated by the provisioning step | Long-lived until rotated | Rotated at the database with the secret manager updated in the same operation | Drop or alter the role; the secret manager entry is invalidated in the same operation | Never traverses plan, log, artifact, argv or environment; delivered directly to the secret manager |
| 3.12 Connector authorization | The granting participant, through their own provider flow | The provider's, with the EngramPort grant carrying its own shorter absolute expiry | The participant's concern; the reference survives rotation because it references rather than copies | Grant revocation makes the reference inert; provider revocation is independent. **Both must work alone** | EngramPort holds no credential to destroy; the grant is revoked and the custody row sealed |
| 3.13 Model provider token | Participant or tenant, outside setup | The provider's | The provider's | Provider-side revocation; the secret manager reference becomes inert | Setup holds none, so nothing to tear down. Owned by runtime configuration |
| 3.14 Temporary agent credential | Minted per run by the supervisor | Short-lived; **the token lifetime is the true revocation latency** and must be documented as such | Per run; never renewed in place | Stop revokes the lease and the token; in-flight work fails at its next authorized call | Destroyed at run completion or lease expiry |
| 3.15 App authentication JWT | The custody signing service, signed with 3.3. The application never signs it itself | At most ten minutes; `iat` backdated no more than sixty seconds | Not rotated; re-minted per exchange | No independent revocation exists, which is why the window is minutes. Revoking 3.3 stops future minting but cannot recall an outstanding JWT | Single use; destroyed at exchange whether or not the exchange succeeded |
| 3.16 Session delegation | Derived from the founder's resolved authority at `start` | Absolute and required, never exceeding the founder's own | None. A new session is a new delegation | Completion, abandonment, expiry, or explicit teardown | Authority record destroyed; approvals revoked so replay is refused |

**Two rules that apply to every row above.** Nothing in this matrix is enforced by being written here; the status column of the inventory and the section 12 matrix carry that. And every expiry becomes a datastore obligation under constraint C6 the moment the credential is stored durably, not an application sweep.

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

### 3.15 detail: GitHub App authentication JWT

Distinct from the installation access token of 3.4, and unnamed until revision 4. This is the short-lived JWT **signed with the App private key** and exchanged for an installation token. It is the credential that proves possession of the key, so compromising it is closer to compromising the key than to compromising a token.

| Property | Value |
|---|---|
| Issuer | The custody signing service, using 3.3. **The application never signs it itself**, because signing it is exactly the operation the key is confined behind |
| Owner | Tenant |
| Custody | **Model C.** Exists only in memory, only between minting and exchange |
| Consumer | The token-exchange caller only. Never a plan, event, log, artifact, argv, or environment |
| Claims | `iss` the App id, `iat` backdated no more than 60 seconds, `exp` at most 10 minutes and preferably shorter, `aud` pinned to the exchange endpoint |
| Expiry | At most 10 minutes; never extended, never reused after exchange |
| Replay | Single use. A JWT is discarded at exchange whether or not the exchange succeeded, so a captured one cannot be replayed within its window |
| Rotation | Not rotated; re-minted per exchange |
| Revocation | No independent revocation exists, which is why the window is minutes. Revoking 3.3 stops future minting but cannot recall an outstanding JWT |
| Teardown | Destroyed at exchange completion, before the calling frame returns |

### 3.16 detail: setup-session delegation authority

Inventoried in revision 2, dropped in revision 3, restored here. It is the wizard's own derived authority and is distinct from the temporary agent credential of 3.14: that one authorizes a runner, this one authorizes the setup session itself.

| Property | Value |
|---|---|
| Issuer | Derived from the founder's resolved authority, per section 7 |
| Owner | The founder principal |
| Custody | **Model C.** In-memory today; durable form gated by C7 and constraint C6 |
| Consumer | The setup session manager only |
| Scope | `setup:`-prefixed scopes contained in the founder's resolved authority. Never broader, never non-setup |
| Issuance | At `start`, after the resolver returns held authority. **[TEST-GATED]** on A1, because today it derives from a caller-supplied assertion |
| Expiry | Absolute and required, never exceeding the founder's own |
| Rotation | None. A new session is a new delegation |
| Revocation | Completion, abandonment, expiry, or explicit teardown; all destroy the authority record |
| Teardown | **[IMPLEMENTED]** narrowly, verified by probe, for the in-memory manager only. The durable form must satisfy constraint C6 before first use |

### 3.14 detail

**[IMPLEMENTED], narrowly.** PW1 passes the runner an object carrying exactly the actor's scopes; supervisor scopes structurally cannot reach it, verified by probe. **What does not exist:** a token value, minting, expiry, an authorized-call check, or revocation. The property is **scope separation**, nothing more. The rest is **[FUTURE]** PW4 and PW7.

## 4. Discovery is not authority

A connector advertises what it can do. Those are bytes from A6.

1. **Discovery returns descriptors.** A descriptor carries no credential, no provider locator, and **no custody or authority-bearing reference**. Revision 3 said "no reference of any kind", which was literally false because a descriptor carries `shape_ref`; the intended property is the narrower one, and `shape_ref` is now derived by ingest rather than supplied. A descriptor cannot address anything.
1a. **Shape selection belongs to the trusted registry.** A provider declares `provider`, `capability` and `protocol_version`. Ingest looks up the pinned shape revision from the trusted integration binding and derives `shape_ref` itself. Provider bytes are validated **against** the selected schema and may not **select** which valid schema applies. Revision 3 prevented registering or shadowing a shape but still let attacker-controlled bytes choose among existing valid ones.
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

## 5A. The custody mint contract

Revision 3 claimed a provider cannot forge a reference because minting requires an authorized custody write, then never specified that write. The final review is right that this moved the risk to the correct boundary without making it testable. **[TEST-GATED]** before W3, control **A8**, owner W1-7.

**The caller supplies no reference id.** Minting is the service's exclusive act, and the caller supplies none of: reference id, UUID, namespace binding, `tenant_id`, `project_id`, `principal_id`, or `actor_id`. Every one of those is derived.

**Who may mint, per namespace:**

| Namespace | Sole authorized minter |
|---|---|
| `shape` | The trusted registry administration path |
| `installation` | The authorized installation path |
| `credential` | The custody service |

**Never permitted to mint:** providers, plans, callers, agents, runners, and the general application identity.

**One transaction, all of it or none of it:**

1. Resolve tenant and project membership for the authenticated principal, from the trusted store.
2. Resolve the authenticated principal and, where delegated, the delegated actor.
3. Resolve a **live authorized grant** covering this mint.
4. Verify the requested scopes are contained in that grant, including the namespace-specific mint scope.
5. Verify the credential class and that its applicable gate has passed for the current revision.
6. Write the sealed custody row.
7. Mint the namespaced UUIDv7 reference.
8. Bind the reference to the custody row with tenant, project, and namespace.
9. Write the audit record.

**Commit both or neither.** A reference is never minted first and populated later, and a custody row never exists without its binding.

**Controls for A8**, each a negative with a paired positive:

| # | Attempt | Expected |
|---|---|---|
| M1 | Caller supplies a chosen reference id | Refused; callers cannot name references |
| M2 | Mint bound to a foreign tenant | Refused |
| M3 | Mint bound to a foreign project within the right tenant | Refused |
| M4 | Mint under an expired grant | Refused |
| M5 | Mint under a revoked grant | Refused |
| M6 | Mint against a revoked custody row | Refused |
| M7 | Requested scope exceeds the grant | Refused, not narrowed |
| M8 | Wrong namespace for the minting identity, for example an agent minting `credential` | Refused |
| M9 | Duplicate UUID collision | Refused deterministically |
| M10 | Two concurrent mints racing for one logical row | Exactly one commits; the loser is deterministic |
| M11 | Fault injected between custody-row write and reference bind | Neither survives; no orphan row, no orphan reference |
| M12 | Fault injected after reference mint, before commit | Reference does not exist afterwards |
| M13 | Credential class whose applicable gate has not passed | Refused |
| **MP** | Fully authorized mint | Succeeds, returns a reference that resolves, with an audit record |

**Orphan resistance is the point of M11 and M12.** The schema accepts a syntactically valid but unresolvable reference, correctly, because structure cannot prove resolution. The custody API is what must guarantee that a valid-looking reference either resolves or was never minted.

## 6. Grant resolution: a grant-shaped document is not authority

Revision 2 permitted a forged but schema-valid grant to satisfy the documented invocation shape. Structural placement of a locator inside a grant payload is necessary and not sufficient.

**Required at every invocation, [TEST-GATED] before W3, owner W1-6.** Revision 3 said "authorized consumer only", which names a property rather than a comparison. These are comparisons:

1. Resolve to a **live server-side record** by `grant_id`; compare the presented document against it and never trust it in its place.
2. **Invoking authenticated principal** equals `granted_to_principal_id`.
3. **Invoking delegated actor** equals `granted_to_actor_id` where present; where absent, no actor delegation is implied.
4. **Invoking tenant** equals stored `tenant_id`; **invoking project** equals stored `project_id`.
5. **Requested action and scopes** are contained in the stored grant scopes. A superset request is refused, never silently narrowed.
6. Stored **provider** and **capability** equal those of the requested operation.
7. **Unexpired** against the database clock per C6.
8. **Grant not revoked** at use time, re-read within the invocation rather than cached from an earlier check.
9. **Setup session not revoked**, expired, or torn down, where the invocation occurs inside one.
10. **Referenced custody rows not revoked** at use time, for both `installation_ref` and `credential_ref`.
11. `granted_by_principal_id` is **never** accepted as proof; grant creation derives granter authority from the resolver of section 7 and may not exceed or outlive it.
12. `installation_ref` and `credential_ref` resolve through the custody service at call time; the invoking code never receives the provider locator or the credential.

**Existence of a valid reference or a live custody row never suffices.** Every comparison above is required, and any failure is refused with a distinct error and audited.

**Controls for A6 and B9**, each with a paired positive:

| # | Attempt | Expected |
|---|---|---|
| G1 | Forged grant document, no stored record | Refused |
| G2 | Already-expired stored grant | Refused |
| G3 | Revoked stored grant | Refused |
| G4 | Cross-tenant invocation | Refused |
| G5 | Cross-project invocation | Refused |
| G6 | Wrong provider | Refused |
| G7 | Wrong capability | Refused |
| G8 | Principal other than `granted_to_principal_id` | Refused |
| G9 | Actor mismatch where `granted_to_actor_id` is set | Refused |
| G10 | Requested scope exceeding stored scopes | Refused, not narrowed |
| G11 | Grantor exceeded own authority at creation time | Refused at creation |
| G12 | Grant revoked between check and use | Refused, proving the re-read |
| G13 | Setup session revoked mid-invocation | Refused |
| G14 | Custody row revoked while grant remains active | Refused |
| **GP** | Fully authorized invocation | Succeeds |

## 7. Bootstrap authority: resolver and the concurrent race

`SetupSessionManager.start` authenticates down to a `principal_id`, then accepts a caller-supplied `founder_authority` object and checks only that its id matches and that requested scopes and expiry are subsets **of that supplied object**. TA7 can assert arbitrary founder scopes. Recorded as **F12**.

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
3. **Prove absence of the canary from every sink, differentially.** Revision 3 listed faults that create a searchable artifact without proving the observer can see a leak. Raising the log level does not put the canary in a log; reading `argv` observes but does not make the checker fail; forcing a crash produces a dump without proving detection.

**Every sink runs twice.** First an **isolated vulnerable variant** deliberately routes the known canary into that sink, and the observer MUST detect it. Only then does the **protected variant** run, and the observer MUST find the sink clean while signing still succeeds. A sink that has never been observed dirty is a sink whose observer is unproven.

| Sink | Vulnerable variant must be DETECTED | Protected variant must be CLEAN |
|---|---|---|
| Logs | Variant logs the canary at the operation's log level | No canary at trace level |
| Events | Variant appends an event body carrying the canary, with the detector disabled | Append carrying the canary is refused by section 8 |
| Artifacts | Variant registers an artifact containing the canary | Registration refused |
| Plans | Variant compiles a plan with the canary in a field | Compilation refused |
| Re:PORT output | Variant generates over an evidence set seeded with the canary, detector disabled | Canary excluded and an incident raised |
| Process arguments | Variant passes the canary in `argv`; observer reads it live | `argv` clean during a live signing operation |
| Process environment | Variant passes the canary in the environment; observer reads `/proc/<pid>/environ` live | Environment clean |
| Core dumps | Variant holds the canary in a buffer and crashes; observer finds it in the dump | Forced crash during signing yields a dump with no canary |
| Backups | Variant writes the canary to a backed-up store; backup taken during the operation contains it | Backup taken during signing contains no canary |
| Error surfaces | Variant raises an exception carrying the canary in its message and stack | Forced exception during signing serializes no canary |

**Isolation requirement.** The canary import path used by vulnerable variants MUST be structurally separate from the production non-exportable-key path, so a vulnerable variant can never place real key material anywhere. Vulnerable variants run only against the synthetic tenant and synthetic key.

4. **Prove denial** for four identities: the wizard, an agent, a runner, and the application's general identity each attempt to sign and each is denied, with IAM policy evidence showing the deny and the connector's allow.
5. **Prove export denial:** an export attempt on the synthetic key fails.
6. **Prove revocation:** revoking the connector identity's authorization renders existing ciphertext unusable by it immediately.
7. **Bind the signer narrowly:** the connector identity is authorized for one tenant, one key, one purpose, and one signing algorithm, so it is not a general cross-tenant signing oracle. Proven by attempting each of the four out-of-binding variants and being denied.

**Counterfactual requirement:** each check above must be demonstrated to fail when its control is removed. A confinement claim that has never been observed failing is an assumption.

## 11. Control gates

**W3-1 may begin after Tier A, using synthetic and non-production credentials only.** Tier B gates W3-1 completion, also synthetic. **No real credential of any class may exist before its own Tier C gate passes, and no real credential of any class may exist before the section 10 falsifiable custody evidence passes**, because every class either lives behind the custody boundary or is protected by controls the harness is what verifies. Passing a synthetic Tier B control never authorizes a real credential.

### The dispatch gate is mechanical, not documentary

Revision 3 recorded that A2 is blocked on C1 and left W3 blocked only by prose. The final review is right that nothing executable prevented a paper waiver, and that C1 is honest only if a missing host **blocks progress** rather than authorizing an exception.

**Required before Tier A may be dispatched, [TEST-GATED], owner W1-5:**

1. **Register W1-5, W1-6 and W1-7** in `docs/plan/workspace-setup-wizard-tasks.md`. Requirements owned by unregistered tasks are unenforceable. Registration is not part of W1-2.
2. **An evidence registry** records, per control, the revision of this document it was demonstrated against, the commit, and the outcome.
3. **W3-1 dispatch fails closed** unless the registry reports **every** Tier A control passed **for the exact current revision** of this document. Not "for some revision": a revision that adds a control invalidates a prior all-clear, which is why the registry keys on revision.
4. **While C1 blocks any applicable Tier A control, W3-1 is mechanically ineligible.** A2 cannot be satisfied without a live PostgreSQL host, so W3-1 cannot be dispatched, and no note, waiver, or judgment call may override it. The absence of a host is a hard stop, which is what makes recording C1 honest rather than decorative.
5. The gate is enforced by the dispatcher, CI, or task state, and a test proves that **removing a passing Tier A entry makes W3-1 dispatch fail**.

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
| A8 | **Custody mint contract of section 5A**, atomic and namespace-authorized, with controls M1–M13 and MP | W1-7 |
| A9 | **Shape selection derived from the trusted registry**, not provider bytes: a descriptor carrying `shape_ref` on the wire is refused, and a provider naming a different valid local shape is refused on mismatch | W1-6 |

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
| C15 | Model provider token by secret-manager reference; setup holds none. **Outside setup**; owned by runtime configuration | Provider token | 3.13 |
| C16 | App authentication JWT signed only by the custody service, `aud` pinned, `exp` at most 10 minutes, single use, destroyed at exchange | App JWT | 3.15 |
| C17 | Setup-session delegation derived from resolved authority, never caller-asserted; durable form satisfies constraint C6 before first durable delegation | Session delegation | 3.16 |

## 12. Traceability matrix

| Requirement | Section | Implementing task | Executable control | Transition gated | Status |
|---|---|---|---|---|---|
| Authority resolver | 7.1 | W1-5 | A1 | W3 start | [TEST-GATED] |
| Atomic bootstrap | 7.2 | W1-5 | A2 | W3 start | [TEST-GATED] |
| Concurrent bootstrap race | 7.3 | W1-5 | A2, blocked on C1 | W3 start | [TEST-GATED] |
| Resolver independence | 7.4 | W1-5 | A1, second assertion of the same control | W3 start | [TEST-GATED] |
| Plan credential refusal | 9, F9 | W1-6 | A3 | W3 start | [TEST-GATED] |
| Credential detector | 9, F10 | W1-6 | A4 | W3 start | [TEST-GATED] |
| Ingest interface, N1–N14 | 8 | W1-6 | A5 | W3 start | [TEST-GATED] |
| Grant-write authorization | 6.3 | W1-6 | A6 | W3 start | [TEST-GATED] |
| Grant resolution at invocation | 6.1, 6.2 | W1-6 | B9 | W3 completion | [TEST-GATED] |
| Minted references | 5 | W1-7 | A7 | W3 start | [TEST-GATED] |
| Custody mint contract, M1–M13 | 5A | W1-7 | A8 | W3 start | [TEST-GATED] |
| Registry-derived shape selection | 4.1a | W1-6 | A9 | W3 start | [TEST-GATED] |
| Invocation comparisons, G1–G14 | 6 | W1-6 | A6, B9 | W3 completion | [TEST-GATED] |
| Mechanical dispatch gate | 11 | W1-5 | gate items 1–5 | Tier A dispatch | [TEST-GATED] |
| Differential canary variants | 10 | W1-7 | B5 | first real key | [TEST-GATED] |
| App JWT lifecycle | 3.15 | W3-1 | C16 | first real JWT | [FUTURE] |
| Setup delegation lifecycle | 3.16 | W1-5 | C17 | first durable delegation | [TEST-GATED] |
| Artifact binding eligibility | 14 | none yet | F14 rule | any credential-bearing binding | [FUTURE] |
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
| Model provider token | 3.13 | runtime configuration, outside setup | C15 | first real provider token | [FUTURE] |
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

**F14, kept separate and stated as a mechanical rule.** Git v0 cannot supersede an artifact binding, so bound bytes can never be redacted. F14 does not broaden W1-2 and does not block synthetic W3 work, because A4 refuses credential-bearing artifacts before binding.

**The binding rule, until F14 closes:** *credential-bearing or externally supplied artifacts are structurally ineligible for Git-v0 artifact binding.* Not discouraged, ineligible. An artifact is eligible only if it is authored inside this repository and has passed the credential detector; anything received from a provider, a participant, or any external source, and anything the detector has not cleared, may be stored in a deletable quarantine but MUST NOT be referenced by an event's `artifacts` field.

The reason is demonstrated rather than theoretical: an illustrative token literal in one of my own documents propagated into agent-b's review of it and from there into an immutable event whose body hash binds it. It cannot be removed. Had it been a live credential, rotation would have been the only remedy. Until typed supersession exists, **every detector miss on a bound artifact is a permanent proof obligation**.

## 15. What this model does not claim

It does not claim safety against a compromised founder session, host kernel, or a malicious but correctly authorized provider. It does not claim credentials cannot leak. It claims every path has a named protection, an accurate status label, an owning task, an executable control, and a transition it gates.

**It does not claim that passing Tier A makes the system ready for a real credential.** Tier A permits W3-1 to begin with synthetic credentials. Tier B, the section 10 canary harness, and the class's own Tier C gate are what permit a real one.
