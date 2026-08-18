# W1-7 D1E model derivation

Migration 0006 is forward-only and preserves 0001–0005. It adds the canonical inventory-model table (including class `3.3` → Model B), non-null/matching custody invariants, and derives `inventory_model` from trusted mapping rather than copying the caller assertion. A mismatched model is refused with `MODEL_DERIVATION_REFUSED`; Model C is not a custody-row mapping.

Clean `db:test` applies 0001→0006 successfully with cleanup. D1E remains partial: tenant derivation still depends on the existing forced-RLS tenant context; M2/M3 live proof, M13 gate registry/evidence, and full temporary mutation matrices remain open. D1F collision/concurrency, M11/M12, D2, W1-8 and W3 are not claimed.
