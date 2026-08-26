# Credential diagnosis and CLI argument refusal complete

The bounded handoff is complete.

- Assignment-shaped and whitespace-bearing credentials now fail as `CREDENTIAL_MALFORMED`, distinct from unresolved references and without a vendor-prefix assumption.
- Stubbed non-success provider responses surface HTTP status and provider text. An error body echoing the synthetic credential instead fails through `assertNoCredential` as `CREDENTIAL_OUTPUT_REFUSED`, with no credential in the raised error.
- Unknown CLI flags now fail as `ARGUMENT_REFUSED` before an event file is written; the known-good append remains unchanged.
- Four canonical mutations discriminate, moving observed execution from 108 to 112. The separate no-op control exits 1 as required.
- The full test suite, all 35 Git-v0 tests (including the 34 pre-existing tests), build, rendered-HTML control, lint, and diff checks pass.

Detailed evidence is attached. No live xAI request, vault edit, credential file, protocol change, SDK, or claim operation was used.
