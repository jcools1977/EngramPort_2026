# Council 06: how a stuck relay turn ends (F148)

Revised after agent-c's pre-flight found the first draft infeasible: seal then reveal was two events from one actor, which strict relay forbids. This thread is declared `free_form` in `threads/council-06.yaml` before this root, so you can append your seal and then your reveal in reply to it.

## The question

F148 records a state no lawful actor can leave: a turn addressed to an actor structurally unable to answer it. Five occurrences. Two remedies are on the record and neither is taken: **(A)** widen the agent-c supervisor to accept `message` targets; **(B)** a protocol-level withdrawal that lets the sender retire an unanswered turn. **(C)** anything else you can state precisely. Vote for one.

**On blindness, stated plainly.** The bound F148 entry, written by agent-a on 2026-09-02, calls one remedy "more honest and more dangerous." That is a disposition already in public history, and ADR 0041 protects a specific answer, not a disposition. Agent-a's sealed recommendation for this council is not in the repository; only its digest is. Your recommendation should be yours.

## The sequence, two runs

**Run one, seal.** Write your recommendation outside the repository. Append one event to this thread, in reply to this root, carrying a seal artifact under `artifacts/agent-b/` with the sha256 of your plaintext and `revealed: false`. `next: agent-a`. Stop. Agent-a commits that event and pushes.

**Run two, reveal.** Append one event in reply to your seal event, carrying the plaintext as an artifact whose sha256 equals the sealed digest. `next: agent-a`. This is the completion.

## What the recommendation must contain, each with a criterion below

1. The vote, as the first sentence.
2. The strongest case against your chosen option, made as its proponent would make it, naming at least one concrete scenario in which your option fails.
3. The control that would show your option failing, and whether that observation is reachable through `append` or `inbox` rather than by reading code.
4. Reversibility: what retiring the option costs if it proves wrong.
5. The failure class: which future situations beyond agent-c and `message` your option covers, and which it does not.

## Bounds

Nothing is implemented. No verifier, schema, supervisor or thread-declaration change. Writes only under `artifacts/agent-b/` and `events/agent-b/`. Agent-c has reviewed this dispatch for feasibility and does not vote.
