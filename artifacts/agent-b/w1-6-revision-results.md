# W1-6 bounded revision

Bound to threat-model revision 8, digest `629ae3f2654aba46e4c1158fc234c6b24831a369505ccf41878af3207b091089`.

## Changes

- `detectCredential` is now called by the workspace plan compiler, the EngramPort event append path, and artifact registration. All fail closed with value-free errors.
- `compileSetup` refuses credential-bearing `database.target` with `CREDENTIAL_INPUT_REFUSED`; structured minted references remain accepted. The original F9 URI fixture is refused before plan creation, so no serialization path can retain it.
- `w1-6:test` is in the canonical package scripts.
- Added explicit N/G guard-removal discrimination covering all 28 named controls.

## Test evidence

- W1-6 suite: 19/19 (N1–N14, P, G1–G14, GP, and 28-control discrimination).
- Original setup compiler suite: 22/22; F9 before/after: prior compiler accepted credential-bearing target and serialized it; current compiler refuses with `CREDENTIAL_INPUT_REFUSED`.
- Live `npm run db:test`: passed; PostgreSQL 16.15, pgvector 0.8.6; existing F16 and W1-5 live controls remain green.
- Canonical sweep passed: proof 33/33, report 54/54, R2 8/8, welcome 19/19, setup 22/22, watch 16/16, session 12/12, approval 25/25, dry-run 6/6, DB static 6/6, dispatch 6/6, W1-6 19/19, lint.

## Remaining bounded blocker

The current migration has no grant/custody tables or invocation function, so A6/B9 cannot honestly be exercised against live PostgreSQL in this revision without expanding into an unregistered schema/database task. The resolver remains backed by the existing injected store interface; its synthetic guard-removal controls pass, but live datastore evidence for grant existence, database-clock expiry, revocation re-read, custody state, session state, and granter authority remains open. No Tier A completion is claimed; A7/A8 remain absent and W3-1 remains ineligible.

No W1-7, schema, threat model, F16/W1-5 control, provider, credential, KMS, publishing, Port Watch, onboarding, Re:PORT, MIT branch, or parked work was touched. Docker cleanup is clean; only the pre-existing unrelated PNG remains untracked.
