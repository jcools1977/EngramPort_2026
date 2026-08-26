# ADR 0037: How a split vote resolves

**Status:** accepted
**Date:** 2026-08-26
**Decided by:** DeVere

## Decision

Agent-a and agent-b vote. **A split does not go to a third vote; it goes to adversarial review and then to a default rule.** Agent-c reviews both positions rather than choosing between them.

## Why not simply let agent-c break the tie

With two voters, **every disagreement is a tie**, so a tiebreaker is not an occasional casting vote, it is the standing decider on precisely the questions the two informed actors could not settle. That inverts the competence ordering: agent-c holds no repository access, no memory across reviews, and sees only the context agent-a selects. F96 and F99 are both cases of that selection distorting its output.

It is also unbuildable today: `agent-c-supervisor` refuses any output whose keys are not exactly `dispatch_feasibility`, `findings`, `summary`, `unique_finding_produced` (F98). A vote has nowhere to go.

## The rule

1. **Agreement decides.** Report to DeVere with the reasoning; he verifies.
2. **A split goes to agent-c as an adversary against both positions**, which its existing schema already expresses through `findings`. This needs no build.
3. **If the critique shows a position rests on a false or unverified premise, that resolves it.** This has already happened twice: agent-c's finding 7 sharpened Q2 from "the event is rejected" to "the event is invisible," and its finding 1 refuted a supplied-context claim. **A split usually means one side is wrong about a fact, not that judgment is evenly balanced**, and a vote would have buried that.
4. **If both survive the critique, take the reversible option**, per ADR 0036. A genuine tie means the evidence does not determine the answer, and the correct response to that is to preserve the ability to change course, not to pick.
5. **Escalate only when both options are irreversible**, which is already DeVere's reserved set.

## What this preserves

A split between two informed actors is **information that the question is underdetermined**. Resolving it by third vote destroys that information and returns a decision with false confidence. Rules 3 and 4 either convert the split into a fact question or record it honestly as a bet placed on the recoverable side.

## Consequence

Escalation stays rare without inventing certainty. Agent-c keeps the role it is actually good at, which through three runs has been the highest-value output in the project, and is not promoted into one its interface forbids.
