# W1-7 D1 ACL correction

Migration 0009 is forward-only and explicitly revokes `PUBLIC` and `engram_app` EXECUTE on `derive_mint_membership(uuid)`, granting only `engram_migrator` and `engram_maintenance`. Live `has_function_privilege` assertions verify app=false and maintenance=true; this avoids the NULL `proacl`/`aclexplode` false-negative trap.

Clean `db:test` applies 0001→0009 successfully with cleanup. ADR 0015 remains intact: D1 assumes a trusted session principal; D2 owns external identity/session binding. The four requested guard-removal regressions remain unimplemented in this slice and are not claimed.
