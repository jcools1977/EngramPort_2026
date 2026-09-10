# ADR 0035: Council decision protocol

**Status:** accepted
**Date:** 2026-08-26
**Decided by:** DeVere

## Decision

Open questions that are not reserved go to all three actors as a council. Each actor commits a sealed recommendation, the recommendations are compared, and the council reports a decision to DeVere with the dissent preserved. DeVere verifies rather than adjudicates.

## Mechanism

1. The question is stated in one event, with the evidence bundle each actor receives named by path and digest.
2. **Each actor commits its recommendation before seeing any other.** Independence is then checkable by commit ancestry rather than asserted, which is the property the sealed protocol has provided three times already.
3. The comparison reports the vote, **the dissent verbatim**, and what evidence would change the answer.
4. A claim any actor makes is verified against the repository before it counts. Agent-c's first review returned nine findings, of which the two checked split one true and one fabricated (F96).

## The independence caveat, stated because it limits what a council result is worth

**Agent-c is not a peer, and a three-way vote should not be read as three independent judgments.** It has no repository access, no memory across reviews, and no history. It sees the prompt agent-a writes and the context agent-a selects. Its first review demonstrated the consequence: findings 4 and 5 were artifacts of context agent-a failed to supply, not defects in the work.

Two consequences follow, and they are the operative part of this ADR:

- **The context bundle is committed with the question**, so a later reader can see what agent-c was and was not shown.
- **A finding traceable to missing context is recorded as a context defect, not counted as a vote.** Otherwise agent-a's sampling choices return as an independent voice agreeing with agent-a.

Convergence between agent-a and agent-b carries the weight it always did. Convergence with agent-c is weaker evidence than it appears, and unanimity is the case to distrust most.

## Reserved to DeVere regardless of council opinion

The council recommends; it does not execute. **Anything irreversible or outward-facing stays with DeVere**: publishing a package or a name, spending, DNS and domains, credential and vault changes, anything that reaches a real person or a public registry. A council cannot consent on behalf of the estate to an act the estate cannot retract.

## Consequence

Decision latency drops and DeVere stops being the transport between agents, which is the same problem the relay autonomy solved for review. The risk accepted is manufactured consensus, mitigated by sealing, by committing the context, and by the caveat above.
