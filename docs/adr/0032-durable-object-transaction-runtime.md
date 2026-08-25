# ADR 0032: Durable Objects own OIDC transaction continuity, and ADR 0031 is amended for Workers

Status: accepted, 2026-08-25. **Decided by DeVere.** Recorded by agent-a.
Amends: ADR 0031's custody mechanism, for Worker-resident components only. Related: ADR 0029, ADR 0030, F79, F81, F82.

## Decision

**A Durable Object keyed by the OIDC `state` owns transaction continuity.** Shape A from F82's costing.

## What this choice avoids, and it is worth naming

**The cookie-and-host trap does not apply.** F82 recorded that a host-only-cookie shape forces auth-start and callback onto the same host, with `Domain=.engramport.com` an unacceptable repair because it widens credential scope to sibling subdomains. **A Durable Object is keyed by the `state` already present in the callback query string, so no cookie carries continuity and no host-sharing constraint follows.** That materially simplifies the deployment.

**The production redirect URI is therefore decidable now**: `https://app.engramport.com/auth/callback`, served by a Worker Custom Domain. F82 confirmed the subdomain buys deployment independence under every shape and is a stable facade rather than a continuity mechanism, which is exactly the role it now plays.

## What this choice costs, accepted deliberately

**Deletion is not erasure.** SQLite-backed Durable Object namespaces support **point-in-time recovery for up to 30 days**, against a **ten-minute** transaction TTL. Three rules follow and are binding:

1. **This namespace is never restored as ordinary application data.** A restore that resurrects transactions is an incident, not a recovery.
2. **Expiry remains authoritative over any restored row.** A row recovered from PITR must still fail the expiry check.
3. **The threat model owes a row** naming Cloudflare, account administrators, PITR and incident restores as readers of the verifier and nonce. **Revision 8 is digest-pinned and is not edited**; the gap is carried as a finding until a later revision, on the F18 pattern.

**The record must be persisted before the authorization redirect returns.** Durable Objects hibernate, restart and discard in-memory state, so keeping the transaction only in object memory would reproduce the defect this decision exists to fix.

**Claim before exchange, atomically, and fail closed.** A claim committed before an interruption prevents replay but loses that authorization; claiming after exchange permits a race. **The secure disposition is fail-closed and the founder restarts authorization.**

## ADR 0031 amended for Worker-resident components

**ADR 0031 is not clause-for-clause satisfiable on Workers and is amended rather than reinterpreted.** A Worker isolate has no process start and cannot invoke `op`, so "held in 1Password", "resolved at process start" and "rotation requires no deployment change" cannot all hold.

**Amended mechanism**: an authorized operator or CI identity resolves the value from 1Password and pipes it directly into `wrangler secret put`. **No `.env`, no `.dev.vars`, no `--secrets-file`, no shell trace, no artifact, no log.** Cloudflare then holds an encrypted binding and supplies plaintext to the Worker environment.

**Cloudflare becomes an additional custodian**, which ADR 0031 did not contemplate. That is the price of this runtime and it is accepted knowingly.

**Rotation becomes a deployment action**: create overlapping provider credentials where supported, update 1Password, resolve and pipe into a new Worker version, roll out and verify, then revoke the old provider value. **Local tests inject a synthetic value directly into the harness**; Cloudflare's documented `.dev.vars` path remains forbidden.

## Consequences

1. **Criterion 1 stays open** and the trusted-session caveat on A6, A7 and A8 stays undischarged. This decides a runtime, not an authentication fact.
2. **Local Wrangler proves routing, persistence across induced restart, atomic competing callbacks, expiry, cleanup and absence of transaction material from logs. It simulates Cloudflare** and cannot establish global request distribution, production placement, control-plane access, PITR behaviour or platform availability. **That distinction must appear in every claim made from a local run.**
3. **`executed=` does not move on this ADR**, which decides and records only.
