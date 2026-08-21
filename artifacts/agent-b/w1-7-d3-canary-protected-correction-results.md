# W1-7 D3 protected canary and cleanup correction

## Scope

This bounded revision corrects only the six protected section 10 operational sinks and their cleanup evidence. The ten vulnerable injection paths are unchanged; the environment landing was broadened from one selected variable to the complete live process environment so the real observer covers the required surface. The accepted artifact-registration tightening remains unchanged.

Migrations `0001` through `0014`, durable custody/retention behavior, D1/D1F/D2/D3, the accepted first four canary sinks, Vault policy, revision 8, production seeds and historical artifacts are byte-identical to the parent. No A7, A8, B5, W1-8, W3 or AEGIS closure is claimed.

Implementation commit: `a0e7bb582a6ef48140be407e0ff4228f336d3cd0`.

## Same protected production operation

The protected log, argv, environment, backup and error variants now receive the same high-entropy synthetic canary in their signing-operation context over stdin, outside argv and the environment. Inside the observed worker they import the production `VaultTransitBoundary`, call live transit signing for `synth-a` over the known digest, and return that operation's `vault:v1:` signature. The canary is validated as present in the operation context before signing. Each sink then emits only its safe allowlisted representation:

| Sink | Operation evidence | Real protected landing inspected |
|---|---|---|
| logs | production transit sign in worker | trace-level operation log without request material |
| process arguments | production transit sign in worker | complete live `process.argv` |
| process environment | production transit sign in worker | complete live `process.env`, not one selected variable |
| backups | production transit sign in worker | backup copied during the operation from a safe store |
| error surfaces | production transit sign in worker | serialized generic exception message and stack |

None returns `{protected:true}`. `canaryHarness` credits these paths only when the protected import returns an actual signature-shaped result from the operation and its independent observer finds the landing clean. The first four detector-backed paths continue to require their real detector refusal and use the accepted parent boundary.

Structural runs use a local synthetic Vault-shaped responder so the real boundary remains executable without live configuration. `kms:test` uses the provisioned Vault 1.17 service and its policy-scoped token; no responder or local signing fallback is used in that run.

## Protected forced core dump

The protected core variant now starts a live Vault transit request in the canonical `pgvector/pgvector:pg16` container and forces a SIGSEGV while that signing operation is in flight. It uses `--ulimit core=-1`, produces a real `667648`-byte dump, reads the dump, and proves both the canary and scoped synthetic Vault token are absent. The signing response is independently required to contain the live `vault:v1:` signature. The vulnerable core path still holds the canary and produces a separate `667648`-byte dump observed dirty.

The crash subprocess receives neither the canary nor token: the canary stays outside the non-exportable signing process by design, and `env -u` removes the scoped token and request body before the crash. Failure to crash, generate/read the dump, or complete signing is a hard test failure.

Both structural and live Vault runs reported:

```text
W1_7_CANARY vulnerable_dirty=10/10 protected_clean=10/10 signed=10/10 operation_signed=6/6 core_bytes=667648/667648
W1_7_CANARY_CLEANUP containers_delta=0 volumes_delta=0 temp_paths_delta=0
```

## Executable discrimination

The source-copy harness now executes nineteen genuine controls:

```text
D3_CANARY_DETECTOR baseline=0 applied=t after=1 forbidden=t restored=0
D3_CANARY_OBSERVER baseline=0 applied=t after=1 forbidden=t restored=0
D3_CANARY_OPERATIONAL_OBSERVER baseline=0 applied=t after=1 forbidden=t restored=0
D3_CANARY_PROTECTED_OPERATION baseline=0 applied=t after=1 forbidden=t restored=0
D1 mutation harness: all controls discriminate (executed=19)
```

The new mutation replaces the exact protected-operation signature anchor. It is catalogued/applied in the source copy, makes the six operation results ineligible, and yields `protected_clean=4/10 signed=10/10 operation_signed=0/6`; the fixture exits nonzero. Restoration returns `10/10`, `6/6` and exit 0. The no-op negative remains separate (`applied=f`, exit 1) and is not counted.

## Cleanup evidence

Core containers now use `docker run --rm`; the fallback cleanup uses `docker rm -f -v`. The full fixture lifecycle, including module/repository copies and the synthetic responder, is inside `try/finally`. Each run snapshots container IDs, Docker volume IDs and `engram-canary-*` temp paths before and after, fails on any positive delta, and reports all three deltas.

Measured around the live `kms:test`: containers `0 -> 0`, volumes `153 -> 153`, task temp paths `0 -> 0`. Every structural, database, mutation and live run also printed `0/0/0` deltas. Two empty task-owned temp directories left by the prior pre-`try` fixture were inspected, removed with `rmdir`, and the final task-temp count is zero. The 153 pre-existing host volumes were not pruned or modified.

## Accepted code touched

`packages/git-adapter/src/custody-service.mjs` is accepted production code and changes only the canary evidence contract: it passes the known digest into a protected importer and distinguishes a signature returned by the observed operation from the parent fallback. The former self-declared `{protected:true}` path is removed. No signer, key access, provider, credential path or fallback was added.

The worker and fixture are test-only. Vulnerable routing is unchanged; only the environment observer now serializes the whole live environment, as required.

## Verification

- `npm test`: exit 0; 235 passed, 0 failed, 0 skipped. Per-suite: proof 34, D2 structural 2, W1-6 19, W1-7 structural 4, Re:PORT 54, R2 8, welcome 19, setup 22, watch 16, session 12, approval 25, dry-run 6, DB static 6, dispatch 6, rendered HTML 2.
- `npm run db:test`: exit 0; PostgreSQL 16.15 / pgvector 0.8.6; database controls 83, D2 live 7/7, W1-7 live 9/9, mutation harness `executed=19`.
- mutation harness no-op negative: exit 1 as required.
- `npm run kms:test`: exit 0; live Vault 1/1, 0 skipped; protected operational signatures 6/6 and all ten signing results 10/10.
- `npm run lint`: exit 0.
- `npm run verify:all`: exit 0 and repeats the complete delegated Node/site, database, Vault and lint graph.
- Proof before publication: 185 events across 29 threads and 2 actors.
- Final task-owned containers, scratch databases, copied trees, core files and temp paths: zero. Docker volume delta: zero.

Only synthetic material and local containers were used. This completes the requested correction for independent review; it does not itself close B5, A7 or A8.
