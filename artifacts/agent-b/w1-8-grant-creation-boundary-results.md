# W1-8 grant-creation boundary results

## Scope and outcome

This bounded slice adds the grant-write boundary required by A6 before the deferred G1–G14 invocation evidence can be attempted. Migration `0018_w1_8_grant_creation_boundary.sql` is forward-only and preserves migrations 0001–0017. `create_invocation_grant` is a pinned `SECURITY DEFINER` function executable by `engram_maintenance`, not by PUBLIC or `engram_app`; maintenance retains no direct INSERT privilege on `invocation_grants`.

The function takes its granter from transaction-bound `app.principal_id`, derives the unique tenant/project membership, and reads authority from section 7's `resolve_founder_authority` inside the creating transaction. Its caller-asserted `granted_by_principal_id` argument is deliberately not used as authority. The derived resolver principal is the value stored.

Before either the context row or grant row is inserted, requested scopes must be contained by the resolved authority and requested expiry must not outlive it. The two datastore outcomes are distinct:

```text
GRANT_SCOPE_EXCEEDS_AUTHORITY
GRANT_EXPIRY_EXCEEDS_AUTHORITY
```

No actor/session requirement was added. This slice does not attempt G1–G14 and does not claim A6, B9, or G11.

## Live evidence

The paired positive supplied `22000000-0000-0000-0000-000000000002` as the caller-asserted granter while the transaction was bound to `11000000-0000-0000-0000-000000000001`. The created row stored the bound/resolved principal and then resolved successfully through the existing `PostgresInvocationStore`:

```text
W1_8_CREATE positive=accepted derived=true resolved=accepted rls_wrong=0 rls_right=1 boundary=true
W1_8_CREATE scope=GRANT_SCOPE_EXCEEDS_AUTHORITY landed=0
W1_8_CREATE expiry=GRANT_EXPIRY_EXCEEDS_AUTHORITY landed=0
```

`landed=0` counts the context registry row, which is inserted before the grant row; therefore it proves statement rollback left neither row after each refusal.

The RLS measurement is now explicit. A direct maintenance SELECT with the wrong bound tenant/project sees zero rows, and the same SELECT with the correct bound context sees one. This establishes forced RLS as defence in depth against raw or misbound reads. It does not credit RLS for the normal store's invocation-isolation comparison: `bind_invocation_grant_context` derives the RLS context from the requested grant itself, so tenant/project/principal/actor comparisons remain the operative invocation controls.

## Discriminating mutations

Each new refusal was removed independently from the live stored function. Each baseline refused, the mutation marker was observed, the forbidden grant landed, and rebuilding restored refusal:

```text
W1_8_CREATE_SCOPE_CEILING baseline=0 applied=t after=1 forbidden=t restored=0
W1_8_CREATE_EXPIRY_CEILING baseline=0 applied=t after=1 forbidden=t restored=0
D1 mutation harness: all controls discriminate (executed=38)
```

The count moved from 36 to 38 only after both mutations executed and observed forbidden acceptance. The separate negative control behaved as required:

```text
NOOP baseline=0 applied=f after=0 restored=0
NOOP false discrimination correctly rejected
```

## Carried findings

The inert production binding in `resolveInvocation` was restored from `let g` to `const g`. The existence mutation anchor changed in the same patch: its mutated copy deliberately changes `const` back to `let` because the mutation must assign the descriptor fallback. This is an accepted-control source correction with no behavioral weakening; `W1_8_LIVE_EXISTENCE` remained discriminating and restorative.

No simulator was added. All new evidence uses live local PostgreSQL roles, policies, stored functions, rows, and the existing production store.

## Verification observed

- `npm run verify:all`: exit 0.
- `npm test` within `verify:all`: exit 0; 235 passed, 0 skipped.
- `npm run db:test` within `verify:all`: exit 0; 83 database controls; D2 7/7, W1-7 13/13, D4 4/4, W1-8 store 1/1, W1-8 creation 1/1; mutation harness `executed=38`.
- `npm run kms:test` within `verify:all`: exit 0; live Vault differential 1/1 with `signer=live-vault`.
- `npm run lint` within `verify:all`: exit 0.
- `bash scripts/run-d1-mutation-harness --negative`: exit 1, expected.
- `npm run proof:verify`: exit 0 at 212 events, 30 threads, and 2 actors before the result event.
- `git diff --check`: exit 0.
- Cleanup: compose containers 0, compose volumes 0, `.d2-mutations.*` directories 0.

Threat-model revision 8, its digest, the F18 stale A6-owner row, task registry, migrations 0001–0017, prior events, and prior artifacts are unchanged.

## Implementation digests

```text
a4db0484ab674212397842bdb71552910620df09f83601420acd2815faed4644  migrations/0018_w1_8_grant_creation_boundary.sql
54bdccb5af8c8bb897265ed3a0c4af302be823f088e945bbde729a2cf0bdfa60  packages/git-adapter/src/credential-boundary.mjs
3fb4e3deea9ef6e911dcbeafcd648923e7765998bdfa96c55ca71476a0fadff0  tests/wizard-w1-8-live.test.mjs
e306e81410c3b34304d10a32cf1b8cb959f822578c52436941e9bf3d84b8f691  tests/failure/w1-8-mutations.txt
5f88eaa0e140b2bfb206e447089109df5cf29a56885acafff55345b5ce5ce97b  scripts/run-d1-mutation-harness
17a804bc1d43868d9a6029a9023250c3553871d62dbea7ce7bd83422c4896666  scripts/run-db-tests
```
