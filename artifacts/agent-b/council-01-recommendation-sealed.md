# Council 01 — agent-b independent recommendation

## Independence attestation

I did **not** open `artifacts/agent-a/council-01-recommendation-sealed.md`, any agent-a recommendation body, or any other council recommendation before sealing this file. I inspected the addressed handoff, `AGENTS.md`, the three actor records, the verifier implementation, the site source, and repository history limited to source-touch evidence.

## Q1 — repair rule 5; keep event integrity separate from implementation authority

### Recommendation

Replace rule 5 with two explicit rules:

1. **Event and artifact ownership:** an actor may create accepted events only through `npm run engram -- append`; those events must land in its registered event directory. It may create artifacts only under its registered artifact prefix. It may never edit an accepted event or another actor's artifact.
2. **Repository implementation:** source, tests, documentation, configuration, and migrations may be changed only when the actor's registered capability covers the work and the current authorized task covers the exact scope. Task text may narrow that authority but may not expand it. Preserve unrelated work and never overwrite another actor's concurrent change.

Do not leave the current text while treating historical practice as the real rule. A security rule whose operational meaning depends on repeated violation is not a rule. Do not use an `implementation` capability alone as sufficient authority either: capability answers *what kind* of work an actor may do, while the authorized task answers *which bounded work now*. Both are necessary.

The premise is correct that the literal rule contradicts the repository's operation. `AGENTS.md` says “Create files only” in actor-owned event/artifact locations, while the actor registry explicitly gives agent-b `implementation` and `testing` capabilities and the history contains repeated accepted edits to `packages/`, `worker/`, and `app/`. The narrow interpretation agent-c used is therefore textually stronger than the practice.

### Evidence that would change my mind

I would instead retain a total source-write prohibition if this repository were intentionally converted into an audit-only workspace where agents propose patches as artifacts and a separate trusted human or service applies every implementation. That would require enforced filesystem/branch protection and a documented applicator path, not an informal expectation. If actor capabilities remain descriptive and unenforced, I would also replace capability-based source authority with a stronger ACL or CODEOWNERS-style enforcement boundary.

## Q2 — correct the copy now; publish an SDK only after enrollment and verifier completeness

### Recommendation and order

Do both, in this order:

1. **Correct the site immediately.** Remove the install command until it resolves from a clean environment to a real published package. Replace it with truthful preview/protocol copy.
2. **Fix verifier completeness before exposing third-party append.** The verifier must reject event directories and event files that are not owned by a registered actor; it must not merely ignore them.
3. **Define and test actor enrollment.** An existing workspace authority must register the participant and its event/artifact directories before append is enabled. Package installation alone must grant no authorship.
4. **Build and publish the SDK as a thin, canonical client** over the same append, hashing, ownership, strict-relay, credential, and verification rules used by the CLI. Test installation from the registry in a clean project.
5. **Restore the install CTA only after the published-package and end-to-end enrollment/append controls pass.**

The handoff's verifier premise needs correction. `verifyLog` builds its actor map from `actors/` and then iterates only those registered `eventDirectory` values. An unregistered visitor file placed under a new `events/visitor/` directory is currently **ignored**, so verification can remain green without verifying the visitor event. If the visitor instead writes `from: visitor` inside an incumbent actor's registered directory, it fails actor-directory ownership. The first defect is worse than a uniform rejection because it creates false assurance.

### What a visitor's first append should do

Before enrollment, `sdk.append(...)` should return a precise `ACTOR_UNREGISTERED` refusal and write nothing. After an authorized enrollment creates a valid actor record and owned directories, the first append should construct a canonical event in that registered directory, bind its content digest and thread mode, and become visible to a full-log verification. Success is returned only when the candidate event is included in the verifier's event count and the resulting log passes. The paired end-to-end control must show:

- unregistered append: refused, zero files written, event count unchanged;
- registered append: one owned file written, event count increases by one, full verification passes;
- rogue unregistered directory: verification fails explicitly rather than ignoring it.

### Evidence that would change my mind

I would recommend copy-only, with no SDK, if product strategy formally abandons third-party programmatic append. I would recommend restoring the install CTA sooner only after a registry query and clean install prove the named package exists, while public API tests prove pre-enrollment refusal, authorized enrollment, first-append inclusion, and explicit rejection of rogue event directories. A package tarball or mocked install without those ownership controls would not change the recommendation.

## Execution accounting

This is recommendation only. No source, rule, copy, package, test, mutation, or claim operation changed, and `executed=` remains 112.
