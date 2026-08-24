# W1-1 durable setup-session creation/read slice

Parent handoff: `01a0353b-9db6-73ea-96ac-883c3afec1e6`  
ADR: `docs/adr/0020-durable-setup-session-delegation.md` (`478a5ab912cbfd8da09e3da56a3c94ce0868a32c06a99d9097bcdc54094c0542`)  
Migration: `migrations/0019_w1_1_durable_setup_sessions.sql` (`c0d0cc7bc392a008aa97b1d43b094778cfc1da7a070bfe678f3a5f319ba4bc2f`)

## Landed boundary

- Added the dedicated `setup_session_delegations` relation with session key, derived founder principal, nonempty `setup:` scopes, absolute expiry, terminal state/timestamp, and database creation time. It contains no actor field.
- Left `actor_delegations` and `agent_sessions` unchanged. The accepted 0016 and 0018 migration digests remain `f979c4f693059c5a70339882cec520c45be673e37d0aa6a816db5bc232f1abb3` and `a4db0484ab674212397842bdb71552910620df09f83601420acd2815faed4644`.
- `create_setup_session_delegation` ignores the asserted founder and stores the principal derived from `app.principal_id`. It reads `resolve_founder_authority` and `RET-SESSION` inside the creating transaction.
- The boundary refuses non-setup scope, scope beyond authority, expiry beyond authority, and expiry beyond the database-clock 24-hour retention ceiling before insert, with distinct outcomes and zero residue.
- `read_live_setup_session_delegation` returns only a session owned by the bound founder while the session is nonterminal and unexpired and the founder authority is live and unrevoked. All time comparisons use `clock_timestamp()`.
- The relation forces RLS. Both functions are `SECURITY DEFINER` with `search_path=public`; PUBLIC and `engram_app` cannot execute them, `engram_maintenance` has only function execution, and neither application role has direct table access.

## Live evidence

```text
W1_1_CREATE positive=accepted derived=true live=1 no_actor=true boundary=true
W1_1_READ expired=0 terminal=0 authority_revoked=0 db_clock=true
W1_1_CREATE nonsetup=SETUP_SESSION_SCOPE_NOT_SETUP landed=0
W1_1_CREATE scope=SETUP_SESSION_SCOPE_EXCEEDS_AUTHORITY landed=0
W1_1_CREATE authority_expiry=SETUP_SESSION_EXPIRY_EXCEEDS_AUTHORITY landed=0
W1_1_CREATE retention=SETUP_SESSION_RETENTION_EXCEEDED landed=0
```

## Mutation evidence

```text
W1_1_SETUP_NONSETUP baseline=0 table_only=1 boundary_only=0 applied=t combined=1 forbidden=t restored=0
W1_1_SETUP_SCOPE baseline=0 applied=t after=1 forbidden=t restored=0
W1_1_SETUP_AUTHORITY_EXPIRY baseline=0 applied=t after=1 forbidden=t restored=0
W1_1_SETUP_RETENTION baseline=0 applied=t after=1 forbidden=t restored=0
D1 mutation harness: all controls discriminate (executed=55)
NOOP baseline=0 applied=f after=0 restored=0
NOOP false discrimination correctly rejected
```

The non-setup property is deliberately measured as a two-layer control. Removing only the creation guard reaches the table constraint and fails the named-outcome fixture; removing only the constraint leaves the named boundary refusal; removing both admits the forbidden row. It counts once.

## Verification

- `npm run db:test`: exit 0; 83 existing SQL controls green; D2 7/7, W1-7 13/13, D4 4/4, W1-8 1/1 + creation + G1-G14, W1-1 1/1; mutation harness 55/55.
- `bash scripts/run-d1-mutation-harness --negative`: expected exit 1 with the no-op correctly rejected.
- `npm test`: exit 0, 235 tests, 0 failures/skips.
- `npm run kms:test`: exit 0; live Vault differential 1/1 and nonexportability check passed.
- `npm run lint`: exit 0.
- `npm run proof:verify`: exit 0 before consumption and after verification, 223 events / 31 threads before this reply.
- `git diff --check`: exit 0.
- Cleanup evidence: W1-7's measured container/volume/temp-path deltas were `0/0/0`; the final repository-wide residue check found `0` compose containers, `0` compose volumes, and `0` mutation temp paths.

## Disposition held

This slice closes nothing. C17 and W1-1 criteria 1 and 4 remain unclaimed; the trusted-session/external-authentication precondition remains. Teardown, expiry sweep, OIDC adapter, W3, and AEGIS work are untouched. Threat-model revision 8 is not edited; row 3.16's new staleness is carried under F18.
