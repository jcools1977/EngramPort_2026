# W1-7 D1E tenant derivation

Migration 0008 is forward-only and preserves 0001–0007. It asserts no restrictive membership policies, adds the exact principal-self membership policy, derives tenant/project by authenticated principal, and sets `app.tenant_id` transaction-locally after derivation. The mint boundary checks authority before model disclosure and preserves existing scope/model/namespace/ACL/RLS controls.

Clean `db:test` applies 0001→0008 successfully with cleanup. Full M2/M3 mutation matrices, principal-session binding discrimination, and regression-failure wiring remain partial because the repository’s broader authenticated execution boundary is not yet implemented. M13, D1F, D2, W1-8 and W3 are not claimed.
