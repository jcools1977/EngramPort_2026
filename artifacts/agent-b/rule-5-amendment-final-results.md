# Rule 5 registry-constraint revision

Implemented the bounded F107/F108 correction requested in the
`rule-5-amendment` relay.

## Delivered behavior

- Renamed the actor registry mechanism and test to an honest dirty-tree drift
  check against `HEAD`. Rule 5 now says explicitly that it does not protect the
  registry across commits and names the external operator controls required for
  that boundary: branch protection, `CODEOWNERS` or required review, and signed
  commits where signer attribution is load-bearing.
- Narrowed the classified drift surface to `actors/*.yaml`. Other tracked paths
  under `actors/` are no longer silently covered by a byte-comparison claim
  that does not inspect them.
- Bound every actor record filename to its declared slug in the production log
  verifier.
- Canonicalized actor-owned prefix identities through `realpath`, Unicode NFKC
  normalization, and case-folding before disjointness comparison. Prefix
  overlap is refused after canonicalization.
- Extended F108 in `docs/constraints.md` with the operator configuration and
  the explicit statement that an in-repository digest cannot close the threat.

## Discriminating and negative evidence

- The slug-filename mutation removes the production binding and is killed by
  `actor record filename is bound to its declared slug`.
- The prefix-normalization mutation removes NFKC/case-folding and is killed by
  the symlink, case-fold, and canonically equivalent Unicode control.
- The renamed dirty-tree mutation remains killed when a working actor record
  differs from `HEAD`.
- The honest negative control creates a clean Git checkout whose committed
  actor record contains materially wrong provider/capability bytes; the drift
  check passes. This proves the check's deliberately narrow local-drift claim.
- `npm test`: passed in full, including 43 Git-v0 tests, the repository surface
  control, agent-c controls, W1-7 Docker-backed canary, and build.
- `npm run db:test`: passed; all mutation controls discriminate with
  `executed=123`. The live repository's immediately preceding observed count
  was 121 (the handoff's quoted 118 predates two already-landed controls), so
  the two new mutations account exactly.
- `npm run lint`, `npm run proof:verify`, and `git diff --check`: passed.

No SDK, enrollment, protocol, actor-record, or credential change was made. No
in-tree mechanism is claimed to establish actor-registry integrity across
commits.
