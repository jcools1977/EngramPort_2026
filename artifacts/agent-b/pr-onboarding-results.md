# Pull-request actor onboarding results

Parent handoff: `01a05935-6cdd-7b41-97dd-a55c2333ea01`

## Bounded implementation

- Added `CONTRIBUTING.md` with six numbered actor-registration steps and one
  machine-readable `onboarding-contract` carrying those same six step IDs in
  the same order.
- Added an actor-record template that binds the filename slug to
  `events/<slug>` and `artifacts/<slug>`.
- Added a deterministic temporary-Git fixture that parses and executes the
  documented contract instead of maintaining a second test-only recipe.
- Added the onboarding suite to ordinary `npm test`.
- Added `SECURITY.md` language stating the exact authority: GitHub
  authenticates the account opening the pull request, while maintainer review
  and merge authorize the repository actor slug and paths. That authorization
  is not cryptographic authentication of the represented human, organization,
  provider, or process.

## Merge boundary evidence

The negative path executes the documented steps through `open-pull-request`.
The proposed actor record and both owned directories exist in the worktree,
but the committed registration is absent. It is refused:

```text
PR_ONBOARDING_UNMERGED_REFUSAL proposal=present head=absent refused=true
```

The positive path executes all six steps, including the modeled maintainer
merge. It then checks the actor record and both owned `.gitkeep` files at
`HEAD`, runs the shipped actor parser, and accepts the actor:

```text
PR_ONBOARDING_MERGED_ACCEPTANCE proposal=merged head=present accepted=true
```

The fixture explicitly says it models the pull-request boundary and does not
claim to be a GitHub integration test.

## Discriminating controls

Two independent mutations prove both halves are required. Removing the HEAD
guard causes the unmerged-refusal test to fail. Removing the merged acceptance
path causes the positive test to fail. Both shipped controls restore cleanly:

```text
PR_ONBOARDING_UNMERGED_REFUSAL baseline=0 applied=t after=1 forbidden=t restored=0
PR_ONBOARDING_MERGED_ACCEPTANCE baseline=0 applied=t after=1 forbidden=t restored=0
D1 mutation harness: all controls discriminate (executed=153)
```

The accepted baseline was 151 controls. This slice adds two, moving the exact
executed count to 153.

## Existing controls preserved

No actor record, Rule 5 rule, registry-drift implementation, repository-surface
classifier, protocol envelope, admission service, or package publication claim
was changed. Agent A's prior declaration of `CONTRIBUTING.md` remains intact.
The focused repository control reports:

```text
ACTOR_REGISTRY_DRIFT_CHECK actors=3 scope=dirty-tree normalized=true disjoint=true
REPOSITORY_SURFACE_POLICY tracked=958 actor_rule=true drift_rule=true shared_rule=true unaccounted=0
```

## Verification

- `node --test tests/pr-onboarding.test.mjs`: 3 passed, 0 failed.
- `node --test tests/repository-surface-policy.test.mjs`: 4 passed, 0 failed.
- `bash -n scripts/run-d1-mutation-harness`: exit 0.
- `bash scripts/run-d1-mutation-harness`: exit 0; all 153 controls
  discriminate.
- `npm test`: exit 0, including proof verification, onboarding, the full
  product suites, production build, and rendered HTML tests.
- `npm run lint -- --quiet`: exit 0.
- `git diff --check`: exit 0.
- `npm run proof:verify` at the start of the complete suite: 449 accepted
  events across 86 threads and 3 actors.
