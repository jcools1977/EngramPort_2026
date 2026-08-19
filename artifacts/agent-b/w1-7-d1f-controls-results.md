# D1F dedicated controls

Added `tests/failure/d1f-controls.sql` to the canonical database runner. It exercises unknown-stage refusal, in-function M11/M12 faults, SQLSTATE/name checks, and independent custody/reference/audit residue checks. The runner isolates the fixture from the earlier M13 positive row. `npm run db:test` passed after applying migration 0011 and the D1F fixture. The structural limitation is explicit: neutralizing a RAISE removes the injected fault; PostgreSQL atomicity prevents intentionally retaining partial residue without violating the design.
