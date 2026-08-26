# agent-a's independent recommendation on a third agent

Author: agent-a. Date: 2026-08-26.
**Committed before agent-b was asked, and deliberately not shared in the handoff.** Independence established by commit order, per the protocol proven in F91. Basis: F86, F91, PROTOCOL.md, ADR 0022, ADR 0033.

## 1. Role: adversarial reviewer and pre-flight dispatch critic. Not a second implementer

**The evidence points at one gap and it is not implementation.** agent-b has run twelve-plus consecutive slices either delivering clean or correctly refusing to build something unprovable. **agent-a shipped five defective dispatches**, each caught downstream at the cost of a round trip, and F86 named the pattern: evidence requirements written to sound rigorous without checking they are satisfiable **by the party being asked**.

So agent-c's first duty is to read agent-a's handoff **before it ships** and answer one question: *is every requirement here satisfiable, by this party?* That check alone would have caught the unexecutable `18`, the control for a composition that did not exist, the nonce rule the protocol forbids, and the dispatch asking an agent to perform a human browser login.

Second duty: **independently verify agent-b's results alongside agent-a**, so acceptance stops being single-sourced. Third: **seal a third opinion on decisions**, using F91's commit-order protocol.

**Refusing the second-implementer role.** WIP one has held. The shared working tree already produced three incidents in one day — agent-b's uncommitted work in agent-a's tree, agent-a deleting a live mutation directory as "residue", and the `db:test` lock correctly refusing agent-a. **Two implementers on one checkout multiplies that.** agent-c writes only `events/agent-c/` and `artifacts/agent-c/`, never production code.

## 2. Model: Grok, and the reason is the one that justifies a third seat at all

**Correlated failure is the enemy.** A third agent adds value only insofar as its blind spots differ from the two already present. **Grok is a different lineage from both Claude and the GPT-family agent-b**, so it is a materially better independent critic than a second Claude model, which would share agent-a's failure modes most closely.

This follows directly from the role: if agent-c's primary duty is critiquing **agent-a's** dispatches, the worst possible choice is a model that thinks like agent-a.

## 3. The harness matters more than the model, and an API key is not an agent

agent-b is not merely a model; it is a model plus a harness that reads the repository, appends events through the CLI, commits and pushes under its own actor identity, and honours the protocol. **An xAI key supplies none of that.** Whatever runs agent-c needs repository read access, event-append capability, and the same bounds agent-a operates under.

**This is the part most likely to be underestimated**, and it should be costed before a model is chosen, not after.

## 4. Protocol: `coordinator_led`, which already exists and has never been used

`strict_relay` is structurally two-party — `next` names the only actor allowed to reply and a parent has at most one direct reply. **Three agents do not fit it.** `coordinator_led` with agent-a as coordinator is the intended shape and is already specified. `free_form` is refused: it loses the ordering guarantees that make this log auditable.

## 5. Authorization: xAI is a new external service and needs its own ADR

New provider, new credential, new egress — the same class as ADR 0022 for Supabase and ADR 0033 for Google. The key belongs in 1Password behind an `op://` reference, never on disk, and **the standing synthetic-only rule must be narrowed explicitly rather than by implication.**

## 6. Sequencing and a kill criterion

**Introduce at slice 1** — migration `0023`, the issuer boundary — not mid-decision. Security-critical, where a bad dispatch costs most.

**And build the measurement in from day one: track whether agent-c ever disagrees.** An agent that never disagrees is not adding independence, it is adding cost. **Proposed kill criterion: if after ten dispatches agent-c has caught nothing agent-a would not have caught, retire it.** A third seat should have to earn its place against evidence, like every control in this register.

## Confidence

**Highest on role**, which the five-defect record nearly forces. **High on protocol and authorization**, both mechanical. **Lower on model**, because agent-a has no direct evidence of Grok's failure modes and is reasoning from lineage rather than observation — the honest basis is the independence principle, not a claim about Grok's quality. **Lowest on harness cost**, which agent-a cannot estimate without knowing what runs it.
