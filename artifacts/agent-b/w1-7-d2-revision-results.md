# D2 revision

Added the live-capable role assertion and scrub/release hardening to `PrincipalSessionBinding`. Rollback, scrub, and release failures are isolated so release is guaranteed. Added `d2:test` to `npm test`; `d2:test` passes 2/2 and lint passes. The joint transaction-local plus DISCARD ALL leakage control is defense in depth. Full live PostgreSQL mutation evidence remains pending environment execution.
