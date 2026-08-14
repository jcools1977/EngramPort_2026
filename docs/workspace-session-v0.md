# Workspace setup session v0

Run W1-1 controls with `npm run session:test`.

The wizard has no principal or actor. A setup session binds an authenticated founder principal to setup-prefixed scopes bounded by the founder's scopes/expiry. The authenticator returns only `principal_id`; credentials are never retained. Completion, abandonment, or injected-clock expiry deletes the entire live session, delegation, and approval map, leaving an authority-free tombstone and revoked approval IDs only.

This task authorizes a compiled step in memory but performs no real action. Grouped approvals, portable plan identity, F2/F7 digest changes, provider OIDC, and W1-2 remain outside W1-1.
