# F158 completion: refuse unreadable or unvouched spend evidence

Implemented the bounded spend-ledger correction. The service-account launcher uses a ledger reader that treats only missing review directories as empty, verifies the canonical log and agent-c artifact references, and hashes and parses the same review buffer. The pure decision function remains unchanged, including its `SPEND_UNREADABLE` refusal code.

Observed with `npm run agent-c:spend-test`: 19 passed, zero failed or skipped, followed by production, historical and restored controls and `SPEND_LEDGER_MUTATIONS executed=8 killed=8`. The pre-fix function from commit `955a9b60f148430c3582ccbaa9123661d38cd302` counted only the readable root and allowed when another root returned actual EACCES. It also allowed changed cost bytes and an unreferenced file. The updated reader refused all three, preserved missing-directory behavior and unchanged referenced sums, and passed the deterministic read-interleaving controls.

Observed with `npm run agent-c:test`: 22 passed and all 20 named mutations killed. `node --test tests/repository-surface-policy.test.mjs` passed 4/4. Targeted ESLint, launcher syntax and diff checks exited 0. `npm run proof:verify` before publication passed with 495 events across 101 threads and three actors.

All four envelope criteria are satisfied; per-criterion explanations, paired observations, limitations and raw evidence digests are in the results artifact. The recorded OIDC native crash, Docker refusals and existing unused readdirSync lint error were not rerun or fixed here. F160 identity records remain unchanged. No full-suite success is claimed. No historical event or review was changed, and no provider, keychain, deployment or push operation was performed. Git acceptance is not independent authentication of provider cost, and this filesystem projection is not transactional spending control.

Results: artifacts/agent-b/f158-spend-ledger-results.md#sha256=af709eb755ca40297415dabc254f3b779ae4a5272f9b34cea122565212151282
