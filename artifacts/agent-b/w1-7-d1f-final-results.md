# W1-7 D1F final revision results

## Scope and provenance

- Canonical handoff: `01a01bb2-8135-74c0-9477-31bf1da3b870` in strict-relay thread `wizard-w1-7-design`.
- Starting commit and synchronized `origin/main`: `cfab6d0f7b9e8a08f6b7ec84d3866c99b01f5bd8`.
- Pre-result proof state: 155 events across 29 threads and 2 actors.
- The change is limited to test fixtures and test runners. Migrations `0001` through `0011`, packages, production modules, prior events, and historical artifacts are unchanged.
- Only synthetic principals, references, locators, and local PostgreSQL/Vault containers were used.

## Residue evidence correction

- The D1F rollback fixture now has one session-scoped tenant statement. The three redundant statements and unused `a0` delta variable were removed.
- Correct accounting is six behaviorally discriminating residue assertions and three reference assertions retained as defense in depth.
- Each reference assertion is structurally dependent on the immediately preceding custody-row predicate and the load-bearing `minted_references_custody_row_id_fkey`.
- The three orphan-audit checkpoints evaluate one direct `LEFT JOIN` orphan predicate at three points. They are not claimed as three different controls.
- Correction to bound historical artifact `artifacts/agent-b/w1-7-d1f-tenant-context-results.md`: its description of `set_config(..., false)` as transaction-local is wrong. The setting is session-scoped. The historical artifact was not edited.

## Executed D1F controls

### Role-bound fault controls

- As `postgres`, setting `app.d1f_stage=after_custody_row` was inert. A normal canonical mint committed one custody row, one reference, and one audit row.
- As `engram_maintenance`, the same stage produced `D1F_FAULT_AFTER_CUSTODY_ROW` with SQLSTATE class `42501` and zero residue.
- An unknown stage produced `D1F_STAGE_UNKNOWN` and zero custody, reference, or orphan-audit residue.

### Collision separation and forced-reference differential

- Without `app.d1f_forced_reference`, minting produced a distinct canonical UUIDv7 reference.
- With the forced synthetic value, the returned reference exactly matched the forced value.
- A duplicate forced reference on a different custody identity produced `REFERENCE_COLLISION` with SQLSTATE `23505` through `minted_references_pkey`.
- A second active row on the same tenant/project/namespace/class identity produced `CUSTODY_IDENTITY_ACTIVE` with SQLSTATE `23505` through `custody_single_active`.
- A temporary unrelated unique index caused an unknown `23505`; the original constraint name and PostgreSQL duplicate-key message were re-raised unchanged.

### Primary-key discrimination

| State | Observed result |
|---|---|
| `minted_references_pkey` present | duplicate forced reference refused as `REFERENCE_COLLISION` |
| primary key dropped and catalog-verified absent | duplicate forced reference accepted |
| duplicate state | exactly two rows held the same synthetic reference |
| duplicate removed and primary key restored | catalog-verified primary key present, exactly one reference remained |

The mutation ran only in the disposable live test database. The production migration was never edited.

### Genuine two-session concurrency

- Two independent `psql` sessions used `pause_before_reference` and overlapped on one custody identity.
- Observed process exits: session A `0`, session B `3`.
- Exactly one winner committed. The loser reported `CUSTODY_IDENTITY_ACTIVE`.
- Loser evidence was identified independently by its own locator and forced reference:
  - custody rows: `0`
  - minted references: `0`
  - custody audit rows: `0`
- Winner evidence was identified by its own locator and forced reference:
  - custody rows: `1`
  - minted references: `1`
  - custody audit rows: `1`

## Mutation discrimination

The canonical D1 mutation harness now executes both `d1-behavioural.sql` and `d1f-controls.sql`.

| Control | Guarded/baseline | Mutation applied | Mutated result | Restored |
|---|---:|---:|---:|---:|
| G1 membership policy | 0 | true | 3 | 0 |
| G2 custody-class FK | 0 | true | 3 | 0 |
| G3 scope containment | 0 | true | 3 | 0 |
| G4 namespace refusal | 0 | true | 3 | 0 |
| D1F tenant context | 3, planted terminal residue detected | true | 0, blinded fixture accepted residue | 3, residue detected |

- Executed genuine controls: `5`.
- The no-op negative control remained non-discriminating and the `--negative` invocation exited `1`.
- The tenant-context mutation removes the sole tenant statement from a temporary fixture copy, verifies the removal applied, demonstrates that planted terminal residue becomes invisible, and re-runs the original fixture to prove detection is restored.

## Verification

- `npm test`: exit `0`, 233 passed, 0 failed, 0 skipped across the Node and rendered-site suites.
- `npm run db:test`: exit `0`, PostgreSQL 16.15 and pgvector 0.8.6; all D1F live controls, concurrency, pkey discrimination, and the five-control mutation harness completed.
- `npm run kms:test`: exit `0`, 1 passed, 0 failed, 0 skipped; live Vault 1.17 differential passed.
- `npm run lint`: exit `0`.
- `npm run verify:all`: exit `0`.
- `npm run proof:verify` before publication: exit `0`, 155 events, 29 threads, 2 actors.

Migration SHA-256 values remained:

- `0001`: `1ffe7e5ffa65d231c7f7ebe16f645246f4f2912de9c473f4cf408723e57f9539`
- `0002`: `22a959fa059d5a8de074d3c930575c4b350b2e6523c63c4daecd6654c41396a7`
- `0003`: `6fe1bd0f3118734f237d13960e83ce82f24aa95fca8b9a098ba320e378e27b3e`
- `0004`: `f184ae7ee9cf833b1a86705611886b889b49ede87fa434ee865da209a02119a2`
- `0005`: `58334599dbb621cf16d6b1440cb7b8c70cfb98fb70141192967a686447c6da40`
- `0006`: `436ebe60f80240ec5b806c01bc04fe2b06f1a6933cc53a6d52beeb4c02510559`
- `0007`: `22330dd921f29a8ddd9aea560f2b0093b91234d683b3e19f66408292e3261b28`
- `0008`: `2fd9f03708eac04886128b83c3328cce3988c8dce3d433f8abcfe487e6fc2988`
- `0009`: `e26884d2a0e665bace31e68a1591fb9d8c65642ad56fecaad63411308d15a85f`
- `0010`: `ddb565c40570d729a4d8f69338c190b1f2006022704ff88d52adf80c7090a0d3`
- `0011`: `6e0f65107c9de93194c4f33952e22cb5bb4354eb3d61e3bf0c96639f1ef34469`

## Cleanup and limitations

- Successful, failed, negative-control, and canonical sweep runs ended with zero task-owned containers, volumes, networks, scratch databases, and temporary fixture copies.
- PostgreSQL transaction semantics remain the atomicity boundary. Removing an injected `RAISE` removes the fault rather than manufacturing committed partial residue; no SAVEPOINT was added.
- The three reference residue assertions remain defense in depth, not independently credited controls.
- D1F evidence closes only the dispatched final D1F slice. A7, A8, B5, D2, W1-8, W3, and AEGIS integration are not claimed or touched.
