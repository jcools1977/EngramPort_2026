# W1-2 revision 3 manifest

Author: agent-a. Date: 2026-08-14.
Revision basis: agent-b second adversarial review, digest `a308c6fe1eb97ffaffb319a12538d4085b6ccc5ca704ade1eb0f145c8695acce`, verdict tightly bounded revision required.

| Document | Path | SHA-256 |
|---|---|---|
| setup-credential-threat-model.md | `docs/security/setup-credential-threat-model.md` | `0cfe31ce386474b67ab16fea4ebac4e6fc26d36a0c8f80fac71c2f8f700a61d6` |
| capability-reference-v1.schema.json | `docs/schemas/capability-reference-v1.schema.json` | `4633cb46bb13de58e098de82b0dece93d2b94ecfe5874648947f04f5be6386d1` |

## The correction that mattered most

The second review's sharpest point was not a bypass; it was that the fifth bypass could be **predicted without being found**. An opaque provider token containing no forbidden punctuation is syntactically indistinguishable from a legitimate locator. `ghp_<36-char-opaque-body>` is a real GitHub token and an ordinary identifier, and no grammar admitting provider-chosen strings can reject it without rejecting valid references.

Two revisions spent tightening a grammar that could not work. Revision 3 removes the premise: **EngramPort mints every reference it stores**, `epr:<namespace>:<uuidv7>` with a closed namespace. A provider-supplied bearer token cannot be a minted reference, not because it looks wrong but because minting requires an authorized custody write a provider cannot perform. Provider locators and credentials live only behind the custody boundary, keyed by the minted reference.

## Schema validation

Rejected: JWT in `installation_ref`; GitHub token shape in `installation_ref`; GitHub token shape in `credential_ref`; **the predicted opaque high-entropy bearer**; revision 2's `{manager, locator}` object form; PEM; userinfo URL; descriptor carrying `installation_ref`; descriptor carrying `credential_ref`; provider-chosen `shape_ref` name; kind/payload mismatch; `invocable: true`; unknown namespace; non-v7 UUID; missing `epr:` prefix; grant missing `tenant_id`; installation reference in the credential field; credential reference in the installation field.

Accepted: baseline descriptor, baseline grant, grant carrying both correctly namespaced references.

## A second finding against my own revision

My probe of revision 3 found that a shared `minted_ref` definition let an `epr:installation:` value validate in `credential_ref` and vice versa. Structurally minor, since both are minted and no provider token passes either, but a field should accept only its own namespace rather than relying on the custody resolver to notice. Namespaces are now pinned per field.

That is the second consecutive revision where my own probe found a residual defect my own reading did not. Recording it for the same reason as last time.

## What changed beyond the schema

Inventory expanded from eleven to **fourteen** rows, adding the GitHub installation access token, the welcome invitation token, and the KMS workload identity, each with a full lifecycle. Every row now maps to a Tier C gate, and Tier C grew from seven gates to fifteen so that no class can acquire a real credential on the strength of a related synthetic control.

Grant resolution is now explicit: a grant-shaped document is a claim, resolved against a live server-side record, with `granted_by_principal_id` never accepted as proof. The ingest layer is an interface with fourteen named negative controls and one positive. The custody harness is built around a canary whose bytes we choose, with faults injected so each absence check can fail, and with proof that the signer still performs its permitted operation.

**F13** is new: concurrent founder bootstrap is unguarded, and its control is blocked on C1, because a credible race proof needs a real datastore rather than an in-memory simulation.
