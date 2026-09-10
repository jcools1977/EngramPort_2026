# V2 subject rule implemented

Schema, verifier, protocol, builder guidance, and the unpublished 0.5.0 changelog now specify blob or worktree subjects, with null for unknowns. Invalid subjects reach the CLI as V2_ENV_SUBJECT.

`node --test tests/adr54.test.mjs` and the rebuilt-bundle run each passed 39 tests. `node tests/run-adr54-mutations.mjs` reported executed=27 killed=27 survived=0 restored=0, including bare-path acceptance after guard removal. `npm test` completed with exit 0; its final block reported tests 4, pass 4, fail 0. Docker-dependent checks and the Node 26.5.0 OIDC runtime gate were explicitly skipped. `npm run proof:verify` verified 609 events across 129 threads and 3 actors before this completion.

All four criteria are satisfied within those observed limits. Exact commands, evidence digests, and mutation observations are in the results artifact. No existing history was rewritten and no package was published.
