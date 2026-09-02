<!-- REPORT_DRAFT_INERT: publication requires a separate digest-bound human approval -->
# DRAFT — NOT PUBLISHED

# The Stops Were Part of the Build

A lab note from the EngramPort experiment: controls rejected their authors, the architect escalated a defect that did not exist, impersonation succeeded, and a public package still has zero users.

## Corrections, reversals, and failures

### Failure: A control pronounced sound did not control the surface it named

Agent-a had verified the Rule 5 replacement and was preparing to accept it. Independent review found that its unaccounted-path check classified every new path outside the actor-owned directories as shared, so the asserted replacement gate could pass without enforcing the property. The review, recorded as F105, stopped an acceptance that the architect had already treated as verified.

Evidence:

- Canonical event `01a03f8c-a712-7bf5-b482-4fac01cd24e4`; artifact `artifacts/agent-c/reviews/01a03f89-ee2f-7d54-864f-54bf442a37e6.json#sha256=9b39d8e19846d87b339f38bedfb191ef1b6b2815eb7ecb50cba1bf739ca4fd60`

### Failure: The repaired registry protection still passed the ordinary threat

The next revision was also independently rejected after verification. Comparing actor records with HEAD detects a dirty worktree, but a second builder's committed registry edit becomes HEAD and passes on the clean checkout where the collaboration model actually operates. F107 forced the claim to be narrowed to local drift and moved cross-commit integrity to external review, branch protection, or signing controls.

Evidence:

- Canonical event `01a03fa8-cf7b-72c0-b7c1-0467e45aab4e`; artifact `artifacts/agent-c/reviews/01a03fa5-8240-72a3-9139-6aa28f7235e4.json#sha256=4d8e3b60a00272acf7ff200c5ec9db07b4a788c4d87d897263a779a9e8da5154`

### Failure: The architect escalated a defect that did not exist

F136 records a failure by the architect rather than by the implementation. Agent-a called the published SDK's handoff method with an invalid empty bounded-context list, received ok:false and the exact validation error, read only the candidate relative path, and reported a silent success that wrote nothing. Exact reproduction against the public tarball showed the valid call writes correctly. The product defect was false; the narrower coverage finding was real, so the correction added a packed-surface control that would now kill the behavior agent-a had alleged.

Evidence:

- Canonical event `01a05d26-ed11-7100-8f36-2a71616a4138`; artifact `artifacts/agent-b/sdk-published-surface-results.md#sha256=717e4fc0ce18cabdc40669ec1d26044f352379b75279ea5deb59e3f463b9b198`

### Failure: A second builder proved that attribution rested on honor

F111 was first a source reading: the caller selects an actor string and the verifier checks consistency, not entitlement. The synthetic second-builder exercise turned that mechanism into a measurement. Builder two created a client naming builder one, appended an event that verified as builder one's, and observed impersonation=accepted. The same exercise showed that the PostgreSQL disposition store could isolate private state while the Git event layer still accepted the false attribution. The chain proved what the record said; it did not prove who caused it.

Evidence:

- Canonical event `01a05432-f9fa-7705-a52d-91586cf80896`; artifact `artifacts/agent-b/second-builder-results.md#sha256=7ed282d9b18760afa0bd5a6223f4955414fe5509b9c4428871d034003b15b30e`

### Correction: A passing control still needed a language correction

A two-layer mutation control produced the right measurements while its labels named the surviving layer instead of the removed layer. The labels and assertions were corrected together without changing the measured behavior or counting the correction as a new control.

Evidence:

- Canonical event `01a0355e-6da4-7507-a60f-50c2cac0b790`; artifact `artifacts/agent-b/w1-1-layer-label-correction.md#sha256=4c7a08042d2e37bd7081b7516762a4c1706ef6a3bf3a65e2bc4232ffe73f1099`

### Correction: Five stopped SDK dispatches became the implementation sequence

The SDK did not begin with an SDK build. Five attempted dispatches stopped before sending because the shared core, log-derived work delivery, durable observation disposition, versioned handoff envelope, and finally the package itself were not yet ready as one honest claim. Each stop produced the missing slice instead of disguising the gap as a small correction; only after those slices existed did the SDK land as a wrapper over the shared substrate.

Evidence:

- Canonical event `01a03fb7-7bfa-76f1-927f-e0ab95c49112`; artifact `artifacts/agent-b/sdk-core-extraction-results.md#sha256=70d4b1feb7e4be76d1b1932d158e0af7a362b1b20383668845a0e1abc8f453af`
- Canonical event `01a048e5-8f69-7c64-8e9f-983bbf61105f`; artifact `artifacts/agent-b/port-watch-work-deliveries-results.md#sha256=407bb35ebe0be2dd6181d0b23a063fda4cb3f7f50e4933c07746a23af276755d`
- Canonical event `01a04a1f-d3bb-7bef-86c3-a5a3f159c3c2`; artifact `artifacts/agent-b/observation-delivery-results.md#sha256=30a9367fadc45538f697fe4d3c86f998438cecfaa99160baffba6d61313c32fe`
- Canonical event `01a04ac5-f6ec-756d-b6bf-eed39f189fba`; artifact `artifacts/agent-b/envelope-retry-v1-results.md#sha256=db7c79b24024a13d57912f6b60d825257a7e95fa848b373bca8dec059b8d83f6`
- Canonical event `01a05290-50e0-7784-ba7f-cebf44e3f591`; artifact `artifacts/agent-b/sdk-build-results.md#sha256=779e2ca405f518664345f78928f2f61a2fb4b5191187e032e8981530adf6a336`

### Correction: The sharpest security material is absent on purpose

This draft cites no finding that the current registry marks unfixed. That makes the security account less sharp than the underlying record: live defects are withheld rather than turned into a public exploitation guide. The omission is a safety boundary, not evidence that the experiment had no further security failures.

Evidence:

- Canonical event `01a044d0-301e-726f-87b5-8e1b5dcfe932`; artifact `artifacts/agent-b/report-correspondent-build-results.md#sha256=97fcadde867aba9de46337d9e1c8b393c38ef47ecb4f7f8cf1a243d2882951fe`

### Correction: Four identity repairs reached the boundary of the repository

F108 forced the first correction: a registry digest stored beside the registry can be rewritten in the same commit as the registry, the rule, and its test. Later attempts reached the same wall from different directions. An event signature still needs an actor-to-key binding outside ordinary writers' control; a commit signature authenticates the pusher rather than the actor named inside an event; and a comparison with the introducing commit runs only after the append-time decision it was meant to influence. The repository can preserve and expose structural inconsistency, but authenticated authorship requires a pre-write boundary whose policy and credential are not mutable by event authors.

Evidence:

- Canonical event `01a03fdb-e566-7b58-b1bf-41cfcf5145a5`; artifact `artifacts/agent-b/rule-5-amendment-final-results.md#sha256=61a153c492b7a44e2a780c780a356e4886ce23bd331cd548f3cddee515cff320`
- Canonical event `01a057cb-51fa-7b83-96f2-0a594aba38d7`; artifact `artifacts/agent-b/agent-b-signing-results.md#sha256=e99af4b7dda4871a9b37e8b374b50e26215c55986978440616e6054ec9952439`
- Canonical event `01a0580c-ff7a-7305-b1c2-5ccbe8ca796c`; artifact `artifacts/agent-b/council-05-comparison.md#sha256=55f55e44e123cf5b5afb3ff53018ad7b7a57eee42ade9d156e24685cf7d8686e`

### Correction: The missing principal became a deployment boundary

F117 joined enrollment, attribution, and possession-level retry at one missing fact: an authenticated principal. The resulting deployment distinction is explicit. Trusted collaborators can use the current Git substrate for durable structure, causality, and evidence. Mutually untrusting builders require an external admission and delegation service that authenticates a caller, authorizes the claimed actor before writing, and alone holds the protected-branch credential. That control plane adds centralized trust and availability; a clone can verify its receipt but cannot derive the real-world enrollment identity from repository bytes alone.

Evidence:

- Canonical event `01a04400-32e2-714d-badd-d7532d2b714f`; artifact `artifacts/agent-b/council-02-comparison.md#sha256=ffb92658deaba36960695854be141833a75b721149d7fbf3840f8cd33fdc258a`
- Canonical event `01a0580c-ff7a-7305-b1c2-5ccbe8ca796c`; artifact `artifacts/agent-b/council-05-comparison.md#sha256=55f55e44e123cf5b5afb3ff53018ad7b7a57eee42ade9d156e24685cf7d8686e`

### Correction: The SDK exists, but the product claim remains partial

The repository is public, the package is installable, and a pull request can register a contributor through an executable merge-bound path. Those are release surfaces, not user evidence. EngramPort still has zero users. Its package covers four public claims with qualifiers, and its evidence calls the Port Watch claim partial. Moving work claims into PostgreSQL removes one process- and filesystem-local boundary while adding a reachable shared control-stream dependency. This is a testable product with a contribution path, not a finished or adopted one.

Evidence:

- Canonical event `01a05290-50e0-7784-ba7f-cebf44e3f591`; artifact `artifacts/agent-b/sdk-build-results.md#sha256=779e2ca405f518664345f78928f2f61a2fb4b5191187e032e8981530adf6a336`
- Canonical event `01a0530f-1bb4-75fd-8d73-86049c9d412a`; artifact `artifacts/agent-b/portable-claim-results.md#sha256=c52ab46ed0c5b72c4260c2fafa68e4ffaf02546b5ac1fa455c826fe960e6acc6`
- Canonical event `01a05955-1fd2-752f-bd0f-ba19288c3cad`; artifact `artifacts/agent-b/pr-onboarding-results.md#sha256=9de118b80702e2a32f48b8818deef55c67f64d7087f8466123348143a0531ec5`

## What worked

### Success: The fourth council was blind in the repository, not merely by promise

For council 04, both actors committed recommendation digests before either plaintext existed in the repository for the other to read. Both later reveals matched their sealed digests. The independent answers converged on durable, reconstructible observation disposition while still exposing a real split over who should write the durable fact.

Evidence:

- Canonical event `01a0498e-2405-7351-8078-b8b606244505`; artifact `artifacts/agent-b/council-04-comparison.md#sha256=1e15cdf51b75ce5288ab1f028ce9f3f0ae96c48c3d4bcef533ef46ae8d8889e9`

### Success: Controls became release conditions instead of launch decoration

The site control refused an install claim while the package was unavailable, then the package was published and the same policy accepted a real install surface. The later whole-surface exercise found no handoff defect but added the missing method-level protection. The contribution path uses the same discipline: an unmerged actor proposal is refused, and the modeled maintainer merge is the authorization boundary. The controls did not merely describe the launch; they determined which claims could appear in it.

Evidence:

- Canonical event `01a05d26-ed11-7100-8f36-2a71616a4138`; artifact `artifacts/agent-b/sdk-published-surface-results.md#sha256=717e4fc0ce18cabdc40669ec1d26044f352379b75279ea5deb59e3f463b9b198`
- Canonical event `01a05955-1fd2-752f-bd0f-ba19288c3cad`; artifact `artifacts/agent-b/pr-onboarding-results.md#sha256=9de118b80702e2a32f48b8818deef55c67f64d7087f8466123348143a0531ec5`

### Success: The report pipeline stops before publication

This output is an inert Markdown draft. The generator has no publication sink, refuses a publish flag, and requires a separate DeVere approval bound to the exact final digest even to prepare a still-unpublished candidate. Writing the lab note does not change site copy or publish anything.

Evidence:

- Canonical event `01a044d0-301e-726f-87b5-8e1b5dcfe932`; artifact `artifacts/agent-b/report-correspondent-build-results.md#sha256=97fcadde867aba9de46337d9e1c8b393c38ef47ecb4f7f8cf1a243d2882951fe`

---

This is an inert correspondent draft. It has no implementation, assignment, approval, memory, architecture, or project-fact authority. Publication requires a separate human approval bound to the final draft digest.
