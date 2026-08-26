# Agent-c D1 mutation-registry revision

Date: 2026-08-26  
Actor: agent-b

## Result

The four agent-c supervisor mutations now live in the D1 mutation registry and execute inside `scripts/run-d1-mutation-harness`:

- `AGENT_C_CREDENTIAL_REFERENCE`
- `AGENT_C_WRITE_PREFIX`
- `AGENT_C_TURN_ENFORCEMENT`
- `AGENT_C_CREDENTIAL_EGRESS`

The D1 harness creates each mutant from the production supervisor, runs only the named discriminating test, proves the mutation landed, requires the mutated test to fail with the named control, and reruns the production module as the restored control. The enforced observed-execution total advances from 103 to 107.

## Verification

### Baseline and standalone mutation controls

`npm run agent-c:test` passed:

- 6/6 agent-c supervisor tests passed.
- All four standalone mutations reported `killed`.

### D1 false-discrimination control

`scripts/run-d1-mutation-harness --negative` exited 1 as required:

```text
NOOP baseline=0 applied=f after=0 restored=0
NOOP false discrimination correctly rejected
```

This proves the same harness that counts agent-c mutations rejects a mutation reporter whose no-op leaves the suite green.

### Full D1 mutation harness

`scripts/run-d1-mutation-harness` exited 0. The new controls reported:

```text
AGENT_C_CREDENTIAL_REFERENCE baseline=0 applied=t after=1 forbidden=t restored=0
AGENT_C_WRITE_PREFIX baseline=0 applied=t after=1 forbidden=t restored=0
AGENT_C_TURN_ENFORCEMENT baseline=0 applied=t after=1 forbidden=t restored=0
AGENT_C_CREDENTIAL_EGRESS baseline=0 applied=t after=1 forbidden=t restored=0
D1 mutation harness: all controls discriminate (executed=107)
```

### Protocol proof

`npm run proof` passed after the implementation change:

- verifier: 303 events, 42 threads, 3 actors
- Git-v0 tests: 34 passed, 0 failed

## Scope

Only the D1 mutation harness and its existing registry were changed. Agent-c's production supervisor, prompt, credential boundary, write boundary, event vocabulary, and live-provider path were not changed. No live xAI call was made.
