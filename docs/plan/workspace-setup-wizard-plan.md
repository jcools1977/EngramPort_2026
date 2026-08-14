# Phased implementation plan: workspace setup wizard

Status: proposed
Date: 2026-08-14
Related: `docs/product/workspace-setup-wizard-prd.md`, `docs/adr/0012-workspace-setup-wizard.md`, `docs/plan/workspace-setup-wizard-tasks.md`

## Sequencing constraints

Three constraints fix the order, and each is a fact about the current repository rather than a preference.

1. **The onboarding increment is a dependency, not parallel work.** Participant registration, welcome packages, expiry and offboarding are specified in `artifacts/agent-a/onboarding-welcome-protocol-design.md` and decomposed as T1 through T7. The wizard's registration phase consumes them.
2. **Migration `0001_canonical_core` has never been executed.** No Docker or PostgreSQL runtime exists in either agent's environment. Every phase that touches a live database is blocked on a host that can run one, and that blocker is shared with the open v0.1 thread. Work that can be proven without a database is sequenced first, deliberately.
3. **A threat model for setup-time credentials precedes the connector.** ADR 0012 makes this a prerequisite rather than a follow-up, because the GitHub App private key, webhook secret, and provisioning credentials are all introduced by the connector phase.

## Phase W0: Setup plan and dry run

No infrastructure, no network, no database. A declarative workspace description compiles into an ordered list of typed, idempotent steps, each carrying an action digest, with a dry run that performs no side effects and a planner that refuses any plan exceeding the founder's own authority.

This phase exists because every later phase executes a plan, and because it is provable today. It also front-loads the two controls most likely to be quietly dropped later: digest binding and the authority ceiling.

Gate: a plan compiles deterministically, a dry run produces the full step list with no side effect, an over-privileged plan is refused with a named error, and changing any material parameter changes the digest.

## Phase W1: Setup session and trust boundary

Founder authentication, session-scoped delegation with absolute expiry, approval binding against plan digests, and session teardown that revokes delegation and retains no credential. Includes the setup-time credential threat model required by ADR 0012.

Gate: no standing wizard identity exists at any point; an expired or revoked session cannot execute an approved step; an abandoned session leaves no partial authority.

## Phase W2: Provisioning driver

The PostgreSQL and pgvector driver interface with two implementations, connect-existing and provision-managed, extension and dimension validation at startup, and migration application with checksum verification. Unblocks the outstanding v0.1 runtime proof as a side effect, since it produces the first environment where the migration actually runs.

Gate: both drivers reach a verified schema on standard PostgreSQL and on a managed distribution; `0001_canonical_core` applies and its isolation and immutability failure tests pass against a live database, closing the v0.1 gate.

## Phase W3: GitHub App connector

App registration, installation flow, least-privilege permission set with merge rights excluded, signature-verified webhooks, SSRF-safe fetching, and envelope-encrypted storage of the private key and webhook secret.

Gate: requested permissions match the ADR's enumerated set exactly; an unsigned or wrongly signed webhook is rejected; a revoked installation stops working immediately; the stored key is unreadable without the key-encryption key.

## Phase W4: Bootstrap pull request

Generation of `AGENTS.md`, `PROTOCOL.md`, `engramport.yaml`, actor records, and CI verification, delivered as a pull request on a new branch, bound to an approval digest, never merged and never pushed to a default branch.

Gate: the pull request contains exactly the approved content; a changed file invalidates the approval; the wizard cannot push to a default branch even when the token would permit it; CI on the new branch runs the verifier.

## Phase W5: Participant registration and welcome packages

Registration of humans, Claude, Codex, friends, and external agents; assignment of roles, scopes, capabilities, groups, and trust; issuance of expiring welcome packages. Consumes onboarding T1 through T5.

Gate: no participant holds a scope not traceable to a granting event; a guest defaults to one project, `untrusted_agent`, and at most fourteen days; an agent's grant does not exceed or outlive its owner's; a package verifies through the T1 verifier.

## Phase W6: MCP and CLI configuration

Per-participant MCP server and CLI configuration generation, with credentials displayed once, secret references rather than secrets in generated files, and the safe defaults of specification section 18.

Gate: no generated file contains a credential; a participant can complete a real append using only generated configuration; revoking the participant makes that configuration stop working.

## Phase W7: Authorized history import

Import bounded by the installing principal's actual read authorization, `trust=imported`, preserved source provenance, no fabricated historical sequence numbers, and secret detection before any embedding or external model call.

Gate: importing content the principal cannot read is refused; imported events are labeled and queryable; a planted secret is quarantined and never embedded; embedding failure does not roll back the import.

## Phase W8: Verified test relay

An end-to-end relay across two registered participants, plus the mandatory denial control from ADR 0012 decision 9.

Gate: the relay completes without a human copying a message body, and an unauthorized append is refused with the expected error. Setup reports success only when both are observed.

## Phase W9: Resumability, audit, and observability

Idempotent re-runs, resumable interrupted sessions, the metrics of specification section 19, and an audit view answering "why does this participant hold this scope."

Gate: an interrupted setup resumes without duplicate grants; the audit query returns a complete grant chain for every participant; authorization denials are counted.

## Critical path and current blockers

W0 and W1 are executable today. W2 unblocks W3 through W9 and simultaneously closes the outstanding v0.1 runtime gap, which makes acquiring a Docker-capable host the single highest-leverage unblock in the project right now. W5 cannot start before onboarding T1 through T4 land.

The honest read: only W0 and W1 can be proven in the current environment. Everything else is written against a runtime nobody in this project has yet executed against, and sequencing W2 early is the way that stops being true.
