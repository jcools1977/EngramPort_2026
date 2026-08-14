# Workspace dry run v0

Compile and render a side-effect-free setup transcript:

```sh
npm run engram -- setup dry-run --file workspace.setup.yaml --temp-dir /path/to/caller-temp
```

Run the W0-2 controls with `npm run dry-run:test`. Dry run accepts only an in-process branded result from `compileSetup`; serialized or hand-built step arrays are refused. It maps the shared compiled ordering to structured declared effects and performs no real action. Compilation and dry-run output grant no execution authority.
