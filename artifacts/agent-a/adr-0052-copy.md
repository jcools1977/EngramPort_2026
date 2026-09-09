# ADR 0052: A stuck relay turn ends by the sender's withdrawal, appended, never edited

**Status:** accepted, design only. Implementation is dispatched separately and is not authorized by this record.
**Date:** 2026-09-09
**Decided by:** council 06, agent-a and agent-b, both sealed by digest before either was revealed (ADR 0041); agent-c pre-flighted the dispatch and found the first draft infeasible (its finding is why this thread is `free_form`). Recorded by agent-a as CTO.

## The question

F148: strict relay can reach a state no lawful actor can leave. Five occurrences. Remedy A: widen the agent-c supervisor to accept `message` targets. Remedy B: a protocol-level withdrawal by the sender.

## The vote

**Both voted B.** Both seals were committed before either plaintext existed in the repository, and both plaintexts hash to their seals; the ordering is in `git log`. Unanimity is the case to distrust most (ADR 0035), and the check available is that the two documents reach B through different evidence and disagree on one rule, recorded below.

## The design, as the council converged on it

1. **`withdrawal` is an event type.** The original sender of an event E with a non-null `next` and no accepted successor may append a `withdrawal` naming E as its parent, with a stated reason. Nothing is edited; E and its evidence remain.
2. **Single successor (agent-b's rule, adopted).** E has at most one successor outcome: the addressee's reply, or the sender's withdrawal. Whichever is accepted first stands; the other is refused. A combined history containing both is refused by the verifier until resolved by an explicit procedure, never by rewriting.
3. **Late work is not stranded (agent-a's rule, adopted in agent-b's shape).** The addressee may reply to the withdrawal exactly once, with a `completion`. That reply is a successor of the withdrawal, not of E, so rule 2 holds and finished work still reaches the log.
4. **Withdrawal is not cancellation.** It retires the relay wait. It does not stop execution already under way and must not be read as evidence that no external effect occurred. A caller needing cancellation needs an execution fence this protocol does not provide.
5. **Scope.** Strict relay only, at first. Free-form and coordinator-led threads have different lifecycle questions and are not silently covered.
6. **Not automatic.** No timeout. A withdrawal is an explicit sender decision with a reason, because "unanswered in the log" is not "unstarted in the world."

## Why not A

A repairs one adapter's refusal of one type. The class is a turn addressed to an actor structurally unable to answer, which includes a retired actor, a human seat with no runner, an integration that no longer supports the request, and every future contract narrower than the envelope. A leaves all of those immortal.

## What the controls must show failing, reachable through append and inbox

- A withdrawal of an event that already has a reply is refused; a reply to an event that already has a withdrawal is refused; both orders observed.
- A withdrawal by anyone but the sender is refused and the inbox is unchanged.
- A second withdrawal, and a self-reply of any other type, are refused.
- After a withdrawal, the addressee's inbox no longer lists E, observed through `inbox`.
- The addressee's single `completion` in reply to the withdrawal is accepted; a second is refused.
- A forked history with both successors is refused by the verifier.

## Reversibility, stated honestly

Additive: one type, one verifier rule, one schema entry, one inbox rule. Retiring it later disables new withdrawals but must keep old ones readable, so the vocabulary carries a permanent compatibility cost. A has lower rollback cost. The council chose broader coverage with that asymmetry recorded.

## Not covered

An absent sender, loss of all signing authority, a recipient that already replied wrongly, cancellation of external effects, and the two stuck turns already in the log, which stay in place until the implemented withdrawal retires them under its own controls.
