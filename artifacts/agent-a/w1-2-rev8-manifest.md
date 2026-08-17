# W1-2 revision 8 manifest, final editorial correction

Author: agent-a. Date: 2026-08-17.
Correction basis: agent-b consolidated audit of commit `bda94c2`, relayed by the operator. That audit has no event id in this log at time of writing; it is identified by the commit it audited.
Corrects the completion record of closing event `01a0021f-ae18-7d9b-97ac-6a4c2322a372` and supersedes the evidence of correction event `01a00f91-94cd-7cca-ac30-d74f29ea20c9`. **No W1-2 contract changed.**

| Document | Path | SHA-256 |
|---|---|---|
| threat model, CORRECTED | `docs/security/setup-credential-threat-model.md` | `629ae3f2654aba46e4c1158fc234c6b24831a369505ccf41878af3207b091089` |
| capability schema, BYTE-IDENTICAL | `docs/schemas/capability-reference-v1.schema.json` | `a91f386c04568a7713b0f3015620760b4706c7d80fcba6ecd8ac061f94847eb9` |

## Exact policy wording changed

**RET-CONFIG-400**, clock start. Was: `Last rotation of the configured object`. Now: **`Initial issuance or configuration of the object if it has never rotated; after its first rotation, the clock resets to the most recent rotation`**. Trigger wording preserved as deletion of the configured object or the 400-day ceiling, whichever occurs first. Maximum unchanged at 400 days.

**RET-VERIFY-104**, ceiling and trigger. Was: `104 days` with `Archival job moving the metadata to cold verification storage`. Now: **`104 days total`**, with the trigger reading **`Archival to cold verification storage may occur earlier, and final deletion from cold storage occurs no later than the 104-day ceiling. Cold storage does not extend the ceiling.`** The justification paragraph now states that archival is a storage-tier change rather than a retention extension, and that there is no indefinite cold retention.

**RET-GRANT-400**, new policy resolving the row 3.12 clock conflict. 400 days maximum, unchanged from the ceiling row 3.12 already cited. Records covered: grant records, grant status, and granting-event identifiers for connector authorizations. Clock starts at **the grant reaching a terminal status**, meaning revoked or expired. Trigger: scheduled audit purge job. Enforced by the retention worker, W1-7. Row 3.12 now cites RET-GRANT-400 and repeats its clock-start wording verbatim, so row and policy agree.

## Exact rows changed

**Revocation trigger added as a separate column, all sixteen rows.** Revision 7 named only an actor. Nine rows received the specific triggers the audit listed, and the remaining seven were given concrete triggers too so the column is uniform:

| Row | Concrete revocation trigger now stated |
|---|---|
| 3.1 | IdP-session revocation, founder logout, or expiry of the IdP assertion |
| 3.2 | IdP client deletion, client-secret revocation, or client-secret rotation |
| 3.3 | Uninstall together with key destruction; uninstall alone is explicitly not a trigger |
| 3.4 | Removal of the GitHub App installation |
| 3.5 | Webhook-secret rotation, or removal of the App installation |
| 3.6 | Deletion or revocation of the cloud workload-identity binding |
| 3.7 | KMS key disablement, scheduled destruction, or removal of the authorization policy |
| 3.8 | Disabling or revoking the signing key, prohibiting all new signing |
| 3.9 | An explicit `invitation.revoked` event, or offboarding of the issuing principal |
| 3.10 | Founder-initiated invalidation, deletion, or rotation at the provider, with the concrete Supabase and self-managed PostgreSQL operations named |
| 3.11 | `DROP ROLE`, or `ALTER ROLE ... PASSWORD` |
| 3.12 | A maintainer appending a grant-revocation event, or the participant revoking at their provider |
| 3.13 | Provider-side token revocation, or disconnection of the provider account |
| 3.14 | A `watch.stopped` control action, or lease expiry |
| 3.15 | None; revoking 3.3 stops future minting but does not recall an outstanding JWT |
| 3.16 | Completion, abandonment, expiry detected by the sweep, or an explicit teardown call |

Revocation authority is retained in its own column in every row.

**Three residual triggers repeated in full**, so no line depends on a neighbour:

- 3.2 rotation timestamps: IdP client deletion, or the RET-CONFIG-400 purge at the 400-day ceiling, whichever occurs first.
- 3.5 rotation timestamps: GitHub App uninstall, or the RET-CONFIG-400 purge at the 400-day ceiling, whichever occurs first.
- 3.11 role name: database role drop, or the RET-CONFIG-400 purge at the 400-day ceiling, whichever occurs first.

**Two 3.12 residual lines** re-pointed from RET-AUDIT-400 to RET-GRANT-400. **One 3.8 residual line** restated as 104 days total across every storage tier.

## Mechanical audit results

- All 16 rows in 3.0b have both authority and trigger columns populated.
- `same trigger` occurrences: **0**.
- Every policy is defined exactly once and every citation matches its definition's maximum, clock start and trigger.
- Stale `RET-AUDIT-400, 400 days from the grant` citations: **0**. Both 3.12 lines use the RET-GRANT-400 clock wording verbatim.
- Cold storage extension: explicitly prohibited in the policy row and the justification. No indefinite-cold-retention wording remains.
- Never-rotated objects have a defined RET-CONFIG-400 clock.
- Banned phrases: zero occurrences of `audit period`, `retained for retry`, `until no longer needed`, `provider-defined`, `per policy`, `must be documented`.
- Capability schema byte-identical.
- TA1–TA8 = 8; Tier A A1–A9 = 9; B1–B9 = 9; Tier C = 17 gates; W1-5, W1-6, W1-7 ownership unchanged.

## Unchanged

No architecture, schema, gate, control identifier, credential lifetime, task ownership, or implementation scope. W1-2 remains closed. W1-5 through W1-7 remain unregistered. No Tier A dispatch authorized.
