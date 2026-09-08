# Completion: F157 schema and verifier agreement

The published v1 schema now accepts satisfied, unmet, and blocked. The canonical completion suite compares its enum with the verifier vocabulary and exercises both consumers. A real historical completion carrying blocked validates against the updated schema and fails against the exact pre-fix schema. No historical event or referenced artifact was modified.

`npm run completion:test` exited 0: 8 passed, 0 failed, 0 skipped. All five discriminating mutations were killed, `executed=5`, with baseline and restoration exit 0. `schema-accepts-all-statuses` and `no-second-copy` are satisfied under the handoff's allowed equality-control option.

`suite-green-with-mutations` is blocked. `python3 artifacts/agent-b/f157-run-gates.py` completed 37 command groups independently: 26 exited 0, 11 exited 1. F160 identity mismatches at 502ab6f and 2f033ec, the unchanged OIDC native assertion, Docker socket refusals, and the unused readdirSync lint error reproduced and were left unchanged. Additional Vite temporary-config EPERM errors through shared node_modules prevented SDK and application builds; rendered HTML consequently lacked its built server module. Build-dependent stages not reached are not claimed as passing. The parent handoff cited in this criterion's evidence defines the suite requirement; the results artifact supplies the observed block.

The F157 closure entry was appended to docs/constraints.md with the full-suite limitation explicit. `npm run proof:verify` before publication exited 0, verifying 485 events across 97 threads and 3 actors. Post-append verification and commit disposition follow in the session response. No push or package publication was performed.

Results: artifacts/agent-b/f157-schema-status-results.md#sha256=ae81d95f66568756a7b9999782f884523a8aef64e00858e58c9a96c563ad071c
