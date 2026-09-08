# Voltron assessment by agent-b

Assessment date: 2026-09-08. Handoff: `01a0827e-1eba-793a-9315-a5936106bf55`, thread `voltron-assessment`. EngramPort worktree baseline: `63d26fdadaa74674068dc33d01867d3176552640`, branch `agent-b/voltron-assessment`.

**INFERENCE:** Partial architectural fit for cooperative coordination, but no current signed custody role and no current integration recommendation. A transport that influences admission, spending, selected evidence, or completion is already in a decision path even when its records say they grant no authority. Premises: the source and probes below, SECURITY.md:15-27, and the bound ADR 0050.

## Evidence and snapshot

**VERIFIED:** These are agent-b's own `shasum -a 256` results, not values inherited from an ADR. The exact commands, stdout, exit codes, HEAD, and porcelain are in `artifacts/agent-b/voltron-assessment-observations.json`.

| Input | Computed SHA-256 | Comparison |
| --- | --- | --- |
| `/Users/an2b/an2b/products/eidetic/voltron/ENGRAMPORT_AGENT_HANDOFF.md` | `46c06dc19af6c2e2451f3c1f703cce1edb68f2a996ac63196e2931f8e7499332` | Current brief bytes |
| `/Users/an2b/an2b/products/eidetic/voltron/protocol/manifest.json` | `c0edd38fdc8ebc201634d477305a18aec69d3c696a0b4b683ceb5029f25f8dfd` | **MISMATCH** with brief's `6308bfece6807bed69487c7db7e63d570975748616ee99576ea8c662f005a5a9` |
| Bound `artifacts/agent-a/adr-0050-copy.md` | `c06a884796eb23fff86e65c5fe6f7573b8cabbec4901a3eff348191c9cac2604` | MATCH with handoff |
| Bound `artifacts/agent-a/seals/voltron-assessment-agent-a.sha256.json` | `1829217a10ec4969e72e4f47206be076e8a94938f709cf2e3d370c427869058e` | MATCH with handoff |

**INSUFFICIENT_EVIDENCE:** Why the manifest differs is unknown. Its listed hashes were read as inventory data; the target files were not opened or verified because the handoff permits only the brief and manifest in Voltron. The brief's 630-test baseline and signatures are claims in the brief, not tests or signature verification performed here. This assessment cannot establish the current behavior of Voltron implementations or endorse the mismatched snapshot.

**VERIFIED:** `npm run proof:verify` completed with exit 0 and `475 events across 95 thread(s) and 3 actors` before work. `npm run engram -- inbox --actor agent-b` returned three paths, including the assigned handoff. Only the named handoff was taken. Both bound artifacts were opened in full and their digests matched. Evidence: handoff event above and `voltron-assessment-observations.json`.

**VERIFIED:** `node artifacts/agent-b/voltron-assessment-probe.mjs` completed successfully. `artifacts/agent-b/voltron-assessment-probe-results.json` records an in-memory forged-actor candidate accepted by `verifyLog`, a changed body with the old hash refused, an inbox changing from zero to one work item, and a synthetic spend decision changing from `DAILY_CAP_REACHED` to allowed. No candidate event was appended. Evidence: probe source and result, especially the `forged_actor_candidate`, `inbox_projection`, and `spend_projection` fields.

**INSUFFICIENT_EVIDENCE:** No full application, database, KMS, provider, or Voltron suite was run. No deployment or operational isolation conclusion follows from this assessment. Current source presence is distinguished below from exercised behavior.

## 1. Fit assessment

### Q1. Actual architectural role today

**VERIFIED:** The exercised collaboration path is a Git-backed event log and work inbox. Live append writes version-1 Markdown envelopes, verifies the whole log, writes exclusively, verifies again, and returns an event path. Inbox state derives from unanswered events addressed to an actor. Sources: `packages/git-adapter/src/event-core.mjs:81-153,156-189`; `engramport.yaml:1-11`; the proof command above. Git transport is the repository contract (`PROTOCOL.md`, Canonical body hash and Strict relay sections).

**VERIFIED:** Implemented PostgreSQL migrations, workspace authorization modules, and observation consumers also exist. Their existence does not make the current Git path authenticated: `migrations/0001_canonical_core.sql:11-79,95-144`, `packages/git-adapter/src/workspace-session.mjs:36-72`, `packages/port-watch/src/observation.mjs:54-105`. ADR 0042 describes a staged canonical cutover with gates, not proof that it occurred.

**INFERENCE:** Fit is **partial**. Explicit handoffs, causal references, inspectable failures, and reproducible artifacts correspond to the coordination need described in the brief. Current Git identity and custody assurance do not meet a consequential trust boundary. Premises: Q2-Q8 and SECURITY.md:15-27.

## 2. Current overlap

### Q2. Existing primitives

**VERIFIED:** The following is a mapping of current source, not a production capability claim.

| Concern | Existing primitive and exact source | Limit |
| --- | --- | --- |
| Artifact integrity | Raw-byte SHA-256 checks, `packages/git-adapter/src/verify-log.mjs:475-493,531-542` | Integrity against the supplied reference, no signer authentication |
| Durable events and causal order | UUIDv7, `in_reply_to`, one root, same-thread parents, strict relay and cycle refusal, `event-core.mjs:7-14,119-153`; `verify-log.mjs:404-418,422-472` | Git files and whole-log validation, not a transactional external execution ledger |
| Replay and delivery | Rebuilt inbox, `event-core.mjs:156-189`; observation batch/checkpoint digests, `packages/port-watch/src/observation.mjs:21-43,89-105` | Work disposition and observation delivery are different protocols |
| Identity and trust | Actor registry and path ownership, `verify-log.mjs:191-211,363-384`; SQL principals/delegations/trust, `migrations/0001_canonical_core.sql:15-44` | Registry strings do not authenticate Git authors |
| Policy binding | Root thread declaration hash, `event-core.mjs:124-126`; threat-model revision/digest and control requirements, `workspace-dispatch-gate.mjs:4-24` | Specific bindings, not a generic authenticated Voltron policy/trust registry |
| Retry and wake coordination | Same-id/same-intent reuse, `event-core.mjs:112-116,140-146`; claims and lease expiry, `packages/port-watch/src/index.mjs:116-157,306-354` | No exactly-once external side-effect guarantee |

### Q3. Exact payload bytes

**VERIFIED:** Event bodies are normalized by CRLF-to-LF conversion and end trimming before hashing and parsing. Append trims the body end and regenerates frontmatter. `hashAppendIntent` canonicalizes a separate intent object. Sources: `verify-log.mjs:51-86`; `event-core.mjs:119-135`. The probe observed equal body hashes for distinct input bytes (`x` with CRLF versus LF and extra trailing newline).

**VERIFIED:** Referenced artifact files are read as bytes for digest verification and are not rewritten by that verifier (`verify-log.mjs:489-492,538-541`). However, bounded context returns `content.toString("utf8")` after checking the byte hash (`bounded-context.mjs:22-31,67-77`). The SQL event payload is `jsonb` (`migrations/0001_canonical_core.sql:68`).

**INFERENCE:** Use an independently pinned artifact file as the candidate byte boundary. Do not equate event-body hashes, JSONB payloads, or UTF-8 context strings with preservation of arbitrary signed bytes. A future transport round trip must measure returned bytes separately from the protocol canonical digest. Premises: the cited readers/writer and brief's Candidate integration seam.

### Q5. Tenant, subject, agent, workflow identity

**VERIFIED:** Git v1 has `from`, `next`, thread slug, event id, parent, hashes, artifact references, bounded context, and completion criteria/results. It has no tenant identifier, independent authenticated principal, or generic subject binding. Source: `schemas/event-v1.schema.json:7-25`; `actors/agent-b.yaml`; `verify-log.mjs:191-211`.

**VERIFIED:** SQL source distinguishes tenant, principal external issuer/subject, project membership, actor ownership/trust/delegations, agent session, thread, correlation/causation, and event principal. It defines forced tenant RLS and delegation checks. Source: `migrations/0001_canonical_core.sql:11-79,95-144`. Workspace sessions authenticate through an injected authenticator and resolve scoped founder authority (`workspace-session.mjs:26-47`). The principal-to-transaction adapter explicitly describes synthetic authentication and checks a supplied `verified` flag (`d2-session-binding.mjs:5-24`).

**INSUFFICIENT_EVIDENCE:** Current operational tenant isolation, externally rooted actor identities, and a Voltron subject-to-tenant mapping have not been demonstrated within this read-only scope. Neither registry membership nor a constructor marker supplies that evidence.

### Q6. Idempotency, delivery, ordering, retries, partial failure

**VERIFIED:** Reusing a v1 event id with the same canonical intent returns the existing event; changed intent with that id refuses. The CLI supports a caller-provided `--id`. New random ids do not provide content deduplication. Sources: `event-core.mjs:95-116,140-146`; `packages/git-adapter/src/cli.mjs:124`. Unknown parents and duplicate strict-relay replies refuse whole-log validation (`verify-log.mjs:422-447`). This is parent-presence validation, not timestamp-based execution ordering.

**VERIFIED:** Append checks a candidate before exclusive file creation and removes its newly written candidate if post-write verification fails (`event-core.mjs:133-152`). Port Watch acquires a lease, rechecks enabled work state, runs the runner, releases on completion, and marks lease-expiry redelivery as `at_least_once` (`packages/port-watch/src/index.mjs:306-354`). Observation source has separate stable delivery ids and canonical checkpoint history verification (`observation.mjs:34-43,63-70,89-99`).

**INFERENCE:** These are useful delivery controls, but process crash, racing writers, and an external action completing before its reply still require explicit recovery and reconciliation. A lease and an idempotent append cannot prove exactly-once purchases or safe replay of an authorization. No crash or database concurrency experiment was run here. Premises: the cited operation order.

### Q7. Opaque signed artifacts and proof of non-change

**VERIFIED:** Raw file hashes can be checked against declared artifact references, as observed for the two bound artifacts with `shasum -a 256`. `verify-log.mjs:538-541` implements this raw-byte check.

**INFERENCE:** Conditional yes for unchanged bytes relative to a digest independently retained by a consumer. No for authenticated custody, original receipt time, signer identity, or proof against a committer rewriting both file and reference. No generic signature verification occurs in the cited Git append/verifier path. A signed commit alone does not bind each event's claimed author (`SECURITY.md:21`). Signed artifact verification must remain independent of EngramPort's custody assertions.

### Q8. Envelope reuse

**VERIFIED:** Reuse the existing v1 event as a coordination wrapper, with a digest-qualified artifact reference and causal parent. The current writer emits only v1 although the repository's historical configuration names v0. Sources: `schemas/event-v1.schema.json:7-25`; `event-core.mjs:84-85,119-135`; `engramport.yaml`.

**INFERENCE:** No new production envelope is justified now. The brief's sketch would require explicit separate fields for payload-byte digest, canonical digest, subject binding, verifier/trust version, and independently attested custody if later approved. Embedding those words in Markdown provides no enforcement. Premises: Q3, Q5, Q7, and the brief's Candidate integration seam.

### Q9. Duplication

**INFERENCE:** A second generic handoff log, inbox, parent-link validator, byte-hash inventory, or retry-intent mechanism would overlap the modules in Q2 and Q6. Voltron's memory evidence semantics, relevance, source precedence, trusted signer verification, and Procura authority do not become EngramPort responsibilities merely because both systems use hashes and envelopes. The Voltron side of this comparison is conditional on the read brief, not independently checked implementation.

## 3. Missing primitives

**INFERENCE:** Before any custody or record role, establish externally rooted actor admission, immutable acceptance verification against that authority, isolated key custody, and both ADR 0050 negative cases. A durable independent anchor must survive an authorized committer rewriting in-tree policy and registry together. Source premises: bound ADR 0050; SECURITY.md:15-27; `event-core.mjs:81-153`.

**INFERENCE:** A later byte transport would also need measured byte-preserving retrieval, explicit tenant/subject binding, trust and policy version pinning, replay/expiry and revocation behavior, and authenticated custody assertions separate from embedded signatures. Generic source presence in SQL is not evidence that those requirements are satisfied by the Git path. Premises: Q3-Q8 and the brief's sketch.

**INSUFFICIENT_EVIDENCE:** The current manifest lists actor-admission artifacts, but their files were outside the allowed read set. Their names are not evidence of successful admission or satisfaction of ADR 0050. No implementation gap on the Voltron side is declared closed from that inventory.

## 4. Authority-risk review

### Q4. Boundaries and completion versus authorization

**VERIFIED:** Git completion validation checks criterion ids, statuses, evidence reference resolution and allowed evidence classes. It does not establish the truth of the evidence or authenticate its author (`verify-log.mjs:279-297,500-527`). Work eligibility derives from `next` and whether a parent has a reply (`event-core.mjs:156-174`).

**VERIFIED:** Workspace plan authorization is a separate code path with live session, revocation, stored approval, plan digest and step checks (`workspace-session.mjs:60-72`). It is not invoked by Git completion validation.

**INFERENCE:** Delivery or completion can be mistaken for approval by a downstream reader, scheduler, governance process, or UI. A valid hash and `satisfied` status are assertions, not a mandate. Treat `received_at` as custody metadata and do not let it override source-effective time, select a source, or imply human authorization. Premises: the preceding source and the brief's Candidate integration seam.

### Q10. Conflicting concepts

**INFERENCE:** The conflict is between Voltron's stated independently trusted component authorities and unauthenticated Git actor assertions, not between event-based coordination and signed evidence themselves. Further conflicts arise if text normalization becomes artifact serialization, Git arrival order becomes source precedence, a tenant label becomes isolation, or custody success becomes action admission. Premises: Q3-Q5, Q7 and the read brief.

### ADR 0050 invariant: can changing or forging a log entry change a consequential decision without independently authenticated authorization?

**VERIFIED:** **Yes for work selection in the Git inbox.** The read-only probe supplies an in-memory event naming agent-a, without a credential or signature. `verifyLog` accepts it, and the inbox projection changes from zero to one item for agent-b. This is candidate verification, not a persisted forgery. Evidence: `voltron-assessment-probe.mjs` and its result; `event-core.mjs:156-174`; `verify-log.mjs:363-384`.

**INFERENCE:** **Yes for an enabled Port Watch runner consuming that Git inbox**, when its runner performs consequential work. Its source wraps `listInboxEntries`, then its tick takes a selected event into `runner.run(context, token)`. Existing enablement, scopes, and leases constrain execution but do not authenticate the work item's author. Sources: `packages/port-watch/src/index.mjs:102-109,306-339`. No such runner was invoked here.

**VERIFIED:** **Yes at the spend-decision function for changed review data.** Holding the cap and reserve fixed, changing a synthetic review cost from 100000000000 ticks to zero changes refusal to allowance. Source and observed output: `voltron-assessment-probe.mjs`, `voltron-assessment-probe-results.json`; `packages/agent-c-supervisor/src/spend-gate.mjs:34-66`.

**INFERENCE:** **The service-account review launcher is a consequential consumer of this forgeable evidence.** It enumerates review JSON files directly, calculates spend, then either refuses or invokes the service-account wrapper (`scripts/run-agent-c-review-service-account:94-138`). This cost-read path does not authenticate or hash-bind each review. A forged high-cost file can deny work; altered or omitted cost evidence can affect an allowance. This is source tracing plus a pure decision probe, not a live provider exploit. No provider invocation, paid action, credential access, or operational deployment was tested.

**INFERENCE:** **Yes for any future Voltron router, source selector, Trust Bundle builder, or Procura admission consumer that treats Git authorship/completion/custody metadata as authority.** Those consumers must not be connected. The brief describes no existing EngramPort integration, and the allowed read set cannot establish one. Premises: Q4/Q7 and bound ADR 0050.

**INSUFFICIENT_EVIDENCE:** The literal phrase "any consumer that reads this log" in ADR 0050 is too broad as a universal empirical claim. A passive renderer, or an independently authorizing consumer that ignores custody assertions, need not change an authorized consequential decision. The measured yes cases above name their actual dependency. This distinction does not reopen the barred record/custody role.

## 5. Minimal experiment

### Q11. Smallest reversible test

**INFERENCE:** Propose, but do not execute, one offline transport experiment after a separate decision and the ADR 0050 admission prerequisite. Use a synthetic signed payload with a pinned out-of-band verification key and separate byte and canonical digests. Compare direct local-file verification with verification after a Git artifact-reference round trip. Retain the same consumer and compare exact returned bytes and authorization decisions.

**INFERENCE:** Preregister refusal cases: altered bytes, changed digest/reference pair with no valid embedded signature, forged actor identity, forged tenant/subject wrapper, stale trust version, replay after expiry/revocation, missing parent, and completion text claiming approval. Include a valid payload and legal redelivery as positive controls. Require no authorization change from custody metadata alone and no altered byte on retrieval. Measure these results without a provider, deployment, production data, or Voltron tree change. Premises: Q3/Q6/Q7 and ADR 0050's two admission refusal requirements.

**VERIFIED:** No integration experiment was executed in this assessment. The only behavioral work was the read-only EngramPort candidate/decision probe identified above. Its source imports EngramPort modules only and performs no append or network operation (`voltron-assessment-probe.mjs`).

## 6. No-go conditions

**INFERENCE:** Each of these independently prevents a current integration recommendation: unresolved manifest snapshot mismatch; unauthenticated append or forged-tree acceptance; any consumer using custody identity or completion as authorization; absent exact-byte round-trip evidence; unproved tenant/subject isolation; missing independent trust/revocation decisions; or opportunity cost that displaces layer-1 user work. Premises: snapshot, Q3-Q7, the invariant results, and bound ADR 0050.

**VERIFIED:** The mismatch and forged-candidate acceptance are observed now. The other listed requirements have no passing evidence in this assessment. Evidence: snapshot command output, probe result, and the expressly limited read/test scope above.

## 7. Recommended timing

### Q12. Trust decision and legitimate signed custody role

**INFERENCE:** Keep EngramPort outside Voltron's trust decision and out of its Trust Bundle. There is no legitimate current signed custody role established by this assessment. Recommend **after the current EngramPort milestone**, conditional on a reconciled snapshot, independent sealed reviews, separately verified admission, and an explicit subsequent implementation decision. Do not schedule integration merely because the assessment is complete. "Not at all" remains a valid result if the seam adds cost without independent value. Premises: bound ADR 0050, SECURITY.md:15-27, and Q7 plus the invariant results.

## Candidate findings

**VERIFIED, candidate VA-B-01: published result schema disagrees with the live verifier.** `schemas/event-v1.schema.json:43-48` permits only `status: satisfied`; `packages/git-adapter/src/verify-log.mjs:8-11,295` permits `satisfied`, `unmet`, and `blocked`. Observation commands: `nl -ba schemas/event-v1.schema.json` and `nl -ba packages/git-adapter/src/verify-log.mjs`; the probe also reads the schema's constant. **INFERENCE:** A schema-validating consumer can reject an honest failure completion the CLI accepts. No schema fix is in this assessment's bounds.

**VERIFIED, candidate VA-B-02: unauthenticated authorship remains observable.** The current verifier accepted the in-memory agent-a candidate; a changed body without rehash failed. This corroborates the already documented F111/F127 mechanism, not a new discovery of it. Evidence: the probe command/result and SECURITY.md:15-21. **INFERENCE:** Structural verification alone is insufficient admission for consequential consumers.

**VERIFIED, candidate VA-B-03: spend gating reads review files outside an authenticated event-evidence resolution step.** The launcher enumerates every `.json` review, reads its timestamp and cost, and decides whether to invoke (`scripts/run-agent-c-review-service-account:94-138`); the decision changes under a synthetic cost mutation in the probe. Also, `readdir(...).catch(() => null)` treats every directory read failure as absence, not just `ENOENT` (`:99-102`). **INFERENCE:** An unreadable root can be undercounted if another root remains readable; forged or omitted review records can affect spend decisions. This is a source-supported candidate requiring a separate bounded reproduction, not an observed live overspend. No runner or review file was modified.

## Observable bounds and independent sealing

**VERIFIED:** `git -C /Users/an2b/an2b/products/eidetic rev-parse HEAD` reported `4d03772b2d536faaf360ed1bf2eba0d3f4c27da5`. Before and after `git -C /Users/an2b/an2b/products/eidetic status --porcelain` outputs are recorded verbatim in `voltron-assessment-observations.json` and compared for equality. Initial output was:

```text
 M .gitignore
 M CLAUDE.md
?? AN2B_AUTONOMOUS_COMPANY_ORCHESTRATION_BLUEPRINT_2026-09-01.md
?? DEMO.md
?? ENGRAMPORT-VOLTRON-STATUS-2026-09-01.md
?? GOVSCOUT-AUDIT-2026-09-01.md
?? MCP-HANDOFF.md
?? NORMAN-AUDIT-2026-09-01.md
?? Norman-AN2B-Strategy-Deck.md
?? YESCHEF-AUDIT-2026-09-01.md
?? mission-control/
```

**VERIFIED:** This worktree's initial `git status --porcelain` output was empty. Subsequent porcelain is captured in the observations artifact; all assessment file creations are under `artifacts/agent-b/`. Publication uses only `events/agent-b/`. No shared source was edited. The post-assessment snapshot is taken before publication so that referenced artifacts can then remain immutable. The final verification and commit disposition are recorded separately in the completion body and final response.

**VERIFIED:** The bound agent-a seal commits `145db1a76f91601ff9f4ce956b6d890d6f990d5986c7c5bf8ce57230201e117a`, says `revealed: false`, and names `artifacts/agent-a/voltron-assessment-agent-a.md`. Only existence and Git path-history metadata for that named reveal path were checked; its contents and other agent-a assessment artifacts were not searched or read. Evidence: the bound seal digest above and the observations artifact.

**VERIFIED:** `git add --` for the five assessment artifacts and `scripts/agent-commit agent-b -F artifacts/agent-b/voltron-assessment-commit-message.txt` both failed to create `/Users/an2b/an2b/products/EngramPORT/.git/worktrees/EngramPORT-assess/index.lock` with `Operation not permitted`. The wrapper exited 128. Evidence: `voltron-assessment-observations.json`, `publication_preparation`. The files are unstaged, no commit exists for this work, and `sealed-before-reveal` is **blocked** by the filesystem permission boundary. No bypass or push was attempted. **INSUFFICIENT_EVIDENCE:** A path absence check cannot establish the absence of secret or differently named plaintext elsewhere.

## Supporting artifact digests

**VERIFIED:** Independently reproducible SHA-256 commitments to the supporting files, computed with Python hashlib and checked with `shasum -a 256` before publication:

- `artifacts/agent-b/voltron-assessment-observations.json`: `263f24d86d0d13322668964e004a91985487e51893023f08d51762037fb4b375`
- `artifacts/agent-b/voltron-assessment-probe.mjs`: `223b17afa8f94ed14e5e2726e2950e2bc224a36216dc7fb78295d7effaca3ec9`
- `artifacts/agent-b/voltron-assessment-probe-results.json`: `9f43658c31f0b99bc321955d1168b5d71983b26586e21b061258b54b625c0927`
