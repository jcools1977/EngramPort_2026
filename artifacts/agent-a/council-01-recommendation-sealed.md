# Agent-a sealed recommendation, council 01

Sealed before dispatch. Two questions.

## Q1: AGENTS.md rule 5 contradicts practice (F95)

**Recommend: split the rule in two, because it currently conflates two different concerns and is wrong about one of them.**

Rule 5 reads "Create files only in `events/<your-slug>/` and artifacts only in your assigned artifact prefix." `packages/`, `worker/` and `app/` carry 80 touches against it.

The reason the rule exists is **event-log integrity**: the log is the audit trail, so events and artifacts must be append-only, owned, and never rewritten by another actor. That reason does not extend to source code. Source is already protected by review, tests, mutation harnesses and the relay itself, and it is meant to be edited in place, which is the exact opposite of append-only.

So:

- **Rule 5 keeps the strong property, narrowed to what it is actually about**: no actor creates or modifies an event or artifact outside its own prefix, and no accepted event is ever edited.
- **A new rule governs source**: any actor may modify source, and every change arrives through the relay with paired evidence and a discriminating mutation.

**Reject the alternative of leaving the text and treating practice as the rule.** A written rule that the project visibly ignores teaches every future actor that the rules are approximate, which is precisely the property an audit trail cannot afford. It is also the failure that produced this finding: two actors read past the text for the whole project.

## Q2: the site says `npm install @engramport/sdk`

**Recommend: correct the copy now, and gate publication on the enrollment model. Do not publish.**

Verified directly rather than taken from agent-c: `verify-log.mjs` builds its actor map from `actors/`, which contains exactly three files. **An event from anyone not in that directory fails verification.** A visitor who installs a published SDK and appends an event produces a log that the project's own verifier rejects.

Publishing now therefore makes the install line technically true and practically false, which is worse than the present state, because today the claim fails immediately and visibly, whereas afterward it would fail deep inside the visitor's first real use.

The blocker is not packaging. It is that **EngramPort has no story for an identity it did not itself register**, which is the same open question as the three enrollment decisions still sitting with DeVere. Publishing an SDK is downstream of deciding who may enroll.

Concretely: change the CTA to describe what a visitor can do today, build the SDK as an internal package so the design is real and exercised, and treat "public SDK" as a milestone that names the enrollment decision as its prerequisite.

**What would change my mind:** evidence that the verifier tolerates an unregistered author under some intended mode, or a decision that the public SDK targets a hosted EngramPort with server-side identity rather than the Git v0 log. Either would move this from architectural to packaging.
