# Dispatch to agent-b: a log must verify on any checkout (F174)

*Final. Agent-c pre-flighted twice; the second was feasible with three refinements, folded in below: the protocol paragraph lands under the repository-contract bullet on artifact digests; the discriminator is CRLF-to-LF normalization only, never the body profile that also strips whitespace; and this repository's own `.gitattributes` becomes an allowed root file so the layer protects itself. Agent-c's first pre-flight found the first draft infeasible on seven points, and the decisive one was that "HEAD blob matches, checkout differs" is the same predicate for a line-ending rewrite and for a local edit. This draft uses normalization as the discriminator, limits the change to artifacts (event bodies are already hashed after CRLF normalization, so they never mismatch on autocrlf), and drops the environment member: F174 was settled by an attribute, not by comparing environments, which is not the trigger ADR 0054 named.*

## Objective

1. **`init` writes `.gitattributes` with `* -text`** into every new log root, alongside the four files it already writes; the packed-tarball control observes the file, and observes a scaffold checked out with `core.autocrlf=true` still verifying after an artifact is committed and re-checked-out.
2. **The verifier names a line-ending rewrite as its own refusal.** On an artifact digest mismatch, `verifyLog` also hashes the worktree bytes with every `\r\n` replaced by `\n` and nothing else changed (not `hashBody`'s profile, which also strips trailing whitespace and would mask a real change); if that digest equals the pinned one, it refuses with `CHECKOUT_ALTERED_BYTES` naming the path and the remedy (`* -text` in `.gitattributes`); otherwise it refuses as today. An artifact that is both rewritten and edited refuses as a hash mismatch. No HEAD or blob comparison; the verifier keeps working before any commit exists.
3. `PROTOCOL.md` gains one paragraph directly under the repository-contract bullet that says artifact references include a SHA-256 digest, saying the digest is over exact bytes, that the layer ships `* -text`, and what `CHECKOUT_ALTERED_BYTES` means. `docs/constraints.md` gets the F174 closure.

## Read directly

`packages/git-adapter/src/init.mjs` (`INIT_PATHS`), `verify-log.mjs` lines 484 to 495 and 533 to 545 (the two artifact digest loops; one shared helper is the right shape, F152), `hashBody` for the existing normalization, `tests/sdk-package.test.mjs` for the packed-tarball control.

4. **This repository carries the attribute too.** Add `.gitattributes` (`* -text`) at the root, add it to the shared root-file list in `AGENTS.md` item 5 and to the repository-surface policy control, so the amendment and its control land together as that rule requires.

## Bounds

`.gitattributes` (new root file), `AGENTS.md` (the root-file list in item 5 only), the repository-surface policy control under `tests/`, `packages/git-adapter/src/init.mjs`, `packages/git-adapter/src/verify-log.mjs`, `packages/sdk/` (bundle only), `tests/`, `PROTOCOL.md` (one paragraph), `docs/constraints.md` (append only). No schema change. No publish. No event on this live log.

## How each property is observed

Through the packed tarball in a temporary scaffold with `git init` and `core.autocrlf=true`; through `verifyLog` on scaffolds where an artifact is rewritten CRLF, edited by one byte, and both; each new rule with a mutation observed accepting what it should refuse; the historical log verifying unchanged.
