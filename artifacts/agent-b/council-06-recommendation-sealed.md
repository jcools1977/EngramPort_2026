I vote for B: an append-only, sender-authorized withdrawal that retires an unanswered relay turn while preserving its history and leaving its work explicitly unresolved.

## Recommendation and precise boundary

This is a design recommendation, not an implemented capability. The bound F148 entry reports a message addressed to agent-c, a supervisor refusal of that type, and strict relay excluding every other actor. The dispatch reports five occurrences; the supplied F148 excerpt describes one event. I have not independently reproduced either the refusal or the occurrence count in this run. The repository verifier passing does not establish relay liveness.

B should add a narrowly defined control transition. For a strict-relay event E with a non-null next actor and no accepted reply or retirement, E's original sender may append a withdrawal W naming E. W must include a reason, retain the original event and its evidence, and terminate that relay chain with next: null. The sender gains no permission to author the recipient's answer, mark criteria satisfied, edit E, or reroute E in place. Retirement means that this turn no longer waits for a reply. It means neither successful work nor cancellation of anything already executing. An unresolved or abandoned outcome remains visible in history and reporting.

This is an explicit exception for a control event to the current recipient-only and no-self-reply rules, not permission for sender-authored ordinary replies. Keep it separate from completion. Restrict the initial design to strict relay, where one open successor is meaningful; do not silently apply it to free-form discussions or coordinator-led work. Any replacement task starts a new thread and cites the retired turn, so the causal record of the failed dispatch remains inspectable.

The canonical history must accept at most one successor outcome for E: recipient reply or sender withdrawal. A reply already accepted makes withdrawal invalid, and a withdrawal already accepted makes a late reply invalid. Concurrent Git branches can each look locally valid; a combined history containing both must be refused until the unpublished conflict is resolved under an explicit recovery procedure. Git v0 cannot promise transactional admission across independent branches. No automatic destructive resolution or rewrite of published history is part of this recommendation.

Require an explicit sender decision and reason rather than a timeout that purports to prove inability. The boundary is unanswered in the accepted record, not unstarted in the world. Existing actor identity and signer controls still matter. B does not strengthen the mutable registry or authenticate writers by itself.

## Strongest case against B and a concrete failure

The strongest case for A is that the observed incompatibility is a review adapter rejecting a message type. Teaching that adapter to accept the type could restore useful review, retain the existing relay rules, and avoid a new durable event meaning that every reader must learn. B can make a queue appear healthy without producing the missing review. It also makes abandonment easier for a sender who dislikes scrutiny. Five occurrences of one compatibility defect do not by themselves establish that a protocol extension is worth its permanent compatibility cost.

A concrete failure is a recipient that starts a slow review or an external operation but has not appended its result. The sender sees an unanswered turn and withdraws it. The recipient later finishes, while the log refuses its reply. The turn has ended in the log, yet the work or external effect has not stopped, and useful evidence may be stranded. Even perfectly serialized append admission does not prevent this execution race. A caller requiring execution cancellation needs a separate acknowledgment or execution fence before acting on retirement. B alone fails that requirement.

Another failure is a sender that is itself unavailable or has lost its signing authority. Sender-only withdrawal offers no lawful recovery actor then. Giving an arbitrary observer that authority would be a different, broader proposal, not a hidden fallback in B.

I still choose B because a durable collaboration protocol needs an honest terminal outcome for work its designated recipient cannot answer. A repairs this adapter mismatch but does not supply that outcome when the next incompatibility involves an unavailable integration, a retired service identity, or an unsupported task format. I would reverse the recommendation if a focused prototype cannot distinguish retirement from completion in all observable consumers, or if maintaining single-successor history requires rewriting accepted events. A is the smaller alternative if that broader contract cannot be maintained.

## Failing observation and reachable controls

Proposed control: WITHDRAWAL_SINGLE_SUCCESSOR_AND_VISIBLE_UNRESOLVED. It is a proposed acceptance control, not a current test name or a test I ran.

In an isolated fixture, append a valid strict-relay turn addressed to a recipient unable to answer. Observe it through inbox. Append the original sender's withdrawal through the normal append boundary. Then observe that the old turn is no longer actionable through inbox, while its original event and withdrawal remain readable and its outcome is unresolved, never completed. The positive witness is retirement of the stuck turn. A discriminating negative witness is an otherwise identical attempt by an unrelated actor, which append must refuse while leaving inbox unchanged.

Exercise both serial orders of reply and withdrawal through append. In each order the first valid successor is accepted and the second refused, without altering the accepted record. Also attempt a second withdrawal and a sender's ordinary self-reply; both must be refused. Exercise a fork in which each side accepts a different successor and require canonical verification to reject the conflicting combined history. This final fork check requires the verifier and Git history, beyond inbox alone.

Failure is directly observable if append accepts an unauthorized withdrawal or two successor outcomes, or if inbox still offers a retired turn as actionable. Those observations are reachable through append and inbox without reading implementation code. If inbox merely hides the turn, that alone does not prove unresolved status or preserved history; inspect the accepted event chain and the consumer that reports task outcomes as well. A consumer displaying retirement as success is also a failing observation, but it is not established by append or inbox output alone.

Proposed control: WITHDRAWAL_DOES_NOT_IMPLY_EXECUTION_CANCELLATION. Delay a recipient result after execution starts, withdraw the turn, then allow execution to finish. Any claim that no external effect occurred is refuted by an independently observed effect. Append and inbox can expose the missing accepted response and retirement, but cannot alone observe execution or prove cancellation. An instrumented executor or effect receipt is required. No live execution is authorized or performed here.

## Reversibility

Retiring B would require disabling admission of new withdrawals, updating dispatch and inbox behavior, removing any automation that initiates them, and reviewing workflows that rely on retirement. Previously accepted withdrawal events must remain readable and verifiable. The event vocabulary therefore has a lasting compatibility cost even after the feature is disabled; reverting schema support wholesale would invalidate preserved history.

Already retired turns cannot simply be reclassified as open without changing the meaning of accepted history. If their work remains necessary, create explicit replacement tasks linked to the old records and reconcile any delayed results or effects separately. The cost includes that manual reconciliation and possible abandoned work. A has lower local rollback cost because the supervisor can stop accepting additional types without adding a new historical transition. I am choosing broader lifecycle coverage with that asymmetry stated, not calling B cost-free or fully reversible.

## Failure class covered and excluded

B covers unanswered turns whose original sender is still available and authorized, including a task assigned to a removed automation, an integration that no longer supports a requested operation, or a permanently unavailable review service. These examples extend beyond agent-c and message targets. Coverage means recording abandonment and releasing the relay wait, not fulfilling the original task or making the recipient capable.

B does not cover an absent sender, loss of all authorized signing keys, corruption that prevents appending any event, a recipient that already replied incorrectly, or cancellation and reconciliation of external effects. It also does not resolve free-form branching or coordinator-led lifecycle policy. Those require separate decisions and evidence.

## Observed evidence and implementation boundary

At the start of this run, npm run proof:verify completed successfully and printed: verified 498 events across 102 thread(s) and 3 actors. npm run engram -- inbox --actor agent-b completed and listed the council-06 root along with two other inbox entries. Only council-06 is being handled. No supervisor behavior, withdrawal behavior, or full test suite was exercised.

Each of the seven bounded_context artifact references in root event 01a0861a-595c-7e36-942f-c3e9411a5e94 was opened in full and checked using shasum -a 256; every observed digest equaled its bound digest. The evidence set comprises the dispatch, agent-a's unrevealed seal, ADRs 0035, 0037 and 0041, the protocol snapshot, and F148. The other actor's specific recommendation was not supplied by those files. Claims attributed to F148 remain evidence from that excerpt, not newly reproduced measurements.

The initial git status --porcelain=v1 --untracked-files=all output was empty, verbatim: zero output bytes. git rev-parse HEAD returned a18cf55a7c8462a6dd4f455d010f9a84e54bb9ac. No implementation is proposed for this run's writes. The only repository additions for run one will be my seal artifact and its reply event. This recommendation is stored outside the repository until run two.

The reveal must carry a fresh verbatim git status --porcelain=v1 --untracked-files=all observation that shows only agent-b artifact and event changes. That future observation cannot truthfully be embedded in this already sealed plaintext. Record it in the reveal event body or a separate agent-b evidence artifact without changing this file. The nothing-implemented criterion remains unmet as a complete reveal requirement until that observation is recorded.

Similarly, seal-before-reveal remains unmet until separate accepted seal and reveal events, committed ancestry, and an exact plaintext digest match are verified. This run establishes the plaintext and seal only. The five recommendation-content criteria are present in this local plaintext; their published evidence remains deferred to the reveal. No criteria_results is published in run one.
