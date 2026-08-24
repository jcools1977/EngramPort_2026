# ADR 0022: Authorized external services, and the boundary they do not move

Status: accepted, 2026-08-24. Author: agent-a, on DeVere's authorization.
Context: threads `wizard-w1-1-scope` and the closed `wizard-w1-8`. Related: ADR 0021, constraint C6, gate C17, threat model §10's setup requirement, W3-1.

## Context

Every control in this project has been proven on synthetic material in local containers, and every handoff has carried the line "no real provider, founder, credential, key or production service". Two open items cannot be closed under that constraint: **C6 requirement 2**, which needs a real scheduler on a real database, and **W3-1**, which needs a real GitHub App.

DeVere has authorized both, with scope.

## Decision

**Supabase is authorized for EngramPort, as its own project.** It is a product, so it gets its own project in the same way GovScout has its own org. Its purpose here is narrow and stated below.

**GitHub is authorized in the `an2b` org, installed on one purpose-made empty repository only.** Not org-wide. The `an2b` org holds client work — `mcgreat-engagement` and GovScout's repos — and a GitHub App installed across it would carry its permissions and webhook reach into that work. Per-repository installation gives W3-1 complete coverage with effectively no exposure, and is reversible by uninstalling.

**Sequencing: Supabase first.** It closes C17, involves no real credential, and does not park the cheaper item behind the more consequential one.

## What these authorizations do not change

1. **The local compose stack remains the test substrate.** All 83 database controls, the mutation harness and every accepted fixture keep running against `pgvector/pgvector:pg16` locally. Supabase is **not** a second test target, and no accepted control is re-pointed at it.
2. **Supabase's only job is the C6 requirement 2 evidence**: that `sweep_expired_setup_session_delegations()` is invoked on a schedule, server-side, without application traffic, on a real deployment target. Nothing else moves there.
3. **Only synthetic material goes to either service.** Synthetic principals, synthetic setup sessions, a purpose-made empty repository. **No real founder identity, no client data, no production credential.**
4. **No secrets on disk.** Connection strings, App private keys and webhook secrets are supplied at the moment of use and are never written into the repository, the scratchpad, or any tracked or untracked file. This follows the estate's standing rule, and nothing about these authorizations relaxes it.
5. **W3-1 is still not dispatched.** This ADR authorizes the *materials*; dispatching the task remains a separate decision, and it comes after the current W1-1 convergence work.

## Consequences

1. **C6 requirement 2 and C17 become closable**, on evidence gathered against the Supabase project, per ADR 0021's named trigger.
2. **The synthetic-only line moves for exactly two purposes** and is otherwise unchanged. Every handoff continues to carry it, and any slice touching these services must say which of the two purposes it serves.
3. **The identity provider is not authorized by this ADR.** Criterion 1's authentication half and the trusted-session caveat on A6, A7 and A8 remain open, and the OIDC verifier continues against synthetic signed fixtures.
4. If either service is later found to require more reach than stated here, that is a **finding to return** and a new decision, not an extension of this one.
