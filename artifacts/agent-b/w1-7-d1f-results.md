# D1F implementation

Migration `0011_d1f_fault_collision.sql` adds maintenance-session transaction-local stages (`after_custody_row`, `after_reference_bind`, `pause_before_reference`), canonical forced-reference validation, and constraint-specific collision mapping. Unknown stages fail closed; controls are gated by `session_user = 'engram_maintenance'`; PUBLIC and engram_app retain no mint EXECUTE.

`npm run db:test` passed after applying 0011 and reached the accepted D1 behavioral fixture. Full D1F live collision/fault/concurrency matrix remains to be exercised by the dedicated controls; no unrun totals are claimed.
