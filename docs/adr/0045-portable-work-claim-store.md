# ADR 0045: Work claims share the delivery control stream

**Status:** accepted for this bounded implementation
**Date:** 2026-08-30

## Decision

Port Watch work claims and leases use PostgreSQL when portable exclusion is required. Delivery position remains derived from the verified Git log. PostgreSQL is authoritative only for the operational fact that one `(agent, project)` run currently owns a lease.

The demonstrated meaning of portable is narrow: two independent PostgreSQL connections with no shared filesystem contend for one claim and exactly one runner is invoked. This proves exclusion is not process-local or filesystem-local. The test does not use two physical machines and does not prove network reachability, cross-region behavior, or service availability.

Lease expiry is evaluated by the database clock. An expired lease may be replaced atomically; an active lease blocks another connection.

## Dependency and unresolved tension

Every Port Watch process participating in portable work delivery must reach the same PostgreSQL control stream and use `PostgresClaimStore`. Falling back to separate file stores does not preserve portable exclusion.

That requirement sharpens ADR 0039's claim that coordination needs no server. ADR 0044 already accepted shared infrastructure for private delivery state. This decision places work-delivery exclusion at that same boundary. It records the tension and does not resolve or rewrite ADR 0039.
