# agent-a's independent recommendation on the three enrollment decisions

Author: agent-a. Date: 2026-08-26.
**Written and committed BEFORE agent-b was asked to recommend, and deliberately not shared in the handoff.** Convergence between two recommendations is only evidence if neither anchored the other, so this is sealed by commit order rather than by trust. Basis: F70, F89, F90, ADR 0027, ADR 0030, ADR 0033.

## 1. Which root may enroll identities and issue founding authorizations

**Recommend A combined with B: a narrow `SECURITY DEFINER` issuer function whose `EXECUTE` is granted only to a dedicated bootstrap operator role.**

Neither half works alone, and agent-b's costing is why. **A alone is a mechanism, not a root** — it must be gated on something, and every gate relocates legitimacy upstream. **B alone gives direct DML with no single place to cap lifetime, generate reserved ids, or require an audit reason**, and granting table `UPDATE` for revocation permits more than setting `revoked_at` unless a column grant or trigger bounds it.

Combined, the function supplies parameter binding, a short maximum lifetime, server-generated ids and an append-only issuance record; the role supplies a **named human root**.

**The regress terminates at whoever provisions that operator role in the managed control plane — which is DeVere.** That is an operational trust statement, not elimination, and it must be **written down as the bootstrap root** rather than left implicit. An unnamed root is the failure mode; a named one is merely a fact.

**Rejecting C alone** on agent-b's own line: an empty-database check is *first caller wins, not authorization*. **Rejecting D for now** — an offline-signed envelope is genuinely stronger and sharply scoped, but there is no signing infrastructure, no key custody policy and no rotation story, and inventing all three to issue one authorization is disproportionate. **D should be revisited if EngramPort ever issues authorizations for founders other than DeVere**, where the key custodian and the founder stop being the same person.

## 2. Migrations 0021 and 0022 on `engramport-dev`

**Recommend authorizing them, schema-only, with synthetic identities and no real `(iss, sub)` write.**

The rehearsal has real value that a local run cannot supply: agent-b established that **0022's ownership is security-relevant**, because its resolver is `SECURITY DEFINER` and its policies name `current_user='engram_migrator'`, so the earlier owner-excluding fingerprint is **insufficient**. Proving ownership, ACLs and policy behaviour on a managed target before production is exactly the kind of rehearsal that prevented the transcription defect F58 caught.

It is also **reversible** — schema on an evidence substrate, no personal data — which is what makes it cheap to authorize.

## 3. Where the real subject is enrolled

**Recommend agent-b's split path: real enrollment waits for the operational target.**

The `(iss, sub)` pair is a **stable global identifier for a real person** and the root input to founder binding. Writing it into a project ADR 0022 explicitly calls *an evidence substrate, not a production deployment* buys a rehearsal obtainable synthetically, in exchange for personal data in platform logs, backups and PITR — and **project deletion is not automatically evidence of erasure**.

There is also a sequencing reason. Per F90, enrollment **crosses the boundary that made C17's conditional reading safe**, and `engramport-dev` currently has `scheduled_jobs = 0`. Enrolling there would place a real identity in a target that **does not meet the store-and-scheduler obligation** — precisely what agent-b meant by *an empty `cron.job` cannot be hidden by calling enrollment "not a delegation."*

## Confidence

**Highest on 3**, which is nearly forced by the retention and sequencing arguments together. **High on 2**, since it is reversible and the ownership finding gives it independent value. **Lowest on 1**, where D is a defensible alternative and the choice turns on how soon EngramPort issues authorizations for founders who are not DeVere — a product question agent-a cannot settle.
