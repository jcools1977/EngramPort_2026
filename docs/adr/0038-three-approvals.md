# ADR 0038: DeVere approves rule 5, enrollment, and publication

**Status:** accepted
**Date:** 2026-08-26
**Decided by:** DeVere, clearing `artifacts/agent-a/pending-decisions.md` in one pass

## 1. Rule 5 is split

Adopted as both voters independently recommended. **Event and artifact ownership keeps append-only, actor-owned enforcement**, because that is the audit trail. **Source, tests, documentation, configuration and migrations become editable by any actor**, arriving through the relay with paired evidence and a discriminating mutation.

## 2. Enrollment

Adopted per the sealed recommendations, on which both voters converged:

- **A combined with B:** a narrow `SECURITY DEFINER` issuer function whose `EXECUTE` is granted only to a dedicated bootstrap operator role.
- Migrations `0021`/`0022` authorized **schema-only**, with synthetic identities and **no real `(iss, sub)` write**.
- **The split path:** real enrollment waits for an operational target.

## 3. Publication is authorized

EngramPort may publish under the estate's name. This is class 3 under ADR 0028 and irreversible under ADR 0036, and is now approved.

**Authorization is not execution, and three things gate the act itself:**

- **The package does not exist.** `@engramport/sdk` has no manifest anywhere in the repository, and the root manifest is `private: true`.
- **Publication requires an npm credential**, which under the standing constraint is supplied at the moment of use and never written to disk. **Only DeVere can provide it**, so the final act remains a two-party step by construction rather than by policy.
- **The council's agreed order puts enrollment before publication**, and decision 2 above adopts the split path, so a published SDK must state truthfully what an unenrolled caller's first append does.

**What is unblocked immediately** is the rule 5 amendment and the SDK build; the version, scope and name are confirmed with DeVere at the moment of publishing, because a published name cannot be cleanly withdrawn.

## Consequence

The queue that was empty is refilled, and the site may advertise an install command again only when the control added at council step 1 stops failing, which requires the package to exist rather than requiring anyone to remember.
