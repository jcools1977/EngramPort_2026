# W1-2 revision 6 manifest, post-close documentation correction

Author: agent-a. Date: 2026-08-14.
Correction basis: agent-b post-close confirmation, event `01a0023c-1e22-7d58-98ba-dd343cb4f8d9`.
Corrects the completion record of closing event `01a0021f-ae18-7d9b-97ac-6a4c2322a372`. **W1-2 architecture remains closed and no contract changes.**

| Document | Path | SHA-256 |
|---|---|---|
| threat model, CORRECTED | `docs/security/setup-credential-threat-model.md` | `b98086cfd22b9a7198060adbdd722f3c78869c1c083aa91f0ff38510b73f9af9` |
| capability schema, BYTE-IDENTICAL to revision 4 | `docs/schemas/capability-reference-v1.schema.json` | `a91f386c04568a7713b0f3015620760b4706c7d80fcba6ecd8ac061f94847eb9` |

## Exact rows changed

**All sixteen**, 3.1 through 3.16. Each gains four fields the post-close review found missing, and each is independently complete rather than inferring from a neighbour:

1. **Issuance prerequisites** — new column in 3.0a.
2. **Revocation latency** — separated from revocation authority into its own column in 3.0b. Revision 5 combined them, leaving latency absent for 3.2, 3.7, 3.8, 3.10, 3.11, 3.12 and 3.13.
3. **Permitted residual metadata after teardown** — new column in 3.0b, with sensitivity and retention.
4. **Maximum exposure window plus compensating control**, for every class lacking independent revocation.

The matrix is now two tables, 3.0a issuance and 3.0b termination, because nine columns in one table is unreadable.

## The seven classes with no independent revocation, each now bounded

| Class | Window | Compensating control |
|---|---|---|
| 3.1 ID token | 15 minutes | Never persisted; only `principal_id` extracted; no refresh token requested |
| 3.4 Installation access token | 1 hour by GitHub, capped to **one operation** by setup | Never cached across operations; destroyed before the calling frame returns |
| 3.10 Provisioning credential | Step duration, hard cap **15 minutes** | Supplied at the step not at session start; never persisted; never in plan, log, artifact, argv or environment |
| 3.13 Model provider token | Provider-defined | Setup holds none, so exposure through setup is zero |
| 3.14 Temporary agent credential | **5 minutes** | Lease fencing, stop marking termination, run scoped to one handoff |
| 3.15 App authentication JWT | **10 minutes**, in practice one exchange | `aud` pinned to the exchange endpoint; single use; discarded at exchange regardless of outcome |
| 3.3 App private key, outstanding JWT | **10 minutes** | The 3.15 controls above |

Revision 5's 3.14 entry said the token lifetime is the true revocation latency and "must be documented as such", which repeated the requirement instead of satisfying it. The number is now **5 minutes**, and every window above is a ceiling to be enforced by its owning task rather than an observation.

## Editorial

Section 4 said "Those are bytes from A6". Corrected to `TA6`. I audited every remaining `A<n>` occurrence: all are legitimate Tier A control identifiers, and the only cross-reference to the old numbering is the note in section 2 explaining the rename. No collisions remain and no control identifier changed.

## What did not change

The capability schema is byte-identical to revision 4. No gate, no control, no task ownership, no architecture, no implementation scope. W1-2 remains closed. W1-5, W1-6 and W1-7 remain unregistered, and this correction authorizes no Tier A dispatch.
