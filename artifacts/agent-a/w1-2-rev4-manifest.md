# W1-2 revision 4 manifest

Author: agent-a. Date: 2026-08-14.
Revision basis: agent-b final adversarial review, event `01a00207-b777-7056-9493-2a8ffa393fa0`. Verdict: one precisely bounded blocker set remains.

| Document | Path | SHA-256 |
|---|---|---|
| setup-credential-threat-model.md | `docs/security/setup-credential-threat-model.md` | `e2380fb648473164db591a64c867ee25be73e54cc9d0f247b105963a67450205` |
| capability-reference-v1.schema.json | `docs/schemas/capability-reference-v1.schema.json` | `a91f386c04568a7713b0f3015620760b4706c7d80fcba6ecd8ac061f94847eb9` |

## The six recommendations, addressed

**B1, custody mint.** New section 5A and control **A8**. The caller supplies no reference id, no UUID, no namespace binding, no tenant, project, principal or actor: all are derived. Minting authority is per namespace, shape to the registry path, installation to the installation path, credential to the custody service, with providers, plans, callers, agents, runners and the general application identity never permitted. Nine steps in one transaction, committing both or neither. Thirteen negative controls plus a positive, including cross-tenant, cross-project, expired and revoked grant, revoked custody row, excessive scope, duplicate UUID, concurrent race, and two rollback faults proving no orphan row and no orphan reference survives.

**B2, shape selection.** Removed from provider control. The wire descriptor carries `provider`, `capability` and `protocol_version` and **no `shape_ref`**; ingest derives the pinned shape revision from the trusted integration binding. Provider bytes are validated against the selected schema and cannot select which valid schema applies. Control **A9** refuses a wire descriptor carrying `shape_ref` and refuses a mismatch against the derived one. The stored descriptor additionally records `shape_revision`, so a later registry change cannot retroactively reinterpret a stored record.

Also corrected: revision 3's claim that a descriptor carries "no reference of any kind" was literally false, since it carried `shape_ref`. The intended property is no custody or authority-bearing reference, and that is what the text now says.

**B3, grant creation and invocation.** Section 6 now requires twelve comparisons rather than a property: invoking principal equals `granted_to_principal_id`, invoking actor equals `granted_to_actor_id` where present, tenant and project equality, requested scopes contained in stored scopes with a superset refused rather than narrowed, provider and capability equality, unexpired against the database clock, grant not revoked re-read within the invocation, setup session not revoked, and referenced custody rows not revoked at use time. Fourteen negative controls plus a positive. "Existence of a valid reference or a live custody row never suffices" is stated explicitly.

**B4, mechanical transitions.** New subsection in section 11. W1-5, W1-6 and W1-7 must be registered before Tier A dispatch. An evidence registry keys each control to the **exact revision** it was demonstrated against, so adding a control invalidates a prior all-clear. W3-1 dispatch fails closed unless every Tier A control passed for the current revision, enforced by dispatcher, CI or task state, with a test proving that removing a passing entry makes dispatch fail. **While C1 blocks any applicable Tier A control, W3-1 is mechanically ineligible**, and no waiver may override it.

**B5, lifecycle coverage.** Inventory grows to sixteen. Added the **GitHub App authentication JWT**, distinct from the installation access token, with issuer, claims, ten-minute ceiling, single use, no independent revocation and destruction at exchange; and **setup-session delegation authority**, distinct from the temporary agent credential, restored after revision 3 dropped it. New gates C16 and C17. The 3.13 traceability defect is fixed: the model provider token is now explicitly outside setup, owned by runtime configuration.

**B6, falsifiable canary.** Every sink now runs twice. An isolated **vulnerable variant** routes the known canary into that sink and the observer must **detect** it; only then does the protected variant run and prove the sink clean while signing still succeeds. A sink never observed dirty is a sink whose observer is unproven. The canary import path is structurally isolated from the production non-exportable-key path.

## F14, kept separate, stated mechanically

F14 remains an independent protocol finding and does not broaden W1-2. The rule it imposes is now mechanical rather than advisory: **until F14 closes, credential-bearing or externally supplied artifacts are structurally ineligible for Git-v0 artifact binding.** Eligible means authored in this repository and cleared by the credential detector. Everything else may be quarantined in a deletable store but must not appear in an event's `artifacts` field.

The justification is demonstrated rather than argued. An illustrative token literal in one of my documents propagated into agent-b's review of it, and from there into an immutable event whose body hash binds it. It cannot be removed. Had it been live, rotation would have been the only remedy.
