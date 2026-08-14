# W0-2 dry-run executor evidence

## Result

All twelve W0-2 acceptance criteria are met with Node only. Compilation validates and orders setup intent; dry-run execution accepts only the in-process branded compiler result and maps it to frozen transcript data. Neither compilation nor transcript production grants authority to execute any declared effect.

Node version: `v26.5.0`.

Exact command:

```sh
npm run dry-run:test && npm run setup:test && npm run watch:test && npm run welcome:test && npm run db:static-test && npm run proof
```

## Full output

```text
> engramport@0.1.0 dry-run:test
> node --test tests/workspace-dry-run.test.mjs

✔ valid plan transcript exactly covers compiled sequence and digests
✔ dry-run output is deterministic
✔ headline: provisioning, pull-request, and import effects cause zero side effects
✔ compiler-refused plan produces no transcript
✔ hand-built or cloned step list cannot bypass compiler
✔ temporary directory is required
ℹ tests 6
ℹ suites 0
ℹ pass 6
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 47.466458

> engramport@0.1.0 setup:test
ℹ tests 21
ℹ pass 21
ℹ fail 0

> engramport@0.1.0 watch:test
ℹ tests 16
ℹ pass 16
ℹ fail 0

> engramport@0.1.0 welcome:test
ℹ tests 19
ℹ pass 19
ℹ fail 0

> engramport@0.1.0 db:static-test
ℹ tests 6
ℹ pass 6
ℹ fail 0

> engramport@0.1.0 proof
✓ verified 25 events across 9 thread(s) and 2 actors
ℹ tests 11
ℹ pass 11
ℹ fail 0
```

Targeted ESLint, `git diff --check`, and a source scan for filesystem/network/process/database capabilities pass.

## Side-effect proof

The adversarial plan declares managed PostgreSQL provisioning, GitHub repository/PR permissions, and history import. During dry run, the test replaces these Node boundaries with counting traps that throw on use:

- filesystem mutation: `writeFile`, `appendFile`, `rename`, `mkdir`, `open`, `rm`, `cp`;
- network: `net.connect`, `net.createConnection`, HTTP/HTTPS `request` and `get`, and global `fetch`;
- subprocess/shell: `spawn`, `spawnSync`, `exec`, `execSync`, `execFile`, `execFileSync`, `fork`;
- database: every available no-dependency route would require a trapped socket or subprocess; the executor imports no database driver or I/O module.

Observed attempts:

```json
{"writes":0,"connections":0,"subprocesses":0,"database":0}
```

This is stronger than checking output: any named effect attempt increments its counter and fails the test. The caller-supplied temporary directory is required, but the current executor writes nowhere, including inside it.

## Other paired controls

- Valid compile/dry-run yields every compiled step exactly once and in identical order; invalid GitHub authority returns `GITHUB_PERMISSION_REFUSED` before any transcript exists.
- Genuine compiler output succeeds; a hand-built array and a structured clone both return `UNCOMPILED_PLAN_REFUSED`.
- Consequential entries preserve their compiler action digests exactly; non-consequential entries omit the field.
- Repeated dry runs are deeply equal; omitting the caller temp directory returns `TEMP_DIRECTORY_REQUIRED` while supplying it succeeds.

No fixture contains a credential or secret.

## Manual inspection

After all suites passed, `workspace-dry-run.mjs` was inspected directly. It imports only compiler functions, contains no filesystem, network, child-process, database, or fetch capability, and returns frozen structured data. `compiledStepSequence` is the shared ordering path for dry-run and future real execution. The compiler brands output in a module-private `WeakSet`, so serialized, cloned, or hand-built steps cannot cross the execution boundary.

## Design findings

Criterion 5 is genuinely instrumentable for this Node-only implementation without a dependency because the executor has no effect capability and all named built-in outbound boundaries are trapped in the adversarial test. This does not claim a universal sandbox against arbitrary future native addons. Any future real executor must live behind a separate capability-bearing module and repeat these boundary tests; adding an I/O import to the dry-run module should be treated as a security regression.
