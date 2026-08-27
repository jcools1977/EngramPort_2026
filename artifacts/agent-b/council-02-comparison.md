# Council 02 — post-seal comparison and returned recommendation

Agent-b committed its independent recommendation as `9e0dbe4` before opening
agent-a's recommendation. Before that commit, I had not opened
`artifacts/agent-a/council-02-recommendation-sealed.md` or its Git history. I
opened it only afterward and verified its published sha256 as
`b8ac6b40d02ba3e3cc992221d2855df96c444e58633f56ff70b825d20e7b052a`.

## Q1 — substantive disagreement remains

Agent-a recommends elevating the existing caller-controlled event id and
treating `EEXIST` as success after comparing actor, thread, and type. Agent-b
recommends a distinct high-entropy retry credential whose digest selects an
atomic event locator, plus bindings to authenticated principal, actor scope,
and a canonical append-intent digest.

Agent-a's collision warning is correct, but its proposed equality test is
insufficient. Two requests can share actor, thread, and type while differing in
body, causal parent, target actor, artifacts, context, or completion criteria.
Returning the first event would still silently report the wrong append as a
success. Comparing the complete canonical intent fixes that ambiguity, but a
public event id still proves no caller identity or possession. The reveal
therefore strengthens rather than changes agent-b's Q1 recommendation.

The decision point is crisp: if “safe retry” means only same declared intent,
caller-controlled event ids plus full canonical comparison can implement it. If
it means the handoff's stronger requirement — evidence that a particular
caller's retry succeeded — retry possession and principal binding are required.
Agent-b recommends the stronger meaning because that is the challenge the
dispatch explicitly posed.

## Q2 — convergence, with one correction

Both recommendations choose version-1 envelope fields, preserve all historical
version-0 events without rewriting them, and reject ordinary new version-0
writes after cutover. Agent-b adds the missing completion-side rule: criteria
need stable ids and exact evidence coverage on completion, otherwise the system
can carry criteria while still accepting a completion that ignores them.

Agent-a's rejection of an artifact form because the file could be edited
independently is not exact: the existing artifact reference binds a sha256, so
an edit causes a digest mismatch. The stronger objection is structural. Today
the envelope cannot declare that an artifact is a context/criteria manifest,
bound its size and shape, or require a completion to cover every criterion. A
typed, digest-bound manifest could satisfy the design, but it would be an
explicit versioned envelope extension rather than a convention over the current
generic `artifacts` array.

## Q3 — one release, two independently testable semantics

Both recommendations avoid two mandatory writer migrations. Agent-a describes
the questions as coupled; agent-b does not. Retry identity applies to every
append, while bounded context and criteria alter handoff/completion meaning.
They should ship in one version-1 release under ADR 0040, but keep separate
contract sections, error codes, race tests, compatibility proofs, and mutations.

## Returned recommendation

Adopt version 1 with:

1. a retry-key digest, principal/actor scope, and canonical append-intent digest
   enforced through an atomic event locator;
2. typed and bounded context references;
3. uniquely identified completion criteria and exact digest-bound evidence
   coverage on completion;
4. permanent read/verify support for version 0, version-1-only live writes after
   cutover, and explicit superseding version-1 handoffs for still-open legacy
   work; and
5. two independent control families delivered in one schema-version release.

This remains a class-three product-semantic protocol change authorized in
principle by DeVere through ADR 0040. This council recommends the contract; it
does not enact it. No source, schema, protocol, copy, test, mutation, or runtime
behaviour changed, and `executed=` does not move.
