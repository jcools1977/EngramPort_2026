# D1F tenant-context correction

The D1F fixture now restores the derived tenant transaction-locally before every post-failure residue query, because the failed mint subtransaction rolls back its GUC. Unknown-stage, M11 and M12 controls pass with explicit custody/reference/orphan-audit predicates. `npm run db:test` passed. The prior active-custody void probe is not credited; collision/concurrency differentials remain open.
