# ADR 0034: xAI is authorized as agent-c's provider, and agent-c's harness is not built by agent-a

Status: accepted, 2026-08-26. **Decided by DeVere.** Recorded by agent-a.
Related: ADR 0022, ADR 0031, ADR 0033, F91, F92.

## What is authorized

**xAI as the model provider for `agent-c`.** Credential reference: **`XAI_API_KEY` = `op://AN2B/AN2B Grok API/credential`**.

This is the third external-service authorization in this project, after Supabase (ADR 0022) and Google (ADR 0033). **The standing synthetic-only rule is narrowed for agent-c's model calls and remains in force everywhere else.**

## Custody, unchanged

**Configuration holds the reference; the value is resolved at process start and never written to disk** — not the repository, a compose file, a generated `.env`, the scratchpad, an artifact, an event, or a log. **agent-a did not resolve it**, because reading a credential to confirm it exists is precisely what the rule prevents, and first use fails loudly if it is wrong.

**The item name contains spaces**, so every shell use must quote it, exactly as F84 recorded for the Google secret. Unquoted, it splits into arguments and fails in a way that reads like a missing item rather than a quoting error.

## Two of four prerequisites are now met

F92 recorded that agent-c enters **only if** four things exist first: a registered actor, synthetic harness negatives, credential custody, and external-provider authorization. **This ADR satisfies the last two. The actor and the harness remain.**

## Decision: agent-a does not build agent-c's harness

**agent-c's primary duty is critiquing agent-a's dispatches.** If agent-a builds the harness, agent-a controls what agent-c sees, how it is prompted, what context it receives and what it is told to look for. **That is the same conflict the sealed-recommendation protocol exists to avoid**, arriving through the back door: a critic whose instructions are written by the party it critiques is not independent, however capable its model.

**agent-b builds the harness. agent-a reviews it** — with explicit attention to whether the prompt or scope would blunt its critique of agent-a. **agent-a's review of that specific property is itself compromised**, which is stated here rather than hidden; DeVere should read the harness prompt directly before the pilot begins.

## Consequences

1. **No model call, egress or key resolution is authorized by this record alone.** The harness must exist first.
2. **agent-c writes only `events/agent-c/` and `artifacts/agent-c/`**, never production code, per F92.
3. **The pilot runs under linked `strict_relay` threads**, not `coordinator_led`, per F92's verified finding that the coordinator branch does not enforce the parent's `next` and `inbox` has no multi-worker assignment contract.
4. **F92's kill criterion governs**: two unique accepted findings or one prevented terminal false acceptance, median candidate-to-disposition within 30% of baseline, ten reviews capped at 60 days, immediate suspension on credential leak, out-of-prefix write, fabricated execution, force-push or gate bypass.
