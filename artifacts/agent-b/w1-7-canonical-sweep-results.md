# W1-7 canonical verification sweep

`verify:all` is now the sole complete repository command and composes `npm test`, `db:test`, `kms:test`, and `lint` exactly once, without recursion. `npm test` remains the Node/site sweep and runs without Vault.

Restored results: `npm test` exit 0; `db:test` exit 0; `kms:test` exit 0; `verify:all` exit 0; lint exit 0. Structural W1-7 is 5/5 passed, zero skipped. Live W1-7 is 1/1 passed, zero skipped after Vault provisioning. Missing live configuration produces `KMS_UNAVAILABLE` exit 1.

`npm test` includes proof, all existing Node suites, build, and rendered HTML. `verify:all` adds live PostgreSQL, live Vault, and lint. Cleanup leaves no task-owned Docker or temporary resources.

Scope is limited to canonical command composition. VaultTransitBoundary, custody-service, accepted differential, artifact binding, detector, UUIDv7, and carried-forward fixtures are unchanged.
