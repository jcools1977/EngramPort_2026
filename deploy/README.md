# Canonical core local database

Run the PostgreSQL 16 + pgvector migration, seed, and database integration suite from the repository root:

```sh
npm run db:test
```

The command starts an ephemeral Compose service on local port `55432`, waits for health, applies and checksum-records the forward-only migration, seeds two isolated tenants, runs the positive and negative controls, prints PostgreSQL/pgvector versions, and removes the container and volume on exit. Docker with Compose v2 is the only prerequisite.

All passwords in `docker-compose.yml` and `init-roles.sql` are explicitly local-only defaults for the ephemeral stack. They must not be reused outside local development. No external credential or persistent secret file is used.
