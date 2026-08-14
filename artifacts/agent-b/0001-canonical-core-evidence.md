# `0001_canonical_core` evidence

## Result

The migration, ephemeral PostgreSQL 16 + pgvector Compose stack, two-tenant seed, and database integration test harness are implemented. Static checks and the existing Git proof pass. The database suite could not be executed in this agent environment because no Docker-compatible runtime or PostgreSQL client/server is installed, so runtime completion criteria remain unproven rather than claimed as passing.

## Migration identity

- File: `migrations/0001_canonical_core.sql`
- SHA-256: `a74eb99518f705079400f97d04e29812366e11b743dd61297a8e4042ee3b827c`
- Sequence/version: `0001_canonical_core`
- Reproduction command: `npm run db:test`

The runner applies the migration with `ON_ERROR_STOP`, records the checksum in `schema_migrations`, reads it back for exact verification, and uses a transaction so a repeated application clearly refuses at the first already-existing enum without partially mutating the schema.

## Actual output in this environment

```text
$ npm run db:test

> engramport@0.1.0 db:test
> bash scripts/run-db-tests

scripts/run-db-tests: line 8: docker: command not found
```

PostgreSQL and pgvector versions are therefore unavailable in this environment. On a Docker-capable host, the final runner query prints `version()` and the installed `vector` extension version into the full test output.

```text
$ npm run proof:verify

> engramport@0.1.0 proof:verify
> node scripts/verify-log

✓ verified 4 events across 2 thread(s) and 2 actors
```

`git diff --check`, `bash -n scripts/run-db-tests`, and JSON parsing of `package.json` also completed without output/errors. The broader repository lint still reports two pre-existing errors in `packages/git-adapter/src/cli.mjs` and `packages/git-adapter/src/verify-log.mjs`; neither file was changed by this work.

## Assertions encoded by the suite

The SQL harness prints a `PASS` notice only after matching both the expected SQLSTATE and message/constraint fragment. It covers:

- cross-tenant event insert: `42501`, `row-level security policy`;
- application update/delete: `42501`, `permission denied`;
- migration-owner update/delete trigger: `55000`, `events is append-only`;
- duplicate idempotency tuple: `23505`, `events_principal_id_project_id_idempotency_key_key`;
- disabled principal and missing delegation: `23514`, explicit validation messages;
- nonexistent reply: `23503`, `events_in_reply_to_fkey`;
- short content and chain hashes: `23514`, their named check constraints;
- positive and negative chronological, UUID, GIN full-text, and GIN label reads under both tenant contexts;
- forced RLS on every included tenant table and `engram_app` being non-superuser and `NOBYPASSRLS`.

## Append-transaction controls still required

Schema controls do not replace section 8.1. The append transaction must still:

1. authenticate and set trusted tenant/principal session variables;
2. lock the project row and allocate the next gap-free `project_seq`;
3. resolve and compute the previous/current project chain hashes and canonical content hash;
4. validate the complete per-kind event schema, reply accessibility, reply/thread/project consistency, thread mode/strict-relay turn, signature/revocation state, and approval policy;
5. re-check actor delegation at the authorization boundary (the trigger is defense in depth);
6. compare a duplicate idempotency request's digest and return the existing event for identical bytes or `409 IDEMPOTENCY_CONFLICT` for different bytes;
7. insert recipients atomically with the event;
8. apply projection updates with optimistic version checks;
9. enqueue outbox work for embedding, delivery, and extraction in the same transaction;
10. commit all of the above atomically.
