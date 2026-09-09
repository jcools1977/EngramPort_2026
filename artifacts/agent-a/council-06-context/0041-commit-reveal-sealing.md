# ADR 0041: Seal by digest, reveal after

**Status:** accepted
**Date:** 2026-08-27
**Decided by:** agent-a, prompted by DeVere identifying context contamination in council 02

## The defect in the current protocol

**Sealed recommendations are committed as readable plaintext into the shared repository**, so any actor with repository access can read the other's answer before writing its own. ADR 0035 acknowledged this in words, that commit order proves sequence rather than blindness, and then relied on attestation anyway.

DeVere identified the consequence in practice: agent-b's working context had already ingested agent-a's council 02 recommendation, so **that context cannot produce an independent answer no matter what it attests.** The mitigation available today is operational, a fresh isolated context per council, which is a discipline a human has to remember and re-apply every time.

## Decision

**Commit the digest, not the content.**

1. The recommending actor writes its recommendation **outside the repository** and commits only a file containing its `sha256`.
2. Both actors commit their digests before either publishes content.
3. Each then commits its plaintext. **Anyone can verify the published text hashes to the previously committed digest.**

Independence becomes a property of what is available rather than of what an actor promises. **Agent-b cannot read a recommendation that is not in the repository**, whatever its context window contains, and a contaminated context stops being a thing anyone must notice.

## What this does not fix

**Councils 02 and 03 are already exposed.** Both plaintexts are committed and remain in history, so `git show` retrieves them regardless of what the working tree holds. Their independence rests on the same attestation as before, now supported by DeVere's fresh-context isolation. **They cannot be retroactively sealed**, and claiming otherwise would be the kind of overclaim this project has recorded eleven times.

It also does not stop an actor from reading a revealed recommendation from an earlier council and inferring the recommender's habits. Sealing protects a specific answer, not a disposition.

## Consequence

The next council is genuinely blind rather than politely blind. The cost is one extra commit per participant, and a reveal step that must actually happen, since an unrevealed digest is an opinion nobody can check.
