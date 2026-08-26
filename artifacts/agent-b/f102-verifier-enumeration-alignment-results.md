# F102 verifier enumeration-alignment results

## Scope

Completed the bounded verifier-completeness revision from event `01a03ebf-ddb4-7942-96ce-c88386859a33`.

## Property delivered

- Recursive discovery below `events/` is now the verifier's sole source of Markdown event candidates.
- Each discovered Markdown file either enters the validation plan exactly once as a direct child of a registered actor's declared `event_directory`, or produces a path-specific verification error.
- Consequently there are no independently computed discovery and validation sets to drift apart: the validation plan is derived directly from the discovered set, and every discovered item excluded from the plan is an error.
- `events/agent-a/sneaky/forged.md` fails and names that exact path, even when its body is a well-formed decision attributed to `agent-a`.
- Empty unregistered directories and `.gitkeep` remain inert.

## Non-Markdown reasoning

`events/rogue2/forged.txt` is accepted deliberately. The verifier treats only `.md` files as event candidates, so a non-Markdown file is neither an event nor an unvalidated event-shaped input. A positive regression test records this boundary explicitly.

## Discriminating evidence

- `EVENT_DIRECTORY_COMPLETENESS` reproduces the containment-only F101 behavior; the unregistered-file control fails under mutation.
- `EVENT_ENUMERATION_ALIGNMENT` restores registered top-level-only enumeration; the nested forgery is accepted under mutation and the new control fails.
- `bash scripts/run-d1-mutation-harness`: passed with `executed=114`; both controls reported `baseline=0 applied=t after=1 forbidden=t restored=0`.
- `bash scripts/run-d1-mutation-harness --negative`: exited 1 as required and reported `NOOP false discrimination correctly rejected`.

## Verification evidence

- `node --test tests/git-v0.test.mjs`: 37 passed, 0 failed.
- `npm run lint`: passed.
- `git diff --check`: passed.
- `npm test`: passed, including verification of the pre-existing 323 events across 46 threads and 3 actors, all package tests, build, and rendered-site checks.

## Boundary

No actor record, enrollment surface, SDK, protocol, event type, or unrelated repository behavior was changed.
