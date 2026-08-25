# C17 closure: independent refutation and supporting case

Parent handoff: `01a038f8-1fa9-7fb7-92ea-b7e736bb4423`

This is a reading, not a decision. It changes no implementation, migration, control, threat-model row, or accepted status. The current register already records DeVere's disposition at F71; this artifact supplies the still-missing strict-relay reasoning and neither reopens nor ratifies that decision.

## Exact gate and the two possible quantifiers

C17 says: *"Setup-session delegation derived from resolved authority, never caller-asserted; durable form satisfies constraint C6 before first durable delegation."* The traceability row marks it `[TEST-GATED]` and gates the transition `first durable delegation` (`docs/security/setup-credential-threat-model.md:528,550`).

The dispute is not primarily factual. It is which of these the gate quantifies over:

1. **Capability/test-gate reading:** a durable form exists and is proven to satisfy C6 before operational durable use is enabled.
2. **Current-system/operational reading:** the path the system would actually instantiate today is durable and its scheduled expiry control is currently operating.

The evidence satisfies the first reading. It does not satisfy the second.

## Strongest case against closure

### 1. The scheduled control is not currently scheduled

C6 requirement 2 is written as an ongoing operational property: tombstoning *"MUST be a server-side scheduled operation"* so an untouched workspace cannot retain live-looking authority (`docs/constraints.md:304-310`). The managed-target evidence proves that `pg_cron` invoked the sweep and that disabling the scheduler discriminates. But the same artifact says the job was **unscheduled after evidence collection** (`artifacts/agent-a/c6-scheduling-evidence.md:96`).

That makes the evidence excellent proof of a reproducible mechanism and a valid discriminator, but not proof that any target currently has the required operation enabled. On the strict operational reading, a past schedule is no more a current control than a past successful authorization read is a current live session.

This is the strongest objection missing from the parent list.

### 2. The production composition is absent and the safe store is opt-in

`SetupSessionManager` silently selects `InMemorySetupSessionStore` when `store` is omitted (`packages/git-adapter/src/workspace-session.mjs:28-33`). `PostgresSetupSessionStore` is real package code and calls all six durable functions (`packages/git-adapter/src/workspace-session-store.mjs:55-141`), so F56's former **zero package references** blocker is genuinely gone. But repository search still finds no non-test `SetupSessionManager` construction and no non-test `PostgresSetupSessionStore` use beyond its definition.

Therefore no deployment surface proves both of these together:

- setup sessions cannot accidentally take the memory fallback; and
- durable sessions cannot start unless the server-side scheduler is enabled.

The current default is a footgun, even though it is not a defect in the durable form itself. If closure will later be cited as “setup sessions are durable,” the citation would overclaim.

### 3. No one substrate carries all five C6 observations

C6 requirements 1, 3, 4, and 5 and the accepted database controls run on local PostgreSQL 16.15. Requirement 2's real scheduler evidence ran on PostgreSQL 17.6. The managed-target artifact explicitly refuses to claim the 83 accepted controls on 17.6 and says its fixture rows were planted directly rather than through the creation boundary (`artifacts/agent-a/c6-scheduling-evidence.md:91-95`).

The schema fingerprint makes composition of the two evidence sets reasonable, but it is still composed evidence: there is no single target/version on which the durable creation, every C6 read/introspection property, and the scheduler were exercised together.

This is a bounded coverage objection, not evidence of a version defect.

### 4. Literal chronology is adverse, but not a useful reading

Git history places the durable boundary at `7adad3e` (2026-08-24 15:44 EDT), scheduler evidence at `15881ec` (18:06), and package convergence at `1164e8c` (19:37). Durable fixture rows therefore existed before C6 requirement 2 closed.

If “before first durable delegation” includes development fixtures, the wording was violated. But that reading makes the gate practically unprovable: one must create durable test rows to demonstrate the datastore controls before authorizing operational use. The traceability column's `first durable delegation` transition is better read as first operational/deployed use, not the first synthetic row created while proving the gate.

### 5. The threat-model row contradicts a broad closure claim

Row 3.16 still says `Model C, in-memory today` (`docs/security/setup-credential-threat-model.md:69,233`). That is factually consistent with the absence of production wiring. Under the repository's established F18 discipline, however, a digest-pinned row can become stale and be carried explicitly rather than edited. The contradiction blocks a broad “the current deployed path is durable” claim; it does not by itself block a narrowly worded test-gate closure.

## Strongest case for closure

### Clause 1: derived authority, not caller assertion

- `SetupSessionManager.start` accepts only the authenticator's `principal_id`, resolves founder authority through the injected trusted resolver, checks setup-only scopes, containment, authority expiry, and absolute expiry, then delegates creation to its single selected store (`workspace-session.mjs:36-48`).
- The PostgreSQL store calls `create_setup_session_delegation` (`workspace-session-store.mjs:72-81`).
- The database function derives its principal from transaction-bound `app.principal_id`, reads `resolve_founder_authority` inside the creating transaction, and never reads its caller-asserted founder parameter (`migrations/0019_w1_1_durable_setup_sessions.sql:28-83`).

So the first clause is not merely adapter-deep; the datastore independently enforces it.

### Clause 2: the durable form satisfies C6

- Authorization reads exclude expiry in SQL.
- Introspection distinguishes expired from active.
- Expiry uses the database clock.
- Planted-expired negatives and paired live positives exist.
- A managed scheduler invoked the sweep without application traffic, with a scheduler-removal mutation separating scheduled operation from manual callability and stable tombstones across repeated runs (`docs/constraints.md:1897-1917`).
- Package convergence now routes the manager through the PostgreSQL boundary and re-reads durable liveness before approved execution (`workspace-session.mjs:60-85`; `workspace-session-store.mjs:84-109`).

On the `[TEST-GATED]` reading, that is the required evidence. A production caller is not a missing control; it is the transition the gate exists to precede. Likewise, the memory default creates only the accepted in-memory form and cannot create a *durable* delegation. Closing C17 can therefore be valid if the closure is explicit that production must configure the PostgreSQL store and scheduler before the first operational durable session.

### The five parent objections, disposed precisely

1. **Memory default:** blocker only under a current-system reading. Under the durable-form test gate, it is cleanup debt and a production configuration prohibition, not contrary evidence about the PostgreSQL form.
2. **Stale row 3.16:** factual debt carried under F18; it must travel with the closure, but revision 8's immutability makes later correction—not silent editing—the established remedy.
3. **Earlier durable rows:** adverse only if synthetic proof fixtures count as the gated transition. That reading is circular and inconsistent with `[TEST-GATED]`.
4. **17.6 versus 16.15:** prevents claiming full 17.6 control coverage. It does not erase the specifically discriminating scheduler observation, whose schema was fingerprint-matched, but it remains an evidence-composition limitation.
5. **No production caller:** means first operational use has not occurred. It strengthens the claim that the gate was proven beforehand; it weakens any claim about what the current application defaults to.

## What C17 closure does not discharge

C17 is delegation evidence downstream of an authenticated `principal_id`. It does not establish that a real identity provider vouched for the founder, that verified `(iss, sub)` reached the binder, or that the privileged session/GUC binding is trustworthy. Therefore all of these survive closure:

- W1-1 criterion 1's external-authentication fact;
- the trusted-session caveat on A6, A7, and A8;
- production configuration of the PostgreSQL store and scheduler;
- correction of row 3.16 in a future threat-model revision;
- the stated limitation that approval state remains process-local and fails closed after restart (approval durability is not C17's session-delegation authority claim).

## If the strict operational reading is selected

The single smallest evidence item that would change the answer is **one fail-closed deployment-composition control**: start the real application composition and prove it refuses to accept its first setup session unless (a) `PostgresSetupSessionStore` is explicitly configured and (b) the target reports the server-side sweep schedule enabled. One control binds the two currently separate facts and makes the memory default, absent caller, and unscheduled-job objections inapplicable without requiring a broader programme.

## Scope record

No implementation, migration, test, script, threat-model file, ADR, registry claim, or accepted event was changed. No mutation was run or added; the current harness count is not changed by this reading.
