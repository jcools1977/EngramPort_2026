# Excerpt of docs/constraints.md for council 06 pre-flight: F148 and F155, verbatim

### F148

**The log can reach a state that no lawful actor can leave.** Event `01a054bf-8947-7931-9b3e-8beff07f01cf` sets `next: agent-c` and `type: message`. Strict relay permits only agent-c to reply. Agent-c's supervisor accepts only `handoff` and `reply` as review targets and refuses `message` with `TARGET_REFUSED`. **The only actor permitted to close the turn is the only actor structurally unable to.**

**Nothing is corrupt and every rule is behaving correctly.** The verifier passes, the poller correctly excludes the event as unactionable, and the relay correctly refuses everyone else. **The turn is simply immortal**, and it will sit in agent-c's inbox for the life of the repository.

**This is a liveness defect, and the register has been recording safety defects almost exclusively.** Every control in this project asks whether something invalid can be accepted. None asks whether something valid can become permanently stuck. A protocol whose whole claim is that work is legible and resumable has a state in which work is legible and unresumable.

**Two candidate remedies, neither taken here.** Widen the supervisor to review `message` targets, which changes an accepted control and needs its own dispatch; or add a protocol-level withdrawal that lets the *sender* retire an unanswered turn, which strict relay currently forbids because it would let an actor edit the effect of an accepted event. **The second is the more honest fix and the more dangerous one**, and it is a design question rather than a repair.

**Not remediated. The stuck turn is left in place** as the standing example, because deleting it would destroy the only instance of the defect while proving nothing about the rule that produced it.


### F155

**The architect dispatched a decision to the critic and forbade it to decide, for the second time in nine days.** The `council-voltron-2` handoff asked agent-c whether "reopen the assessment" follows from ADR 0049 or is itself an amendment. Those are incompatible next states, and choosing one is a selection. The same event said *"Do not vote, rank, or select."* Agent-c returned `infeasible` and named four further defects: the controlling ADR's text was not supplied, only a paraphrase, which is F145 and F147 again since naming evidence is not delivering it; the attestation question was a non-discriminating test the dispatch itself had already conceded was unverifiable; the bounds said nothing is assessed while the body treated a fitness question as open; and a `dispatch` review returns feasibility rather than soundness, so the merits questions could not be answered in that mode by construction.

**F146 recorded this exact shape on 2026-08-30**, and the memory carried into the session that wrote this dispatch names it as agent-a's dominant defect. The dispatch was written anyway. A register that is not read before writing is a diary.

**Why it happened.** The prior thread was stuck (F148, fifth occurrence) and the architect wanted the council closed. Wanting closure produced a dispatch shaped like closure rather than like a question the recipient could answer.

**Remediation.** The thread is closed terminal with agent-c's review accepted in full. The council's converged position is recorded as ADR 0050 by agent-a under the ownership DeVere delegated on 2026-09-08, with ADR 0035's warning stated inside it. Agent-c is not asked again; the merits questions belong to the voters. Cost of the review, as agent-c reported it: 11,613 tokens.

**What this does not fix.** No control refuses a dispatch to agent-c whose completion criteria require a selection. The critic catches it, at the price of a review. That is the same "detected by the reviewer rather than by a control" gap F145 recorded, and it is left open deliberately: a control that scans criteria text for words like "verdict" is F105 again, a check satisfied by rewording.

