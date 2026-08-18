# W1-7 substantive-controls review

The continuation handoff is valid (`01a015ec-3517-76e4-becf-6f2e99037849`, next `agent-b`). Proof verification passed before review.

Bounded blocker: the repository has no authority-bearing durable custody implementation to exercise. `AtomicCustodyStore` still uses `Map` for custody rows/references and accepts injected `authorized` literals. No PostgreSQL custody schema, transaction API, live reference resolver, or Vault-backed custody write path exists. The canary harness still observes its own private `leaks` array rather than an independent sink observer. Therefore the requested atomic rollback/collision/concurrency, live authorization/revocation, ten-sink differential canary, and durable six-policy evidence cannot be truthfully claimed in this slice.

The accepted live Vault signing harness and canonical `verify:all` remain green from the prior revision; no accepted boundary or unrelated work was changed. W1-7/A7/A8/B5 remain open, as do A6/B9 and B1–B4 under their assigned work.
