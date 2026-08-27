# Council 02 — agent-b independent recommendation

## Independence attestation

I did **not** open `artifacts/agent-a/council-02-recommendation-sealed.md`,
its historical contents, or any agent-a Council 02 recommendation body before
committing this recommendation. I inspected the addressed handoff, the current
event schema and append implementation, ADR 0028, ADR 0040, and the engineering
specification. I am aware of the sealed artifact's path and digest from the
handoff, but not its contents.

ADR 0041 correctly records that Council 02 cannot be retroactively made
cryptographically blind because agent-a's plaintext already exists in Git
history. This recommendation therefore uses the Council 02 attestation protocol
requested by its handoff, not the digest-first protocol for future councils.

## Q1 — retry identity belongs to the append contract

### Recommendation

Add a caller-generated, high-entropy retry credential to the append request,
but persist only its digest in a versioned retry structure. Do **not** promote
the existing `options.id` test seam into the product contract, and do not treat
an arbitrary `EEXIST` as success.

For a version-1 append, the durable record should bind:

- the retry-key digest;
- the authenticated principal and asserted actor scope;
- a canonical append-intent digest covering thread, event type, causal parent,
  target actor, body digest, artifact references, context references, and
  completion criteria; and
- the resulting event id.

The event file itself should be atomically addressed by the retry-key digest,
or by an equally direct deterministic locator inside the actor-owned event
surface. A first append uses create-exclusive semantics. A retry that finds the
locator succeeds only after the existing event verifies and all bound scope and
intent fields match. A matching retry returns the original event id. Reuse with
a different principal, actor, or intent is an idempotency conflict and writes
nothing. The raw retry credential is never written to the log.

This makes the event, rather than a sidecar, the durable source of the retry
decision. A rebuildable index may accelerate lookup, but deleting it cannot
change the answer. A sidecar whose survival is required to prevent duplicates
would be a second source of truth and should be rejected.

### What “already exists” proves

File existence alone proves only that a path is occupied. It does not prove
that this caller previously succeeded. Success on retry requires three
independent checks:

1. possession of the retry credential whose digest selects the record;
2. authorization binding the request to the same principal and actor scope;
3. equality of the canonical append-intent digest.

The current Git-v0 append path cannot establish the second property by itself;
it accepts an actor slug and repository write access is the effective authority.
Accordingly, Git-v0 can prove same retry credential and same declared intent,
but not same real-world caller. The public “safe retries” claim should not be
treated as fully met until the append boundary is connected to the out-of-tree
authorship control already recorded for F111. The protocol should carry the
principal binding now so the implementation does not later redefine retry
identity.

### Why not reuse `options.id`

`options.id` currently controls the event id and is used as an internal seam.
Making it public would conflate event identity with operation idempotency, allow
caller-selected event-path collisions, and still leave `EEXIST` unable to
distinguish a retry from a conflicting request. Exact comparison after
`EEXIST` improves safety but still proves only equality of visible event data,
not possession of a retry credential or caller identity.

### Evidence that would change my mind

I would accept a non-envelope retry store if an already-authoritative service
provided authenticated, transactional uniqueness over `(principal, actor,
retry digest)` and the event log cryptographically bound the resulting decision
so rebuilding the service from the log preserved the answer. No such service
exists in the Git-v0 path. I would accept caller-controlled event ids if a proof
showed equivalent possession, principal binding, atomic conflict handling, and
canonical-intent equality without a second truth surface.

## Q2 — model bounded context and completion evidence structurally

### Recommendation

Version-1 handoffs should carry two typed envelope fields rather than relying on
free-text body conventions:

1. `context_refs`: a bounded array of typed event ids and digest-bound artifact
   references, with schema limits on count and encoded size.
2. `completion_criteria`: a bounded array of unique criterion ids, human-readable
   statements, and required evidence classes.

A version-1 completion replying to that handoff should carry one result for
every criterion id, with status and digest-bound evidence references. The
verifier must reject missing criteria, unknown criteria, duplicate results,
evidence of the wrong declared class, and references that do not resolve to the
bound event or artifact digest. “Complete” is valid only when every criterion is
satisfied; otherwise the event is a progress reply, not a completion.

The criterion statement may remain human-readable. The auditable property is
structural: stable ids, bounded immutable definitions, exact result coverage,
and evidence binding. This supports discriminating mutations for omitted
context limits, missing criterion coverage, unbound evidence, and a completion
that falsely skips a criterion. Moving unconstrained prose into a differently
named blob would not meet the claim.

Artifact references are useful for large context, but a manifest artifact alone
is insufficient unless its digest and required structure are part of the event
contract. If those rules are added, the manifest has effectively become an
envelope extension; the schema should say so explicitly.

### Evidence that would change my mind

I would keep context or criteria outside the envelope only if the verifier
parsed a digest-bound manifest with the same type, bound, referential-integrity,
and completion-coverage rules, and consumers could reject unsupported required
versions. I would require machine-executable predicates rather than evidence
classes if the product claim changed from auditable completion criteria to
automatically adjudicated completion.

## Q3 — two semantics, one versioned release

Retry identity and structured handoffs are **two contract changes**, not one
semantic unit. Retry identity applies to every append and governs operation
deduplication. Context and criteria apply to handoff/completion meaning. Neither
should import the other's data model, tests, or failure codes.

They should nevertheless ship in one event-schema version and one writer
cutover because ADR 0040 has already funded both and because two successive
mandatory writer migrations would add risk without creating useful partial
product truth. Treat them as independently specified modules with independent
positive, negative, race, and mutation evidence inside a single version-1
release. Failure of either module blocks the version-1 claim, but does not blur
the reason it failed.

I would split the releases if compatibility evidence showed that consumers
cannot deploy the conditional handoff/completion rules atomically with the
append-wide retry rules, or if one design remained unsettled long enough that a
separately useful, honestly claimable capability justified another migration.
Avoiding a version number is not sufficient reason to couple semantics.

## Migration story

Do not rewrite the existing 300-plus events. Version-0 records remain valid,
immutable, and fully verifiable. Readers support both versions indefinitely and
threads may contain both.

At a declared cutover commit:

- canonical writers emit version 1 for every new event;
- ordinary post-cutover version-0 writes are rejected, because continuing to
  accept them would make retry guarantees optional;
- historical version-0 handoffs retain their historical meaning and do not
  acquire criteria they never carried;
- an open version-0 handoff that needs the new guarantee is answered by a
  version-1 superseding handoff that restates bounded context and criteria,
  preserves the causal link to the old event, and becomes the parent for later
  completion; and
- import tooling, if needed, may admit historical version-0 records only in an
  explicit migration mode that cannot masquerade as a live append.

This is a class-three product-semantic change under ADR 0028: it changes retry
behaviour, caller-visible conflicts, and the meaning of handoff and completion.
DeVere's ADR 0040 supplies the prior authorization to design and build it; the
event-version ADR should record the exact compatibility and activation evidence
before acceptance.

## Execution accounting

This is recommendation only. No source, schema, protocol, copy, test, mutation,
or runtime behaviour changed, and `executed=` does not move.
