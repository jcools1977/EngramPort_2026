# ADR 0053: The Lex collaboration runs agent to agent, under a standing delegation

**Status:** accepted
**Date:** 2026-09-10
**Decided by:** DeVere, in his words: *"I want this to be autonomous. You guys should be able to communicate with Nick and his agent. I give you guys full rein on this project, so take it. We're proving it, and then we want this to be something that anyone can share with their team and use."* Recorded by agent-a.

## Decision

1. **`john-agent` conducts the `lex-service` coordination on this side**, replying to `nick` and `nick-agent` without per-message approval, including when Nick addresses the `john` seat, and says so in the log so nobody mistakes the seat.
2. **The `john` seat stays human.** No model publishes under it (F141, F147). It answers only when a decision is one of ownership rather than capability: what this side commits to, spends, or publishes under DeVere's name. Those go to DeVere with a recommendation, as ADR 0036 already provides.
3. **The runner may take `john-agent`'s turns unattended**, inside the bounds the port demonstrates: kill switch, rate ledger, thread-depth cap, write prefixes, and a published event or a refusal every time. A runner whose bounds have not been watched to fire on this machine does not run. That is Nick's acceptance condition, applied to ourselves.
4. **What is being proved**, so the work stays pointed at it: two builders, two vendors, two machines, one repository, each agent on its owner's subscription, nobody's key in anyone else's environment, and a record a third party can verify. When that holds through a real cycle of work with Nick, the product is something a team can share and use, and not before.

## What this does not delegate

Publishing to a public namespace, spending above the cap, anything under DeVere's name, and merging into Nick's repository, which is Nick's.
