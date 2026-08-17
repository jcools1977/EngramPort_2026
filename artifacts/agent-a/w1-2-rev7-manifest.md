# W1-2 revision 7 manifest, consolidated lifecycle-matrix correction

Author: agent-a. Date: 2026-08-17.
Correction basis: agent-b consolidated lifecycle-matrix audit of commit `150c847fd9c6e550c751040d8e218e4b70f341b4`.
Corrects the completion record of closing event `01a0021f-ae18-7d9b-97ac-6a4c2322a372` and supersedes the evidence of prior correction event `01a00242-8d9f-7c49-9764-ab1a95e6c026`. **No W1-2 contract changes.**

| Document | Path | SHA-256 |
|---|---|---|
| threat model, CORRECTED | `docs/security/setup-credential-threat-model.md` | `53290a1b7245afd0d04b4fabda77a74b2cad9dfe3bfeea40ae1321e4e0bc9cd8` |
| capability schema, BYTE-IDENTICAL | `docs/schemas/capability-reference-v1.schema.json` | `a91f386c04568a7713b0f3015620760b4706c7d80fcba6ecd8ac061f94847eb9` |

## Rows changed

**All sixteen, 3.1 through 3.16.** The matrix is now three tables so each field is separate and independently readable rather than packed into a shared cell:

- **3.0a** credential scope, issuance prerequisites, issuer, lifetime, rotation, gate
- **3.0b** revocation authority, revocation latency, maximum exposure with compensating control, teardown
- **3.0c** one line **per residual**, with sensitivity, maximum retention, deterministic trigger, and retention-policy owner

Rows with more than one residual class now state each separately rather than sharing a duration: 3.2, 3.3, 3.5, 3.6, 3.7, 3.9, 3.11, 3.12 and 3.16 each have two or three residual lines.

## Named retention policies

| Policy | Exact maximum | Clock starts | Trigger | Enforced by |
|---|---|---|---|---|
| RET-SESSION | Session absolute expiry, ceiling **24 hours** | Session `start` | Completion, abandonment, or expiry sweep | `SetupSessionManager`, durable form W1-5 |
| RET-OPS-90 | **90 days** | Terminal disposition | Scheduled operations purge | Retention worker, W1-7 |
| RET-AUDIT-400 | **400 days** | Acceptance of the audited action | Scheduled audit purge | Retention worker, W1-7 |
| RET-CONFIG-400 | **400 days** from last rotation | Last rotation | Configured-object deletion or the 400-day purge, whichever first | Retention worker, W1-7 |
| RET-VERIFY-104 | **104 days** = 14-day guest package ceiling + 90 | Expiry of the last artifact signed by that key | Archival to cold verification storage | Retention worker, W1-7 |

Public verification metadata is archived rather than kept permanently, and the justification is stated: a key whose last signed artifact expired more than 90 days ago verifies nothing anyone can still present.

## Audit performed after editing

- Banned unresolved phrases: `audit period`, `retained for retry`, `until no longer needed`, `provider-defined`, `per policy`, `must be documented` — **zero occurrences each**.
- Rows with an independently readable scope: **16 of 16**.
- Residual lines citing a defined policy: **all**; zero lines lack one.
- Keyword sweep on `retry`, `dead-letter`, `tombstone`, `event list`, `timestamp`, `public by design`: **zero** rows bypass the retention requirement.
- Capability schema **byte-identical**.
- TA1–TA8 present and consistent; Tier A A1–A9 present; B1–B9 present; Tier C C1–C17 = 17 gates; A8 custody mint and the mechanical dispatch gate intact; W1-5, W1-6, W1-7 ownership unchanged.

Two residuals that reference immutable records say so explicitly rather than implying deletion: 3.12's granting event id and 3.16's session event list both note that the canonical event log is governed separately by specification section 5.3 and is not deleted by these policies.

## Unchanged

No architecture, schema, gate, control, task ownership, or implementation scope. W1-2 remains closed. W1-5 through W1-7 remain unregistered. No Tier A dispatch is authorized.
