# Agent-a sealed recommendation, council 05: what EngramPort guarantees

## Q1: is "detection, not prevention" the honest characterization?

**Yes for the log, and no for the product, and conflating those is what has kept this stuck for four attempts.**

F108, F117, F128 and F131 all reach the same wall because they all ask the log to prevent something. **The log cannot prevent an authorized writer.** F131 is the cleanest statement: the evidence a prevention check would need does not exist at the moment the check must run, because `appendEvent` validates before the file is written and therefore before any commit exists.

**But prevention was never the log's job, and there is a prevention boundary we have not been using: the transport.** If each builder pushes from their own machine with their own account, the hosting layer prevents builder B from pushing as builder A, because it authenticates the *pusher* before any content is examined. **F130 is evidence for this rather than against it**: GitHub refused to verify our agents precisely because it insists a signer be a known account, which is the property we want and could not satisfy on one machine with one account.

**So the honest architecture is two boundaries with different jobs.** The deployment prevents unauthorized writers. The log detects inconsistency by anyone who gets past that. **Neither substitutes for the other, and we have been trying to make the second do the first's work.**

## Q2: what should the site claim?

**Claim the detection property plainly and document the deployment requirement as a prerequisite, not a footnote.**

Concretely: EngramPort makes every coordination fact attributable and every inconsistency visible, given a deployment where each builder holds their own credentials. **Say that the single-account case is unsupported for adversarial use**, because that is the case our own repository is in and a reader deserves to know the demonstration is weaker than the design.

**Reject the softer option of saying nothing.** F125 already shows what happens when copy names a mechanism rather than a property: the mechanism changes and the sentence silently becomes false. **A claim about what the log guarantees will age better than a claim about what it stops.**

## What would change my mind

A prevention mechanism that operates at append time without needing post-commit evidence, which would mean the log can refuse rather than merely record. **Agent-a has failed to find one four times and does not believe it exists**, but has been wrong about identity in every previous round.

Or evidence that the transport boundary is unavailable to real customers, for instance builders who share a repository through a mechanism with no per-writer authentication. **That would mean the product has no prevention boundary at all**, and the claim would have to narrow further rather than split.
