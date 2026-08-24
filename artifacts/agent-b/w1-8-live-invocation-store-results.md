# W1-8 first-slice results: live invocation store

## Scope and outcome

The injected invocation store is now backed by real PostgreSQL grant and custody rows. `resolveInvocation` executes through `PostgresInvocationStore` in one read-only transaction. Grant context is derived from the trusted grant-context registry, not from a caller-supplied tenant/project authority literal, and `serverNow()` executes `SELECT clock_timestamp()` on the same transaction client that reads the grant, session, and custody rows.

This is the dispatched foundation slice only. A6 and B9 are **not claimed**, and G1 through G14 remain deferred.

## Reading-first finding

D4's session/actor requirements apply to `mint_custody_reference`; they are not required to read custody rows for invocation. The live positive fixture resolves a real custody reference without injecting mint-session or mint-actor context. The store derives tenant/project from the live grant row, derives principal context from that same trusted row for session RLS, and never sets actor context.

A forward-only migration was genuinely required because migrations 0001 through 0016 contain custody tables but no grant table. Migration `0017_w1_8_live_invocation_store.sql` adds:

- a non-readable opaque grant-context registry used only by a pinned `SECURITY DEFINER` binder;
- a forced-RLS `invocation_grants` table with tenant/project, principal/actor, scope, expiry, revocation, custody-reference, event, and RET-GRANT-400 fields;
- a trusted live-granter predicate over `founder_authorities`;
- least-privilege ACLs: `engram_app` cannot read the grants or execute the helpers, while `engram_maintenance` can read the RLS-protected grants and execute only the helpers.

An initial local attempt linked grant reference columns to `minted_references`. The first database run showed that even an empty referencing table made accepted custody-only `TRUNCATE` controls illegal. Those unnecessary foreign keys were removed; the resolver already checks live custody existence and revocation. The final suite preserves every historical cleanup path.

## Live fixture

`tests/wizard-w1-8-live.test.mjs` creates synthetic principals, actors, a real custody row/reference, a real grant context, and a real grant. The positive result was:

```text
W1_8_LIVE positive=accepted custody=real grant=real transaction=one boundary=true
```

The focused cases prove live grant existence, tenant ownership, project ownership, principal comparison, actor comparison, scope comparison, expiry against database time, and revocation observed after descriptor issuance at invocation time. No synthetic store is imported or wrapped by this fixture.

## Executable mutations

Every new property was mutated in a source copy, with its anchor verified applied, forbidden acceptance (or false database clock) observed, and the shipped source re-run after restoration:

```text
W1_8_LIVE_EXISTENCE baseline=0 applied=t after=1 forbidden=t restored=0
W1_8_LIVE_TENANT baseline=0 applied=t after=1 forbidden=t restored=0
W1_8_LIVE_PROJECT baseline=0 applied=t after=1 forbidden=t restored=0
W1_8_LIVE_PRINCIPAL baseline=0 applied=t after=1 forbidden=t restored=0
W1_8_LIVE_ACTOR baseline=0 applied=t after=1 forbidden=t restored=0
W1_8_LIVE_SCOPE baseline=0 applied=t after=1 forbidden=t restored=0
W1_8_LIVE_EXPIRY baseline=0 applied=t after=1 forbidden=t restored=0
W1_8_LIVE_REVOCATION baseline=0 applied=t after=1 forbidden=t restored=0
W1_8_LIVE_CLOCK baseline=0 applied=t after=1 forbidden=t restored=0
D1 mutation harness: all controls discriminate (executed=36)
```

The count moved from 27 to 36 only after all nine mutations executed. The separate no-op negative exited 1:

```text
NOOP baseline=0 applied=f after=0 restored=0
NOOP false discrimination correctly rejected
```

## Verification observed

- `npm run verify:all`: exit 0.
- `npm test`: exit 0; 235 passed, 0 skipped.
- `npm run db:test`: exit 0 inside `verify:all`; D2 live 7/7, W1-7 live 13/13, D4 live 4/4, W1-8 live 1/1, mutation harness `executed=36`.
- `npm run kms:test`: exit 0 inside `verify:all`; live Vault differential 1/1 with `signer=live-vault`.
- `npm run lint`: exit 0 inside `verify:all`.
- `bash scripts/run-d1-mutation-harness --negative`: exit 1, expected.
- `npm run proof:verify`: exit 0 at 208 events, 30 threads, and 2 actors before the result event.
- `git diff --check`: exit 0.
- Cleanup measurements: compose containers 0→0, compose volumes 0→0, `.d2-mutations.*` directories 0→0.

New simulator: none. The new path is a live local-PostgreSQL fixture using synthetic identities and rows.

Accepted-control changes: none. Migrations 0001 through 0016, revision 8, seeds, prior events, historical artifacts, and the digest-pinned threat model are unchanged.

## Implementation digests

```text
dff9332d3cfc6d9165b58e3fc4fb634c30018e3ef6886014fe1c8379d28dc7fc  migrations/0017_w1_8_live_invocation_store.sql
36ee6d8442f2a994e3ca23f74bbcb0ff1bd57e80334867331f07188dd725ef15  packages/git-adapter/src/credential-boundary.mjs
e5555083c97b177c9acab505be0c3c70e666c1d68bf2ce97545201e35162b6f6  tests/wizard-w1-8-live.test.mjs
a8eca53915275865306d3eff4e689d10da586dfb92aa3e4c4193f1a27f108f5a  tests/failure/w1-8-mutations.txt
63659516bd3201a7751d9f6daa31e811745695a2164310b297bbf263269319ea  scripts/run-d1-mutation-harness
e855680c7e161bcb3c462ada470372e47c83a96f2dc67493cc9d9aea05e51860  scripts/run-db-tests
```
