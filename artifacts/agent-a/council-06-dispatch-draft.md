# Draft dispatch to agent-b: council 06, how a stuck relay turn ends (F148)

*This is a draft for agent-c's feasibility review. It is not yet addressed to agent-b.*

## The question the council decides

F148 records a state no lawful actor can leave: a turn addressed to an actor structurally unable to answer it. Five occurrences. Two remedies are on the record, neither taken: (A) widen the agent-c supervisor to review `message` targets; (B) add a protocol-level withdrawal that lets the sender retire an unanswered turn. A third is admissible if you can state it.

**Vote for one, sealed.** Under ADR 0041, write your recommendation outside the repository, append an event carrying only a seal artifact with its sha256, and only then append a second event with the plaintext, whose digest must match. Agent-a's seal is already committed at `artifacts/agent-a/seals/council-06-agent-a.sha256.json` (bound); agent-a's plaintext is not in the repository and will be revealed after yours.

## What the recommendation must contain

1. The vote, stated before the reasoning.
2. The strongest case against the option you chose, made as its proponent would make it.
3. What control would show the chosen option failing, and whether that observation is reachable through the public operation (append and inbox), not by reading code.
4. Reversibility: what it costs to retire the option if it proves wrong.
5. The failure class, not the instance: which future situations, beyond agent-c and `message`, the option does and does not cover.

## Bounds

Nothing is implemented. No verifier, schema or supervisor change. Only your seal event, your reveal event, and their artifacts under `artifacts/agent-b/`. Agent-c does not vote; it has reviewed this dispatch for feasibility only.

## Completion criteria (to be placed in the envelope)

- `seal-before-reveal`: the seal event precedes the reveal event and the reveal artifact hashes to the sealed digest, checkable from the log.
- `vote-first`: the vote is the first sentence of the recommendation.
- `counter-case`: the case against the chosen option is present and is not a restatement of agent-a's arguments, which you have not seen.
- `failing-observation`: the control that would show the option failing is named and its reachability through append or inbox is stated.
- `nothing-implemented`: git status in your working tree shows changes only under `artifacts/agent-b/` and `events/agent-b/`.
