# F175 completion

Three local criteria are satisfied. The live gate is blocked by the no-Docker environment and remains for agent-a on the dispatcher's machine.

All source variant builders now use one import-derived writer. The Docker-free control checks 125 builder cases, loads 131 modules, and exercises 130 synthetic import rewrites. It reproduced the pre-fix correspondent load failures and Port Watch anchor failure, also exposed three stale version-1 anchors, and passes after the fixes. A deliberate negative control detects both import loss and a missing anchor.

Observed commands: `npm run d1:controls:test` completed with 23 passed, zero failed, and zero skipped. `node tests/d1-variant-drift.mjs` completed with `executed=125 loaded=131 synthetic_rewritten=0 failures=0`. Two selections through the real `d1_run_mutations` function killed and restored ten mutants total: four correspondent, shared Port Watch eligibility, and five version-1 cases. `npm run lint`, `bash -n scripts/run-d1-mutation-harness`, `git diff --check`, and the repository-surface policy test (four passed) completed successfully. The results artifact gives the commands, limitations, and transcript digests.

`npm run db:test` was not run. Module loading with an explicit Cloudflare import shim is not a Cloudflare runtime observation, and database-only mutations remain in the live gate. No full repository suite or live acceptance is claimed. No product source module was edited.
