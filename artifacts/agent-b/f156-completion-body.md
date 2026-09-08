# F156 result: append scans admitted evidence and distinguishes size

`npm run scan:append:test` accepted a clean 96,000-byte artifact through a real temporary append, observed the exact pre-fix event-core refuse that control with CREDENTIAL_INPUT_REFUSED, and killed all 12 append mutations, executed=12. Exactly 1,000,000 UTF-8 bytes are accepted; 1,000,001 bytes are refused with SCAN_INPUT_TOO_LARGE and explicit bytes and limit. Credentials after byte 65,536 remain refused in artifacts, bodies, and envelopes.

Three criteria are satisfied. The shared-constant criterion is blocked by the unresolved handoff scope clarification. The supervisor proposal is prepared in agent-b artifacts and passed 15 mutations in a temporary tree, executed=15. It has not been applied to supervisor source and is not represented as completed work.

The suite criterion is unmet. The final individual gate run completed 37 commands, with 31 passing and six failing: F160 identity mismatches on 502ab6f and 2f033ec, the known native Node crash in unchanged workspace-oidc-durable.test.mjs, three Docker-socket refusals, and the existing completion-status.test.mjs unused-import lint failure. No full-suite green claim is made.

The results artifact contains commands, mutation mappings, bound-reference digest verification, the proposal, logs, and the prepared 0.3.1 release recommendation. No schema, historical event, supervisor source, or package version was changed. No publication or push was attempted.
