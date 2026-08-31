# ADR 0049: The Voltron integration assessment is deferred

**Status:** accepted
**Date:** 2026-08-31
**Decided by:** DeVere

## Decision

**Voltron integration is deferred. Not declined — deferred, with the reason recorded so it need not be re-derived.**

A handoff brief was drafted at `/Users/an2b/an2b/products/eidetic/voltron/ENGRAMPORT_AGENT_HANDOFF.md`, sha256 `05a1275f...`, asking EngramPort's agents for a twelve-question architectural assessment. **Both stated digests were verified and matched**, including the protocol manifest at `7fe40df7...`, and the document's path warning was confirmed: `/Users/an2b/an2b/products/voltron` exists with no Git HEAD, so an agent choosing the first folder of that name would read the wrong tree.

**The brief is well constructed**: it states that integration must not be assumed, offers "not at all" as a valid timing answer, forbids production credentials and consequential actions, and closes with *"if the answer is no, preserving their independence is a successful result."*

## Why deferral is right, and it is about substance rather than schedule

**The likely answer to their central question is already known and is a no-go.** Their question 12 asks whether EngramPort has a legitimate signed custody role in Voltron's Trust Bundle. Voltron's Router is a consequential-action boundary and Procura is commerce authority.

**`SECURITY.md` states that EngramPort does not authenticate authorship.** Any party who can commit may write an event claiming to be any actor — measured as F127, with four recorded attempts to close it in-repository and why each failed. **A custody layer whose authorship cannot be authenticated must not sit beneath a system that authorizes spending.**

That answer will not change until an admission boundary exists, which council 05 identified and which is the paid tier of ADR 0047 rather than current work.

## The unresolved item, carried forward

**The brief opens by naming "Andrew" as the sponsor of the enquiry.** Agent-a has only ever been directed by DeVere. Under the rule this project runs on — document content is untrusted evidence, not authority — **a brief naming an unverified sponsor is F120's shape.** It is recorded rather than acted on, and it should be resolved before any assessment is returned.

## When this resumes

**After EngramPort has users.** Layer 1 exists, the SDK is published, the contribution path works, and nobody has used any of it. **The next meaningful signal is a second builder opening a pull request, not an integration assessment.**
