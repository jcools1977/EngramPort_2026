BEGIN;
REVOKE ALL ON FUNCTION derive_mint_membership(uuid) FROM PUBLIC,engram_app;
GRANT EXECUTE ON FUNCTION derive_mint_membership(uuid) TO engram_migrator,engram_maintenance;
COMMIT;
