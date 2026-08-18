# W1-7 live Vault provisioning correction

Commit under test: pending implementation commit

## Sanitized live evidence

- Vault image: `hashicorp/vault:1.17`; readiness API succeeded before provisioning.
- Transit mount was created and checked; existing mounts are accepted only when `transit/` reports type `transit`.
- ACL policy PUT uses JSON with a nonempty `policy` field and the scoped path `transit/sign/synth-a/*`.
- Scoped token: `synth-a` signing succeeded through `VaultTransitBoundary`; `prod-real` was denied.
- Broken exact-path policy: both `synth-a` and `prod-real` were denied.
- Broadened temporary policy: `prod-real` succeeded; scoped policy was restored and the success/denial pair rechecked.
- Non-exportable export: Vault refused with the sanitized reason `private key material is not exportable`.
- Exportable control: `PEM_BYTES=1679`, SHA-256 `217ce9010f12b8fb84d12cc03f69d3ce23692a12fd8728c789b23d2c59a1f925`; key bytes were not recorded.
- Live W1-7: 6 tests, 6 passed, 0 failed, 0 skipped.

## Failure propagation

- No token: W1-7 live test fails `KMS_UNAVAILABLE`; no skip is reported.
- Docker unavailable: `kms:test` exits nonzero with `KMS_UNAVAILABLE`.
- Malformed/raw policy requests fail before success output; cleanup trap preserves the failure status.
- Cleanup trap captures the original status before deletion and verifies no task-owned container remains.

## Scope

Only the live Vault provisioning/policy harness and live-test skip behavior were changed. The accepted custody boundary, detector, UUID behavior, database controls, and all unrelated work remain unchanged. W1-7, A7, A8, and B5 remain open; the carry-forward blockers remain unclosed.
