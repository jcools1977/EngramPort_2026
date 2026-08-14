# ADR 0012: Workspace setup wizard, GitHub App connector, and the setup trust boundary

Status: proposed
Date: 2026-08-14
Supersedes: nothing
Amends: `ENGRAMPORT_ENGINEERING_SPEC.md` sections 30 and 25
Depends on: ADR 0001, 0002, 0005, 0009, 0011

## Context

The product direction requires a workspace setup wizard that connects a GitHub repository through a durable GitHub App, provisions PostgreSQL with pgvector, registers heterogeneous participants, assigns authority, installs bootstrap files through a pull request, generates per-participant MCP and CLI configuration, imports authorized repository history, runs a verified test relay, and issues expiring welcome packages.

Reconciling this with the engineering specification surfaces one blocking conflict and three unmodeled surfaces.

**The blocking conflict.** Specification section 30 lists "Native Slack/Linear/GitHub/Drive connectors" as explicit future work that does not block v1 "unless promoted through an ADR." A durable GitHub App connector is therefore currently out of scope by the specification's own terms. The direction cannot be implemented without promoting it, and promotion is exactly what this ADR is for. Building it without this record would leave the repository holding a specification that says the work is deferred and a codebase that says otherwise.

**Unmodeled surface one: the wizard's own privilege.** The wizard provisions databases, holds repository credentials, writes to a repository, mints identities, and grants permissions. Nothing in the specification models a component with that reach. Sections 13 and 15 assume authority flows from an authenticated principal to a constrained actor; the wizard would sit above that.

**Unmodeled surface two: the bootstrap paradox.** Every authorization path in the specification presumes an existing project, principal, and membership. The wizard must act before any of those exist.

**Unmodeled surface three: provisioning credentials.** Holding cloud or database administrative credentials is a trust boundary the specification never describes. Section 13 covers OIDC, API keys, and envelope encryption for integration credentials, but not a component that creates infrastructure.

## Decision

**1. Promote a GitHub App connector from section 30 future work into scope**, narrowly. Only the capabilities the wizard needs are promoted: read authorized repository content and history, open a single pull request on a non-default branch, and receive signature-verified webhooks. Merge rights, write access to default branches, issue and Actions management, and organization administration are **not** promoted and MUST NOT be requested. Other connectors named in section 30 stay deferred. A GitHub App is chosen over personal access tokens because installation-scoped credentials survive the founder's departure and are revocable per repository.

**2. The wizard is a bounded session, never a standing actor.** It authenticates a human founder through OIDC, then acts strictly under that principal's delegation with scopes narrowed to the setup task and an absolute expiry. It holds no authority of its own, retains no credential after the session ends, and its delegation is revoked at completion or abandonment. There is no `wizard` super-principal.

**3. The human founder is the root of authority, resolving the bootstrap paradox.** The first authenticated principal creates the tenant and project and becomes its owner. Every subsequent grant is traceable to that human. The wizard never grants a right the founder does not hold, which makes "no grant exceeds the granting principal's authority" true from the first event rather than from the first membership check.

**4. Every consequential step is human-gated with an action digest**, per specification section 6.3. Provisioning, GitHub App installation, opening the bootstrap pull request, importing history, and issuing welcome packages each bind to an exact digest over their parameters; any material change invalidates the approval. Self-approval is permitted for the founder on their own workspace, since there is no second party at setup time, and this exception is recorded rather than assumed.

**5. Approval granularity is deliberately coarse.** Steps are grouped into a small number of reviewable plans rather than approved individually. Section 6.3 compliance is satisfied by digest binding, not by approval count. Asking a founder to approve thirty steps trains them to approve without reading, which defeats the control it appears to implement.

**6. Provisioning is a driver interface, not a Supabase binding.** Consistent with section 7.1, the wizard supports connecting to an existing PostgreSQL instance and provisioning a managed one, and the schema stays portable to standard PostgreSQL. Provisioning credentials are supplied per session, never persisted by the wizard, and are held only for the duration of the approved step.

**7. Imported repository history is `trust=imported` and is data.** Following section 17.4, imported events preserve source repository, commit, and path provenance, are appended without fabricated historical sequence numbers, and are labeled untrusted. Secret detection runs before any embedding or external model call, per sections 10 and 23.3. Import authorization is bounded by what the installing principal can actually read; the App's reach is not the authorization.

**8. The authority model from the onboarding design is reaffirmed and is not reopened here.** Roles and scopes are authority. Capabilities and groups are routing and MUST NOT be authorization-bearing. Trust is assigned, never claimed, and never inferred from provider or model metadata. First-party agents receive no privilege for being first-party.

**9. The test relay MUST include a negative control.** A relay that only demonstrates success is not evidence. Setup reports success only when a correct denial has also been observed.

**10. PostgreSQL remains the single canonical store.** Consistent with ADR 0001 and 0002, the wizard introduces no second source of truth. Embeddings are derived and rebuildable, and embedding failure never rolls back an import.

## Alternatives considered

- **Personal access token instead of a GitHub App.** Simpler, and rejected: the connection dies with the founder's account, scopes cannot be constrained per repository, and revocation is all or nothing.
- **The wizard as a standing privileged service.** Operationally convenient, and rejected: it creates exactly the persistent super-identity that the append-only authority model exists to avoid, and it would hold credentials indefinitely.
- **Bootstrap files committed directly to the default branch.** Faster, and rejected: it removes the human review gate at the moment when the founder is least likely to be reading, and it makes the wizard a writer to protected branches.
- **Automatic merge of the bootstrap pull request.** Rejected for the same reason, and because merge rights are a materially larger permission grant than opening a pull request.
- **Importing all repository history by default.** Rejected: import scope is an authorization question and a secret-exposure question, not a convenience default.
- **Deferring the GitHub connector and shipping a manual bootstrap.** Genuinely viable, and rejected because repository connection is the spine of the direction. Recorded here so the trade is visible if scope must be cut later.

## Consequences

- Specification section 30 must be amended to note that GitHub connector capabilities enumerated above are promoted by this ADR, with the rest still deferred.
- Specification section 25 gains `apps/wizard/` and `packages/connector-github/`.
- A new threat model is required for setup-time credential handling, covering provisioning credentials, GitHub App private keys, and webhook secrets. This is a prerequisite for the connector task, not a follow-up.
- The onboarding increment tasks T1 through T7 become dependencies of the wizard's participant registration phase rather than parallel work.
- Envelope encryption per section 13 now has a concrete first consumer in the App private key and webhook secret.
- Sections 6.3 and 15 gain a setup-time reading that did not previously exist and should be documented for operators.

## Operational trigger for reconsideration

Reopen this ADR if any of the following occur: GitHub App installation proves unable to express least-privilege for the enumerated capabilities; a second repository host is required, making a GitHub-specific connector the wrong abstraction; provisioning credentials cannot be handled without persistence; or measured founder behavior shows the coarse approval grouping is being approved without review, which would mean decision 5 traded a real control for a comfortable one.

## Security impact

This ADR concentrates and then deliberately bounds the highest privilege in the product. The controls that carry that bound are the session-scoped delegation with expiry, the absence of any standing wizard identity, digest-bound approvals on every consequential step, least-privilege App permissions with merge rights excluded, per-session provisioning credentials that are never persisted, secret detection before embedding, and the mandatory denial control in the test relay. If any single one of these is dropped during implementation, the wizard becomes a persistent privileged component and this ADR no longer describes what was built.
