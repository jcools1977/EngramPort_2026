# Founder identity registry and resolver — bounded result

Parent handoff: `01a038f4-6ca5-7846-902e-7c1d6468360f`

## Delivered surface

- Added forward-only migration `0022_founder_identity_registry.sql`; migrations 0001–0021 are unchanged.
- Added one globally unique external identity row keyed by `(issuer, subject)`, with an internal `identity_id` and a global disable timestamp.
- Added tenant-local bindings from `(identity_id, tenant_id)` to exactly one tenant-local `principal_id`.
- Added single-use founding-authorization state that reserves a future tenant/principal pair and is consumed atomically under `FOR UPDATE`.
- Added the `SECURITY DEFINER` resolver `resolve_founder_principal`. It returns only `principal_id`; the caller-asserted principal and tenant arguments are deliberately ignored. A binding or founding-authorization UUID is only an exact selector for a trusted stored row.
- Forced RLS on all three registry tables, revoked direct access from application and maintenance roles, and granted the maintenance role only resolver execution.
- Did not change bootstrap, OIDC verification/wiring, packages, the threat model, or revision 8.

The resolver does not join tenant-RLS `principals` before a tenant has been resolved. The binding's composite foreign key `(tenant_id, principal_id)` establishes that invariant at write time; joining `principals` inside this pre-bootstrap resolver would make the resolver circular and hide every candidate before tenant context exists.

## Live evidence

The positive fixture stores one external `(issuer, subject)` once and maps it to two distinct tenant-local principals:

```text
W1_1_BINDING_PRODUCT a=54000000-0000-0000-0000-000000000001 b=54000000-0000-0000-0000-000000000002 same_identity_rows=2 surface=principal_id assertions_ignored=true forced_rls=3 direct_read=42501 unique=23505
W1_1_BINDING absent positive=54000000-0000-0000-0000-000000000001 negative=FOUNDER_BINDING_ABSENT
W1_1_BINDING ambiguous positive=54000000-0000-0000-0000-000000000001 negative=FOUNDER_BINDING_AMBIGUOUS
W1_1_BINDING disabled positive=54000000-0000-0000-0000-000000000001 negative=FOUNDER_BINDING_DISABLED
W1_1_BINDING conflict positive=54000000-0000-0000-0000-000000000004 negative=FOUNDER_BINDING_CONFLICT conflict_consumed=0
W1_1_BINDING_ONE_SHOT outcomes=54000000-0000-0000-0000-000000000005,FOUNDER_BINDING_ABSENT consumed=1
```

The one-shot case invokes the same founding authorization concurrently. Exactly one call returns its reserved principal; the other is refused and the datastore records one consumption.

## Discriminating mutations

Each named refusal has a paired positive and its own executable guard-removal mutation:

```text
W1_1_BINDING_ABSENT baseline=0 applied=t after=1 forbidden=t restored=0
W1_1_BINDING_AMBIGUOUS baseline=0 applied=t after=1 forbidden=t restored=0
W1_1_BINDING_DISABLED baseline=0 applied=t after=1 forbidden=t restored=0
W1_1_BINDING_CONFLICT baseline=0 applied=t after=1 forbidden=t restored=0
D1 mutation harness: all controls discriminate (executed=86)
```

The counter advances from 82 to 86 only after each mutation is observed, produces its specific forbidden result, and the shipped migration is rebuilt and shown restored.

## Verification

```text
npm run db:test                                      exit 0; executed=86
npm test                                             exit 0
npm run kms:test                                     exit 0; live Vault differential and cleanup deltas zero
npm run session:async-negative                       exit 0; failed=21 passed=16 manager_refusals_removed=19 nonmanager_green=3 enumerated=t
bash scripts/run-d1-mutation-harness --negative      expected exit 1; NOOP false discrimination correctly rejected
npm run lint                                         exit 0
bash -n scripts/run-db-tests scripts/run-d1-mutation-harness  exit 0
git diff --check                                     exit 0
```

## Explicit finding and non-claims

`founding_authorizations` is durable issuance state, not an issuance authorization boundary. This slice does not establish who may create a founding authorization; the live fixture plants that state through the database administrator. That missing root-of-authority/threat-model row remains a finding for a future threat-model revision. Revision 8 is untouched.

This slice closes nothing. It does not establish the real-provider authentication fact, does not discharge the trusted-session caveat on A6/A7/A8, and does not alter the synthetic-only boundary.
