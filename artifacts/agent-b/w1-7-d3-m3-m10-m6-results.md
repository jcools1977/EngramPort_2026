# W1-7 D3 M3, M10 and M6 lifecycle results

## Scope and disposition

This slice implements the decision in ADR 0016 and replies to handoff `01a02bcf-9744-7dd7-bb00-86927506106c`. It does not claim A7 or A8 closure. W1-8, W3, AEGIS integration, and M8's identity half are untouched. All principals, projects, locators, references, keys and services used by the fixtures are synthetic.

## M3 enforcement

Forward-only migration `0015_d3_membership_ambiguity.sql` replaces storage-order selection with fail-closed uniqueness. `derive_mint_membership(uuid)` now returns a row only when the authenticated principal has exactly one eligible membership. Zero or multiple memberships therefore reach the existing `TENANT_PROJECT_REFUSED` boundary. The function signature, `SECURITY DEFINER`, pinned `search_path=public`, owner and ACL shape are preserved; PUBLIC and `engram_app` remain denied and `engram_migrator`/`engram_maintenance` retain execution.

Committed live observation:

```text
W1_7_A8_M3 positive=minted ambiguous=TENANT_PROJECT_REFUSED landed=none
```

The positive proves the ordinary single-membership path still mints into the expected project. The negative adds a lower-UUID project in the same tenant and a second membership for the same principal, then observes refusal and no custody landing.

Mutation `D3_A8_M3_MEMBERSHIP_AMBIGUITY` restores `ORDER BY tenant_id,project_id LIMIT 1` in the scratch database. The forbidden mint lands in synthetic project `02000000-0000-0000-0000-0000000000ff`, making the fixture fail:

```text
D3_A8_M3_MEMBERSHIP_AMBIGUITY baseline=0 applied=t after=1 forbidden=t restored=0
```

The seed and fixture audit found no accepted control that depends on multi-membership derivation.

## M10 discrimination

The committed fixture uses two overlapping database connections, distinct forced references and the accepted `pause_before_reference` stage against one logical custody identity. With `custody_single_active` present it observes exactly one committed winner, one `CUSTODY_IDENTITY_ACTIVE` loser, and 1/1 custody/reference state:

```text
W1_7_A8_M10 winners=1 custody=1 references=1 outcomes=winner,CUSTODY_IDENTITY_ACTIVE
```

Mutation `D3_A8_M10_ACTIVE_RACE` drops only the scratch database's `custody_single_active` index. The identical overlap produces two winners and 2/2 state, so the fixture fails:

```text
D3_A8_M10_ACTIVE_RACE baseline=0 applied=t after=1 forbidden=t restored=0
```

No new simulator was introduced; the fixture uses the real PostgreSQL function, transactions and overlap stage already accepted for D1F.

## M6 lifecycle evidence

M6 is recorded as **inapplicable**, not satisfied, under ADR 0016. The non-counted lifecycle fixture mints and resolves an old row, lawfully revokes it, observes the old reference unresolved, then mints a distinct replacement row and observes the replacement resolving:

```text
W1_7_A8_M6_LIFECYCLE old=null replacement=resolved distinct=true
```

This is lifecycle evidence only. It adds no mutation and does not increment `executed=`.

## Harness and verification

The two new discriminating mutations raise the harness total from 24 to 26:

```text
D1 mutation harness: all controls discriminate (executed=26)
```

The no-op negative remains separate and exited 1 as required: `NOOP baseline=0 applied=f after=0 restored=0`.

- `npm test`: exit 0; 235 passed, 0 failed, 0 skipped.
- `npm run db:test`: exit 0; PostgreSQL 16.15 / pgvector 0.8.6; database controls 83, D2 live 7/7, W1-7 live 13/13, mutation harness `executed=26`.
- `npm run kms:test`: exit 0; live W1-7 1/1 with `signer=live-vault`.
- `npm run lint`: exit 0.
- `npm run verify:all`: exit 0.
- Both canary legs reported `containers_delta=0 volumes_delta=0 temp_paths_delta=0`; final host measurement found compose containers 0 and compose volumes 0.

Existing accepted controls changed only through the intended M3 tightening: a principal with multiple eligible memberships now refuses instead of silently selecting the lowest UUID. Migrations 0001 through 0014, production packages, revision 8, seeds, prior events and historical artifacts are unchanged.
