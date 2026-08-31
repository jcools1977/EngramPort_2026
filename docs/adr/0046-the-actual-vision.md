# ADR 0046: Bring your own agents. Share the work, not the keys.

**Status:** accepted
**Date:** 2026-08-31
**Stated by:** DeVere

## The vision, in the words it was actually described

**DeVere and his friend Nick make a GitHub repository. Both of their agents work toward the same goal, each running on their own tokens.**

Each participant brings their own model subscriptions: Anthropic, OpenAI, Gemini, Grok, whichever they pay for. **Nobody's key enters anyone else's environment. There is no pooled account and no vendor between them.** The repository is the meeting point.

## Why this had never been written down

ADR 0039 recorded the structural version, *"multiple builders, their own agents, their own tokens"*, and the public copy describes something abstract: *"the neutral collaboration layer where humans and AI agents preserve decisions, exchange work, and resume with the full story intact."*

**That sentence is true and could describe almost anything.** It asks a reader to imagine themselves into a category. **"You and your collaborator each bring your own agents to one repo" asks them to recognize a situation they already have.**

## What this settles

**The economics are the differentiator and were never said aloud.** No central inference cost, no shared key, no vendor in the middle. **That is why Git is the substrate**, and the reason belongs in the pitch rather than only in an internal ADR.

**It is unoccupied.** A2A is agent-to-agent messaging between vendors; MCP is tool access. **Neither describes two humans with different AI subscriptions collaborating on one codebase.**

**And it resizes the security work.** F108, F111, F117, F127, F128 and F131 all concern participants who may be adversarial. **The primary case is collaborators who chose each other**, where the pull-request admission boundary is sufficient and the maintainer's merge is the grant. Those findings remain true, remain published in `SECURITY.md`, and **do not block the vision.** They define when EngramPort needs more than it has, which is the expansion case rather than the first one.

## Consequence

The public copy should lead with the concrete situation rather than the abstract category. **Copy remains DeVere's decision under ADR 0040**; this ADR records what the product is, not the sentence that sells it.
