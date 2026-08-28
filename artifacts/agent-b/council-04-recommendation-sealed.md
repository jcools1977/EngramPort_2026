# Council 04 — agent-b independent observation-disposition recommendation

## Recommendation

Record observation disposition as an append-only, batched delivery checkpoint in a private canonical delivery-control stream owned by EngramPort. Do not use a source event's `in_reply_to`, do not create one acknowledgment per observation, and do not let a local cursor or cache decide correctness.

The important distinction is between two claims that are often collapsed into “seen”:

1. **A person or model understood an observation.** EngramPort cannot prove this, and it is private consumer state rather than a project fact.
2. **The delivery boundary accepted a specified observation batch for a durable subscription.** This is an auditable fact about EngramPort's own activity. The Port-family invariant already permits Port Watch to append records of what it did.

Only the second claim should be durable. A checkpoint means “subscription S, under selector revision R, accepted every matching source event through canonical source position P, with batch digest D.” It must not claim human attention, agreement, project completion, or transfer of authority.

## Why a checkpoint rather than one receipt per observation

A receipt for every observation approaches one new log event per source event and doubles log growth in the limit. It also invites misuse of `in_reply_to`, whose single direct-reply slot belongs to strict relay's turn-holder.

A cumulative checkpoint acknowledges a bounded prefix for one subscription. It is appended only after a non-empty delivery batch is accepted, never for an empty poll. Multiple observations delivered together produce one checkpoint. Implementations may delay checkpointing within a declared maximum batch size or time window; a crash before the checkpoint produces bounded duplicate notification, not silent loss.

The checkpoint is append-only. Later checkpoints supersede earlier positions for projection purposes but do not rewrite them. A fresh machine scans the subscription's control stream, validates the selector revision and checkpoint chain, derives the latest acknowledged prefix, and resumes matching after it. A disposable cache may accelerate that scan but is never the authority.

This changes log growth from approximately one receipt per observation to one event per accepted delivery batch. It does not make growth constant, and the design should say so. Retention or compaction can optimize old control records only if the canonical service preserves a verifiable checkpoint chain; deleting the only disposition evidence would restore the original defect.

## Strict relay and causality

Observation checkpoints must not be direct replies to observed source events. Strict relay allows one direct reply, and that causal edge belongs to the actor holding `next`.

The disposition belongs in a dedicated delivery-control stream whose ordering and writer rules are separate from project conversation threads. Its payload may cite source position, first and last delivery ids, selector revision, batch digest, and count. Those citations are evidence references, not `in_reply_to` edges and grant no turn. If the protocol insists that every accepted record be a current event type inside ordinary strict-relay threads, then the design is not implementable without changing that protocol; overloading a reply is not an acceptable shortcut.

## Obligation versus notification

Observations are notifications, not work obligations. They grant no implementation authority, claim, approval, or turn, and duplicate delivery is annoying rather than a project-integrity error. That permits at-least-once rather than exactly-once semantics and makes batched acknowledgment safe.

They are nevertheless a **delivery obligation of the product** once the site promises durable cursors and resumption across machines. Losing every observation since a local file vanished would contradict that claim even though no project work was lost. The obligation is narrow: offer each matching observation at least once to the configured delivery boundary and resume from durable accepted checkpoints. It is not an obligation for the consumer to understand or act.

If DeVere instead defines observations as best-effort notifications, local state is sufficient and this protocol change should be rejected. The product copy would then need to say that durable cursors cover work delivery only. ADR 0040 currently says the claim stands, so best-effort local-only observation is not the recommendation under the accepted product meaning.

## Authorization and privacy

Subscriber acknowledgment is private consumer bookkeeping, not a project fact. Therefore the canonical delivery-control stream must be access-controlled to the subscription principal and authorized operators. Publishing viewing behavior into a broadly readable project thread would turn private telemetry into project history and is not justified by durability.

“Canonical” here means the EngramPort service is the authoritative writer and durable store for its own delivery activity, not that every collaborator may read the records. The project log and private control stream may share the same append and integrity substrate while having different visibility. If Port Log is defined as necessarily project-visible, then its invariant must be refined or a private canonical control-log component must be named explicitly. Either is a product-semantic decision, not an implementation detail.

## Rebuild semantics

For a subscription with id S:

1. Load the accepted subscription configuration and its immutable selector revision R.
2. Verify the checkpoint chain for `(S, R)` and derive the highest accepted source position P.
3. Scan canonical source events after P, applying authorization before selection.
4. Deliver a bounded ordered batch of matching observations.
5. After the delivery boundary accepts the complete batch, append a checkpoint binding S, R, the covered source prefix, delivery ids or their digest, count, and prior checkpoint id.
6. On crash before step 5, re-offer the batch. On crash after step 5, another machine derives P from the checkpoint and does not re-offer it.

A selector change creates a new revision and an explicit baseline/replay choice. It never silently reinterprets an old checkpoint under new matching rules.

## Migration

This is class three under ADR 0028. It introduces caller-visible delivery semantics, private canonical state, authorization and privacy rules, a new control-record meaning, and a baseline/replay choice. ADR 0040 funds durable cursors but does not decide these contract details.

Migration should be explicit:

1. Register each observation subscription with a stable id and immutable selector revision.
2. Treat legacy local cursor/cache state as advisory only. Do not import it as disposition.
3. Rescan source history and re-offer matching observations unless an authorized operator appends a baseline acceptance for that subscription and revision.
4. If a legacy observation delivery was in flight, expire it and allow at-least-once re-delivery; do not silently mark it accepted.
5. Stop reading legacy state after migration. Retain it only as a rollback artifact for a bounded period.
6. Prove that a fresh machine reconstructs the same acknowledged prefix and next batch from canonical records alone.

Because this changes product semantics and privacy, it parks until DeVere accepts the protocol. It is not a mechanically forced class-two addition.

## Rejected alternatives

- **One `in_reply_to` acknowledgment per observation:** collides with strict relay and grows the log one-for-one.
- **One new event per observation without `in_reply_to`:** avoids the relay collision but retains unnecessary one-for-one growth.
- **A mutable durable cursor table as sole truth:** survives machines but cannot be rebuilt from the log and makes a projection authoritative.
- **A local file/cache:** acceptable only for explicitly best-effort notifications and contradicts the currently accepted durable-resume claim.
- **Treating observations as work replies:** falsely grants responsibility and corrupts the addressed-work model.
- **Claiming semantic “seen”:** unverifiable; the durable fact must stop at delivery-boundary acceptance.

## Evidence that would change the recommendation

I would choose local-only state if DeVere narrows the durable-cursor claim to work deliveries and explicitly defines observations as best effort. I would choose an authoritative consumer-offset table without checkpoint events if the Port-family invariant is amended to permit non-reconstructible private delivery state and the service proves transactional cross-machine behavior, backup/restore, selector-version binding, and migration without silent loss. I would choose per-observation receipts if measured batch checkpoint ambiguity cannot be bounded without losing required replay precision and the expected observation volume makes the additional log growth acceptable.

## Execution accounting

This is recommendation only. No source, schema, protocol, site copy, test, mutation, runtime behavior, or `executed=` count changes.
