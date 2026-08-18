# W1-7 D1E authorization derivation

Migration 0005 (`migrations/0005_d1e_authorization_derivation.sql`) is forward-only and adds required scope/model columns and in-transaction scope/model checks to the custody mint boundary. Migrations 0001–0004 remain unchanged; the runner applies 0001→0005 once on clean PostgreSQL and records each checksum.

The live db suite passes with migration 0005 and cleanup. D1E remains partial: the existing forced-RLS project-membership policy still depends on `app.tenant_id`, so complete tenant de-circularization and M2/M3 live proof are not claimed. Full M7/M13 mutation matrices and independent D1E temporary-failure discrimination remain open. No Node/Vault/canary/retention/D2 work is included.
