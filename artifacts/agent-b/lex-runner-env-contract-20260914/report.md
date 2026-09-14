# Runner environment contract completion

Lex tree: /Users/an2b/an2b/products/lex-service-pr3, branch fix/runner-env-contract,
HEAD fe93ad168d7e32c7a9372d849dd71e1498e0b858 (descends from b7af747).
Darwin arm64, Node v26.8.2. Working tree bytes; no commits in either tree.

Node runner/notifier now resolve LEX_DIR, LEX_REPO/coordination, then script bin/.. .
Missing actor refusal includes the resolved actor file. Shared defaults match Bash:
nick-agent, main, 900 seconds, 6 runs, 3600 seconds, thread cap 8.
Bash is unchanged as required. Bash does not consume LEX_DIR, LEX_PREFIXES,
LEX_AGENT_CMD or LEX_AGENT_ARGS; README explicitly identifies these Node-only
controls and Bash-only LEX_MODEL rather than claiming full feature parity.
Node prefixes and agent argument defaults are also asserted against the table.
WorkingDirectory equals the plist LEX_REPO placeholder.

Validation: node --test tests/*.test.mjs completed with SDK 0.3.0:
“tests 41; suites 0; pass 41; fail 0; cancelled 0; skipped 0; todo 0”.
plutil -lint deploy/com.lex.run.plist.example: OK. git diff --check: exit 0.
See suite-locked.log for exact log lines including INBOX cwd=... path=coordination/events,
REFUSED no-open-turn-for-actor, missing actor path, and notifier QUIET no open turn.
Runner resolution executes the actual entry point copied into disposable fixtures
with a fail-closed Git double and isolated home. Original cwd fallback mutation is
killed by the same repo-only and own-location observers. Notifier uses real Git with
a local filesystem remote and notification shim. These are local synthetic checks,
not a launchd deployment or production-turn observation.

Initial full run completed: 41 tests, 32 passed, 9 failed. Pre-existing untracked
node_modules symlink points to /Users/an2b/an2b/products/lex-service/coordination/node_modules
with SDK 0.2.0 (missing dist/cli.mjs and failing the 0.3.0 assertion).
Installed package-lock dependencies in a disposable directory using npm ci --offline
--ignore-scripts; temporarily pointed that symlink to the installation for the passing
run, then restored its original target and deleted the temporary installation.
Dispatcher must install the locked dependency before reproducing the full suite.
Both runs retained. No actual notification, agent invocation, or remote publication.
