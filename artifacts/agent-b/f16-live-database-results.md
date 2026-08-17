# F16 live database path evidence

Implementation commit: `37ced94468e08d571eaa4de7fd28e17c25c1e0d4`

## Result

Canonical F16 is complete. The live path runs unmodified as `npm run db:test` against a clean Docker PostgreSQL instance and passes migration, seed, isolation, application grants, constraints, and discrimination controls.

Implementation changes are limited to the Docker extension bootstrap boundary, seed identity values, the `pg_class.relforcerowsecurity` catalog assertion, correct migration-owner trigger reachability, checksum handling, and test-only guard-removal discrimination fixtures.

## Defect evidence, before and after

The pre-repair canonical run exited 3 before any database test completed. The four observed failures were:

1. **Extension privilege:** migration as `engram_migrator` failed with `permission denied to create extension "vector"` / `Must be superuser`. After repair, `vector` and `pgcrypto` are created by the Docker bootstrap superuser in `deploy/init-extensions.sql`; migration output is `extension "vector" already exists, skipping` and `extension "pgcrypto" already exists, skipping`. `engram_migrator` remains `NOSUPERUSER NOBYPASSRLS`.
2. **Seed identity:** the original two tenant-A principals omitted issuer/subject, so `UNIQUE NULLS NOT DISTINCT (tenant_id, external_issuer, external_subject)` rejected the multi-row seed with a duplicate identity. After repair, all three principals have distinct synthetic issuer/subject pairs; seed completes with `INSERT 0 3`, and the disabled principal remains available to the negative delegation control.
3. **Forced RLS assertion:** the original `pg_tables.forcerowsecurity` reference errored because that column does not exist. After repair, the assertion reads `pg_class.relrowsecurity` and `pg_class.relforcerowsecurity`; the live run reports `PASS application role is NOSUPERUSER NOBYPASSRLS and all tenant tables have forced RLS`. A test-only table with enabled but unforced RLS is then detected by the discrimination fixture.
4. **Migration-owner trigger:** the original constraint control received `42501 permission denied for table events` before reaching the append-only trigger. After repair, the owner assertion confirms `engram_migrator` owns `events`, and UPDATE and DELETE both reach the trigger with `55000 events is append-only`. A test-only `DISABLE TRIGGER events_immutable` fixture then demonstrates both operations would succeed if the trigger guard were removed.

## Database run and exact totals

Command: `npm run db:test` — exit code 0.

Server-read versions from the passing run:

- PostgreSQL `16.15 (Debian 16.15-1.pgdg12+2) on aarch64-unknown-linux-gnu, compiled by gcc (Debian 12.2.0-14+deb12u1) 12.2.0, 64-bit`
- pgvector `0.8.6`
- pgcrypto `1.3` (bootstrap extension present; the final version query reports vector as required)

Per database SQL file:

- `tests/isolation/rls.sql`: 11/11 pass
- `tests/failure/app-role-grants.sql`: 14/14 pass
- `tests/failure/constraints.sql`: 9/9 pass
- `tests/failure/discrimination.sql`: 21/21 pass

The migration checksum was recorded and verified as `e6fac07bc56f3e6b5b14143af153b22cb5636fa0360686dbc6948c842c3ee63a`.

Guard-removal discrimination is explicit and transactional: BYPASSRLS exposes restricted reads; an unforced RLS fixture is detected through the catalog; temporary INSERT grants make app-role writes succeed; disabling RLS makes cross-tenant INSERT succeed; temporary UPDATE/DELETE grants change the app error from `42501` to the trigger's `55000`; dropping each constraint or disabling the delegation/immutability trigger makes its forbidden operation succeed. Every mutation is rolled back.

## Regression matrix

- `npm run proof`: 33/33 tests; proof log verified 62 events across 21 threads and 2 actors before the result event.
- `npm run report:test`: 54/54
- `npm run report:r2:test`: 8/8
- `npm run welcome:test`: 19/19
- `npm run setup:test`: 22/22
- `npm run watch:test`: 16/16
- `npm run session:test`: 12/12
- `npm run approval:test`: 25/25
- `npm run dry-run:test`: 6/6
- `npm run db:static-test`: 6/6
- `npm run lint`: exit 0

## Design findings and scope

Extensions belong to the Docker/platform initialization boundary, while ordinary migrations remain representative of managed PostgreSQL and least-privileged. Correcting seed identities preserves, rather than weakens, `UNIQUE NULLS NOT DISTINCT` semantics. The catalog assertion now checks the actual PostgreSQL source of forced-RLS truth. The migration-owner check now proves the trigger itself rather than a preceding privilege failure.

No Re:PORT, Port Watch, wizard, onboarding, Git substrate, providers, credentials, publishing, parked records, or unrelated PNG was changed. No secret is committed; all database credentials remain explicitly local-only. Docker cleanup trap completed with no containers or persistent volumes; only Docker's default `bridge`, `host`, and `none` networks remained.
