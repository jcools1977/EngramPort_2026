# Third-agent design — independent recommendation

Parent handoff: `01a03e28-a45e-78f3-b53d-f572d8c2f407`

This recommendation was written without reading
`artifacts/agent-a/third-agent-recommendation-sealed.md`. It is reading only. No
actor, harness, key, provider, network, model call, thread mode, production file,
or accepted control changed. `executed=` remains 103.

## 1. Role — cold falsification auditor, not a third implementer

**Recommend a narrowly scoped evidence-falsification seat.** The third agent
receives an immutable candidate commit, its claimed closures, and reproduction
commands after the builder has published them but before terminal acceptance.
It does not design the slice, implement the fix, or decide acceptance. Its job is
to produce counterexamples:

- trace each claim to the exact assertion that could falsify it;
- remove or bypass the named guard and verify that the claimed control actually
  turns red;
- inspect test isolation, residue, ownership/ACLs, concurrency, cleanup, and
  compound-command exit status;
- compare implementation, artifact, event, register, and external-fact scope for
  contradictions;
- distinguish synthetic proof from real operator/provider facts; and
- return either an accepted novel finding, a reproducible refutation attempt
  that did not land, or a precise statement that the claim is not testable.

The useful difference is **lack of slice ownership**. Agent-a architects,
reviews, and coordinates; agent-b implements, tests, and performs security
review. Both also carry long context and have sometimes reviewed work they
helped shape. A cold auditor has no delivery incentive and does not repair what
it finds. The coordinator must disposition its finding; the builder must repair
it separately.

This role is grounded in the register's actual failures: controls that stayed
green for the wrong reason, counts/messages that did not measure the claimed
thing, hidden stubs behind live labels, protected paths that never received the
canary, owner-excluding fingerprints, compound-shell exit misreads, DB-test
collisions, and a scheduler removed after evidence collection. Another general
architect or implementation agent would duplicate coverage. A dedicated
falsifier concentrates on the recurring epistemic failure: **the evidence says
green while the named property is not what was exercised**.

It should enter only selected high-risk reviews: migration ownership and ACLs,
`SECURITY DEFINER` boundaries, credentials/custody, concurrency/atomicity,
provider composition, operational closure claims, and any change to the proof
harness. It should not review routine prose or low-risk mechanical edits.

**Confidence: 0.91 (high).** The historical defect pattern is unusually
consistent.

**What would change this answer:** if a pilot shows its accepted findings mostly
concern architecture before code exists, move it earlier into design review; if
it repeatedly supplies implementation rather than counterexamples, the role has
collapsed into agent-b and should be stopped rather than broadened.

## 2. Model — Grok, for provider/model-family independence

**Recommend Grok as the pilot model.** The reason is not a capability ranking.
Claude and Codex already occupy Anthropic and OpenAI model families. A third seat
earns its cost only if correlated blind spots fall, and xAI supplies a genuinely
different provider/model lineage plus a concrete API credential DeVere already
controls. The actor should still be named neutrally (`agent-c`); a persona name
must not be mistaken for model identity or authority.

Fable has no accepted capability, provider, harness, or failure-mode evidence in
this repository. If it is a persona or wrapper over either existing model family,
it adds presentation diversity rather than epistemic independence. If it is a
separately trained model with a stable API, the answer should be decided by a
blinded mutation bakeoff, not branding: give both candidates the same withheld
historical false-green cases and compare unique reproducible findings, false
positives, protocol compliance, latency, and cost.

Grok is therefore the better **first hypothesis**, not a permanent entitlement.
No xAI call is authorized by this recommendation. The key is a new provider
credential and egress path requiring an explicit DeVere authorization and a
custody/non-retention boundary before the first call.

**Confidence: 0.66 (medium, the least certain item).** There is no repository
evidence from either candidate, so model choice is necessarily less grounded
than role and harness design.

**What would change this answer:** a blinded synthetic bakeoff where Fable (as a
truly independent model) produces materially more unique reproducible findings
at equal or lower false-positive/coordination cost, or evidence that Grok cannot
reliably use the bounded tool/protocol contract.

**What remains DeVere's:** provider budget, acceptable xAI data-processing terms,
and authorization to use the key. Engineering can recommend the experiment; it
cannot approve the external service.

## 3. Runtime — the harness is larger than the model choice

An xAI API call is not an EngramPort agent. **The harness is the larger piece of
work and the larger security decision.** A minimum credible third seat needs:

1. **Actor/protocol identity.** `actors/agent-c.yaml`, owned
   `events/agent-c/` and `artifacts/agent-c/` directories, declared review-only
   capabilities, deterministic Git author identity, and verifier/fixture coverage
   for three actors and prefix ownership. The Git push credential remains a
   higher operational root; an actor YAML record is not a cryptographic person.
2. **A supervisor, not raw autonomous shell.** A fixed policy layer reads
   `engramport.yaml`, `AGENTS.md`, and agent-c's actor file; runs proof before
   consumption/publication; consumes only addressed eligible work; enforces WIP
   one and the DB-test/scratch lock; exposes repository reads, approved test
   commands, scratch mutation work, and writes only to agent-c's artifact/event
   prefixes. Production repair remains unavailable to this role.
3. **Provider boundary.** Explicit xAI endpoint/model allowlisting, TLS/network
   egress restriction, rate/token/cost ceilings, timeout/retry/idempotency,
   request/response size limits, and a no-fallback rule. Provider errors must not
   become partial events or commits.
4. **Credential custody.** Resolve the xAI key from an approved secret manager
   into process memory only; never place it in Git, `.env`, argv, shell history,
   model context, logs, artifacts, diagnostics, or crash output. Run the existing
   credential detector on every candidate body/artifact before CLI append, while
   ensuring the model never receives the key in the first place.
5. **Agent loop and context.** Deterministic repository snapshot/commit pinning,
   bounded context selection, untrusted-event quoting, tool-call mediation,
   output validation, reproducible command transcripts, artifact hashing, CLI
   append, proof verification, commit, pull-with-rebase, conflict refusal, push,
   crash recovery, and a durable cursor/lease. Never force-push and never infer
   scratch staleness.
6. **Failure tests before real egress.** Synthetic provider responses and
   mutations for wrong actor/prefix/parent, prompt-injected project text,
   credential-shaped output, malformed tool calls, timeout, retry duplication,
   crash after artifact/before event, crash after event/before commit, rebase
   conflict, concurrent WIP, held DB lock, partial test output, and a process
   exit that disagrees with a nested command.
7. **Pilot telemetry in the log.** Each review records candidate commit, exact
   claims attempted, commands and exit codes, accepted/duplicate/false-positive
   disposition, dispatch-to-reply duration, additional relay count, token usage,
   and provider cost without recording prompts that contain unsafe project data.

The existing Port Watch WIP/cursor concepts and Git-v0 CLI are useful substrates,
but provider adapters are still stubs and no model tool loop exists. Wiring a raw
completion endpoint directly to shell and Git would be a new privileged agent,
not a harmless adapter.

**Confidence: 0.97 (very high).** The repository and protocol make the missing
surfaces directly observable.

**What would change this answer:** an existing audited harness that already
proves all seven surfaces could reduce implementation cost. A vendor SDK or API
client alone does not.

## 4. Protocol — keep `strict_relay` for the pilot, in linked audit threads

**Recommend `strict_relay` initially, not a three-way thread.** Agent-a opens a
dedicated audit thread addressed to agent-c after the candidate result commit and
before final acceptance. Agent-c replies to agent-a with its finding. Repairs are
dispatched to agent-b in a separate strict-relay thread or continuation. The
three agents participate in the project, but each authorization edge remains a
mechanically exclusive two-party relay.

This is deliberate experimental isolation. The pilot already introduces a new
model, provider, credential, harness, actor, and role. `coordinator_led` is tested
synthetically but has never carried an accepted live thread; `free_form` has the
same history. Changing the collaboration topology at the same time would make it
hard to tell whether failures came from the third model or the mode.

What strict relay loses is real: no sibling reviews on one parent, no direct
agent-b/agent-c exchange, duplicated context across linked threads, serial
latency, and agent-a as the manual bridge. That loss also protects the cold-audit
role: the auditor sees an immutable evidence package rather than negotiating a
fix with its author. The result is less conversational and more falsifiable.

After the pilot earns its seat, `coordinator_led` is the natural next experiment
with agent-a as coordinator. Before adoption, its operational addressing must be
tested—not only graph validity. The current verifier permits multiple worker
replies, but `next` is not enforced in coordinator-led mode while `inbox` still
uses one `next` and treats any reply as answering a parent. A three-worker
supervisor needs an explicit, tested assignment/discovery rule rather than
relying on workers to scan prose. `free_form` is not recommended for privileged
work because it removes even the coordinator hub and widens duplicate/WIP risk.

**Confidence: 0.80 (medium-high).** The safety/isolation argument is strong; the
cost is slower review.

**What would change this answer:** if linked strict threads account for most of
the measured latency or regularly lose context, and a synthetic coordinator-led
pilot proves addressed multi-worker inbox behavior, WIP exclusion, crash
redelivery, and terminal disposition, switch selected review threads to
`coordinator_led`.

## 5. Entry and kill criterion — a measured high-risk pilot

**Entry point.** Start only after actor registration, synthetic harness negatives,
credential custody, external-provider authorization, and one end-to-end
synthetic review have all passed. The first real assignments should be the next
eligible high-risk candidate results, after implementation and before acceptance.
Do not place agent-c in the critical path for every task.

**Pilot window.** Ten qualifying high-risk audits, capped at 60 calendar days.
Before the first audit, derive a baseline from the preceding ten comparable
two-agent reviews: median candidate-result-to-terminal-disposition time and
relay-event count. Agent-a must label every agent-c disposition in an event as
`novel-accepted`, `independent-confirmation`, `duplicate`, `false-positive`, or
`protocol-failure`, with the causal commit/finding.

**Keep criterion.** By audit ten, agent-c must have either:

- at least two `novel-accepted` findings/claim corrections, or
- one finding that prevented a terminal false acceptance,

and median disposition latency must be no more than 30% above the baseline.

**Kill criterion.** Retire the third seat at the end of the pilot if it misses
that contribution threshold **or** raises median disposition latency by more than
30%. This is intentionally demanding: a third full seat that only repeats one of
the existing reviews is not independence worth paying for. The event log supplies
the findings, dispositions, timestamps, and relay counts; the harness-supplied
usage field supplies cost.

**Immediate suspension criteria:** any credential exposure; out-of-prefix or
production write; bypass of proof, WIP, DB-lock, rebase, conflict, or approval
gates; force-push; fabricated execution; or a model response committed after a
provider/tool failure. One such event is evidence that the harness is unsafe,
not a reason to give the model broader discretion.

**Confidence: 0.84 (high).** The thresholds are measurable and tied to the role,
though ten reviews is a pilot rather than a statistical proof.

**What would change this answer:** a much lower review volume would require a
longer calendar window, but not a softer safety threshold. DeVere chooses the
budget cap and can stop earlier; engineering should not redefine duplicate work
as value to preserve the experiment.

## Ordered recommendation

1. Register a review-only `agent-c` whose sole job is cold evidence
   falsification.
2. Pilot Grok because it adds a third model/provider lineage; treat the choice as
   falsifiable by a blinded mutation bakeoff.
3. Build and prove the supervisor/harness before any xAI call; this is materially
   larger than choosing the model.
4. Keep the pilot on linked `strict_relay` audit threads, then evaluate
   `coordinator_led` separately if relay cost dominates.
5. Run ten high-risk audits/at most 60 days and keep the seat only if it produces
   unique accepted value within the 30% latency ceiling; suspend immediately on
   any safety/protocol breach.

Model/provider spend and external-service authorization remain DeVere's. The
role, protocol, harness gates, and kill measurement are engineering
recommendations. None is enacted here.
