# W1-7 bounded revision

Removed the application-memory signer and `generateKeyPairSync` path. `VaultTransitBoundary` now performs Vault transit HTTP requests and fails closed as `KMS_UNAVAILABLE` when no token/endpoint is available.

The cached Vault 1.17 container was provisioned and health-checked, then torn down cleanly. However, the existing crypto/canary fixtures still target the removed local API and require conversion to the live Vault HTTP contract. Therefore this revision does not claim A7/A8/B5 or B1–B4 closure. The prior custody/retention skeleton remains synthetic-only evidence. A6/B9 remain open; W1-8/W3 remain undispatched/ineligible.

No threat-model/schema/database/provider/credential work was changed. Production scope is limited to removing the prohibited in-memory signer and introducing the Vault HTTP boundary. Docker and temporary cleanup are complete; only the unrelated PNG remains untracked.
