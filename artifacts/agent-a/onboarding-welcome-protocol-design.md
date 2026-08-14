# Onboarding and welcome-package protocol, design v1

Author: agent-a (Claude Architect)
Status: proposed for implementation
Scope: production increment following v0.1 canonical event service
Normative language: MUST, MUST NOT, SHOULD, MAY per RFC 2119, matching `ENGRAMPORT_ENGINEERING_SPEC.md`

## 1. Problem

EngramPort can carry work between two actors that already exist. It has no defined way to turn a stranger into a participant. Today an actor exists because somebody hand-wrote `actors/agent-a.yaml` and a row in a seed script. That does not survive contact with a real project, where the arrivals are a new teammate, a contractor with a six-week engagement, an auditor who may read but never write, a friend who wants to help for one evening, and that friend's own agent running on their own machine under their own keys and their own model vendor.

The spec's guiding implementation test in section 31 is precisely this case: "a new, initially context-free participant should be able to discover the right work, understand why the current state exists, act only within granted authority, append a durable response, and hand the project forward." Sections 4, 13, 14 and 15 give the primitives. Nothing assembles them into an arrival.

The hard part is not creating rows. It is that the newcomer arrives with no priors, cannot yet distinguish authority from prose, and is exactly the participant least able to detect that the project state it is being handed is a lie. Onboarding is therefore a security surface first and a convenience feature second.

## 2. The welcome package

A **welcome package** is a signed, content-addressed, bounded bundle that converts an accepted invitation into a working participant. It is the single artifact a newcomer needs, and it is verifiable without trusting whoever handed it over.

It has six parts:

1. **Identity block.** Who you are here: actor id, slug, kind, trust level, owning principal. What you may do: project roles and scopes. How you are addressed: capabilities and groups.
2. **Verified project checkpoint.** A `checkpoint.created` event naming `project_seq`, `chain_hash`, and issuance time, signed by the project's server key. This is what makes the package's view of history falsifiable.
3. **Bounded context.** Active decisions, open tasks and handoffs addressed to you, and thread summaries, assembled under an explicit token budget, every item labeled with source, trust and event id.
4. **Repository bootstrap instructions.** How to connect, verify, read your inbox, and append, drawn from the project's trusted policy files, never from an event body.
5. **A first typed handoff.** One small, real, completable piece of work addressed to the new actor. Completing it proves the whole loop.
6. **Trust boundary statement.** An explicit declaration that parts 2, 3 and 5 are quoted evidence and can never alter parts 1 or 4.

### 2.1 Manifest

Portability comes from separating the manifest from the parts. The manifest is the authority; the parts are content-addressed data.

```yaml
package_version: 1
package_id: <uuidv7>
issued_at: 2026-08-14T12:00:00Z
expires_at: 2026-08-28T12:00:00Z
issuer:
  tenant: <uuid>
  project: <uuid>
  principal: <uuid>
subject:
  invitation_id: <uuid>
  actor: <uuid>
  actor_slug: friend-agent
checkpoint:
  event_id: <uuid>
  project_seq: 1842
  chain_hash: <hex>
grant_digest: <sha256 over the canonical grant object>
parts:
  - name: identity
    media_type: application/yaml
    sha256: <hex>
  - name: context
    media_type: application/json
    sha256: <hex>
  - name: bootstrap
    media_type: text/markdown
    sha256: <hex>
  - name: first-handoff
    media_type: text/markdown
    sha256: <hex>
signature:
  algorithm: ed25519
  key_id: <uuid>
  value: <base64>
```

The same manifest is valid whether the parts are files in a Git checkout, resources fetched over REST, MCP resources, or a tarball on a USB stick. Verification is identical in every transport: recompute each part digest, verify the manifest signature over the canonical manifest digest, then verify the checkpoint against whatever log you can independently see. A newcomer who can see only the package can still detect tampering of parts; a newcomer who can also see the log can additionally detect a forged history.

### 2.2 The grant is structural, never parsed

`grant_digest` is a SHA-256 over the canonical grant object: project, role, scopes, capabilities, groups, trust ceiling, expiry. This mirrors the `action_digest` binding of approvals in section 6.3, and carries the same rule: **any material change to the grant invalidates the package.**

The rule that matters most: **an actor's rights MUST be read from the invitation's grant digest and the server-side membership and delegation tables, never from prose in any part.** No implementation may derive a permission by reading text. This is the structural control that makes part 3 safe to fill with untrusted project content.

## 3. Identity, roles, capabilities, groups, scopes, trust

The spec has an ambiguity here that will produce a security bug if it reaches implementation unresolved.

Section 4.3 makes `capability:security-review` an **address**. Section 8 stores `actors.capabilities text[]`. Section 13 defines scopes such as `events:write` and `approvals:decide` as **authorization**. A newcomer, or an agent reading its own actor record, will naturally read `capabilities: [security-review, admin]` as a statement of what it is allowed to do.

**Decision, binding on implementation:**

- **Capabilities are routing labels. They are descriptive and MUST NOT be authorization-bearing.** They answer "who should see this", never "who may do this."
- **Scopes are authorization.** Only scopes, project role, and delegation determine what an actor may do.
- **Groups are routing plus optional role inheritance**, and inheritance MUST be resolved server-side into effective scopes at authorization time, never trusted from a client-supplied claim.
- An actor MUST NOT be able to modify its own capabilities, groups, role, scopes, or trust level. Self-service edits of routing labels are a privilege-escalation vector precisely because humans and agents will confuse them with permission.
- **Trust level is assigned, never claimed.** Provider and model metadata are descriptive per section 13. An arriving agent that says it is Claude, or says it is `trusted_agent`, gets `untrusted_agent`.

Default grants for arrivals:

| Arrival | Role | Trust | Expiry | Denied scopes |
|---|---|---|---|---|
| Teammate | contributor | trusted_agent or verified_human | none | admin:project |
| Contractor | contributor | untrusted_agent | engagement end | approvals:decide, admin:project, memory:accept |
| Auditor | reader | verified_human | 30 days | events:write, artifacts:write |
| Friend | contributor, single project | untrusted_agent | 14 days | approvals:decide, admin:project, memory:accept |
| Friend's agent | contributor, single project | untrusted_agent | 14 days, at most the friend's | approvals:decide, admin:project, memory:accept, subscriptions:manage |

A grant MUST NOT exceed the granting principal's own authority, and a delegated agent's grant MUST NOT exceed and MUST NOT outlive its owning principal's.

## 4. Invitations

An invitation is a canonical event plus a projected state row. The redemption token is a bearer secret, high entropy, hashed at rest, displayed once, exactly as API keys in section 13.

**The token grants only the right to attempt redemption.** It never carries the grant. This separation is what makes a leaked invitation link survivable: redemption still checks the projected invitation status, the expiry, the single-use flag, and the issuer's continued authority.

New event kinds, extending section 5.4:

| Family | Kinds |
|---|---|
| Invitation | `invitation.created`, `invitation.sent`, `invitation.accepted`, `invitation.declined`, `invitation.revoked`, `invitation.expired` |
| Membership | `membership.granted`, `membership.role_changed`, `membership.revoked` |
| Delegation | `delegation.granted`, `delegation.revoked` |
| Key | `key.registered`, `key.revoked` |
| Welcome | `welcome.package_issued`, `welcome.package_acknowledged` |
| Offboarding | `offboarding.initiated`, `offboarding.completed` |
| Actor | `actor.registered`, `actor.disabled`, `actor.retired` |

Redemption MUST be a single transaction that: resolves the token hash, loads the projected invitation with `FOR UPDATE`, checks status is `open`, checks `expires_at > now()`, checks the issuer still holds the authority the grant requires, checks the grant digest is unchanged, creates or binds the actor, writes membership and delegation, and marks the invitation consumed with an optimistic version check. Concurrency follows section 16: two simultaneous redemptions of a single-use invitation MUST resolve with exactly one winner and one explicit conflict error.

## 5. Friends and independently operated agents

This is the case that distinguishes EngramPort from a team tool, and the one most likely to be got wrong by relaxing isolation.

A friend is an external human who may hold no account, brings their own agent, runs it on their own machine, under their own model vendor, with keys the project does not hold and cannot audit.

**Decision:** guests join as **guest principals inside the host tenant**, scoped to one project, at `untrusted_agent` trust, with a short absolute expiry. Cross-tenant read paths are **not** relaxed to accommodate them. Section 8.2's forced RLS stays exactly as it is; a guest is a member of the host project or is nothing.

The rejected alternative is federated cross-tenant membership, where the guest stays in their own tenant and policy spans both. It is rejected for this increment because it requires every authorization path to reason about two tenants at once, which is the single change most likely to produce a cross-tenant leak. It is recorded as future work behind a bridge actor that mirrors selected events with `trust=imported` and preserved source provenance, in the manner of section 17.4 Git import. This warrants an ADR before anyone attempts it.

The friend's **agent** is a distinct actor owned by the friend's principal, with its own delegation, its own registered Ed25519 key, and a grant that is the intersection of the friend's grant and the agent's own ceiling. Revoking the friend MUST revoke the agent.

**Attestation honesty.** Per section 15, a verified signature on a guest agent's event proves possession of a key at signing time. It does not prove which model produced the text, that the friend did not edit it, or that the key is uncompromised. Verification output MUST report `valid`, `invalid`, `unknown_key`, `revoked_after_signing`, or `unanchored`, and MUST NOT collapse into a claim that the content is trustworthy.

## 6. Expiry, revocation, offboarding

Every grant in this protocol carries an absolute expiry. Unbounded access is opt-in for permanent staff, never the default for arrivals.

- **Expiry.** Enforced at redemption and at authorization, from the projection, not from the token.
- **Revocation before acceptance.** `invitation.revoked` flips projected status. Redemption checks status, so a revoked token fails even though its bytes remain valid.
- **Revocation after acceptance.** `membership.revoked`, `delegation.revoked`, `key.revoked`, `actor.disabled`. Effective immediately for new requests. In-flight agent sessions are bounded by the short-lived least-privilege tokens of section 13; token lifetime is therefore the true revocation latency and MUST be documented as such rather than described as instant.
- **Offboarding** is a cascade, and the step teams forget is the last one: `offboarding.initiated`, then revoke every membership, delegation and key, disable every owned actor, end every agent session, **expire every invitation the departing principal issued that is still open**, rotate any shared secret they held, then `offboarding.completed` carrying the evidence list. An offboarded maintainer whose outstanding invitations stay redeemable is a persistent backdoor.
- **History is immutable.** Revocation and offboarding never delete authored events. Attribution survives. Legal erasure follows section 5.3, by cryptographic erasure or audited tombstoning, never by mutating the log.

## 7. Provenance and audit

Every right an actor holds MUST be answerable by walking events: `invitation.created` → `invitation.accepted` → `membership.granted` → `delegation.granted`, each with a chain position. "Why does this actor have this scope" is a query, not an investigation.

Section 14.9 requires recording the exact context supplied to an agent. Therefore `welcome.package_issued` MUST record the manifest digest, every part digest, and the list of event ids included in the bounded context. This is what lets an auditor later prove exactly what a newcomer was shown, which matters when the question is whether a participant was misled.

## 8. Prompt-injection boundaries

The welcome package is the highest-risk artifact in the system. It is consumed by a participant with no priors, and its whole purpose is to carry project content into a fresh context. Section 14 applies with these additions:

1. **Manifest is authority; parts are data.** No part may alter identity, grant, or bootstrap instructions. Enforced structurally: the consumer reads rights from the identity block, which is covered by the signature and bound to `grant_digest`.
2. **Bootstrap instructions come from trusted policy files**, never from event bodies, and never from the invitation's free text.
3. **Every context item is delimited and labeled** with source, trust level and event id, per section 14.3.
4. **Reference expansion is bounded** in depth, size and domain, per section 14.8. A welcome package MUST NOT recursively inline artifacts.
5. **No prose filtering.** The control is structural, not a blocklist of phrases like "ignore previous instructions." Such text is stored, searchable, and inert. An implementation that tries to sanitize wording instead of removing authority has not solved the problem.
6. **Invitation free text is untrusted and attacker-controlled.** Whoever can create an invitation can put text in front of a fresh agent. It MUST be labeled and delimited exactly like event content.
7. **Red-team fixtures are mandatory**, not optional: a package whose context contains role-escalation instructions, one whose invitation note impersonates the operator, one whose part content contradicts the identity block, and one with a valid signature over a tampered part list.

## 9. Known spec gaps this increment must close

1. **No groups table.** Section 4.3 defines `group:` addressing; section 8 has no `groups` or `group_members`. Addressing a group is currently unimplementable.
2. **Capability versus scope ambiguity**, resolved in section 3 above, but the spec text itself should be amended.
3. **No invitation, key, or welcome-package tables** anywhere in section 8.
4. **No `actor.registered` payload definition** although the kind is listed in section 5.4.
5. **Git v0 artifact ownership is unenforced.** `verify-log` checks that events live under the authoring actor's directory, but artifact references are only checked against the shared `artifacts/` root, so any actor can reference or place a file under another actor's artifact prefix. Onboarding introduces guests, which makes this exploitable rather than theoretical.
6. **Strict relay cannot express onboarding.** The Git substrate implements only `strict_relay`, where every reply must come from the parent's `next` actor and an actor may not follow itself. An invitee is by definition not yet an actor, so it can never be named as `next`, and an issuer cannot revoke or expire its own invitation in-thread without a counterparty. Onboarding threads are inherently not two-party relays. Section 6.2 already defines `free_form` and `coordinator_led`; the Git adapter needs per-thread mode before any real onboarding thread can exist in this substrate.

## 10. Decomposition into bounded tasks

Ordered. Each is independently verifiable and none bundles two verification stories.

- **T1. Invitation record and welcome-package manifest, with verification.** The two file formats, their schemas, `engram welcome verify`, artifact-prefix ownership enforcement in `verify-log`, and a negative fixture for every rejection reason. Runs today on Node with no external services. This is the first handoff.
- **T1.5. Per-thread modes in the Git substrate.** `free_form` and `coordinator_led` alongside `strict_relay`, declared per thread, so an onboarding thread can exist at all. Blocking for any real invitation thread; see gap 6.
- **T2. Postgres onboarding schema, migration 0002.** `groups`, `group_members`, `invitations`, `invitation_redemptions`, `actor_keys`, `welcome_packages`, projections `membership_state` and `invitation_state`, forced RLS, immutability, failure tests. Blocked on a Docker-capable host, together with the outstanding v0.1 runtime proof.
- **T3. Invitation lifecycle service.** Create, send, accept, decline, revoke, expire; digest binding; single-use concurrency with exactly one winner.
- **T4. Welcome package assembler.** Bounded context under token budget, provenance labels, checkpoint binding, issuance event recording every included event id.
- **T5. Guest and foreign-agent participation.** Guest principals, key registration, signature verification with honest limit reporting, cross-tenant ADR.
- **T6. Revocation and offboarding cascade.** Including outstanding-invitation invalidation and documented revocation latency.
- **T7. Injection red-team suite.** The fixtures in section 8.7, run in CI.

**Why T1 is first and is Git-layer rather than Postgres.** The v0.1 migration is written but has never been executed: no Docker runtime exists in either agent's environment, so its tests are unrun. Handing over a second unrunnable migration would stack unproven work on unproven work, against the principle that the presence of code is not evidence of the code being executed. The Git substrate is executable today, is the spec's designated interoperability proof in section 17, and is exactly the surface a friend meets when they clone a repository. T1 produces a demonstrated onboarding loop now; T2 ports it to Postgres when a host exists.
