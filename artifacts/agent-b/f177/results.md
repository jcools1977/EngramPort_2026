# F177 candidate and local verification limits

The candidate is not a verified closure. The relay handoff reports CI run 34597910043; no CI logs were fetched here.

## Environment

Base revision: `c8c164e12e485434e35403021a8069ed4dced8e2`. Branch: `agent-b/f177`; dirty working tree; real node_modules directory. Platform: `macOS-26.5.2-arm64-arm-64bit-Mach-O`. Every durable command prefixes PATH with `/opt/homebrew/opt/node@22/bin`; quoted `node -v`: `v22.23.2`.

## Candidate

Both schedule comparisons use the alarmAt and expiresAt returned together by one DO inspect call. The second observation uses a separate 1000 ms transaction after claimed cleanup, so injected delay does not itself expire the claimed callback. Only manual cleanup uses the 60 ms runtime. An absent/expired observation with null alarmAt has its own `fired-before-inspect` outcome; it does not prove the automatic alarm fired (inspect can purge expiry itself). Invalid present scheduling remains false and fails. The worker and packages are unchanged. The existing exact harness forbidden line is unchanged:

```text
W1_1_OIDC_DURABLE cleanup scheduled=true claimed=204/true alarm=true
```

## Paired evidence attempt

`old-delayed.test.mjs` preserves the HEAD control with a test-only delay before the old `before` inspect and relocates imports. `run-controls.sh` builds the actual cleanup mutant through `make_w1_1_oidc_durable_variant`, demands the old/new delayed lines, then ten passing baselines and ten failing mutants with the exact forbidden line. Its 2300 ms delay exceeds both runtimes' TTL + 1000 ms grace. Run from the repository root: `bash artifacts/agent-b/f177/run-controls.sh`.

The builder completed, but the first runtime observation was blocked. Both individually attempted old/new delayed checks printed:

```text
error: 'listen EPERM: operation not permitted 127.0.0.1'
# pass 0
# fail 1
```

See `old-delay.log`, `new-delay.log`, and `paired-attempt.log`. No cleanup observation line was emitted. The runner correctly stopped, so ten-of-ten baseline/mutant behavior is **not observed**. Expected lines in the script are assertions, not quoted observations.

The full durable suite was attempted with `node --test tests/workspace-oidc-durable.test.mjs` and completed unsuccessfully, all seven cases blocked on the listener:

```text
# tests 7
# suites 0
# pass 0
# fail 7
# cancelled 0
# skipped 0
# todo 0
```

See `durable-suite.log`. `node --check tests/workspace-oidc-durable.test.mjs`, `bash -n artifacts/agent-b/f177/run-controls.sh`, and `git diff --check` passed. These checks do not establish runtime behavior.

## Other six checks: source audit

All line numbers below refer to the candidate `tests/workspace-oidc-durable.test.mjs`. Default runtime is 1000 ms (`async function runtime(persist,ttl=1000)`).

### route: no matching race

Default TTL; status-only assertions, no alarm observation.

```text
38:   const mf=await runtime(persist);try{
40:     console.log(`W1_1_OIDC_DURABLE route start=${started.status} callback=${completed.status} fallback=${fallback.status}`);
```

### same-name: no matching race

Default TTL; status/presence assertions, no alarm timestamp comparison.

```text
46:   const mf=await runtime(persist);try{
50:     assert.deepEqual({pending:pending.status,present:pending.present,callback:completed.status,clean:clean.present,unknown:unknown.status},{pending:"pending",present:true,callback:204,clean:false,unknown:400});
51:   }finally{await mf.dispose();}
```

### restart: no matching race

Default TTL before and after restart; presence/status assertions.

```text
55:   let mf=await runtime(persist);const attempt=await start(mf),before=await inspect(mf,attempt.state);await mf.dispose();
56:   mf=await runtime(persist);try{
59:     assert.deepEqual({before:JSON.parse(before.body).present,callback:completed.status,clean:JSON.parse(after.body).present},{before:true,callback:204,clean:false});
```

### atomic: no matching race

Default TTL; concurrent callback statuses and record presence.

```text
64:   const mf=await runtime(persist);try{
67:     assert.deepEqual(statuses,[204,400]);assert.equal(JSON.parse(after.body).present,false);assert.equal(bodies.some(body=>body.includes("OIDC_STATE_REFUSED")),true);
```

### expiry: no matching race

Short 50 ms TTL, but asserts callback status and presence only; never compares getAlarm metadata.

```text
72:   let mf=await runtime(persist,50);const expired=await start(mf);await new Promise(resolve=>setTimeout(resolve,90));const refused=await callback(mf,expired.state),after=await inspect(mf,expired.state);await mf.dispose();
76:     assert.deepEqual({expired:refused.status,clean:JSON.parse(after.body).present,fresh:accepted.status},{expired:410,clean:false,fresh:204});
```

### redaction: no matching race

Default TTL; alarmAt is only an expected metadata key, not a timestamp-value assertion.

```text
104:   const mf=await runtime(persist);try{
108:     assert.equal(nonceOnlyInRedirect,true);assert.equal(metadataKeys,"alarmAt,expiresAt,present,status");assert.equal(control.body.includes("nonce"),false);assert.equal(control.body.includes("codeVerifier"),false);assert.equal(callbackBody,"");
```

## Completed D1 control run

`npm run d1:controls:test` exited 1 on Node `v22.23.2`:

```text
# tests 24
# suites 0
# pass 22
# fail 1
# cancelled 0
# skipped 1
# todo 0
# duration_ms 99811.663417
```

See `d1-controls.log`. The failing case is `the declared canary budget overrides the default while an ordinary test retains its budget`, at `tests/d1-baseline-timeout.test.mjs:105`: its child emitted `test timed out after 100ms` instead of the expected `ok 1 - canary budget override`. This file is outside the handoff's change bounds. The durable integration classifier check skipped because the loopback socket could not start. No overall passing-suite claim is made.

## Commit blocked

Staging the explicit candidate paths failed before a signed commit could be made:

```text
fatal: Unable to create '/Users/an2b/an2b/products/EngramPORT/.git/worktrees/EngramPORT-f177/index.lock': Operation not permitted
```

The worktree's Git metadata lives outside this sandbox's writable roots. Approval policy is never. No commit or push occurred; resume in an environment permitting loopback listeners and this worktree's Git metadata, run the evidence runner, and use `scripts/agent-commit agent-b` with the actor's verified signing key.
