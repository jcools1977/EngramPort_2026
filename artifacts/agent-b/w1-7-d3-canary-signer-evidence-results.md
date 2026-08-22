# W1-7 D3 canary signer-evidence correction

## Scope and implementation

- Implementation commit: `b81ba7c49a667160e149692726c87b0cd620e153`.
- Canary evidence now names `signer=local-stub` or `signer=live-vault`.
- `kms:test` requires `signer=live-vault` both in the live Node assertion and in the canonical shell runner. The runner fails with `KMS_SIGNER_EVIDENCE_INVALID` if the live label is absent or the stub label appears.
- The test-only stub moved from canonical Vault port 8201 to port 18201. If 18201 is occupied, fixture startup fails with `CANARY_STUB_PORT_OCCUPIED`; that refusal was executed and observed.
- No migration, production package, accepted seed, or historical artifact changed. The accepted vulnerable halves, real core dumps, protected in-operation signing, whole-environment observer, cleanup controls, and four canary mutations remain unchanged in behavior.

## Simulator disclosure

`local-stub` is an in-process, test-only HTTP simulator listening on `127.0.0.1:18201`. It accepts only the synthetic token and the synthetic `synth-a` transit path and returns a deterministic Vault-shaped `vault:v1:` signature. The protected operation worker still traverses the production `VaultTransitBoundary`; a test-only fetch redirect sends that boundary's request to port 18201. The protected core worker sends its already-accepted raw transit request to the selected signer port.

The stub simulates only the Vault transit HTTP response shape needed to exercise canary sink plumbing. It is used by the structural `w1-7:test` leg in `npm test`, the W1-7 canary leg in `db:test`, and the canary mutation-harness runs. It is not evidence of Vault cryptography, non-exportability, policy enforcement, or a production KMS, and it is not a production fallback. `kms:test` and the KMS leg of `verify:all` use the provisioned Vault 1.17 container and require the `live-vault` label.

## Observed signer evidence

- Structural/database evidence: `vulnerable_dirty=10/10 protected_clean=10/10 signed=10/10 operation_signed=6/6 signer=local-stub`.
- Live KMS evidence: `vulnerable_dirty=10/10 protected_clean=10/10 signed=10/10 operation_signed=6/6 signer=live-vault`.
- `kms:test`: 1/1 passed, zero skipped; Vault 1.17 differential, scoped signing, non-exportable refusal, and exportable control passed.
- Occupied stub port: fixture exited nonzero and emitted `CANARY_STUB_PORT_OCCUPIED`.

## Verification

- `npm test`: exit 0; 235 passed, zero skipped across the canonical Node/site sweep. The structural W1-7 suite was 4/4.
- `npm run db:test`: exit 0; D2 live 7/7, durable W1-7 9/9, and the canonical D1/D1F/D2/D3 database controls passed.
- `npm run kms:test`: exit 0; live W1-7 1/1, zero skipped, and `signer=live-vault` asserted.
- `npm run lint`: exit 0.
- `npm run verify:all`: exit 0.
- Mutation harness: 19 genuine controls discriminated; all four existing canary mutations showed baseline pass, mutation applied, forbidden behavior observed, and restore pass. The executed count remains 19 because this wording/provenance correction added no new mutation control.
- Separate NOOP negative: exit 1 and reported `NOOP false discrimination correctly rejected`; it is not included in the 19.
- Proof before publication: 187 events across 29 threads and 2 actors.

## Cleanup and limits

- Measured `kms:test` deltas: containers 0, volumes 0, canary temp paths 0.
- Both structural and live canary runs reported `containers_delta=0 volumes_delta=0 temp_paths_delta=0`.
- Only synthetic principals, tokens, keys, canaries, and local containers were used.
- This result does not close A7, A8, B5, or W1-7 and does not advance W1-8, W3, or AEGIS.
