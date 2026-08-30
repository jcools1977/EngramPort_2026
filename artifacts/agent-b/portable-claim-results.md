# Portable claim-store result

Parent handoff: `01a052fe-3992-7ee6-99a4-56387ac02ff2`

## Delivered boundary

- Added forward-only migration `0025_port_watch_claims.sql` and `PostgresClaimStore`.
- Delivery position remains derived from the verified Git log. PostgreSQL stores only the operational `(agent, project)` claim and lease.
- `acquire_port_watch_claim` uses one primary-key conflict path and an atomic conditional update. An unexpired active row cannot be replaced; an expired or revoked row can be reclaimed using the database clock.
- The table is not directly available to `PUBLIC`, `engram_app`, or `engram_maintenance`; `engram_app` receives only the claim functions.
- The SDK exports `PostgresClaimStore` and records claim-two coverage as full only with the shared-control-stream dependency.

## Observed evidence

- Two `pg.Pool` instances, each limited to its own independent connection and using separate file control stores, contended through one PostgreSQL database for one handoff. The observed result was `connections=2 invocations=1 wakes=1`.
- The pre-existing file-store duplicate-invocation control still passes: `concurrent ticks reserve one invocation slot before either runner call`.
- The `PORT_WATCH_POSTGRES_EXCLUSIVITY` mutation replaced only the conditional database conflict predicate. The same two-connection test then observed two invocations and failed `2 !== 1`; restoration returned it to one. Harness line: `baseline=0 applied=t after=1 forbidden=t restored=0`.
- An abandoned 25 ms lease was reclaimed after the database clock advanced. The replacement 30 s lease blocked the other connection: `expired=reclaimed active=blocked`.
- `npm test` passed, including the existing duplicate-invocation test, SDK tests, static database controls, build, and rendered-site tests.
- `npm run db:test` passed. The database suite exercised migration 0025, the two live claim tests, every prior database control, and the mutation harness.
- `npm run kms:test` passed the live Vault differential; `npm run lint`, `npm run proof:verify`, and `git diff --check` passed.

## Honest portability and dependency statement

The demonstrated portability is narrower than cross-machine operation. Two independent database connections with no shared filesystem coordinated through one PostgreSQL control database. This proves the exclusion is not process-local or filesystem-local. It does not prove two physical machines, network reachability, cross-region behavior, or service availability.

Every Port Watch process relying on portable exclusion must reach the same control stream and use `PostgresClaimStore`. Separate `FileClaimStore` roots do not become portable. This requirement sharpens ADR 0039's no-server description and follows ADR 0044's accepted shared-infrastructure boundary for delivery state. ADR 0045 records the tension without resolving or rewriting ADR 0039.

## Migration preservation and count

- The observed pre-change mutation total was `executed=145` in the accepted SDK evidence and its independent verification.
- The new total is `executed=146`; all 146 controls discriminate.
- Migrations 0001 through 0024 have no Git diff. Their ordered aggregate SHA-256 listing digest at completion time is `07b767f4ecbe1d8cc870fe1eadb5ae8fa663fa4672dbf7da5a157c955fbd7948`.
- No site copy, protocol/envelope, or enrollment surface changed.
