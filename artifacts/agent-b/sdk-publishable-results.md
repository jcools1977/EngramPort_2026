# Publishable SDK results

Parent handoff: `01a05841-3196-7ae1-b1f5-5353fa493c86`

## Packaging fork

Chosen approach: **one bundled `@engramport/sdk` artifact**.

The alternative was to introduce and eventually publish separate Git-adapter
and Port-Watch packages before the SDK could install. Bundling preserves the
source architecture while giving a consumer one self-contained tarball with no
unpublished package dependency. The cost is duplicated internal bytes in the
SDK artifact and a required bundle rebuild whenever either internal module
changes. The permanent clean-package test is the control for that cost.

The manifest now:

- exports `dist/index.mjs`;
- allowlists only `dist` and `README.md`;
- runs the Vite library build during `prepack`;
- declares MIT license and the repository package directory;
- retains `"private": true`.

No `npm publish` command ran, no site claim changed, and no protocol or event
envelope changed.

## Clean install proof

`tests/sdk-package.test.mjs` packs the real workspace package, installs that
tarball with scripts disabled into a new operating-system temporary directory
outside the repository, imports `@engramport/sdk` by package name, creates a
fresh synthetic EngramPort log, and performs a real append through
`createClient`:

```text
SDK_CLEAN_INSTALL package=imported append=accepted repository=absent
```

The packed file list is limited to:

```text
README.md
dist/index.mjs
package.json
```

The observed tarball is 17,181 bytes compressed and 65,565 bytes unpacked;
the bundled module is 60.79 kB before gzip.

## Permanent contrast control

The `SDK_PACKAGE_ISOLATION` mutation copies the SDK plus its two source
dependencies into an in-repository fixture, changes the package export back to
`src/index.mjs`, includes only `src` and the README, and removes `prepack`.
That exact escaping-relative-import shape still passes the in-repository SDK
append test because sibling packages are present. Packing and installing only
the SDK then fails with `ERR_MODULE_NOT_FOUND` because those siblings do not
exist in the consumer:

```text
SDK_PACKAGE_ISOLATION baseline=0 in_repository=0 applied=t after=1 forbidden=t restored=0
D1 mutation harness: all controls discriminate (executed=154)
```

The accepted baseline was 153 controls. This slice adds one independent
packaging control, moving the exact count to 154.

## Verification

- `node --test tests/sdk-package.test.mjs`: 2 passed, 0 failed.
- `npm run sdk:test`: 6 passed, 0 failed after rebuilding the bundle.
- `bash -n scripts/run-d1-mutation-harness`: exit 0.
- `bash scripts/run-d1-mutation-harness`: exit 0; all 154 controls
  discriminate.
- `npm test`: exit 0, including proof, clean SDK packaging, ordinary SDK and
  product suites, production build, and rendered HTML tests.
- `npm run lint -- --quiet`: exit 0.
- `git diff --check`: exit 0.
- Proof verification at the start of the complete suite: 450 accepted events
  across 86 threads and 3 actors.
