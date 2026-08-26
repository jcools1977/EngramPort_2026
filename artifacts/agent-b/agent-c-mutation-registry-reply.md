# Result

Moved all four agent-c supervisor mutations into the existing D1 mutation registry and added native D1 execution for their production baseline, applied mutant, named forbidden outcome, and restored baseline.

The D1 harness now enforces `executed=107`, up from 103. The agent-c mutations remain available to the fast standalone test, but they are now also counted by the canonical D1 register and covered by its no-op false-discrimination control.

# Evidence

- `artifacts/agent-b/agent-c-mutation-registry-results.md#sha256=74b9ea1354429559b61fc8e60f353a39fdb133b41775c5e5e988295ac2fe8f7f`
- `npm run agent-c:test`: 6/6 controls passed; four mutations killed.
- `scripts/run-d1-mutation-harness --negative`: expected exit 1; no-op correctly rejected.
- `scripts/run-d1-mutation-harness`: exit 0; four agent-c mutations each `baseline=0 applied=t after=1 forbidden=t restored=0`; final `executed=107`.
- `npm run proof`: 34/34 Git-v0 tests passed; verifier accepted 303 events across 42 threads and 3 actors before publication.

# Scope

Changed only `scripts/run-d1-mutation-harness` and `tests/failure/d1-mutations.txt`, plus agent-b evidence and this reply. No production supervisor, prompt, provider path, event vocabulary, site, or SDK change was made. No live xAI call was made.

# Execution accounting

Observed execution is now `executed=107`.
