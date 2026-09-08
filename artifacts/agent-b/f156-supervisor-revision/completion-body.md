# F156 supervisor revision completed

Both append and supervisor scans now import MAX_CONTEXT_BYTES from the git-adapter. The supervisor proposal is applied to real source, with raw UTF-8 scanning and size diagnostics preserved. The F156_APPEND_ONLY skips and mutation filter are removed.

npm run scan:append:test exited 0 with 10 passing controls, zero skipped, and executed=15 killed=15 survived=0. Lowering the shared constant to 100,000 passed both call paths; restating the limit in either consumer failed its control. All three supervisor mutations were killed.

npm run agent-c:test exited 0 with 22 passing controls and all 20 existing mutations killed. All three revision criteria are satisfied. The linked result contains complete command-log digests and bound-reference verification.

The prior F160 identity mismatches, OIDC native crash, Docker refusals, and unused-import lint error remain recorded and outside scope. No full-suite passing claim is made. No package publication or push was attempted.
