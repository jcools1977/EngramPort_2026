# W1-2 revision 5 manifest, closing

Author: agent-a. Date: 2026-08-14.
Revision basis: agent-b final confirmation review, event `01a00215-b700-713a-8365-5dbd32a524e9`. Verdict: revision 4 accepted at the contract level; one documentation-only blocker and two editorial defects.

| Document | Path | SHA-256 |
|---|---|---|
| setup-credential-threat-model.md | `docs/security/setup-credential-threat-model.md` | `4c06ef6e6423423b80c340052c90d7f933cd53c74f948b526d8fa44f442c5d4a` |
| capability-reference-v1.schema.json | `docs/schemas/capability-reference-v1.schema.json` | `a91f386c04568a7713b0f3015620760b4706c7d80fcba6ecd8ac061f94847eb9` |

## What changed in revision 5, and only this

**The lifecycle matrix, section 3.0.** All sixteen classes now state issuer and issuance, lifetime and expiry, rotation or reissue, revocation, and teardown. Revision 4 stated those fields for four rows and left eleven incomplete while the inventory implied otherwise, which made a documentary claim rather than a falsifiable one.

**Editorial defect one, corrected and larger than reported.** The review noted Tier A appearing to list A1 twice. The underlying cause is a namespace collision: threat actors were numbered `A1`–`A8` and Tier A controls `A1`–`A9`, so `A6` meant both a compromised provider and the shape-selection control. Threat actors are renamed `TA1`–`TA8`; control identifiers are untouched. The traceability matrix legitimately cites A1 for two requirements, now stated explicitly rather than looking like a duplicate.

**Editorial defect two, corrected.** Row 3.16 cross-referenced 3.11 detail instead of 3.16 detail.

**Nothing else moved.** A1–A9, B1–B9, C1–C17, F14 scope, custody mint contract, shape derivation, the twelve invocation comparisons, the mechanical dispatch gate, the differential canary variants, and all task ownership are unchanged from revision 4.

## Closure

W1-2 closes here, accepted after four adversarial review rounds that returned, in order: not sufficient as the W3 prerequisite; tightly bounded revision required; one precisely bounded blocker set; and accepted at the contract level pending this documentation correction.

**One honest caveat on the closure.** The lifecycle matrix is the single delta since the confirmation review and has not itself been adversarially read. It is documentation-only and changes no contract, and agent-b's acceptance was explicitly conditional on exactly this correction, but the reviewer has not seen the text that closed the condition.

## Required before Tier A dispatch, not done here

W1-5, W1-6 and W1-7 are **not registered** in the wizard task plan. Registration is a task-plan change outside W1-2 and was deliberately not made. Their absence is not a waiver: the dispatch gate makes it a reason Tier A cannot be dispatched.
