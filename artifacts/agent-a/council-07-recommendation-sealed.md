# Council 07, agent-a's sealed recommendation: the environment goes on the claim

Written 2026-09-10 before agent-b's vote exists, sealed by digest under ADR 0041.

## The question

Nick, the second builder, answered how two builders should handle a disagreement about a fact (recorded on `environment-on-the-claim`): environment as fields on every result; "could not reproduce" as the recipient's own `blocked` with its environment; contested computed from conflicting results, never declared; acceptability disagreements not modeled, owner decides. Separately, his agent found that a self-correction has no shape that leaves the reviewer's turn open (F172). Both change the envelope. What exactly is added?

## Vote

**Add an optional `environment` object to every `criteria_results` entry, required from the next schema version on, with exactly four fields: `version`, `platform`, `tree_shape`, `observed_at`.** `version` is the package version the result was produced against; `platform` is `process.platform` plus the Node major; `tree_shape` is the actor-stated relation of the log to the repository root, as a short string such as `subdirectory:coordination` or `root`; `observed_at` is when the command ran. Nothing else. A fifth field will be proposed within a week and should be refused until an actual disagreement needs it.

**Contested is derived by the report layer, not declared by any actor**: two results for one criterion id with conflicting status and differing environments. It clears when a later result carries `satisfied` in both environments, or when the criterion's owner re-states the criterion naming the environment it assumed. No `contested` status exists in the vocabulary, on purpose.

**Add a `correction` event type** whose parent must be the same actor's own accepted event, which carries no criteria, which the inbox ignores exactly as it ignores a withdrawal, and which a reader lists beside the corrected event. That is F172's shape, and it costs one type and one inbox rule, the same pattern ADR 0052 already paid for.

## The strongest case against

Fields invite lying by omission: an actor fills `platform` and leaves `tree_shape` at a default, and the derived contested state now trusts a field nobody verified. Environment is self-reported, like cost in ADR 0047, and self-report is fine as a measurement and unacceptable as a claim on a pool. The answer is the same as there: at layer 1 the actors chose each other, and a wrong environment block is a finding against the actor, not a failure of the protocol. The scenario where this fails: two honest actors, same four fields, different results, because the variable was a fifth thing. That is the "same pinned environment, still different" case, and Nick's answer stands: a third environment by the side that did not make the claim, and if it still splits, reported as contested and left there. The protocol does not resolve it and should not pretend to.

## What the control must show failing

A completion whose result carries an `environment` with a missing or extra field is refused at append. Two completions for one criterion with conflicting status and different environments are both accepted, and the report derives `contested` for that criterion; a third with `satisfied` in both environments clears it, observed through the report, not by reading code. A `correction` whose parent is another actor's event is refused; one whose parent is the author's own event is accepted and absent from every inbox.

## Reversibility

Additive: one optional object, one derived report state, one event type. Retiring the object leaves old results readable; retiring the type leaves old corrections readable. The permanent cost is the same as ADR 0052's: vocabulary once shipped is history.

## Failure class covered and not

Covers every disagreement whose variable is version, platform, tree shape or time, which on today's evidence is all of them. Does not cover a fifth variable, a dishonest environment block, or disagreement about acceptability, and the last is by design.
