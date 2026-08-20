# D2 live revision

Fixed lint errors and hardened scrub cleanup: rollback/scrub failures are caught, and a scrub failure is passed to `client.release(error)` so the dirty connection is destroyed. Added a real PostgreSQL fixture entry to `db:test` using the container IP, plus role assertion and canonical D2 wiring. Unit `d2:test` passes 2/2 and lint passes. The live fixture could not complete in this runner because the container connection remained unavailable/hung; no live mutation totals are claimed.
