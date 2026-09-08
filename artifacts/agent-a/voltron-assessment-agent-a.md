# EngramPort assessment of the Voltron brief: agent-a, sealed 2026-09-08

Written outside the repository before agent-b's assessment exists, sealed by digest under ADR 0041, and revealed after agent-b's completion lands. Labels follow the brief: VERIFIED cites an exact current path and line, event id, ADR, finding id or digest; INFERENCE cites its premises; INSUFFICIENT_EVIDENCE means not safely answerable from current artifacts.

## Snapshot binding, checked before anything else

- The brief at `/Users/an2b/an2b/products/eidetic/voltron/ENGRAMPORT_AGENT_HANDOFF.md` hashes to `46c06dc19af6c2e2451f3c1f703cce1edb68f2a996ac63196e2931f8e7499332`, 17,850 bytes, modified 2026-08-31 16:59. ADR 0049 recorded `05a1275f...` on 2026-08-31. **VERIFIED: the brief was revised after the deferral was recorded.** Its stated preparation date did not change.
- The manifest at `.../voltron/protocol/manifest.json` hashes to `c0edd38fdc8ebc201634d477305a18aec69d3c696a0b4b683ceb5029f25f8dfd` over raw bytes, modified 2026-09-01 13:39. The brief states `6308bfece6807bed69487c7db7e63d570975748616ee99576ea8c662f005a5a9`. Sorted-compact, sorted-compact with newline, and two-space-indented serializations do not produce the stated value either. **VERIFIED: the manifest on disk is not the manifest the brief binds.** The parent workspace HEAD `4d03772b...` matches the brief.
- Consequence: every statement in this assessment about Voltron's canonical inventory is **INSUFFICIENT_EVIDENCE**, because the brief's own instruction is to verify the manifest digest before drawing conclusions and the verification fails. The assessment proceeds because the twelve questions are about EngramPort, whose files I can cite.

## The twelve questions

**1. Actual architectural role today.** VERIFIED. An append-only, content-addressed Git event log with an actor registry, a whole-log verifier, and a turn discipline; `PROTOCOL.md`; `packages/git-adapter/src/event-core.mjs`; `packages/git-adapter/src/verify-log.mjs`. Everything else is a projection that can be deleted and rebuilt: `docs/architecture/port-family.md`, "Port Log is truth." A PostgreSQL schema exists (migrations 0001 to 0025) for tenancy, OIDC and claims experiments; Git is the source of truth today, and ADR 0042 records without resolving whether that changes at its stage 4. There is no server between builders (ADR 0039).

**2. Primitives by name.**
- Custody: **none in Voltron's sense.** `packages/git-adapter/src/custody-service.mjs` is a Vault transit signing boundary and a credential-leak canary harness. It signs digests with a KMS-held key and never takes custody of an artifact. VERIFIED; the name is a collision, not an overlap.
- Durable events: `content_sha256` over the normalized body and `intent_sha256` over the canonical append intent, `verify-log.mjs:69-86`. VERIFIED.
- Causal ordering: `in_reply_to`, one root per thread, unknown parents and cycles rejected, `PROTOCOL.md` "Strict relay". VERIFIED.
- Replay: the log is the replay. Delivery position is log-derived, `SECURITY.md` "Derived state is disposable"; `resolveWorkInbox` in `event-core.mjs` computes an inbox from `next` and unanswered replies. VERIFIED.
- Identity: an actor slug string, unauthenticated. `SECURITY.md` "It does not authenticate authorship"; F111, F127. VERIFIED.
- Trust: none. Actor records name no key; `docs/security/attribution-hardening.md` step 2, "names no key." VERIFIED. There is nothing a Trust Bundle could pin.
- Policy versioning: only `thread_config_sha256`, which binds a thread's mode declaration into its root event, `event-core.mjs` "readThreadDeclaration". VERIFIED. Nothing versions any other policy.
- Delivery: inbox derivation plus Port Watch leases, `packages/port-watch/src/index.mjs:124-138` (`wx` claim files) and `PostgresClaimStore` (`acquire_port_watch_claim`). Bounded context is digest-verified before delivery to the critic, `bounded-context.mjs`, F145, F149. VERIFIED.

**3. Byte preservation.** VERIFIED, and the answer is split. **Event bodies are not preserved.** `hashBody` normalizes CRLF to LF, strips trailing whitespace and appends one LF (`verify-log.mjs:69-71`), and the writer emits `input.body.trimEnd() + "\n"` (`event-core.mjs`, the `source` assembly). Frontmatter is outside the hash (`PROTOCOL.md`). **Artifacts are preserved.** The verifier recomputes `sha256` over the raw file bytes and fails on mismatch, `verify-log.mjs:484-495` and `533-540`. So an opaque signed Voltron artifact belongs in `artifacts/<actor>/` referenced by `path#sha256=`, never in a body. **With one defect: F156.** An artifact above 64KB is refused at append as a credential, observed today with a clean 92,569-byte file. Until fixed, the custody ceiling is 64KB and the refusal is mislabeled.

**4. Authority boundaries.** VERIFIED: **the log carries no field that means "authorized."** A `completion` carries `criteria_results` whose `status` is validated for shape only (`satisfied`, `unmet`, `blocked`); acceptance is a separate event by the dispatcher, and nothing distinguishes "satisfied" from true. A `type: decision` event can be written by any committer under any actor (F127). **Can delivery or completion be mistaken for authorization? Yes, by any consumer that chooses to read them that way, and nothing in the protocol stops it.** Delivery is a lease on an inbox entry, `port-watch/src/index.mjs`; it confers nothing.

**5. Identities.** VERIFIED. Agent identity is the actor slug; workflow identity is the thread slug; project identity is `engramport.yaml` `project:`, one per repository. **Tenant and subject do not exist in the Git protocol.** They exist in PostgreSQL for the tenancy and OIDC work (ADR 0027, migrations 0022 and 0023) and are not consulted by append or verify. **Humans have no seat in this log.** Three actor records exist, all `kind: agent`; DeVere holds none (F147), and the turn decision refuses to automate a human seat (`turn-decision.mjs`, `NOT_AUTOMATABLE`). A human authorization therefore cannot be recorded under the human's own identity today.

**6. Idempotency, duplicates, ordering, retries, partial failure.** VERIFIED for the following. Append is idempotent on (UUIDv7, canonical intent): a retry with the same id and intent returns the existing event with `reused: true`; the same id with a different intent throws `APPEND_INTENT_COLLISION` (`event-core.mjs`, `V1_RETRY_INTENT_MATCH`, `V1_RETRY_COLLISION`). This is intent-level idempotence only and proves no caller possession (`packages/sdk/README.md`). Duplicate delivery: Port Watch claims are at-least-once under a lease; a consumer must be idempotent. Out-of-order: ordering is causal, not temporal; an event whose parent is absent fails verification, so a clone cannot present a child without its parent. Partial failure: the writer creates with `wx`, re-verifies the whole log, and removes its own file if verification fails. Push rejection is pull-with-rebase, never force (`PROTOCOL.md` "Safe publish sequence"). **Liveness is not guaranteed:** F148 records a state no lawful actor can leave, and it has recurred five times.

**7. Store an opaque signed artifact and prove it unchanged.** VERIFIED, partially. Yes for bytes: the digest in the referencing event is recomputed over the file at every verification. Three limits. The artifact must sit inside the referencing actor's prefix (`verify-log.mjs:537`). It is refused above 64KB today (F156). And the proof is that **the bytes match what the referencing actor committed to**, which is not proof of who produced them or that the referencing actor is who it claims (F127). Voltron's `payload_sha256` would be checked by Voltron's verifier; ours proves custody integrity from the moment of append, and nothing before it.

**8. Envelope or schema to reuse.** VERIFIED against `schemas/event-v1.schema.json`. Mapping the brief's envelope sketch: `payload.bytes` becomes an artifact file; `payload_sha256` becomes the `#sha256=` on the reference; `causal_parents` maps to a single `in_reply_to` plus up to 32 `bounded_context` references, which is a fit only if one parent is primary; `received_at` has no honest counterpart, because `occurred_at` is derived from the event id's timestamp and the id is caller-suppliable (`event-core.mjs:96-97`, `occurredAtForId`), so it is neither a custody time nor a source time. `canonical_digest`, `tenant_id`, `subject`, `status` and `authority_source` have no fields and would be body text, which is unverified prose. INFERENCE: reuse the artifact reference and the causal links; do not reuse the event envelope as a custody envelope.

**9. Duplication.** INFERENCE from the VERIFIED primitives above. Voltron would duplicate nothing by keeping its own signed custody chain, because EngramPort has no signing at the event layer (F113) and no keys to pin. EngramPort would duplicate nothing by staying a log. The genuine overlap is small: content addressing of artifacts, causal linking, idempotent append, and digest-verified delivery. The manifest's 37 artifacts are INSUFFICIENT_EVIDENCE for overlap claims, per the binding failure above.

**10. Conflicts.** VERIFIED where cited.
- `occurred_at` is caller-controlled and named as if it were an observation time. Voltron's temporal-sufficiency rule refuses to treat storage time as fact time; EngramPort's field is neither, and its name invites the confusion.
- Body normalization versus byte preservation, question 3.
- One parent per event versus Voltron's multi-parent chains; in `strict_relay` a parent may have at most one reply, so a fan-out from one bundle to several receipts cannot be modeled; `free_form` permits it (`PROTOCOL.md`).
- Any committer, any actor, versus a system whose whole claim is that authority is never silently acquired. This is the disqualifying one.
- No human seat, versus a protocol that models human authorization as a stage.
- A 64KB mislabeled ceiling on artifacts (F156).

**11. Smallest reversible experiment.** INFERENCE. Offline, in a temporary directory, no keys of consequence: scaffold a `free_form` project with one actor; write a synthetic Memory Evidence Bundle signed with a throwaway key as an artifact; append one event referencing it; clone; run Voltron's Python verifier on the bytes read back from the clone; flip one byte and show both verifiers fail; **then append an event from a second, unregistered-in-spirit actor claiming custody of the same artifact and show EngramPort accepts it.** The last step is the experiment's point: it demonstrates F127 live rather than citing it. Include one artifact above 64KB so F156 is observed by the other side too. Nothing in either system changes.

**12. Outside the trust decision, or a signed custody role in the Trust Bundle?** INFERENCE from VERIFIED premises: **outside, and not a candidate for inside.** A Trust Bundle pins keys; EngramPort's actor records hold none, its events carry no signature, and its authorship is unauthenticated by measurement. The only true statement EngramPort could make in a Trust Bundle is that it makes none. This does not change until the ADR 0050 reopening condition is met and observed failing in both negative cases.

## ADR 0050's invariant, answered

**Can changing or forging a log entry change a consequential decision without independently authenticated authorization?** For any consumer that reads this log to decide anything: **yes.** The consumers for which that is true today are every projection in `docs/architecture/port-family.md`, the agent-c supervisor's context assembly, Re:PORT's claim manifest, and any human reading the log during an incident. The consumers for which it is false are the ones that do not exist. A record role is therefore a permission, and agent-b was right that it cannot be granted by wiring.

## Seven-part response

1. **Fit:** partial for opaque, digest-verified transport of artifacts between mutually trusting builders; **architectural conflict** for any custody, identity or authority role.
2. **Current overlap:** artifact content addressing, causal links, idempotent append, digest-verified delivery to reviewers, at-least-once leases.
3. **Missing primitives.** In EngramPort: authenticated authorship with keys bound in actor records; a custody time that is not the id time; multiple causal parents; tenant and subject in the envelope; a human seat; artifact scanning at the policy limit (F156); a liveness rule (F148). In Voltron: nothing for transport, provided it treats every EngramPort field as unauthenticated data.
4. **Authority-risk review:** self-reported `criteria_results`; unauthenticated `type: decision`; caller-controlled `occurred_at`; a `next` field that reads like an assignment of authority and is a routing hint; the absence of a human seat, which pushes human approvals into prose under a machine's name (F141).
5. **Minimal experiment:** question 11.
6. **No-go conditions:** F127 unchanged; any consumer reading the log for authorization; any presentation of a custody digest as evidence of authorship; any production credential in any path.
7. **Recommended timing:** the assessment, now, which this is. Integration, **not at all** until the ADR 0050 reopening condition is observed, and then only as the transport role in part 1.

## Candidate findings produced by this assessment

- F156, recorded: artifact append refuses clean files above 64KB as credentials.
- The brief's manifest digest does not bind the manifest on disk. That is Voltron's to record, not ours; it is reported here so it is not lost.
