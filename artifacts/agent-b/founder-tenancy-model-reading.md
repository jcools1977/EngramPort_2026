# Founder tenancy model: source reading and option costs

Reply to handoff `01a038e5-1464-7f59-97f1-97f803d82df8` on `founder-tenancy-model`.

This is a reading for DeVere, not a decision. It changes no accepted surface, claims nothing, leaves C17 held, and keeps `executed=82`.

## The two premises are correct

1. **One principal can establish one tenant today.** `bootstrap_establishments.principal_id` is the primary key and references `founder_authorities(principal_id)` (`migrations/0001_canonical_core.sql:181-185`). `bootstrap_workspace` inserts that row before any tenant, principal, project, or membership (`:196-214`) and translates every `unique_violation` to SQLSTATE `23505`, message `founder bootstrap already established` (`:216-217`). The accepted concurrency control invokes the function twice with the same principal and different tenant/project ids, requires exactly one winner, requires that exact loser message, and asserts one establishment and one principal (`scripts/run-db-tests:157-200`). This is structural and already discriminating, not an inference from column names.
2. **External identity is tenant-scoped in `principals`.** The table has a global `id` primary key, one non-null `tenant_id`, and `UNIQUE NULLS NOT DISTINCT (tenant_id, external_issuer, external_subject)` (`migrations/0001_canonical_core.sql:15-20`). The same non-null `(external_issuer, external_subject)` can therefore appear once in tenant A and once in tenant B, but those rows need different globally unique `id` values. The bootstrap function does not exercise that capacity yet: it stores `('bootstrap', p_principal_id::text)` rather than verified claims (`:210-211`).

## ADR 0026 did silently choose option C as written

The error agent-a asked me to check is real.

ADR 0026 Decision 3 maps one globally unique `(issuer, subject)` directly to `founder_authorities.principal_id` (`docs/adr/0026-founder-identity-binding.md:28-32`). One external identity therefore resolves to one principal. That principal can occupy only one `bootstrap_establishments` row, and its `principals` row can belong to only one tenant. A returning founder resolving through the same registry row reaches the same principal and is refused with `founder bootstrap already established`.

That composition is option C even though ADR 0026 says the product question is deferred at `:38-44`. The accepted constraints record repeats the same contradiction: global uniqueness at `docs/constraints.md:2098`, deferral at `:2100`. Decision 3 must be corrected or explicitly narrowed to provisional before a binder is built. Accepted events are immutable, so the correction would have to be a later ADR/decision, not an edit to event history.

There is a second tension: a relation globally unique on `(issuer, subject)` cannot contain two live rows for the same pair, while ADR 0026 requires a normal `FOUNDER_BINDING_AMBIGUOUS` refusal and paired mutation. Ambiguity is meaningful only if the eventual design admits multiple scoped/history candidates, or if the control is explicitly classified as structural corruption detection. ADR 0026 currently says neither.

## Shared accepted surface

The verifier/manager seam does not change under A, B, or C: the verifier still returns only verified claims, the binder still returns exactly `{principal_id}`, and callers still cannot assert the internal id.

One separately deferred choice applies to all three options. If verified issuer/subject must be copied into the tenant `principals` row, a forward migration must replace the accepted `bootstrap_workspace(uuid,uuid,uuid,text,text)` signature and its insert at `migrations/0001_canonical_core.sql:196-211`. Its ACL/signature and positive/negative controls at `tests/bootstrap/bootstrap.sql:50-111`, plus the concurrent calls at `scripts/run-db-tests:157-225`, must follow the new signature. If the pre-bootstrap registry remains the sole canonical identity record, that function need not accept the claims, but the tenant principal continues to carry the synthetic `bootstrap` identity. That transfer question remains distinct from the tenancy choice.

## Option A — one global principal id, many founded tenants

### Accepted surface and measured cost

This option conflicts with two accepted keys, not one:

- `principals.id` is globally unique while the same row has exactly one `tenant_id` (`migrations/0001_canonical_core.sql:15-20`). The current table cannot represent one principal row in two tenants.
- `bootstrap_establishments.principal_id` is the primary key (`:181-185`). It cannot represent two establishments for one principal.

A forward migration must therefore do both of the following:

1. Separate global principal identity from tenant participation—for example, a global principal plus a tenant-principal relation—or replace the principal key with a tenant-qualified representation while preserving one logical global id. Either physical choice changes the `principals` tenant RLS policy generated at `migrations/0001_canonical_core.sql:123-127` and the tenant/principal check in `validate_event_actor_delegation` at `:102-103`.
2. Replace the establishment key with at least `(principal_id, tenant_id)` and retain the independent tenant/project uniqueness barriers, then replace `bootstrap_workspace` at `:196-217` so a second tenant is an accepted establishment rather than a translated unique violation.

The principal remodel reaches eight accepted foreign-key relationships across four migration files: `project_memberships`, actor ownership, actor delegation, and events (`migrations/0001_canonical_core.sql:32,37,43,63`); custody provenance (`migrations/0002_durable_custody.sql:4`); invocation grantee and granter (`migrations/0017_w1_8_live_invocation_store.sql:33-34`); and durable setup sessions (`migrations/0019_w1_1_durable_setup_sessions.sql:13`). A normalized global-principal/tenant-link design must redirect the three tenant-qualified relationships and decide whether the five single-id relationships mean global identity or tenant-local participation. A composite-key design instead forces those five single-id relationships to gain tenant context. Thus no physical representation preserves the accepted graph unchanged.

The existing bootstrap control must also change: `scripts/run-db-tests:157-200` currently proves same-principal/different-tenant has one winner, while its discriminating weakening at `:202-225` proves that removing the barrier yields two. Under A, two tenants must be a positive, so the concurrency control needs a different duplicate-attempt fixture to preserve its atomicity claim.

### Returning founder

After those changes, the same bound principal may establish a second tenant. The concrete accepted result is the function's returned `(tenant_id, project_id)` row (`migrations/0001_canonical_core.sql:215`); there is no accepted symbolic success code to quote. Without the key/function changes, the concrete result remains SQLSTATE `23505`, `founder bootstrap already established`.

### Revocation

As currently shaped, founder authority is global to the principal: `founder_authorities.principal_id` is its primary key and `resolve_founder_authority` takes only that id (`migrations/0001_canonical_core.sql:176-193`). A revoke of that row therefore disables the founder across every tenant reached by the global principal. That effect propagates to setup-session creation/read (`migrations/0019_w1_1_durable_setup_sessions.sql:47-54,94-104`) and grant authorization (`migrations/0017_w1_8_live_invocation_store.sql:56-64`), as well as the custody minter's authority read.

This is the surprising option: an operation described as revoking the founder "in tenant A" is not representable. It revokes the one global authority everywhere. Making revocation tenant-local while retaining a global principal would require tenant-qualified founder authorities and tenant context in every resolver/caller above—another accepted control family, not a column tweak.

### Poisoned binder gain

A poisoned `(issuer, subject) -> principal_id` row gives the attacker every tenant membership, setup authority, and founder-authority use attached to that global principal. One bad binding has multi-tenant blast radius. Rebinding or conflicting the row also locks the legitimate founder out of all of those tenants at once.

## Option B — distinct tenant-local principal ids

### Accepted surface and measured cost

This is the option the existing tenant graph already represents:

- `principals` already permits the same external pair once per tenant and requires distinct global row ids (`migrations/0001_canonical_core.sql:15-20`).
- Each local principal already gets its own `founder_authorities` row (`:176-180`) and one `bootstrap_establishments` row (`:181-185`).
- Every tenant-qualified membership/grant foreign key can remain as written.

So B requires **zero key changes** to those three existing tables and **zero rewrites** of the eight principal foreign keys counted under A. It is not free at the binder boundary, however. ADR 0026's proposed global unique direct mapping must be replaced. Before bootstrap, the registry needs either a target tenant id allocated in advance or an opaque, single-use founding-intent id, and its uniqueness must distinguish the two bindings for the same `(issuer, subject)`. The resolver may use a caller-provided selector only to find an exact out-of-band authorized row; it may not treat a tenant hint as authority. With no exact selector, multiple local bindings must produce `FOUNDER_BINDING_AMBIGUOUS`, not lowest-id selection.

Controls required beyond the shared bootstrap signature decision are: the same verified identity bound to two distinct principal ids; exact selection of each authorized target/founding intent; no-target ambiguity refusal; caller tenant/principal substitution refusal; and a paired positive showing the two resulting tenant principal rows carry the same external pair without violating the tenant-scoped unique constraint. The existing same-principal concurrency barrier remains unchanged; a separate two-principal positive proves the multi-tenant product behavior.

### Returning founder

If the return path reuses the first tenant's principal, it is still refused with SQLSTATE `23505`, `founder bootstrap already established`. To found tenant B, the trusted provisioning path must first allocate a different principal id and authority/binding for tenant B or its founding intent. `bootstrap_workspace` then accepts that new principal and returns tenant B's `(tenant_id, project_id)` row. The success is therefore conditional on a new trusted binding, never on a caller asking for another tenant.

### Revocation

Revoking tenant A's local founder-authority principal affects tenant A only; tenant B's different principal and authority row remain live. A global external-identity disable—for example, because the IdP account is compromised—would be a separate all-bindings operation and must not be conflated with tenant-local authority revocation. B is the only listed option where those two operations are naturally distinct in today's schema.

### Poisoned binder gain

Poisoning one scoped binding gives the attacker the authority of one tenant-local principal, not every principal for that external identity. A registry-wide attacker can of course poison multiple rows, and a resolver that trusts an unverified tenant hint would restore cross-tenant blast radius; the exact out-of-band binding check is therefore load-bearing. A conflicting row can also deny one tenant or consume a new founding intent without compromising already separate tenant principals.

## Option C — one external identity may found exactly one tenant ever

### Accepted surface and measured cost

The current keys already enforce C when composed with ADR 0026:

- global unique `(issuer, subject)` registry row -> one founder principal (`docs/adr/0026-founder-identity-binding.md:28-32`);
- one founder authority per principal (`migrations/0001_canonical_core.sql:176-180`);
- one establishment per principal (`:181-185`);
- one tenant per principal row (`:15-20`).

No existing key, foreign key, RLS policy, or bootstrap atomicity barrier changes. The planned registry/resolver still has to be implemented and the ADR's deferred section at `docs/adr/0026-founder-identity-binding.md:38-44` must become an explicit C decision. The shared issuer/subject transfer choice may still replace `bootstrap_workspace`; it is not required merely to enforce the one-tenant rule if the registry remains canonical.

The required new control is a sequential return attempt—not only today's overlapping race—showing the same verified identity resolves to the same principal, the second establishment refuses with the exact message, and no tenant/project/principal/membership residue lands. ADR 0026's ambiguity control also needs the structural/history disposition noted above.

### Returning founder

The binder returns the existing principal. The second `bootstrap_workspace` call is refused with SQLSTATE `23505`, `founder bootstrap already established`. This is already the function's accepted named refusal and the overlapping form is already observed by `scripts/run-db-tests:175-200`.

This policy need not mean the identity can never join another tenant. It means it cannot **found** another one; invitations could create a tenant-local non-founder principal/member under a separately defined flow.

### Revocation

The one authority row is physically global to its principal, but the principal can have only one founded tenant. Revocation therefore has one-tenant effect and no hidden second tenant to surprise. Identity disable and tenant-founder revocation still coincide unless modeled separately.

### Poisoned binder gain

A poisoned mapping gives the attacker the victim principal's one tenant and its founder authority. It also enables permanent account squatting before bootstrap: the attacker can consume the identity's single establishment, after which the legitimate founder receives `founder bootstrap already established`. The confidentiality blast radius is smaller than A, but the global uniqueness and one-shot rule make denial/recovery consequences larger than a single bad B binding.

## Additional options

### D — global external account, tenant-local principals

Introduce a globally unique external-identity/account record for `(issuer, subject)`, but map that account to one or more tenant-local principals in a second relation. The ADR's global uniqueness then applies to the external account, not directly to `founder_authorities.principal_id`. This is a normalized form of B, but it adds an important semantic split:

- tenant authority revocation disables one local principal;
- compromised external identity disables the global account and therefore all bindings;
- returning login first establishes the global account, then requires an exact authorized tenant/founding-intent binding.

It does not answer how many tenants an account may found; a policy/constraint on the account-to-principal relation still must. It does avoid forcing that product cardinality into the definition of `principal_id`, and it makes the two revocation operations explicit instead of accidental.

### E — founding is invitation/claim authority, not an identity entitlement

Require a single-use, out-of-band founding claim that already names a proposed tenant/founding intent. Verified OIDC proves who is redeeming it; the claim, not the external identity alone, authorizes tenant creation and chooses the new local principal. A returning identity can found another tenant only if issued another claim. Existing-tenant login still needs an exact tenant/account binding, so this does not remove the binder, but it avoids treating "may found N tenants" as an inherent property of `(issuer, subject)`.

### F — one founded tenant, invitations elsewhere

Adopt C only for founding while separately allowing the same external identity to join other tenants through tenant-local invitation bindings. This avoids the common false equivalence between "one identity founds one tenant" and "one identity can belong to one tenant." Its costs are C's bootstrap path plus a later invitation/account-linking path; it does not require A's global principal remodel.

## Evidence-weighted comparison, without a choice

| Option | Existing key rewrites | Second founding | Tenant-A authority revoke | One poisoned binding |
|---|---:|---|---|---|
| A: one global principal | Two core identity/establishment keys plus principal graph/RLS work | Same principal succeeds after remodel | Revokes every tenant unless authority is also remodeled | Reaches every tenant of the principal |
| B: tenant-local principals | Zero existing key/FK rewrites; registry selector/cardinality must change | New trusted local binding succeeds; old principal refuses | Tenant A only | One scoped tenant binding |
| C: one tenant ever | Zero existing key/FK rewrites; ADR deferral becomes explicit policy | `23505 founder bootstrap already established` | The only founded tenant | One tenant plus one-shot squatting/DoS |
| D: global account + local principals | New two-level registry; existing tenant principal graph can remain | Policy on account-binding relation decides | Local revoke; global identity disable is separate | Local row unless global account is poisoned |

The evidence makes B or its normalized D form materially smaller than A in existing schema changes, and makes A's cross-tenant revocation the largest hidden consequence. That is not a selection. C is the behavior ADR 0026 and the current keys already produce; choosing it would ratify an accidental composition as product policy, while choosing A or B requires correcting ADR 0026 before implementation.

## Scope verification

No migration, schema, function, control, fixture, package, binder, OIDC component, or accepted document was changed. `npm run proof:verify` passed at 259 events before publication. Full engineering suites were not run because this reading changes only its bound artifact and reply event.
