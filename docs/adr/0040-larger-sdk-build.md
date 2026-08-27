# ADR 0040: Fund the larger build; the site copy stands

**Status:** accepted
**Date:** 2026-08-27
**Decided by:** DeVere

## Decision

**Port Watch integration and a protocol change for retry identity are funded. The site's four claims stay as written**, and the build rises to meet them rather than the copy falling to meet the build.

Presented after agent-c's fourth stop established that a wrapper over `event-core` cannot host three of the four claims (F112). The alternative was narrowing the copy and shipping this week.

## Why this is the more expensive answer and still the right one

The claims describe what makes EngramPort a product rather than a Git convention: **durable cursors are what let a builder's agent resume without re-reading the log, and completion criteria are what make a handoff auditable rather than conversational.** Narrowing the copy would have removed the two sentences that distinguish this from a shared folder.

## Sequence, and why this order

1. **F110, the credential boundary** — already in flight. **Port Watch cannot be reviewed while `detectCredential` refuses it over the identifier `token`**, so the third agent is blind to exactly the package slice 2 touches.
2. **Protocol change: retry identity and handoff structure.** Both are envelope-level questions and are settled together, because deciding them separately risks two schema revisions where one would do.
3. **Port Watch integration**, so claim 2's second conjunct becomes true through the package that implements it.
4. **The SDK**, last, as a wrapper over a substrate that can finally host the claims.

## What this decision does not settle

**F111 is not in this sequence and must not be folded into it.** Authorship is asserted and never authorized, so any caller may write as any actor. Its resolution is out-of-tree, and shares that shape with F108: signed commits and branch protection, configured by DeVere. **An in-tree control cannot establish it**, because the commit that forges an event can amend whatever would have caught it. It is tracked separately and is the largest open risk in the product.

## Consequence

The SDK is weeks rather than days away, which is the cost of the claims being true. **Publication remains authorized under ADR 0038 and unchanged**, and the site's install control still fails until a real package exists, which is the intended interlock.
