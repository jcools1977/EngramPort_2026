# W1-1 store convergence finding: two durable refusals have no accepted manager equivalent

Parent handoff: `01a035f6-00fd-7c30-97d0-03f72f84022d`

The handoff requires an explicit mapping from the durable `SETUP_SESSION_*` refusals to the accepted manager codes, and requires a reading rather than an invented code when no accepted equivalent exists. That condition holds before the store seam can be implemented.

## Exact inventories

The accepted migrations expose eight named durable refusals:

- `SETUP_SESSION_AUTHORITY_REFUSED`
- `SETUP_SESSION_SCOPE_NOT_SETUP`
- `SETUP_SESSION_SCOPE_EXCEEDS_AUTHORITY`
- `SETUP_SESSION_EXPIRY_EXCEEDS_AUTHORITY`
- `SETUP_SESSION_RETENTION_UNRESOLVED`
- `SETUP_SESSION_RETENTION_EXCEEDED`
- `SETUP_SESSION_NOT_OWNED`
- `SETUP_SESSION_ALREADY_TERMINAL`

The accepted manager exposes these relevant session refusals:

- `FOUNDER_AUTHORITY_NOT_FOUND`
- `SESSION_SCOPE_NOT_SETUP`
- `SESSION_SCOPE_EXCEEDS_FOUNDER`
- `SESSION_OUTLIVES_FOUNDER`
- `SESSION_ABSOLUTE_EXPIRY_REQUIRED`
- `SESSION_EXPIRED`
- `SESSION_REVOKED`

The remaining accepted manager codes concern authentication, approval integrity, compilation, or step membership and are not equivalent to a datastore retention refusal.

## Mappings that preserve meaning

| Durable refusal | Accepted manager equivalent |
| --- | --- |
| `SETUP_SESSION_AUTHORITY_REFUSED` | `FOUNDER_AUTHORITY_NOT_FOUND` |
| `SETUP_SESSION_SCOPE_NOT_SETUP` | `SESSION_SCOPE_NOT_SETUP` |
| `SETUP_SESSION_SCOPE_EXCEEDS_AUTHORITY` | `SESSION_SCOPE_EXCEEDS_FOUNDER` |
| `SETUP_SESSION_EXPIRY_EXCEEDS_AUTHORITY` | `SESSION_OUTLIVES_FOUNDER` |
| `SETUP_SESSION_NOT_OWNED` | `SESSION_REVOKED` |
| `SETUP_SESSION_ALREADY_TERMINAL` | `SESSION_REVOKED` |

The last two preserve the accepted manager's deliberately opaque terminal-or-absent behavior.

## Missing equivalents

`SETUP_SESSION_RETENTION_UNRESOLVED` has no accepted equivalent. It means the datastore cannot resolve the mandatory `RET-SESSION` policy. It is not founder-authority absence, malformed or missing absolute expiry, expiry in the past, or revocation.

`SETUP_SESSION_RETENTION_EXCEEDED` also has no accepted equivalent. The durable fixture proves the distinct state directly: a requested expiry 25 hours ahead while founder authority remains valid for 48 hours is refused specifically as `SETUP_SESSION_RETENTION_EXCEEDED`. Mapping it to `SESSION_OUTLIVES_FOUNDER` would be false because the grant does not outlive the founder. Mapping it to `SESSION_EXPIRED` would reverse the temporal fact.

Both are pre-insert datastore refusals in `create_setup_session_delegation`; neither can be made unreachable by the accepted manager without adding the same 24-hour policy and policy-resolution semantics to a second layer. Doing that inside this slice would invent behavior and duplicate the database authority rather than translate it.

## Required decision

Before convergence can proceed, the accepted manager contract needs an explicit disposition for these two meanings. The narrow option is to authorize two new manager codes, for example `SESSION_RETENTION_UNRESOLVED` and `SESSION_RETENTION_EXCEEDED`, and add paired controls. Propagating the raw durable codes would abandon the required translation; folding either into an existing code would make the code false.

Per the handoff, implementation stopped at this reading. No manager, store, adapter, migration, fixture, test, mutation, or accepted control changed. The 37-control dual-adapter run, unreachable-database mutation, and ADR 0021 repeat-safety mutation did not begin; `executed=` remains 63. C17 remains open and criterion 5 remains deferred.
