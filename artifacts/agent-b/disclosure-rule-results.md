# Disclosure-rule results

Parent handoff: `01a05825-ed37-7569-a043-f09b672ce9ce`

Returned after governance repair: `01a058bb-944a-7336-b291-9ceb82a71449`

## Bounded implementation

- The finding registry validator now accepts exactly `fixed`, `disclosed`, and `unfixed`.
- A claim citing a `disclosed` finding is citable only when the finding ID is actually present in the checked-in `SECURITY.md` text.
- A disclosed registry mark without that public reference refuses with `DISCLOSED_FINDING_NOT_PUBLIC` and names the finding.
- `unfixed` still refuses with `UNFIXED_FINDING_REFUSED`.
- `fixed` still requires its registry event to resolve to a canonical event authored by agent-a; a null or non-agent-a disposition refuses with `FIXED_FINDING_DISPOSITION_INVALID`.
- No entry in `docs/report/findings-status.json` changed. No site, SDK, protocol, envelope, or publication surface changed.

## Observed controls

The focused correspondent suite passes 8 tests, including a positive disclosed F108 reference, a negative disclosed F106 reference absent from `SECURITY.md`, the existing unfixed refusal, and the fixed-disposition refusal.

The full mutation harness proves each property independently:

```text
REPORT_UNFIXED_FINDING_GUARD baseline=0 applied=t after=1 forbidden=t restored=0
REPORT_DISCLOSED_STATUS_SUPPORT baseline=0 applied=t after=1 forbidden=t restored=0
REPORT_DISCLOSED_SECURITY_REFERENCE baseline=0 applied=t after=1 forbidden=t restored=0
REPORT_FIXED_DISPOSITION_GUARD baseline=0 applied=t after=1 forbidden=t restored=0
D1 mutation harness: all controls discriminate (executed=151)
```

The accepted harness baseline was 148 controls. This slice adds three controls, so `executed=` moves from 148 to 151.

## Baseline repair review

The first full run correctly stopped because committed `LICENSE` and `SECURITY.md` were absent from Rule 5's shared-root allowlist. Agent B returned blocker event `01a058b7-f79a-713d-a3ba-635f45cb18a6`. Agent A's repair in commit `00782f1` declared those two already-committed root files in `AGENTS.md` and updated the bound classifier and expected rule sentence. It changes no actor authority. Agent B reran the surface suite and the full harness; the repaired control reports:

```text
REPOSITORY_SURFACE_POLICY tracked=948 actor_rule=true drift_rule=true shared_rule=true unaccounted=0
ACTOR_PREFIX_NORMALIZATION baseline=0 applied=t after=1 forbidden=t restored=0
```

## Verification

- `npm run report:correspondent:test`: 8 passed, 0 failed.
- `node --test tests/repository-surface-policy.test.mjs`: 4 passed, 0 failed.
- `bash scripts/run-d1-mutation-harness`: exit 0, all 151 controls discriminate.
- `npm test` with the live canary's required Docker access: exit 0.
- `npm run lint`: exit 0.
- `git diff --check`: exit 0.
- `npm run proof:verify` before completion append: 445 accepted events, 85 threads, 3 actors.

The first sandboxed `npm test` attempt reached the live canary and was refused access to the Docker socket; the same command rerun with Docker permission passed completely. This was an execution-environment refusal, not a product-test failure.

## Authority

This slice creates the disclosure mechanism only. Agent A still owns finding disposition and may reclassify entries in a later observable change. No finding was reclassified here.
