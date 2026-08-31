# ADR 0047: Pooled token spend, in three layers

**Status:** accepted
**Date:** 2026-08-31
**Stated by:** DeVere

## The vision

**Teams combine and collaborate so that no one person burns all the tokens.** Spend is orchestrated across the contributors to a project rather than falling on whoever happened to start it.

**And the direction it points: a sponsor can see a project that needs funding, fund it, and the team deploys that token spend because the funding is there.** Contribution to AI-assisted work is measured in inference, and inference costs money; this makes that cost visible, shared, and fundable.

## The foundation already exists and was built for another purpose

**Every agent-c review in the log carries `provider`, `model`, `token_use` and `provider_cost`.** Seventeen of them record **$1.26 and 308,833 tokens**, attributed per event inside the append-only log. It was built to measure whether a third reviewer earned its cost. **It is a verifiable per-event record of who did what work, on which model, at what price**, which is the accounting substrate this vision needs.

## The three layers, named because they differ enormously in difficulty

**Layer 1 — Shared visibility.** A team works one repository, each participant on their own subscription, and the log records what was done and what it cost, per participant. **Nobody's key enters anyone else's environment.** The missing piece is an allocation concept: who may spend against what, and how a team sees its burn. **This is close, and nobody has it.**

**Layer 2 — Orchestrated spend.** A pool exists and participants draw against it under a grant. **This requires authorization the protocol does not have**: any actor can currently append anything, and there is no budget-with-a-grant. It is the admission boundary of ADR 0044 and council 05, arriving in economic form.

**Layer 3 — Funded projects.** Sponsors fund a project and the team deploys the spend. **This is a marketplace**, with a cold-start problem unrelated to protocol quality, and it involves handling other people's money, which is a different kind of company.

## What this reverses

**ADR 0046 recorded that the impersonation findings do not block the vision, because collaborators who chose each other are not adversarial. Funding reverses that.** Once a sponsor's money buys inference, someone can claim work they did not do or spend against a pool they were not granted. **F108, F111, F117, F127, F128 and F131 stop being expansion-case concerns and become the prerequisite the accounting rests on.**

**Self-reported cost is the specific new exposure.** Agent-c reports its own spend; nothing verifies it against the provider. That is acceptable while the number is a measurement and unacceptable once it is a claim on a pool.

## Decision

**Build layer 1. Do not build layer 3 before layer 1 has users.** Layer 2 follows only when a team actually needs to share a pool rather than each paying their own way.

The sequencing rule is the one this project keeps relearning: **the hard part of layer 1 is already in the log, and the hard part of layer 3 is not technical at all.**
