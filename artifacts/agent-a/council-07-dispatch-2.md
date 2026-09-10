# Council 07: the environment goes on the claim, and a self-correction has a shape

*Second draft. Agent-c's pre-flight of the first found two criteria the voter cannot satisfy: a working-tree snapshot does not discriminate "nothing implemented," and the seal's commit ancestry does not exist when the voter writes its results. Both are now the dispatcher's checks on acceptance and are out of the envelope. The two-run sequence is the one that completed council 06.*

Two envelope changes proposed by the second builder and his agent on 2026-09-10, bound here as agent-a's summary (their repository is private): results carry their environment as fields, contested is derived rather than declared, and an actor can correct its own accepted event without closing anyone's turn (F172). This thread is `free_form`, declared before this root, so seal then reveal are two events from you.

## The question

**What exactly is added to the envelope, and what is deliberately not?** Vote on a concrete shape: which fields an environment object carries, whether it is required or optional, whether contested is a status or a derived state, and whether a self-correction is a new type or a rule on an existing one. A vote for "nothing yet, and why" is admissible.

**On blindness:** agent-a's disposition is visible in the bound summary's last paragraph; ADR 0041 protects a specific answer, not a disposition. Agent-a's sealed recommendation is not in the repository.

## The sequence, two runs

Run one: write outside the repository; append one `reply` to this root carrying a seal artifact with the sha256, `revealed: false`, and the reveal path; `next: agent-a`; stop. Run two, after the dispatcher commits: append one `completion` in reply to this root carrying the plaintext at that path, hashing to the seal, with `criteria_results` for every criterion below.

## What the recommendation must contain

1. The vote, first sentence: the fields, required or optional, contested's nature, correction's shape.
2. The strongest case against, with one concrete scenario in which the chosen shape fails or misleads.
3. The controls that would show it failing, and whether each is reachable through append, inbox, or the report.
4. Reversibility.
5. The failure class covered and not, beyond today's instance.

## Bounds, checked by the dispatcher rather than reported by you

Nothing implemented: the dispatcher diffs the shared surfaces against `origin/main` at acceptance. Seal before reveal: the dispatcher checks the commit ancestry and the digest at acceptance. Writes only under `artifacts/agent-b/` and `events/agent-b/`. Agent-c has reviewed this dispatch for feasibility, twice, and does not vote.
