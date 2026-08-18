# W1-7 durable custody: the binding design

Status: **binding on W1-7 implementation.** Authored 2026-08-18 by agent-a after agent-b's design-gap finding on thread `wizard-w1-7`.
Binds to: `docs/security/setup-credential-threat-model.md` **revision 8**, digest `629ae3f2654aba46e4c1158fc234c6b24831a369505ccf41878af3207b091089`.
Related: `docs/adr/0014-durable-custody-contract.md`, `migrations/0001_canonical_core.sql`, `docs/plan/workspace-setup-wizard-tasks.md`.

## Why this document exists

agent-b's finding is **correct and it is a missing architecture contract**, not an implementation prerequisite that was already written down. Reconciled against every canonical document:

**What exists.** Threat model §5 defines the minted-reference format `epr:<namespace>:<uuidv7>` over the closed namespace `{installation, credential, shape}`, and establishes that a provider cannot forge one because minting requires an authorized custody write. §5A defines the mint contract **behaviourally**: the caller supplies no reference id, who may mint per namespace, a nine-step transaction, commit-both-or-neither, and controls M1–M13 plus MP. §3 assigns a custody model per credential class. §3.0 defines six retention policies with their clock starts. §6 defines invocation-time grant resolution. `migrations/0001_canonical_core.sql` establishes the role, forced-RLS, `SECURITY DEFINER` and `REVOKE ... FROM PUBLIC` **patterns** this design inherits.

**What does not exist anywhere.** No custody table, no minted-reference table, no grant table. `grep` for a custody DDL across `migrations/`, `docs/`, and the engineering specification returns nothing. There is no column set, no unique constraint, no role privilege, no RLS policy, no transaction boundary, no Node service interface, and no statement of where W1-7 stops and W1-8 begins at the schema level.

**Also missing, and inside A7's scope.** A7 requires "custody model declared per inventory row". The inventory uses **Model A**, **Model B** and **Model C** across sixteen rows, and **no document defines what those three models mean.** They are legible from usage but never stated, so an implementer must guess. §1 below states them.

This document is the smallest thing that makes W1-7 implementable without guessing. It adds no control and closes none.

## 1. The three custody models, now defined

| Model | Meaning | EngramPort stores | Example rows |
|---|---|---|---|
| **A** | **Reference only.** The secret lives at the provider and EngramPort never holds it in any form | A custody row of metadata, and the minted reference | 3.12, 3.13 |
| **B** | **Managed custody.** The secret is held by a KMS, HSM or secret manager. EngramPort holds a **locator into that system**, never the material | A custody row with a key locator, and the minted reference | 3.2, 3.3, 3.5, 3.8, 3.11 |
| **C** | **Never at rest.** Transient, in-memory, destroyed at the end of the operation or run. **No custody row is written** | Nothing durable except an audit record | 3.4, 3.10, 3.14, 3.15, 3.16 |

**Only Models A and B produce custody rows.** Model C rows are a defect: if a class is Model C, minting must refuse.

## 2. Durable representation

Two tables. The split is the point: **the custody row holds metadata, the reference table holds the binding**, and M11 and M12 require both to appear in one transaction or neither at all.

```
CREATE TYPE custody_model AS ENUM ('A','B');
CREATE TYPE epr_namespace AS ENUM ('installation','credential','shape');

CREATE TABLE custody_rows (
  id                uuid PRIMARY KEY,
  tenant_id         uuid NOT NULL,
  project_id        uuid NOT NULL,
  namespace         epr_namespace NOT NULL,
  credential_class  text NOT NULL,              -- inventory row id, e.g. '3.3'
  custody_model     custody_model NOT NULL,
  key_locator       text,                       -- Model B only; see section 8
  metadata          jsonb NOT NULL DEFAULT '{}',-- allow-listed keys only; see section 3
  minted_by_principal_id uuid NOT NULL REFERENCES principals(id),
  minted_by_actor_id     uuid REFERENCES actors(id),
  granting_event_id      uuid REFERENCES events(id),
  issued_at         timestamptz NOT NULL DEFAULT clock_timestamp(),
  rotated_at        timestamptz,
  expires_at        timestamptz,
  revoked_at        timestamptz,
  terminal_at       timestamptz,
  retention_policy  text NOT NULL,
  FOREIGN KEY (tenant_id, project_id) REFERENCES projects(tenant_id, id),
  CHECK (custody_model <> 'B' OR key_locator IS NOT NULL),
  CHECK (custody_model <> 'A' OR key_locator IS NULL)
);

CREATE TABLE minted_references (
  reference    text PRIMARY KEY
    CHECK (reference ~ '^epr:(installation|credential|shape):[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'),
  custody_row_id uuid NOT NULL UNIQUE REFERENCES custody_rows(id),
  tenant_id      uuid NOT NULL,
  project_id     uuid NOT NULL,
  namespace      epr_namespace NOT NULL,
  minted_at      timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY (tenant_id, project_id) REFERENCES projects(tenant_id, id)
);
```

**The `reference` regex is the canonical grammar from `docs/schemas/capability-reference-v1.schema.json`, restated in the database** so a malformed reference cannot be inserted even by a caller holding the maintenance role. The namespace inside the string and the `namespace` column must agree; enforce with a `CHECK` on the split prefix or a trigger.

**`custody_row_id` is `UNIQUE`**: exactly one reference per custody row, which is what makes "no orphan row, no orphan reference" a schema property rather than a convention.

## 3. Allowed metadata only

`metadata` carries **no credential, key, token, or ciphertext bytes**, and no provider bearer material of any kind. Permitted keys are exactly: `provider`, `installation_display_id`, `scopes`, `algorithm`, `key_version`, `rotation_generation`, `shape_id`, `notes`. Anything else is refused at the service boundary **and** by a `CHECK` constraint over `jsonb_object_keys`, so a direct SQL writer cannot smuggle a field past the Node layer.

**Every value written into `metadata` passes W1-6's `detectCredential` before the transaction opens.** A hit refuses the mint with `CREDENTIAL_INPUT_REFUSED`. This is the sealed-rows-must-be-detector-clean dependency already recorded in the W1-7 register entry.

## 4. Ownership, namespaces and the trusted authorization source

**Tenant and project are derived, never supplied.** §5A: the caller supplies none of the reference id, UUID, namespace binding, `tenant_id`, `project_id`, `principal_id` or `actor_id`. The service derives `tenant_id` and `project_id` from **W1-5's resolver** (`resolve_founder_authority` and the membership graph), from the authenticated principal, exactly as `bootstrap_workspace` already does. A caller-supplied tenant or project is refused, not overridden. That is M2 and M3.

**Namespaces are closed** by the `epr_namespace` enum, so a fourth namespace cannot be minted without a migration. Per-namespace minting authority, from §5A:

| Namespace | Sole authorized minter |
|---|---|
| `shape` | trusted registry administration path |
| `installation` | authorized installation path |
| `credential` | custody service |

Never permitted: providers, plans, callers, agents, runners, the general application identity. That is M8.

**The authorization source is the live grant, read inside the transaction**, not a caller assertion. Grant existence, scope containment including the namespace-specific mint scope, and the credential class's gate status are all read from the trusted store within the same transaction that writes the row. That is M4, M5, M7 and M13.

## 5. Database-clock expiry and revocation

**Every time comparison uses the database clock.** `clock_timestamp()` in the transaction, never a value passed in by the caller and never the Node process clock. This is what W1-8 will later depend on when it derives `serverNow()` from the database rather than a constant.

- **Expiry:** a row with `expires_at <= clock_timestamp()` is expired. Expired rows never resolve and never authorize a mint.
- **Revocation:** setting `revoked_at` is immediate and irreversible. A revoked custody row refuses resolution and refuses to back any further mint. That is M6, and it is G14's counterpart at the custody boundary.
- **Revocation atomicity (A7):** revoking a custody row and invalidating its reference happen in one transaction. There is no window in which the row is revoked and the reference still resolves.

## 6. The atomic mint transaction

One transaction implementing §5A's nine steps in order, with the writes last:

1. Resolve tenant and project membership for the authenticated principal, from the trusted store.
2. Resolve the principal and, where delegated, the delegated actor.
3. Resolve a live authorized grant covering this mint.
4. Verify requested scopes are contained in that grant, including the namespace mint scope.
5. Verify the credential class and that its applicable gate has passed for the current revision.
6. Insert the custody row.
7. Mint the namespaced UUIDv7 reference.
8. Insert the binding into `minted_references`.
9. Insert the audit record.

**Commit both or neither.** No `SAVEPOINT` may be used to preserve a partial mint; a failure at any step rolls the whole transaction back.

**Rollback and loser residue.** After any failed mint, for that logical row: zero `custody_rows`, zero `minted_references`, zero audit rows claiming success. The loser of a race leaves **no residue in any of the three**, and this is asserted per table rather than by comparing two counts to each other. The F19 lesson applies directly: `rows.size === refs.size` holds when both leak, so equality between two tables is not an orphan test.

## 7. Uniqueness and concurrency

- `minted_references.reference` is the primary key, so a duplicate UUID collides at the database rather than in application logic. That is **M9**, and it is deterministic because the loser receives a unique-violation and refuses.
- `minted_references.custody_row_id` is `UNIQUE`, so a second reference for one row is impossible.
- For **M10**, two concurrent mints racing for one logical row: add a partial unique index expressing the logical identity, for example `UNIQUE (tenant_id, project_id, namespace, credential_class) WHERE revoked_at IS NULL AND terminal_at IS NULL` on `custody_rows` where the class is single-instance. **Exactly one commits; the loser is refused deterministically with a named error.** The barrier must be the database constraint, never an application pre-check, which is the invariant F13 established and W1-5 proved with a discrimination control that removed the constraint set and demonstrated two winners.

## 8. The Vault key locator relationship

For Model B rows, `key_locator` names the material **inside the boundary** and is never the material itself. Its form is `vault:transit/<mount>/<key-name>` or the equivalent for another provisioned KMS. It is a locator, not a credential: possessing it permits nothing without the boundary's own authorization.

**The invariant:** `key_locator` never contains key bytes, a token, or a signature. The accepted `VaultTransitBoundary` already refuses to expose key material, and the export path is Vault-side only, so nothing in the custody row can round-trip to a private key. `detectCredential` runs over `key_locator` as well as `metadata`.

**Key names are selected from trusted configuration**, matching the boundary's existing allowlist behaviour; a custody row cannot introduce a new key name that the boundary would then sign with.

## 9. Roles and privileges

Inheriting the migration's established three-role model exactly.

| Role | `custody_rows` | `minted_references` | `custody_audit` |
|---|---|---|---|
| `engram_app` | **no direct DML**; `SELECT` only through the resolving function | **no direct DML**; `SELECT` only | none |
| `engram_migrator` | owns the objects, applies the migration | owns | owns |
| `engram_maintenance` | full DML for operations and purges | full | `SELECT`, `DELETE` for retention only |

**`engram_app` may not `INSERT`, `UPDATE` or `DELETE` custody rows or references directly.** Minting happens only through a `SECURITY DEFINER` function, so the application role cannot write a custody row by any other path.

**Forced RLS** on all three tables, tenant-scoped, following the existing `tenant_isolation` pattern. Verify with `pg_class.relforcerowsecurity`, **not** `pg_tables.forcerowsecurity`, which does not exist and silently never passes; that error is recorded in F16.

**`REVOKE ALL ON FUNCTION mint_custody_reference(...) FROM PUBLIC`** immediately after creation, then `GRANT EXECUTE` to the specific role. PostgreSQL grants `EXECUTE` to `PUBLIC` by default, and F16 records `engram_app` reaching a `SECURITY DEFINER` function through exactly that default and defeating a table `REVOKE`. Every `SECURITY DEFINER` function carries `SET search_path = public`.

## 10. Retention and audit

`custody_rows` carries the timestamps the six policies clock from, and the policy name in `retention_policy`:

| Policy | Clock starts at | Column |
|---|---|---|
| RET-SESSION, 24h ceiling | session start | not on this table |
| RET-OPS-90 | terminal disposition of the operation | `terminal_at` |
| RET-AUDIT-400 | **acceptance of the audited action** | `custody_audit.accepted_at` |
| RET-GRANT-400 | the grant reaching **terminal status** | `terminal_at` |
| RET-CONFIG-400 | issuance, **reset to the most recent rotation** | `coalesce(rotated_at, issued_at)` |
| RET-VERIFY-104 | expiry of the last artifact signed by the key | `expires_at` |

**RET-CONFIG-400 resets on rotation and RET-GRANT-400 starts at terminal status, not issuance.** Enforce the clock start, not only the duration, and test inside the window where the correct and incorrect clocks disagree.

**Audit fields that survive teardown.** `custody_audit` retains, after the custody row is purged: `audit_id`, `tenant_id`, `project_id`, `namespace`, `credential_class`, `action`, `outcome`, `principal_id`, `actor_id`, `accepted_at`, and the **reference string**. It never retains `metadata`, `key_locator`, or any material. The reference survives so a purged mint remains auditable, and it resolves to nothing, which is correct: §5 already states that structural validity is not proof of resolution.

## 11. The Node service interface

```
mintCustodyReference({ namespace, credentialClass, custodyModel, keyLocator, metadata }, ctx, opts) -> { ok, reference } | { ok: false, code }
resolveCustodyReference(reference, ctx) -> row | null
revokeCustodyReference(reference, ctx) -> { ok, revokedAt } | { ok: false, code }
```

`ctx` carries the authenticated principal and the transaction handle; it does **not** carry tenant, project or namespace authority, which are derived. `opts` carries only fault-injection points for M11 and M12 testing. Named refusal codes, one per control, so a test can assert which guard fired: `NAMESPACE_REFUSED`, `MINT_AUTHORITY_REFUSED`, `TENANT_MISMATCH`, `PROJECT_MISMATCH`, `GRANT_EXPIRED`, `GRANT_REVOKED`, `SCOPE_EXCEEDED`, `CUSTODY_REVOKED`, `CLASS_GATE_NOT_PASSED`, `CREDENTIAL_INPUT_REFUSED`, `REFERENCE_COLLISION`, `CONCURRENT_MINT_LOST`.

**The existing `AtomicCustodyStore` is replaced, not wrapped.** Its `Map` backing and injected `{authorized: true}` literal are the things this design exists to remove.

## 12. The boundary: what W1-7 is not

**W1-7 owns minting, custody rows, references, revocation and retention. W1-8 owns invocation-time grant resolution.**

| Concern | Owner |
|---|---|
| Writing custody rows and minting references | **W1-7**, A8 |
| Custody model per row, resolving service, tenant binding, revocation atomicity | **W1-7**, A7 |
| Reading a grant **to authorize a mint** | **W1-7**, inside the mint transaction |
| Reading a grant **at invocation time** to authorize an operation | **W1-8**, A6 and B9 |
| The twelve invocation comparisons G1–G14 | **W1-8** |
| `serverNow()` derived from the database clock in `credential-boundary.mjs` | **W1-8** |
| Signing boundary demonstration on synthetic keys | **W1-7**, B5; **B1–B4 close at W3** |

The distinction is the moment. W1-7 asks "may this principal mint this reference now"; W1-8 asks "may this descriptor invoke this operation now". They read overlapping data and they are not the same control. **W1-7 must not implement G1–G14 or A6/B9**, and a W1-7 result claiming them will be refused.

## 13. Contract delta, recorded without touching revision 8

This design adds no control, changes no control's meaning, and closes nothing. It states a representation for a contract revision 8 already defines behaviourally, and defines the three custody models revision 8 uses without defining.

**Revision 8 is not edited.** It is digest-pinned at `629ae3f2…` and the W1-2 dispatch gate binds every Tier A evidence claim to that exact digest, so editing it to fold in this design, or to correct F18's stale ownership rows, would invalidate the accepted W1-5, W1-6 and W1-6a bindings and buy nothing behavioural. The delta is carried here and in ADR 0014, and folds into the next revision that changes a contract for another reason. **F18 stays open on those terms.**
