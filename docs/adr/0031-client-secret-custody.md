# ADR 0031: the OIDC client secret lives in 1Password and is resolved at process start

Status: accepted, 2026-08-25. **Decided by DeVere.** Recorded by agent-a.
Answers the open item created by ADR 0030. Related: ADR 0029, ADR 0030, F73, F77, W1-6's credential detector.

## Decision

**The OIDC client secret is held in 1Password.** It is resolved at process start and handed to the token-exchange component through the environment. **The plaintext exists in process memory and nowhere else.**

This follows the estate's standing rule — *no secrets on disk; keys come from 1Password or a browser* — and reuses the shape already proven in `dotfiles/bin/engramport-mcp` rather than inventing a second pattern.

## What may be written down, and what may not

**Configuration holds a reference, never a value.** An `op://vault/item/field` reference is not a secret and may live in deployment configuration. **The resolved value may never be written to the repository, a compose file, a generated `.env`, the scratchpad, an artifact, an event, or a log line** — tracked or untracked.

DeVere names the concrete vault, item and field. **agent-a did not enumerate the vaults**, because reading a secret to confirm its location is the thing being prevented.

## Fail loudly, never fall back

**If the secret cannot be resolved, the component refuses to start.** It must not start and fail later at exchange.

This is the specific lesson `engramport-mcp` already records: *a silently unauthenticated server is the single most confusing failure mode, because the tools appear, the client looks healthy, and every call fails with a bare 401 that reads identically to a bad key.* **An OIDC client is the same shape** — a missing secret and a wrong secret both surface as token-exchange failures, long after the misconfiguration, in a component the founder is not watching. **The refusal must be named and must occur at startup.**

## Rotation

Rotation happens in 1Password. **No code, configuration or deployment change follows**, because only the reference is recorded anywhere.

## Controls this makes testable now, without a provider

The custody decision is a deployment concern, but three properties are synthetic-provable immediately and should not wait for client registration:

1. **Startup refusal** when the reference resolves to nothing, with a named error and no partially constructed client.
2. **Non-leakage**: the secret appears in no log line, no error message, no serialized state, and no thrown object. **W1-6's `detectCredential` already guards the plan compiler, the event append path and artifact registration** — the secret must be covered by that existing boundary rather than a new one.
3. **Non-retention** after exchange, on the pattern already used for the ID token and claims in `oidc-verifier.mjs`.

Each with a paired positive and a discriminating mutation.

## What this unblocks

**The entry point that F77 asked for can now exist honestly.** The objection was that a real route implies a real provider, which implied an unanswered secret question. With custody specified, the entry point may resolve the reference at start, refuse to start without it, and **keep the exchange injected** until client registration happens. **The structural-limitation exemption agent-a left open is no longer required**, though it remains available if a different obstacle appears.

## Consequences

1. **No secret exists yet.** Client registration with Google has not occurred; there is nothing to store until it does.
2. **The `op` CLI is a deployment dependency** wherever the client runs, and the operator must be authenticated to the vault at process start.
3. **Criterion 1 stays open** and the trusted-session caveat on A6, A7 and A8 stays undischarged; this decides custody, not authentication.
