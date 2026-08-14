# W1-1 evidence: bounded setup session

Implementation scope: W1-1 only. The implementation adds an in-memory, Node-only setup-session state machine, a founder-authentication interface, narrowed and expiring delegation, minimal session-bound step approval, and structural teardown. It performs no setup action and adds no provider, database, network, migration, grouped-approval, F2/F7, W1-2, Port Watch, Re:PORT, or onboarding behavior.

## Environment and reproduction

- Node: `v26.5.0`
- Focused command: `npm run session:test`
- Regression command: `npm run setup:test && npm run dry-run:test && npm run watch:test && npm run welcome:test && npm run db:static-test && npm run proof`
- Static checks: `npx eslint packages/git-adapter/src/workspace-session.mjs packages/git-adapter/src/workspace-setup.mjs tests/workspace-session.test.mjs && git diff --check`

No Docker, PostgreSQL, network, or secret is needed. The sole credential literal is named `fixture-only-founder-credential` and is asserted not to be retained.

## Focused output

```text
> engramport@0.1.0 session:test
> node --test tests/workspace-session.test.mjs

ok session binds authenticated founder with narrowed scopes and absolute expiry
ok approved step executes only within its live session
ok completion structurally removes identity, delegation, approval, and credential
ok expired session refuses approved execution and leaves no identity
ok torn-down session cannot authorize and replayed approval is refused
ok approval from session A cannot execute under session B
ok scope and expiry ceilings reuse W0 predicates
ok non-setup scope and unbounded session are refused
ok abandonment leaves no partial authority
ok state machine is deterministic under injected clock and ids
ok authenticator returns identity only and fixture credential is never stored
tests 11; pass 11; fail 0; skipped 0
```

## Acceptance-control mapping

| Contract | Negative assertion | Paired positive control |
|---|---|---|
| founder binding, narrowing, absolute expiry | non-setup scope -> `SESSION_SCOPE_NOT_SETUP`; null expiry -> `SESSION_ABSOLUTE_EXPIRY_REQUIRED` | authenticated founder starts an active, finite, narrowed session |
| live approval | absent/uncompiled/mismatched approval paths are refused | compiled `repository.connect` approval authorizes while live |
| structural completion teardown | `authorize` after completion -> `SESSION_REVOKED`; replay -> `APPROVAL_REPLAY_REFUSED` | live session has exactly one founder binding and delegation before completion |
| no standing wizard identity | post-teardown inventory asserts zero wizard principals, actors, bindings, delegations, and credentials | live inventory exposes a session binding/delegation but always zero wizard principals, actors, and credentials |
| expiry | execution at the absolute boundary -> `SESSION_EXPIRED` and deletes live authority | same approval executes before the boundary |
| torn-down/revoked | authorization -> `SESSION_REVOKED`; replay -> `APPROVAL_REPLAY_REFUSED` | same approval executes before teardown |
| session binding | approval A under session B -> `APPROVAL_SESSION_MISMATCH` | approval A under session A authorizes |
| founder ceiling | extra scope -> `SESSION_SCOPE_EXCEEDS_FOUNDER`; later expiry -> `SESSION_OUTLIVES_FOUNDER` | subset scope and equal founder expiry succeed |
| abandonment | replay -> `APPROVAL_REPLAY_REFUSED`; inventory is authority-empty | ordinary live session authorizes before teardown |
| determinism | no wall clock or random IDs enter the fixture | two identical event sequences deep-equal in all public results |

The founder ceiling is not duplicated: `grantOutlives` and `scopesExceed` are exported from the W0 compiler and used by both W0 and W1.

## Regression output

```text
setup:test       tests 21; pass 21; fail 0
dry-run:test     tests 6;  pass 6;  fail 0
watch:test       tests 16; pass 16; fail 0
welcome:test     tests 19; pass 19; fail 0
db:static-test   tests 6;  pass 6;  fail 0
proof:verify     verified 28 events across 10 threads and 2 actors
proof:test       tests 11; pass 11; fail 0
targeted ESLint  pass
git diff --check pass
```

Database behavior is not claimed or required by W1-1.

## Manual inspection and design findings

The authority-bearing object is the private live-session record. Completion, abandonment, or expiry deletes that entire record, including its founder binding, delegation, and approval map. The only survivors are an authority-free tombstone (`session_id`, terminal status, `authority: false`) and opaque revoked approval IDs. Credentials never enter the stored record. Thus the no-standing-identity property is structural within this component: post-teardown authorization cannot find an identity or delegation to use, rather than finding one and consulting a revoked flag.

The design remains fail-closed across process loss because all live authority and approvals are in memory; a restart preserves neither. A future durable/provider-backed implementation must preserve this shape with atomic authority deletion and server-enforced expiry. The current result deliberately makes no claim about that future store, real OIDC credentials, or real setup execution.
