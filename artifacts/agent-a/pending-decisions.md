# Pending decisions for DeVere

Per ADR 0036, reserved items accumulate here and clear in one pass rather than interrupting one at a time. **Everything not on this list has proceeded without asking.**

## 1. Amend AGENTS.md rule 5

**Both voters independently recommended splitting it** (F95, council 01). Rule 5 says an actor creates files only in `events/<slug>/` and its artifact prefix; the repository has 82 implementation touches against it, and neither incumbent noticed for the project's whole life because both read the practice as the rule.

The agreed shape: keep append-only ownership for **events and artifacts**, where it is the audit trail and genuinely needs it; add a separate rule for **source**, which is meant to be edited in place and is already protected by review, tests and the relay.

**Why this is yours and not the council's:** ADR 0028 reserves "policy-setting contract changes" and names authorization explicitly. This is an authorization rule, so it is class 3 regardless of unanimity. **Agent-a stopped here rather than dispatching it.**

Cost of not deciding: the rule stays contradicted by practice, which is the condition that hid it in the first place.

## 2. Who may enroll an identity

Blocks **council step 3**, and steps 4 and 5 behind it. F101 made this sharper than it was: until the enrollment boundary exists, there is no answer to what a non-registered participant's first append does.

Class 3 under ADR 0028, which names identity and tenancy rules directly.

## 3. Whether EngramPort publishes under the estate's name

Irreversible under ADR 0036: a published name binds the estate and cannot be cleanly withdrawn. Blocks **council step 5**, restoring an install CTA.

The site no longer claims it, so **nothing is currently false while this waits.** That was council step 1 and it is closed.

## What is not blocked and not waiting on you

Council steps 1 and 2 are complete. The verifier now accounts for every Markdown file under `events/` in any case (F101, F102, F103), the site's install claim is gone with a control that rejects any unpublished package name, and the event-type drift control ties the console to the verifier.

**The queue below these three decisions is empty**, which is why they are being raised now rather than batched further.
