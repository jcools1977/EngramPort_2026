# Workspace setup wizard: canonical document manifest

Author: agent-a (Claude Architect)
Date: 2026-08-14
Purpose: bind the canonical repository documents for the workspace setup wizard direction to digests, so an event can reference them verifiably.

The canonical documents live in `docs/`, per the repository layout in `ENGRAMPORT_ENGINEERING_SPEC.md` section 25, which places architecture, protocol, security, and ADR documents there. The Git v0 verifier hash-binds only paths under `artifacts/`, so this manifest carries the digests. Verify with `shasum -a 256 <path>` and compare.

| Document | Path | SHA-256 |
|---|---|---|
| Product requirements | `docs/product/workspace-setup-wizard-prd.md` | `6339ce1b21a9b5f15f2852511ac2794c3154737682f8417619273cd92d8335ee` |
| ADR 0012 | `docs/adr/0012-workspace-setup-wizard.md` | `b8baff75e3e19a6c22d842d38f2e9f8757edb111bc0178743c619b41dbff370a` |
| Phased plan | `docs/plan/workspace-setup-wizard-plan.md` | `34b19da66afa27cfa2f7ff420c0344aee77f016c12fbf5d2fa87a3382369b874` |
| Bounded tasks | `docs/plan/workspace-setup-wizard-tasks.md` | `266c3946a11782ca9f8a790fdc4f3c8de1780afcc1afee9283e11c04a35dca45` |

## Reconciliation summary

The direction was reconciled against the full engineering specification. One blocking conflict and three unmodeled surfaces were found.

**Blocking conflict.** Specification section 30 defers "Native Slack/Linear/GitHub/Drive connectors" as future work that does not block v1 "unless promoted through an ADR." The direction's durable GitHub App is therefore out of scope by the specification's own terms. ADR 0012 promotes a narrow subset: read authorized content and history, open one pull request on a non-default branch, receive signature-verified webhooks. Merge rights, default-branch write, Actions and organization administration are explicitly not promoted. Other section 30 connectors stay deferred.

**Unmodeled surface one.** The wizard provisions infrastructure, holds repository credentials, mints identities, and grants permissions. The specification models authority flowing from principal to constrained actor and has no component with that reach. Resolved by making the wizard a bounded session under founder delegation with no standing identity.

**Unmodeled surface two.** The bootstrap paradox: every authorization path presumes an existing project, principal, and membership, yet the wizard must act before any exist. Resolved by authenticating a human founder first and treating that human as the root of all authority.

**Unmodeled surface three.** Provisioning credentials are a trust boundary the specification never describes. Section 13 covers OIDC, API keys, and envelope encryption for integration credentials, but not a component that creates infrastructure. A setup-time credential threat model is a prerequisite for the connector work, recorded as task W1-2.

## Points already decided and not reopened

The authority model from `artifacts/agent-a/onboarding-welcome-protocol-design.md` stands unchanged: roles and scopes are authority, capabilities and groups are routing, trust is assigned rather than claimed and is never inferred from provider or model metadata. First-party agents receive no privilege for being first-party. Guests join as guest principals in the host tenant; tenant isolation is not relaxed.

ADR 0001 and 0002 stand: PostgreSQL is the single canonical store and pgvector is a derived, rebuildable index. The wizard introduces no second source of truth.

## Sequencing note

Only phases W0 and W1 are provable in the current environment. Migration `0001_canonical_core` has still never been executed because no Docker or PostgreSQL runtime exists in either agent's environment, so every phase touching a live database is blocked on the same host. Phase W2 is sequenced early precisely because it closes that gap and simultaneously satisfies the outstanding v0.1 gate.
