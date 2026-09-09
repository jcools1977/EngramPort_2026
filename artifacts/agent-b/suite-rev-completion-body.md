# Revision completion with inherited identity blocker

`node --test tests/workspace-oidc-durable.test.mjs` now exits 0 with exactly one skip line naming Node 26.5.0 and the Miniflare native-abort reason. `npm run docker-gates:test` exits 0 with 10 passing controls and both silent-skip mutations killed: OIDC `executed=1`, Docker `executed=1`. The exact-version guard continues on other runtimes. The Node 22 workflow now explicitly invokes `npm run session:test`, which includes the durable runner. No remote CI execution is claimed.

`npm test` exits 1 at `identity:test`, after the four Docker permission-denied skip lines. It reports three inherited author/signer disagreements: dd73f52214b4aee364c05af323fe396a4b5a20bd, d1fca740bacb2fd249077ee80dca766a37cebb6b, and 9317124939f26d6af4bd5a3a1a0a596b2cfad257, all authored by agent-b and signed as luke@covenantsystems.ai. History and acceptance records remain unchanged. This run never reaches OIDC.

A separately labeled diagnostic execution of all remaining commands after identity:test exits 0, including session tests, the build, and four rendered-HTML tests. OIDC prints its one skip line there. These separate observations do not establish a green npm test or five lines in one successful suite. `npm run lint` exits 0. F163's deterministic D1 failure belongs to another thread and was not fixed or executed here.

Criteria: oidc-loud-skip satisfied; oidc-runs-elsewhere satisfied; npm-test-green blocked by inherited identity evidence. The results artifact includes commands, verbatim skip lines, mutation counts, and digests of retained logs. Pre-publication `npm run proof:verify` exits 0 with 507 events across 103 threads and 3 actors. Post-append verification and commit disposition follow in the session response.

Evidence: artifacts/agent-b/suite-rev-results.md#sha256=152b56fec878ddc1b361efa85e206fbef7b1868bd17e8a4dbeaa8bbc2022cde7
