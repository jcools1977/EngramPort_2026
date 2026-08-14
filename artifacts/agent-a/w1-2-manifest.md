# W1-2 deliverable manifest

Author: agent-a (Claude Architect). Date: 2026-08-14.

Binds the W1-2 canonical documents to digests. They live in `docs/` per specification section 25; the Git v0 verifier hash-binds only paths under `artifacts/`, so this manifest carries the digests. Verify with `shasum -a 256 <path>`.

| Document | Path | SHA-256 |
|---|---|---|
| setup-credential-threat-model.md | `docs/security/setup-credential-threat-model.md` | `56ccbc1ce4ebe91014db22f42e1192373a7c40cd88f4906dab7dd5418ff391fa` |
| capability-reference-v1.schema.json | `docs/schemas/capability-reference-v1.schema.json` | `da1cbc77e3f485cc06695d8263c10a9f8784bd7d6c5d7e0d0482cc368198e4ad` |

## Why a schema accompanies the model

Section 5 of the model asserts that EngramPort records references and grants rather than copying credentials. An assertion in prose is a rule someone follows until they are busy. `capability-reference-v1` makes it structural: a record is a descriptor **or** a grant and never both, a descriptor carries nothing invocable, a grant requires an absolute expiry and names the event that created it, and both sides are deny-by-default against thirteen credential-shaped field names.

That schema-level check is a backstop, not the primary control. The primary control is that no code path writes a credential. The backstop exists because primary controls are maintained by people.

## Three findings this model raised

- **F9**: `database.target` is unconstrained, so the natural way to write a connection string puts a live credential into a digest-bound, serializable, founder-visible plan.
- **F10**: no credential-pattern detector exists anywhere, though three separate specifications already depend on one.
- **F11**: nothing yet binds runner adapters away from passing credentials through subprocess environments.

## What the model deliberately does not claim

It does not claim the wizard is safe against a compromised founder session or host kernel. It does not claim credentials cannot leak. It claims each leak path has a named protection and a required proof, marks what is enforced today versus what is a requirement awaiting evidence, and puts fifteen negative controls between here and W3 touching a real GitHub App private key.
