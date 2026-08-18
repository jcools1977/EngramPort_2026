# W1-7 sweep wiring and artifact binding

Structural command: `npm run w1-7:test` — 5/5 passed, 0 skipped; no Vault required.
Live command: `npm run w1-7:live:test` — fails with `KMS_UNAVAILABLE` when `KMS_TOKEN` is absent (exit 1), and is invoked only after Vault provisioning by `kms:test`.
Live harness: `npm run kms:test` — live W1-7 1/1 passed, 0 skipped; Vault differential and cleanup passed.

Command graph: `npm test` is the Node/structural sweep only. `verify:all` is the canonical nonrecursive full sweep: proof, structural suites, database, live KMS, and lint. No live test is run before provisioning.

Artifact binding is attached to the result event machine-readable `artifacts` field, with this file's SHA-256. The proof verifier checks correct digest/path, and rejects changed bytes, changed digest, or missing bound artifact.

Scope is limited to test separation, command wiring, and artifact binding. Accepted VaultTransitBoundary/live differential and all carried-forward W1-7 blockers remain unchanged.
