# W1-7 harness revision

Fixed deterministic Vault harness failure propagation: readiness now retries boundedly and fails with `KMS_UNAVAILABLE`; transit setup no longer suppresses errors; tests run before success; cleanup uses `docker rm -f -v` and preserves exit status. Added Vault token detector coverage (`hvs.`, `hvb.`, `s.` and JWT forms) with clean near-matches. Added UUIDv7 timestamp/counter generation, async boundary behavior, and canonical package sweep wiring including W1-7.

W1-7 suite: 5/5. Proof suite: 33/33. Lint passed. `kms:test` provisioned Vault 1.17, health-checked, ran W1-7, and cleaned resources. Full live Vault export/policy differential and remaining A7/A8/B5 fixture conversion remain explicitly unclaimed for the next revision. A6/B9 remain open; B1–B4 remain W3 scope.

Production scope excludes real credentials/providers and does not modify the threat model/schema. Docker/temp cleanup is clean; unrelated PNG remains untracked.
