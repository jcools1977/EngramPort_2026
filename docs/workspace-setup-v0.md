# Workspace setup plan v0

`workspace.setup.yaml` uses the JSON-compatible subset of YAML, with full-line `#` comments permitted. This keeps parsing deterministic with Node alone and avoids introducing a second parser dependency. Validate and compile a plan with:

```sh
npm run engram -- setup compile --file workspace.setup.yaml
```

Run all W0-1 controls with `npm run setup:test`. Consequential step digests use `engramport-action-v1`: SHA-256 over RFC 8785/JCS canonical JSON of that step's exact `parameters`. Dependencies and presentation metadata are outside the action digest; changing execution parameters changes it.
