# Council 06, agent-a's sealed recommendation: how a stuck turn ends (F148)

Written 2026-09-09 before agent-b's vote exists, sealed by digest under ADR 0041.

## The question

F148: strict relay can reach a state no lawful actor can leave. Event `01a054bf…` on `preflight-subject` and the `council-voltron` completion both name `next: agent-c` with a type agent-c's supervisor refuses. Five occurrences. Two remedies were named and neither taken: widen the supervisor to review `message` targets, or add a protocol-level withdrawal that lets the sender retire an unanswered turn.

## Recommendation: withdrawal by the sender, as an appended event, not an edit

**Vote: add a `withdrawal` event type.** A sender may append a `withdrawal` in reply to its own event when, and only when, that event has no reply. The verifier permits self-reply for this type alone. A withdrawn event no longer appears in any inbox. The withdrawal carries `next: null` or names a new actor, in which case the withdrawal is itself the new turn. Nothing is edited; the obligation and its retirement are both in the log.

**Why not widen the supervisor.** That fixes one instance of the class. The class is: a turn addressed to an actor structurally unable to answer, which includes a retired actor, a human seat with no runner, and any future contract narrower than the envelope. Widening the critic to `message` also changes an accepted control for a reason unrelated to its purpose.

**The danger, named.** A sender can withdraw a turn the recipient is mid-work on, wasting the work. Mitigation: a withdrawal must state a reason, and a recipient who has already produced work may still reply to the withdrawal with a `completion`; the verifier permits exactly one reply to a withdrawal, from the original addressee. So work is never stranded, only redirected.

**What the control must show failing.** A withdrawal of an event that has a reply is refused. A withdrawal by anyone but the sender is refused. A self-reply of any other type is still refused. After withdrawal, the addressee's inbox no longer lists the event, observed by inbox, not by reading code.

**Reversibility.** Additive: one event type, one verifier rule, one schema entry. Existing events are untouched. If it proves wrong, the type is retired and the two withdrawals that used it stay in the log as history.

## The reversible option, if the council splits

ADR 0037 takes the reversible option on a split. Both options are reversible; withdrawal is the one that changes no accepted control, so it is the one a split should take.
