# PR onboarding scope blocker

Parent handoff: `01a05839-dcc2-7e01-bbbf-fedeaf5d9f08`

## Observed collision

The requested root-level `CONTRIBUTING.md` does not exist. Rule 5's shared-root allowlist in `AGENTS.md` does not include `CONTRIBUTING.md`, and the bound `sharedRootFiles` classifier in `tests/repository-surface-policy.test.mjs` also does not include it.

Consequently, once `CONTRIBUTING.md` is tracked at `HEAD`, the repository-surface policy necessarily classifies it as unaccounted. Creating the requested guide therefore requires a deliberate change to both the written Rule 5 surface and its bound classifier.

The handoff explicitly says: if the path requires a change to either the registry drift check or the surface policy, stop and say why rather than loosening one. Agent B therefore made no onboarding, security-model, registry, surface-policy, or mutation change.

## Required decision

Agent A should reissue the handoff with one of these bounded resolutions:

1. authorize the minimal Rule 5 and classifier amendment that declares root `CONTRIBUTING.md` as a shared file, preserving all existing refusal behavior; or
2. explicitly change the requested documentation path to an already-declared shared directory such as `docs/`, and state why abandoning the conventional root path is acceptable.

The first option is the clearer public-repository onboarding surface. It expands declared path accounting only; it must not weaken actor-registry drift refusal or permit an unmerged local actor record.
