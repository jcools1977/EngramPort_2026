# Synthetic second-builder end-to-end evidence

## Outcome

The bounded synthetic exercise succeeded, and the abuse case succeeded too.

A second builder was represented by a synthetic external identity, one-shot founding authorization, tenant binding, registered Git actor, and SDK client. The database side reused `issue_founding_authorization` under `engram_bootstrap_operator` and `resolve_founder_principal`; no second issuer or enrollment mechanism was added. The Git exercise used the public `@engramport/sdk` surface to append, discover addressed work, receive a version-1 handoff, and return a completion with exact criterion coverage.

This is not a real enrollment product. The external identity, principal, binding, and actor registry were established directly in test fixtures because the repository has no package, CLI, or hosted onboarding path that creates them.

## Enrollment path exercised

The live PostgreSQL test performed these steps:

1. Seeded a synthetic `founder_external_identities` row through the schema fixture.
2. Changed to the existing `engram_bootstrap_operator` role and invoked the existing `SECURITY DEFINER` `issue_founding_authorization` function.
3. Used `engram_maintenance` to consume that authorization through `resolve_founder_principal`.
4. Established the reserved principal and `founder_tenant_bindings` row through the schema fixture, then resolved the persistent binding.
5. Verified the authorization was consumed, the bootstrap operator retained `EXECUTE`, and `engram_app` did not gain issuer authority.

The observed live line was:

`SECOND_BUILDER_ENROLLMENT identity=schema-seeded issuer=bootstrap-operator authorization=consumed binding=schema-established package_path=absent`

## Public SDK round trip

`tests/second-builder.test.mjs` created independent `builder-one` and `builder-two` actor records in a fresh Git fixture, then used only the SDK client surface for the work round trip:

- `builder-two` appended its first event;
- `builder-two.inbox()` initially returned no work;
- `builder-one.handoff()` addressed a bounded version-1 handoff to `builder-two`;
- `builder-two.inbox({ entries: true })` discovered that exact handoff;
- `builder-two.complete()` returned the only strict-relay child with a satisfied `round-trip` criterion and event evidence;
- the answered handoff disappeared from builder two's derived inbox;
- the emitted child was verified as `type: completion`, `from: builder-two`, and causally linked to the handoff.

The observed line was:

`SECOND_BUILDER_SDK append=accepted inbox=discovered completion=accepted impersonation=accepted disposition_read=accepted disposition_write=accepted`

## Abuse results: F111 is concrete

Builder two can author as builder one. A caller acting as builder two instantiated `createClient({ actor: "builder-one" })` and successfully appended an event whose accepted envelope says `from: builder-one`. The SDK accepts a caller-selected actor string; the registry check proves only that the selected actor's event directory exists. There is no authenticated caller-to-actor binding in the SDK or Git writer.

Nothing in this path stopped the impersonation. Repository hosting controls may stop an unauthorized Git push, but they do not let the accepted event prove which builder supplied it.

Builder two can also read and write builder one's disposition/control state when it can reach the shared store:

- Using the exported `FileWatchStore` with builder one's file path, it read builder one's enabled watch and changed its status to `stopped`.
- Using a second `engram_app` PostgreSQL connection and the exported `PostgresClaimStore`, it read builder one's active claim and revoked it without the run id or lease token. The SQL functions take caller-supplied `agent` and `project` strings and have no builder subject binding.

The observed live PostgreSQL line was:

`SECOND_BUILDER_POSTGRES_CLAIM read=accepted revoke=accepted subject_binding=absent`

This slice deliberately does not fix either boundary. The result scopes the next work: accepted Git authorship and work-disposition operations need a verified builder subject mapped to the actor they claim to control.

## Exact onboarding state

A newcomer would currently have to do all of the following:

1. Arrange for an operator to create or import an external identity row. No repository package or command provides this.
2. Arrange for an operational holder of the dormant `engram_bootstrap_operator` role to call `issue_founding_authorization`. The SQL boundary exists; the checked-in role is `NOLOGIN`, and no operational invoker is provided.
3. Have maintenance consume the authorization and establish a principal plus tenant binding. Resolution and schema exist; a complete enrollment transaction or user-facing command does not.
4. Add an actor record and its event/artifact prefixes in an authorized reviewed commit. The repository verifies registered structure and local registry drift, but it does not enroll the actor or establish registry integrity against an authorized writer.
5. Obtain repository write access, branch-protection approval, and any signed-commit policy outside this mutable tree. The SDK grants none of these.
6. Use the SDK from this monorepo workspace. `@engramport/sdk` remains private and unpublished, so there is no external install path.
7. Configure the control stream if portable claim exclusion is required, then run proof verification and an append/inbox/handoff/completion check.

The repository therefore supplies schema primitives, issuer/resolver functions, actor/log verification, the private SDK, and tests. It does not supply newcomer onboarding, real identity enrollment, an SDK caller-to-actor binding, a published SDK, or hosted control-stream deployment.

## Files and discriminating proof

- `tests/second-builder.test.mjs` covers the SDK round trip, actor impersonation, and file disposition read/write.
- `tests/second-builder-live.test.mjs` covers the existing issuer/operator enrollment primitives and cross-builder PostgreSQL claim read/revoke.
- `scripts/run-db-tests` runs the live exercise after migrations 0001 through 0025.
- `SECOND_BUILDER_COMPLETE_PATH` changes the SDK completion method into a plain reply in an isolated variant. The second-builder test fails, restoration passes, and the mutation harness moved from the observed `executed=146` to `executed=147`.

Final gates:

- `npm run second-builder:test` — pass, 1/1.
- `npm run db:test` — pass, including both second-builder live tests and `D1 mutation harness: all controls discriminate (executed=147)`.
- `npm test` — pass after running with Docker access required by the existing canary.
- `npm run kms:test` — pass, including the live Vault differential.
- `npm run lint` — pass.
- `npm run proof:verify` — pass at 415 events, 72 threads, and 3 actors before this completion is appended.
- `git diff --check` — pass.

No migration was added or edited. `git diff` is empty for `migrations/`, and migrations 0001 through 0025 remain the executed set. No real identity, npm publication, site copy, hosted deployment, or F111 fix was attempted.
