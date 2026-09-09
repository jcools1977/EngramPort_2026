# Completion: source-derived agent-c variants and loud load failures

The builder discovers adapter module specifiers from the supervisor source. The actual pre-edit variant left bounded-context.mjs unrewritten and failed at load. A synthetic fourth-import control now passes and rejects the former two-import builder. A rejected mutant import emits a distinct named mutant-load-failed outcome with its error, counts toward the total, and fails the harness before forbidden classification. The missing-module control rejects suppressing the marker reader and passes after restoration.

`node --test tests/d1-agent-c-mutations.test.mjs` exited 0 with three passed and zero skipped. Through d1_load_definitions and d1_run_mutations, all 13 active AGENT_C definitions produced baseline=0 applied=t after=1 forbidden=t restored=0 and a matching per-case not-ok line. Accounting reported executed=13 not_exercised=0 negative_control=0 expected_total=13. The envelope says twelve; the current definition files contain 13, and every one was exercised.

`npm run d1:controls:test` exited 0 with 17 passed and zero skipped. `npm run agent-c:test` exited 0 with 22 supervisor tests passed and 20 separate supervisor-runner mutations killed. `npm run lint`, `bash -n scripts/run-d1-mutation-harness`, and `git diff --check` exited 0. `node --test tests/repository-surface-policy.test.mjs` exited 0 with four passed. Pre-publication `npm run proof:verify` verified 542 events across 110 threads and three actors.

rewrites-derived, load-failure-loud, and twelve-killed are satisfied. live-run is unmet: the dispatcher has not yet observed npm run db:test for this revision. No live database or full repository test success is claimed. The constraints file contains an appended local F169 closure with that acceptance limit.

Evidence: artifacts/agent-b/d1-rev5-results.md#sha256=1ddb0527279bdc014260dab2f66244dbe9c6c168f545b36fba3ed1df7a063bac
