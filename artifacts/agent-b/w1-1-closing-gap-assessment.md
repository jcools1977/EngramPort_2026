# W1-1 durable criterion and convergence assessment

Parent handoff: `01a0358c-6a98-70b7-8367-c6914a1977c3`

This is a reading only. It changes no implementation, migration, fixture, mutation, task record, or accepted control and claims no closure.

## Criterion 1: durable clause map

Criterion 1 is: “A session binds to an authenticated founder principal and carries scopes narrowed to setup with an absolute expiry” (`docs/plan/workspace-setup-wizard-tasks.md:44-46`). At the durable boundary, every clause other than establishment of the external authentication fact is implemented:

| Clause | Durable evidence | Reading |
|---|---|---|
| Bind the founder principal | `migrations/0019_w1_1_durable_setup_sessions.sql:36,43-55,77-81` derives the principal from transaction-bound `app.principal_id`, resolves its live datastore authority, and stores the resolver principal. The caller-asserted founder parameter at lines `28-32` is never read. RLS and the live read require the same bound founder at lines `22-26,96-100`. | **Satisfied conditionally at the datastore boundary.** The condition is that `app.principal_id` already represents an authenticated founder. Nothing here establishes that fact. |
| Carry only setup-narrowed scopes | `setup_scopes_only` at lines `5-9`, the column constraint at lines `11-15`, and creation refusals at lines `64-69` require a nonempty `setup:`-only subset of the resolved authority. | **Satisfied.** “Narrowed” is enforced as refuse-outside-the-ceiling, not silent rewriting: the stored set is the requested setup-only subset or no row is created. |
| Carry an absolute expiry | The relation requires `expires_at timestamptz NOT NULL` at lines `11-19`; creation takes the absolute timestamp at lines `28-33`, snapshots the database clock at line `40`, and refuses expiry beyond founder authority or `RET-SESSION` at lines `57-75`. The authorization read applies `expires_at>clock_timestamp()` at lines `85-107`. | **Satisfied.** The timestamp is absolute, bounded twice, database-clock evaluated, and non-live after expiry. |

There is therefore no additional missing *criterion-1 datastore clause*. Two things still prevent criterion 1 from being an end-to-end fact:

1. The external authentication layer is absent. `founderAuthenticator` only validates that a callback was injected (`packages/git-adapter/src/workspace-session.mjs:6-9`), and `start` trusts its returned `principal_id` (`:14-15`). There is no OIDC exchange/verifier, issuer/audience/signature/time/PKCE/state/nonce validation, or configured subject-to-principal mapping.
2. The verified identity, in-memory manager, transaction binding, and durable creation function are not composed. Repository call-site search finds `SetupSessionManager` only in its class definition and test imports, while every durable function invocation is also a database test. This reachability/convergence gap is not a missing datastore guard, but it is a missing end-to-end binding.

## What `SetupSessionManager` should become

**Wrap the durable boundary through a store abstraction while replacing the manager’s internal session-authority maps as the source of truth.** The public manager remains useful as the orchestration façade for authentication, plan approvals, named errors, and deterministic API behavior; replacing the whole class with raw SQL functions would discard that accepted behavior. Leaving it unchanged as a parallel “pre-durable path” would make the stronger boundary optional.

The target shape is:

1. `SetupSessionManager` depends on one `SetupSessionStore` contract for create, live read, inspect, complete, and abandon.
2. A production PostgreSQL store binds the verified principal and calls migrations 0019/0020. Every approval authorization consults the durable live session before returning authority.
3. The current maps become an in-memory **store adapter used by tests**, not a second production session implementation. Existing deterministic unit tests can remain against that adapter, while contract tests run the same semantics against PostgreSQL.
4. The durable terminal state is authoritative. Even if process-local approval cleanup is interrupted, the next execution must re-read the durable session and refuse, so local state cannot resurrect authority.

This is “wrap” at the API boundary and “replace” at the authority-storage boundary. It must not be implemented as best-effort dual writes between the existing maps and PostgreSQL: no transaction can make those two stores atomic.

Leaving both implementations independent creates five concrete risks:

- **Bypass:** production composition can accidentally choose the in-memory path and evade C17/C6.
- **Semantic drift:** scope, expiry, terminal state, and refusal codes can diverge while each suite stays green against its own implementation.
- **Split-brain teardown:** PostgreSQL can be terminal while an in-memory approval remains usable, or memory can tear down while a durable row remains live-looking.
- **Identity mismatch:** the callback’s string principal can differ from the principal bound into the privileged database transaction.
- **False evidence:** tests can prove the manager while deployment uses SQL, or prove SQL while execution still authorizes from the manager maps.

## Complete remaining-gap list

The following is the conservative closing checklist before W1-1 can be presented for task closure. It distinguishes accepted per-boundary evidence from missing composition rather than reopening accepted controls.

1. **Criterion 1 — external authentication:** implement the founder identity adapter and production composition that verifies an OIDC result and maps the verified issuer/subject to a canonical principal without accepting a caller assertion. Synthetic signed-token verification can prove verifier logic; proving the configured real issuer, client, redirect, account mapping, and exchange requires DeVere’s authorization.
2. **Criterion 1 — convergence:** connect that verified principal to the privileged transaction binding and migration 0019 creation boundary. Today neither session implementation has a production call site, and they do not call one another.
3. **Criterion 2 — integrated inventory:** accepted evidence separately shows the in-memory manager creates no wizard principal/actor (`workspace-session.mjs:13,21-26`; `workspace-session.test.mjs:11,13-15,20`) and the durable relation has no actor column (`migrations/0019_w1_1_durable_setup_sessions.sql:3-20`). After convergence, one end-to-end inventory/residue test must prove the composed path creates no standing wizard identity and leaves none after every terminal path. This is an integration-evidence gap, not a discovered schema defect.
4. **Criterion 3 — durable execution refusal:** the in-memory manager produces named `SESSION_EXPIRED`, `SESSION_REVOKED`, and replay refusals (`workspace-session.mjs:17,23-25`; `workspace-session.test.mjs:14,16`). The durable live read correctly returns no row for expired or terminal authority (`migrations/0019_w1_1_durable_setup_sessions.sql:85-107`) but no approved-step execution path consults it, and an empty result does not itself distinguish a named expired versus revoked outcome. The composed manager/store must translate durable state into the accepted named refusal before authorizing a step.
5. **Criterion 4 — no behavioral gap in the accepted scope:** agent-a’s parent event closes criterion 4 on atomic durable completion/abandonment, irreversible terminal state, immediate live-read refusal, and zero residual authority. Integration must preserve that source-of-truth rule, but this assessment does not reopen the closure. External IdP exchange-transient handling remains part of the external-authentication work, not a defect in the accepted datastore teardown.
6. **Criterion 5 — composed negative controls:** all four controls exist for the in-memory manager (`tests/workspace-session.test.mjs:14,16-17,20`). Durable tests prove expiry and terminal reads but never create or execute an approved step. After convergence, repeat expired execution, terminal/revoked execution, cross-session approval use, and replay after durable teardown through the composed path, with the same named outcomes and paired positives.
7. **C6 requirement 2 / C17 gate:** the sweep mechanism exists, but no recurring server-side schedule invokes it. Agent-a’s parent event correctly holds C6 and C17 open until the separate deployment decision installs a schedule or records a managed-platform obligation with enforceable evidence. This assessment does not choose or implement either option.

The minimal closure path is therefore: decide and evidence the recurring sweep; converge the manager onto one durable store; add composed criterion 2/3/5 evidence; implement the synthetically testable identity-verifier layer; then obtain separately authorized real-provider establishment proof if the task is intended to assert the authentication fact rather than carry it as an explicit precondition.

## Quoted accepted baseline and scope

No suite, fixture, mutation, or control was executed for this assessment. The parent’s accepted baseline is quoted, not re-run: `db:test` exit 0 in 280 seconds with 83 controls and mutation harness `executed=63`; separate negative harness exit 1; `npm test` 235 passed and 0 skipped; `kms:test` and lint exit 0; container and volume deltas zero.

The required `npm run proof:verify` exited 0 at 229 events across 31 threads before publication. Files changed in this slice: this single assessment artifact and its event only. Accepted-control changes: none. New simulator: none. Migrations 0001 through 0020, production code, tests, scripts, revision 8, row 3.16/F18, prior events, and historical artifacts are unchanged. `executed=` remains quoted at 63. W3, scheduling, OIDC, and AEGIS integration were not begun.
