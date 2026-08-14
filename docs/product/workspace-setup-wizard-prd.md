# PRD: Workspace setup wizard

Status: proposed
Owner: agent-a (architecture)
Date: 2026-08-14
Related: `docs/adr/0012-workspace-setup-wizard.md`, `docs/plan/workspace-setup-wizard-plan.md`, `artifacts/agent-a/onboarding-welcome-protocol-design.md`

## 1. Problem

EngramPort's value begins only after a workspace exists: a database, a connected repository, registered participants with correct authority, working MCP and CLI configuration, and enough imported history that the first session is not context-free. Today every one of those steps is manual, and several are the steps most likely to be got wrong in a way that is silent and security-relevant. A misassigned trust level or an over-scoped GitHub App does not announce itself.

Setup is also the moment of maximum privilege and minimum verification. Whoever runs it can provision infrastructure, hold repository credentials, write files into a repository, mint identities, and grant permissions, all before any audit trail exists to constrain them. The wizard is therefore the highest-risk component in the product, and the one a new user is most likely to run while paying the least attention.

## 2. Users

- **Workspace founder.** A human who owns the repository and the cloud account, and who is the root of all authority the wizard exercises.
- **Team participants.** Humans joining an existing workspace.
- **First-party agents.** Claude and Codex installations operating under a founder's or member's delegation.
- **Friends and external agents.** Independently operated participants, on their own machines, under their own model vendors, with keys the project does not hold. Covered by the guest model in the onboarding design.

## 3. Goals

1. Take a founder from an empty state to a verified, working workspace in one guided flow.
2. Make every consequential step explicit, reviewable, reversible where possible, and human-approved.
3. Produce a workspace whose authority assignments are correct by construction rather than by the founder's attention.
4. Prove the workspace works before declaring success, including proving it correctly denies what it should deny.
5. Leave a complete provenance trail explaining why every participant holds every right.

## 4. Non-goals

- Not a general infrastructure provisioning tool. It provisions exactly what EngramPort needs.
- Not a repository management product. It opens one bootstrap pull request and does not merge it.
- Not a migration tool for other collaboration systems.
- Not a persistent service. The wizard is a bounded session that ends, not a standing privileged actor.
- Not a replacement for the onboarding and welcome-package protocol. The wizard is its front door.

## 5. Requirements

### 5.1 Repository connection through a durable GitHub App

A GitHub App installation, not a personal access token, so the connection survives the founder leaving and carries per-repository least-privilege permissions. Requested permissions MUST be the minimum for reading authorized history and opening one pull request, and MUST be enumerated to the founder before installation. Webhook payloads are verified by signature and treated as untrusted input.

### 5.2 PostgreSQL with pgvector provisioning

Provision through a driver interface with at least two implementations: connect to an existing PostgreSQL instance, and provision a managed instance. Supabase is a supported distribution and MUST NOT become a product boundary; the schema and migrations stay portable to standard PostgreSQL. Startup validates extension availability and embedding dimensions before declaring success.

### 5.3 Participant registration

Register humans, Claude, Codex, friends, and external agents as actors bound to principals. Trust is assigned by the founder or a maintainer, never claimed by the participant and never inferred from provider or model metadata. First-party and external agents follow identical rules; being Claude confers nothing.

### 5.4 Roles, capabilities, trust levels, groups, permissions

Assignment uses the model fixed in the onboarding design and reaffirmed in ADR 0012: roles and scopes are authority, capabilities and groups are routing, trust is a classification. No participant may edit its own assignment. No grant may exceed the granting principal's own authority, and no delegated agent's grant may exceed or outlive its owner's.

### 5.5 Repository bootstrap through a pull request

Generate `AGENTS.md`, `PROTOCOL.md`, `engramport.yaml`, actor records, and CI verification, and deliver them as a pull request on a new branch. The wizard MUST NOT push to a default branch and MUST NOT merge. The pull request is the human review gate, and its exact content is bound to an approval digest.

### 5.6 MCP and CLI configuration per participant

Emit per-participant MCP server configuration and CLI configuration. Credentials are displayed once and never written to a file the wizard controls. Generated configuration names a secret reference, not a secret. Defaults are safe per spec section 18: no implicit project, no hidden writes, visible idempotency.

### 5.7 Authorized history import

Import repository history the installing principal is actually authorized to read. Imported events carry `trust=imported`, preserve source repository, commit, and path provenance, and are appended without fabricated historical sequence numbers. Secrets are detected and quarantined before any embedding or external model call. Imported content is data, never instruction.

### 5.8 Verified test relay

Before reporting success, run a relay that publishes, discovers, responds, and completes across two registered participants, and that additionally demonstrates one correct denial, such as an unauthorized actor's append being refused. A setup check that can only report success is not evidence the workspace works.

### 5.9 Expiring welcome packages

Generate a signed, content-addressed welcome package per participant, with an absolute expiry, using the format in the onboarding design. Guests default to a single project, `untrusted_agent` trust, and at most fourteen days.

### 5.10 PostgreSQL as truth, pgvector as index

The wizard MUST NOT introduce a second canonical store. Embeddings are derived, deletable, and rebuildable. Import writes events first; embedding is an asynchronous consequence and its failure does not roll back an import.

### 5.11 Provenance and untrusted imported content

Every right is traceable to the events that granted it. Every imported item is labeled with source and trust. Verification output reports honest limits per spec section 15 and never collapses uncertainty into a claim of trustworthiness.

## 6. Success criteria

1. A founder with an empty repository and a database URL reaches a verified workspace without hand-editing a file.
2. Every consequential step produced an approval bound to an exact action digest, and changing any material parameter invalidated it.
3. The test relay passed and its mandatory denial control failed in the expected way.
4. `verify-log` or its production equivalent passes on the bootstrapped repository.
5. An auditor can answer "why does this participant hold this scope" by walking events.
6. Re-running the wizard is idempotent and resumable; an interrupted setup leaves no partial authority.
7. Imported history is queryable, labeled `imported`, and contains no detected secret.

## 7. Explicit risks

- **The wizard is the most privileged component in the product.** Mitigated by acting only under the founder's delegation, holding no standing authority, and ending as a session.
- **Bootstrap paradox.** Authority must exist before the wizard can be authorized. Resolved by authenticating a human principal first and treating that human as the root.
- **Provisioning holds cloud credentials**, a surface the engineering specification does not currently model. ADR 0012 records this as a new trust boundary requiring its own threat model.
- **Import is an injection vector at the worst moment**, since imported prose reaches participants who have no priors.
- **Setup fatigue.** A wizard that asks for approval at every trivial step trains founders to approve without reading, which is worse than asking less often about things that matter.
