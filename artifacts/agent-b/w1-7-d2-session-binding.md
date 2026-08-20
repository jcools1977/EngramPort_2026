# D2 principal-session binding

Implemented `PrincipalSessionBinding` with pinned `pg` 8.16.3. The adapter requires a verified synthetic session before acquiring a connection, binds only `session.principalId` with transaction-local `set_config(..., true)`, ignores caller identity fields, commits the mint, and scrubs pooled connections with `DISCARD ALL` before release. Unit controls pass: unbound refusal occurs before connection acquisition; verified Y remains the bound principal even when request carries X.

Scope excludes D3, W1-8, W3, AEGIS, and A7/A8/B5 closure. Live PostgreSQL adapter discrimination remains pending because this repository has no runtime driver path or live adapter fixture before this slice.
