# W1-7 D3 A7/A8 control mapping

## Scope and disposition

This assessment replies only to handoff `01a02ac0-f2bd-7555-be97-12b3bb0a3d93`. It maps the accepted durable implementation and committed evidence; it does **not** close A7 or A8. Disposition remains with agent-a. Migrations `0001` through `0014`, production packages, revision 8, seeds, prior events and historical artifacts are unchanged. The only new executable evidence is in the W1-7 live fixture and scratch mutation harness. All identities, references and locators are synthetic.

## A8: exact section-5A mapping

| Control | Exact section-5A attempt / expected result | Present enforcement | Committed observation | Discriminating mutation | Status |
|---|---|---|---|---|---|
| M1 | Caller supplies a chosen reference id / Refused; callers cannot name references | `PrincipalSessionBinding.mint` passes no reference parameter; `mint_custody_reference` generates the UUIDv7 in migration 0011 lines 13-14. | `tests/wizard-w1-7.test.mjs:44-51`: a canonical caller value is supplied as `request.reference`; the returned value is independently generated. | `D3_A8_M1_CALLER_REFERENCE` makes the copied adapter set the maintenance-only forced-reference GUC from the caller field; the chosen value is returned and the fixture fails. | Discriminating. |
| M2 | Mint bound to a foreign tenant / Refused | The adapter binds the verified session principal; `derive_mint_membership` derives tenant/project; caller tenant is not a mint parameter. | `tests/d2-live.test.mjs:59-68`: caller substitution still stores principal Y and tenant Y. | `D2_SUBSTITUTION` makes the copied adapter honor caller principal X; the observed mint lands under X's foreign tenant and the fixture fails. | Discriminating. |
| M3 | Mint bound to a foreign project within the right tenant / Refused | `derive_mint_membership(uuid)` chooses a membership and the mint signature has no project argument (`migrations/0008_d1e_tenant_derivation.sql:6`). | No committed fixture constructs two same-tenant projects and attempts to select the foreign project. | None. The existing M2 substitution crosses tenant and project together; it cannot be credited to M3. | **Gap: structural shape exists, no direct observation or discrimination.** |
| M4 | Mint under an expired grant / Refused | Migration 0011 line 7 reads `founder_authorities` `FOR SHARE` and compares `expires_at` with `clock_timestamp()`. | `tests/wizard-w1-7.test.mjs:44-51`: the durable authority is expired, mint returns `MINT_AUTHORITY_REFUSED`, residue is 0/0/0. | `D3_A8_M4_EXPIRED_AUTHORITY` removes only the expiry predicate in scratch `pg_proc`; the expired mint commits and the fixture fails. | Discriminating. |
| M5 | Mint under a revoked grant / Refused | Migration 0011 line 7 reads the authority row `FOR SHARE` and rejects non-null `revoked_at`. | `tests/wizard-w1-7.test.mjs:44-51`: the durable authority is revoked, mint returns `MINT_AUTHORITY_REFUSED`, residue is 0/0/0. | `D3_A8_M5_REVOKED_AUTHORITY` removes only the revoked predicate in scratch `pg_proc`; the revoked mint commits and the fixture fails. | Discriminating. |
| M6 | Mint against a revoked custody row / Refused | **Absent.** Migration 0011 never reads an earlier custody row's revocation state; `custody_single_active` excludes revoked rows, so it permits a replacement active row. | No committed mint fixture attempts a second mint after revocation. The resolution fixture's `revoked=null` proves only that the old reference no longer resolves. | None: there is no M6 guard to neutralise. | **Implementation and evidence gap.** |
| M7 | Requested scope exceeds the grant / Refused, not narrowed | Migration 0011 line 11 computes the exact required scope and requires it in durable `g.scopes`. | `tests/failure/d1-behavioural.sql:9` and `tests/wizard-w1-7.test.mjs:38` observe `SCOPE_EXCEEDED` for unheld class 3.5. | D1 `G3` removes the exact scope predicate from scratch `pg_proc`; the forbidden mint succeeds. | Discriminating. |
| M8 | Wrong namespace for the minting identity, for example an agent minting `credential` / Refused | Migration 0011 line 11 refuses `shape` and `installation` at this custody boundary before scope evaluation. | `tests/failure/d1-behavioural.sql:10` covers both namespaces; `tests/wizard-w1-7.test.mjs:37` observes `NAMESPACE_REFUSED`. | D1 `G4` removes the namespace guard from the final stored function; both forbidden namespaces mint. | Discriminating. |
| M9 | Duplicate UUID collision / Refused deterministically | `minted_references_pkey`; migration 0011 line 19 maps that constraint to `REFERENCE_COLLISION`. | `tests/failure/d1f-collision.sql:19-44` observes the named `23505` outcome on a forced duplicate. | `tests/failure/d1f-collision.sql:66-80` catalog-verifies the pkey, drops it, observes two identical references, removes the duplicate and restores the pkey. | Discriminating, executed inside db:test rather than counted in the source-copy harness. |
| M10 | Two concurrent mints racing for one logical row / Exactly one commits; the loser is deterministic | Partial unique index `custody_single_active`; migration 0011 line 19 maps its violation to `CUSTODY_IDENTITY_ACTIVE`. | `scripts/run-db-tests:77-128`: two independent overlapping sessions produce one winner, one named loser, winner 1/1/1 and loser 0/0/0. | None for this custody race. The later weakened-barrier two-winner mutation in the runner is the W1-5 bootstrap race, not M10. | **Behavior observed; no discriminating mutation.** |
| M11 | Fault injected between custody-row write and reference bind / Neither survives; no orphan row, no orphan reference | Migration 0011 line 16 raises inside the real transaction after the custody insert and before reference bind. | `tests/failure/d1f-controls.sql:10-14` observes the named fault and zero custody/reference/orphan-audit residue. | None by accepted structural limitation: removing the injected `RAISE` removes the fault and completes normally; manufacturing committed residue with a savepoint would test a different contract. | **Behavior observed; structurally non-discriminating.** |
| M12 | Fault injected after reference mint, before commit / Reference does not exist afterwards | Migration 0011 line 17 raises inside the real transaction after reference bind and before audit/commit. | `tests/failure/d1f-controls.sql:15-19` observes the named fault and zero custody/reference/orphan-audit residue. | None for the same PostgreSQL implicit-abort limitation as M11. | **Behavior observed; structurally non-discriminating.** |
| M13 | Credential class whose applicable gate has not passed / Refused | Migration 0011 line 9 reads the revision-8/digest-bound gate `FOR SHARE` and returns `CLASS_GATE_NOT_PASSED`. | `tests/failure/m13-class-gate.sql:3-21` and `tests/wizard-w1-7.test.mjs:40` observe passed, failed and nondisclosing cases. | `D3_A8_M13_CLASS_GATE` supplies the otherwise-masking 3.2 scope, removes the exact gate guard from scratch `pg_proc`, observes the forbidden mint, then rebuilds. | Discriminating. |
| MP | Fully authorized mint / Succeeds, returns a reference that resolves, with an audit record | Migration 0011 lines 7-18 performs authority, derivation, row, reference and audit work in one transaction; migration 0012 provides resolution. | `tests/wizard-w1-7.test.mjs:28-30` observes canonical reference and 1/1/1 linked rows; lines 54-56 observe the returned reference resolving for the bound principal. | `D3_ATOMIC_ROWS` changes the copied adapter's commit to rollback and observes 0/0/0; `D3_RESOLUTION_ISOLATION` weakens both isolation layers and makes a foreign resolve visible. | Discriminating across the committed mint and resolve fixtures. |

### Controls without discriminating evidence

- **M3**: no same-tenant/foreign-project fixture or mutation.
- **M6**: no enforcement and no fixture; a revoked custody row does not currently block a later mint.
- **M10**: the real overlap is proven, but its custody uniqueness barrier has not been neutralised in an executable mutation.
- **M11 and M12**: real zero-residue behavior is proven; fault-removal is structurally non-discriminating and is not counted.

These five entries are not hidden inside broader `D3_AUTH_REFUSALS` or atomicity claims.

## A7 four-clause mapping

| A7 clause | Fixture observation | Mutation |
|---|---|---|
| custody model declared per inventory row | `tests/wizard-w1-7.test.mjs:28-40` stores class 3.3 as Model B and refuses 3.3 as Model A; `tests/failure/d1-behavioural.sql:7` also checks the class-mapping FK. | `D3_AUTH_REFUSALS` makes the boundary report the model mismatch accepted; D1 `G2` drops the class-mapping FK and permits an unmapped custody row. The function guard and storage invariant mutually reinforce the property, so neither mutation alone removes both layers. |
| resolving service | `tests/wizard-w1-7.test.mjs:54-56` resolves live and returns one nondisclosing null for unknown, malformed, foreign and revoked references. | `D3_RESOLUTION_ISOLATION`: each isolation layer alone still passes; weakening both yields `foreign=resolved`. |
| tenant binding | `tests/d2-live.test.mjs:59-68` and the durable atomic row observation store the verified principal's derived tenant, not caller state. | `D2_SUBSTITUTION` honors caller principal X and visibly lands in X's foreign tenant. |
| revocation atomicity | `tests/wizard-w1-7.test.mjs:59-61` observes one database clock across custody/reference/audit, 0/0/0 after the in-transaction fault, immediate resolution refusal and irreversibility. | `D3_REVOCATION_ATOMICITY` skips only reference invalidation; the fixture observes divergent clocks/state and fails. |

This mapping supplies agent-a with the evidence inventory; it does not decide A7 or A8 closure.

## New executable evidence and accounting

The four new controls were run from source/database copies only:

```text
D3_A8_M1_CALLER_REFERENCE baseline=0 applied=t after=1 forbidden=t restored=0
D3_A8_M4_EXPIRED_AUTHORITY baseline=0 applied=t after=1 forbidden=t restored=0
D3_A8_M5_REVOKED_AUTHORITY baseline=0 applied=t after=1 forbidden=t restored=0
D3_A8_M13_CLASS_GATE baseline=0 applied=t after=1 forbidden=t restored=0
D1 mutation harness: all controls discriminate (executed=24)
```

The NOOP negative remains separate: `baseline=0 applied=f after=0 restored=0`, invocation exit 1. No accepted production control and no simulator changed.

## Verification and cleanup

- `npm run db:test`: exit 0; PostgreSQL 16.15 / pgvector 0.8.6; database controls 83, D2 live 7/7, W1-7 live 10/10, mutation harness `executed=24`.
- `bash scripts/run-d1-mutation-harness --negative`: exit 1 as required; `NOOP baseline=0 applied=f after=0 restored=0` and false discrimination rejected.
- `npm test`: exit 0; 235 passed, 0 failed, 0 skipped. Per-suite: proof 34, D2 structural 2, W1-6 19, W1-7 structural 4, Re:PORT 54, R2 8, welcome 19, setup 22, watch 16, session 12, approval 25, dry-run 6, DB static 6, dispatch 6, rendered HTML 2.
- `npm run kms:test`: exit 0; live W1-7 1/1, `signer=live-vault`, ten vulnerable sinks dirty, ten protected sinks clean, six operational paths signed, incident count exactly one and canary excluded.
- `npm run lint`: exit 0.
- `npm run verify:all`: exit 0.
- Post-suite cleanup measurement: compose containers 0 and compose volumes 0. The W1-7 observers also reported `containers_delta=0 volumes_delta=0 temp_paths_delta=0` independently on the local-stub and live-Vault legs.

The assessment makes no A7/A8, W1-8, W3 or AEGIS closure claim.
