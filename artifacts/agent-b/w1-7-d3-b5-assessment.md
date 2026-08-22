# W1-7 D3 B5 assessment: ten-sink canary and Re:PORT incident evidence

## Disposition

This is an evidence assembly for agent-a's independent B5 review. It does **not** claim B5, A7, A8, W1-7, or section 10 closed.

Implementation commit: `1690036f8c2e627156d0cd18b395bc681959f1fa`.

## Re:PORT incident completion

`runReportIfChanged` now accepts an optional incident sink. When the real report input boundary raises `CREDENTIAL_INPUT_REFUSED`, it sends the sink a sanitized `incident.opened` record containing the refusal code, evidence path, tenant/project identity, severity, summary, and detection time, then preserves the original refusal. If incident persistence fails, the report path fails closed.

The protected canary sink persists that record through the real Engram event append path into a copied repository. Its observer reads the written event file, requires exactly one sanitized incident, and requires that the canary is absent. Evidence observed in both structural/database and live-Vault runs:

`W1_7_REPORT_INCIDENT excluded=true recorded=true landing=event-file count=1`

The accepted production control changed only in `packages/git-adapter/src/report-boundary.mjs`: the new refusal-only incident-sink hook. No migration, custody boundary, retention control, detector, seed, or prior canary behavior changed.

## Ten-sink assessment matrix

| Sink | Vulnerable real landing and dirty observation | Protected path and clean observation |
|---|---|---|
| Events | Detector-disabled CLI append writes the canary to an event file; observer reads that file dirty. | Real CLI append refuses credential-bearing body; event-file observer remains clean. |
| Artifacts | Detector-disabled append registers the canary-bearing artifact in a written event and leaves the artifact file; observer reads both. | Real append refuses registration and removes the rejected temporary artifact; event and file observers remain clean. |
| Plans | Detector-disabled setup compiler emits a compiled plan containing the canary; observer inspects the compiled object dirty. | Real compiler refuses the credential-bearing setup; no compiled plan carries the canary. |
| Re:PORT output | Detector-disabled report input path produces generated Re:PORT output containing the canary; observer inspects the generated object dirty. | Real report boundary refuses the evidence, generates no dirty output, and now persists one sanitized `incident.opened` event observed in the written event file. |
| Logs | Signing operation writes the canary at operation log level; observer reads the operation log dirty. | The same signing operation emits a trace record without the canary; observer reads the trace log clean and signing succeeds. |
| Process arguments | Signing operation carries the canary in live argv; observer serializes live argv dirty. | The same signing operation receives the canary on stdin, signs, and serializes live argv without it. |
| Process environment | Signing operation carries the canary in the live process environment; whole-environment observer is dirty. | The same signing operation receives the canary on stdin; observer serializes the entire live environment clean and without the KMS token. |
| Core dumps | A process holds the canary in a buffer and is forced to `SIGSEGV`; the real 667,648-byte dump contains it. | A real transit request runs during a forced `SIGSEGV`; the real 667,648-byte dump excludes canary and token, and the transit response contains a valid `vault:v1:` signature. |
| Backups | A backup is taken during the signing operation from a store containing the canary; observer reads the backup dirty. | The same signing operation backs up the safe operation record; observer reads the backup clean and signing succeeds. |
| Error surfaces | A forced exception places the canary in both message and stack; observer reads both dirty. | The same signing operation emits the sanitized `SIGNING_OPERATION_FAILED` message and stack; observer reads both clean and signing succeeds. |

Across the matrix the fixture observed `vulnerable_dirty=10/10`, `protected_clean=10/10`, `signed=10/10`, and `operation_signed=6/6`. Vulnerable and protected module graphs and landings are separate. Only synthetic tenant, principal, key, token, and canary material is used.

## Signer provenance and section 10 setup evidence

- Structural, database, and mutation canary legs explicitly report `signer=local-stub`. The disclosed test-only response-shape simulator listens on port 18201 and is not KMS, cryptographic, policy, or non-exportability evidence.
- `kms:test` provisions Vault 1.17 and explicitly reports and asserts `signer=live-vault`.
- With the same scoped synthetic token used by the live canary, signing `synth-a` succeeds and addressing `prod-real` is denied.
- The discrimination sequence proves policy causation: an incorrect exact-path policy denies both keys; a broadened policy permits both; restoring the scoped policy permits `synth-a` and again denies `prod-real`.
- Export of the non-exportable synthetic key is refused by Vault; the exportable control returns real key bytes whose length and digest are recorded without emitting the bytes.

These facts are assembled for the section 10 setup requirement that canary authority be structurally unable to reach a production-class key. Whether their binding is sufficient to accept B5 remains explicitly agent-a's disposition.

## Executable discrimination

The new `D3_CANARY_REPORT_INCIDENT` source-copy mutation removes only `await incidentSink(incident)` from the copied report boundary. The mutation anchor is verified applied. The protected Re:PORT evidence remains excluded, while the real incident landing disappears:

`baseline=0 applied=t after=1 forbidden=t restored=0`

The forbidden observation is `W1_7_REPORT_INCIDENT excluded=true recorded=false landing=event-file count=0`. Thus incident persistence is load-bearing independently of credential exclusion. The canonical harness now reports 20 genuine discriminating controls. The separate NOOP negative exits 1 and is not counted.

## Verification and cleanup

- `npm test`: exit 0; 235 passed, zero skipped. Per-suite: proof 34, D2 structural 2, W1-6 19, W1-7 structural 4, report 54, report R2 8, welcome 19, setup 22, watch 16, session 12, approval 25, dry-run 6, DB static 6, dispatch 6, rendered HTML 2.
- `npm run db:test`: exit 0; 83 database controls, D2 live 7/7, durable W1-7 9/9, mutation harness executed 20.
- `npm run kms:test`: exit 0; live W1-7 1/1, zero skipped.
- `npm run lint`: exit 0.
- `npm run verify:all`: exit 0.
- Separate NOOP negative: exit 1, false discrimination rejected.
- Measured live-KMS cleanup deltas: containers 0, volumes 0, canary temporary paths 0. Canary fixture cleanup reports the same 0/0/0 in structural, database, and live runs.
- Migrations `0001` through `0014` are byte-identical to the parent handoff. No real provider, founder, credential, key, or production service was used.
