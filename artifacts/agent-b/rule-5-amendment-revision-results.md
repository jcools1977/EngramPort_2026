# Rule 5 amendment revision results

Parent handoff: `01a03f8d-e427-74bd-85bc-b5707dd1fd77`

## Delivered correction

- Replaced the tautological “everything outside events/artifacts is shared” rule with exact shared directory and root-file allowlists in `AGENTS.md`.
- Classified `actors/*.yaml` as a protected surface. This is the chosen actor-record mechanism; no actor-registry digest binding was added.
- The policy control compares the actor-record set and bytes with the checked-out `HEAD`, requires `event_directory: events/<slug>` and `artifact_prefix: artifacts/<slug>`, and rejects overlapping actor prefixes.
- The tracked-path control derives actor-owned prefixes from the protected records, recognizes only the written shared allowlists, and rejects every other path.

## Discrimination

- `REPOSITORY_UNEXPECTED_PATH`: a temporary Git index tracks `secrets/creds.env` with the repository's existing empty blob. The control fails, reports `unaccounted=1`, and names `secrets/creds.env`; the normal index restores to zero failures.
- `ACTOR_REGISTRY_PROTECTION`: a copied actor registry changes agent-b's artifact prefix from `artifacts/agent-b` to the takeover prefix `artifacts`. The control fails with `actors/agent-b.yaml differs from HEAD`; the committed registry restores to zero failures.
- D1 result: `D1 mutation harness: all controls discriminate (executed=118)` (previously 117).

The prefix-takeover report was independently confirmed. String uniqueness was insufficient because `artifacts` contains every actor prefix. The revised control instead requires each prefix to equal `artifacts/<slug>` or `events/<slug>` and also proves pairwise disjointness.

## Protection choice and limit

The protected-surface option is load-bearing. It rejects ordinary relay worktree additions, removals, and edits to `actors/*.yaml`, including staged edits, because the working registry must equal the checked-out commit. It does not cryptographically bind the registry across commits. An attacker able to replace the committed baseline and amend or disable the control and `AGENTS.md` in the same history rewrite could evade it; actor metadata not used for routing also has no digest binding. That remaining commit-boundary trust is stated in Rule 5 rather than hidden behind a second, unexplained mechanism.

## What the broad ban covered that enforcement did not

The retired broad ban covered every file another actor created: source, verifier code, tests, configuration, migrations, documentation, actor records, and unreferenced artifacts. The verifier properties previously cited cover only accepted event ownership, filename/body integrity, referenced artifact digests, and referenced artifact prefixes. They do not protect shared implementation files or unreferenced artifact bytes. The revised split deliberately weakens cross-actor file ownership for the explicitly listed shared source/test/configuration surfaces so verified relay work can edit them; it retains the policy ban for other actors' event and artifact surfaces, mechanically protects the actor registry at the checked-out-commit boundary, and fails closed for undeclared paths.

## Verification

- `node --test tests/repository-surface-policy.test.mjs`: 2 passed; 754 tracked paths, zero unaccounted.
- `npm run lint`: passed.
- `npm run db:test`: passed; both new mutations killed; `executed=118`.
- `npm test`: passed, including Docker-backed W1-7, build, and rendered HTML checks.
- `npm run proof:verify`: passed before publication with 340 accepted events across 51 threads and 3 actors.
- `git diff --check`: passed.

No SDK, enrollment, actor record, migration, or site change is included.
