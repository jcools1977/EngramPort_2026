# Harness integration revision

Implemented scratch-only canonical gate IDs: class 3.2→C8 and 3.12→C14, and restored the G1 fixture’s empty `app.tenant_id` context. The live attempt confirms G1 is independently reached, but the existing maintenance fixture currently reports the expected FK path as RLS-masked and the G1 membership baseline remains nonzero; therefore the requested complete 0→true→3→0 matrix and db/verify sweep acceptance are not claimed.
