# W1-7 D3 section 10 canary foundation and first four sinks

## Scope

This bounded D3 slice replaces the self-observing `canaryHarness` and implements the first four section 10 sinks: events, artifacts, plans, and Re:PORT output. The remaining six sinks are not implemented or claimed. Migrations `0001` through `0014`, accepted D1/D1F/D2/D3 behavior, Vault policy, revision 8, production seeds, and historical artifacts are unchanged.

No A7, A8, B5, W1-8, W3, or AEGIS closure is claimed.

## Canary and structural isolation

The canary is assembled at runtime from a synthetic label and 256 bits of chosen hexadecimal entropy. It is used only with hard-pinned tenant `synthetic-canary-tenant` and key `synth-a`; any other tenant or key is refused before a run. The signed payload is a fixed, known SHA-256 digest, not the canary or sink content.

Vulnerable and protected importers must be different function identities. Their observers must also be different functions, and the fixture gives them separate stores. Vulnerable importers receive only the frozen synthetic tenant/canary context; they never receive the Vault boundary, token, key name, or signing function. The non-exportable signing boundary is held only by the harness closure and invoked only after protected-boundary evaluation. This is structural separation, not a claim about call order.

The observer reads the imported sink store independently. It does not read an array written by observer bookkeeping. Each vulnerable importer genuinely writes the canary into its isolated event body, artifact registration, compiled-plan-shaped input, or generated Re:PORT-shaped output; the independent observer then searches those bytes.

## Real protected boundaries

- Events and artifacts use `validateAppendInputs`, factored from the existing CLI append path. The append command calls the same helper, so the test and production path cannot drift.
- Plans call the accepted `compileSetup` boundary, whose first validation is the W1-6 detector.
- Re:PORT validates each authorized evidence record with the same W1-6 detector before deterministic assembly or generator invocation.

The CLI factoring preserves its accepted behavior. Adding detector enforcement to Re:PORT evidence intake is the only new protected-path production behavior in this slice and is required to prevent credential-bearing evidence from reaching generation.

Synthetic and live Vault runs both produced:

```text
W1_7_CANARY vulnerable_dirty=4/4 protected_clean=4/4 signed=4/4 digest=aff7005bb542f2eb6f4dbcafe8414ceab389285ae6c43681a346ab960e72d05c isolation=separate-importers-and-stores
```

Every vulnerable sink was observed dirty. Every protected sink was refused by its real detector boundary, its separate protected store remained clean, and signing over the known digest succeeded through live Vault transit. The existing forbidden-key control remained denied.

## Executable discrimination

The scratch/source-copy harness now executes seventeen controls:

```text
D3_CANARY_DETECTOR baseline=0 applied=t after=1 forbidden=t restored=0
D3_CANARY_OBSERVER baseline=0 applied=t after=1 forbidden=t restored=0
D1 mutation harness: all controls discriminate (executed=17)
```

The detector-disabled variant copies the module graph and replaces the exact W1-6 secret-detector guard. All four protected paths then accept and become dirty while signing remains 4/4; the test reports `protected_clean=0/4` and fails. The observer-neutered variant replaces both exact observer-result anchors. The four vulnerable writes still occur but report `vulnerable_dirty=0/4`, and the test fails. Each mutation checks its anchor and marker, then runs the shipped source again to prove restoration.

The no-op negative remains separate and exits 1.

## Verification

- `npm test`: exit 0; 234 passed, 0 failed, 0 skipped; non-live W1-7 is 4/4.
- `npm run db:test`: exit 0; D2 live 7/7, W1-7 live 9/9, mutation harness `executed=17`.
- mutation harness negative control: exit 1 as required.
- `npm run kms:test`: exit 0; live Vault 1/1, including four protected canary signatures, 0 skipped.
- `npm run lint`: exit 0.
- `npm run verify:all`: exit 0 and repeats the complete Node/site, database, Vault, and lint graph.
- Proof before publication: 179 events across 29 threads and 2 actors.
- Task-owned containers, volumes, networks, scratch databases, copied mutation trees, and temporary files after normal and negative runs: zero.

Only synthetic principals, tenant identifiers, canary bytes, references, and local containers were used.
