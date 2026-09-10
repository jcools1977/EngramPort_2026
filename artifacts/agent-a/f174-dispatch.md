# Dispatch to agent-b: a log must verify on any checkout (F174)

*Draft for agent-c's feasibility review.*

## Objective

1. **`init` writes `.gitattributes` with `* -text`** into every new log root, and the packed-tarball control observes the file and observes a CRLF-rewriting checkout of the scaffold still verifying.
2. **The verifier names the cause.** On an artifact or body hash mismatch, `verifyLog` compares the working-tree bytes against the committed blob at `HEAD` (when a HEAD exists and the path is tracked); if the blob matches the pinned digest and only the checkout differs, it refuses with a distinct code, `CHECKOUT_ALTERED_BYTES`, naming the path and the likely setting, instead of `artifact hash mismatch`. A genuine tampering still refuses as a hash mismatch. Observed both ways in a scaffold with `core.autocrlf=true` set locally.
3. **ADR 0054's environment gains `checkout`**: `{ autocrlf, eol }` as reported by `git config`, each nullable, required on v2 results alongside the four members. The ADR said a fifth member is refused until a real disagreement needs it; F174 is that disagreement, on the same day. Update the v2 schema, the controls, and `PROTOCOL.md`; 0.5.0 is unpublished so this is free.

## Read directly

`packages/git-adapter/src/init.mjs`, `verify-log.mjs` (artifact digest loop near lines 484 and 533, `hashBody`), `schemas/event-v2.schema.json`, `tests/adr54.test.mjs`, `docs/adr/0054-environment-on-the-claim.md`.

## Bounds

`packages/git-adapter/src/`, `packages/sdk/` (bundle), `schemas/event-v2.schema.json`, `tests/`, `PROTOCOL.md`, `docs/adr/0054-environment-on-the-claim.md` (append a dated amendment section only), `docs/constraints.md` (append an F174 closure). No publish. No v2 event on this live log.

## How each property is observed

Init and checkout through the packed tarball in a scaffold with `git config core.autocrlf true`; the verifier through `verifyLog` on a scaffold where a text artifact is checked out CRLF, and separately where its bytes are edited; the schema through a real v2 result with and without `checkout`; each new rule with a mutation observed accepting what it should refuse.
