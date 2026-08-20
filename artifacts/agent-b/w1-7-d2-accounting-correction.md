# W1-7 D2 evidence accounting correction

## Scope

This artifact supersedes only the evidence classification in `artifacts/agent-b/w1-7-d2-closure-results.md`. The earlier artifact remains byte-identical because it is bound by an immutable event. The accepted D2 adapter, runner ordering, live controls, executable mutations, mutation harness, D1/D1F controls, migrations, and production behavior are unchanged.

The only executable-test wording change is:

```text
previous: failed attempt leaves zero custody, reference, and audit residue
current:  committed state after the D2 sequence is clean
```

Its observed output is now explicit about the source of atomicity:

```text
D2_COMMITTED_STATE custody=0 references=0 audit=0 clean_checkout=true implicit_abort_boundary=true
```

## Correct accounting

D2 contains six behaviorally discriminating live properties backed by four executable adapter mutations:

1. a mint-capable caller cannot substitute principal X or its derived tenant for verified principal Y;
2. transaction-local principal binding and `DISCARD ALL` jointly prevent checkout leakage, while either layer alone remains defence in depth;
3. only `engram_maintenance` is accepted, while `engram_app` and `postgres` are refused;
4. a scrub failure after a successful mint destroys the dirty client;
5. a scrub failure after a failed mint destroys the dirty client; and
6. the subsequent checkout is a clean client with an empty principal binding.

The four executable mutations remain:

```text
D2_SUBSTITUTION baseline=0 applied=t after=1 forbidden=t restored=0
D2_JOINT_LEAK baseline=0 local_only=0 scrub_only=0 applied=t after=1 forbidden=t restored=0
D2_ROLE_GUARD baseline=0 applied=t after=1 forbidden=t restored=0
D2_DIRTY_RELEASE baseline=0 fault_only=0 fault_clean=t applied=t after=1 forbidden=t restored=0
```

The mutation harness still reports `executed=9`: five previously accepted D1/D1F controls plus four D2 controls. This number does not include the committed-state residue observation.

## Structural limitation

The `custody=0 references=0 audit=0` observation is not falsifiable by an adapter mutation because PostgreSQL's implicit transaction abort is the atomicity boundary. Removing the adapter's explicit `ROLLBACK` does not produce committed partial residue. Manufacturing residue with a `SAVEPOINT` would contradict the accepted transaction design. The observation is therefore defence in depth, not rollback discrimination, and receives no mutation or discriminating-control credit.

## Verification

- `npm test`: exit 0, 235 passed, 0 failed, 0 skipped.
- `npm run db:test`: exit 0; the renamed committed-state test passed; mutation harness `executed=9` unchanged.
- `npm run kms:test`: exit 0, live Vault 1 passed, 0 skipped.
- `npm run lint`: exit 0.
- `npm run verify:all`: exit 0.
- Proof before publication: 169 events across 29 threads and 2 actors.
- Task-owned containers, volumes, networks, scratch databases, and mutation copies after verification: zero.

No claim is made for D3, W1-8, W3, AEGIS integration, or closure of A7, A8, or B5.
