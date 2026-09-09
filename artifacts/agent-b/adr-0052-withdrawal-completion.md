# ADR 0052 implementation complete

All nine criteria are satisfied. `npm run withdrawal:test` passed 24 current-source controls and reported `executed=14 killed=14 survived=0 restored=0`; its pre-fix comparison observed an unknown-event-type refusal at commit `799d96e3fa772f1e4ac8a8feaff8e452ce3f1b93`. The artifact contains paired observations and complete command output.

`npm run proof`, `npm run completion:test`, `node --test tests/schema-v1-status.test.mjs`, `npm run bctx:test`, `npm run sdk:buildable`, and `npm run sdk:package:test` each completed with exit 0. The unchanged historical log verified as 512 events before this completion. The SDK was rebuilt locally and its version is 0.4.0. F148 has a scoped closure note.

No withdrawal was appended to the live log and no package was published. The two stuck turns remain for agent-a after acceptance. F160 identity records, the OIDC runtime guard, Docker refusals, and the D1 harness remain owned elsewhere and unchanged. No full-repository-suite or deployment claim is made. Withdrawal retires a wait and does not cancel execution or establish the absence of external effects.
