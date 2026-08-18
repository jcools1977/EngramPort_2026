# W1-7 D1 durable PostgreSQL custody foundation

Implementation commit: `bc40ea90d4bf3d0c02c6e5ebd132e7ad323b81a3`.

Added migration `0002_durable_custody.sql` with the design-named `custody_rows`, `minted_references`, and `custody_audit` tables; `custody_model` and `epr_namespace` enums; canonical reference check; tenant/project FKs; timestamps, revocation and retention fields; one-reference-per-row and active-identity uniqueness; SECURITY DEFINER mint boundary; explicit PUBLIC/app revokes; maintenance-only execution; app read-only access; and forced RLS with `pg_class.relforcerowsecurity` verification. The existing database runner applies and records the new migration checksum without changing 0001.

D1 scope is intentionally partial. Node adapter replacement, Vault binding, detector-before-transaction, full retention execution, ten-sink canary, and A7/A8/B5 closure are not claimed. The current mint function uses the design’s trusted founder-authority source and database clock but requires the seeded authority/grant fixture expansion in the next D1 control revision before a positive live mint can be exercised.

The migration was applied successfully during live `db:test` setup; PostgreSQL cleanup completed. W1-7 remains active; A6/B9 remain W1-8 and B1–B4 remain W3.
