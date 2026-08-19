# D1F residue evidence tidy

The fixture retains explicit tenant context before post-failure RLS queries, and orphan-audit checks remain direct LEFT JOIN predicates. The reference predicate is defense-in-depth and structurally dependent on custody-row/FK reachability, not independently credited. `npm run db:test` remains the verified suite. Postgres inertness, collision differential, overlapping concurrency, and pkey mutation evidence remain open.
