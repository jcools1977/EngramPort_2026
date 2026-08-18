# W1-7 D1E authentication ordering and mapping

Migration 0007 is forward-only, preserves 0001–0006, completes the seven custody-bearing inventory mappings (3.2, 3.3, 3.5, 3.8, 3.11 → B; 3.12, 3.13 → A), adds a custody-class foreign key, and moves authentication/authority checks before model derivation to prevent unauthenticated class enumeration.

Clean `db:test` applies 0001→0007 successfully with cleanup. Tenant de-circularization remains blocked by the existing forced-RLS membership tenant-context dependency; full M2/M3 live proof and temporary mutation wiring remain open. M13, D1F, D2, W1-8 and W3 are not claimed.
