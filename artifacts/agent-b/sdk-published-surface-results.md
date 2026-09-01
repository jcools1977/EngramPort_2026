# SDK published-surface verification

Date: 2026-09-01

## Result

F135 is disproved. `@engramport/sdk@0.1.0` does not have the alleged silent `handoff()` write defect.

The original probe supplied `boundedContext: []`. Protocol version 1 requires 1–32 bounded-context references. The published SDK therefore returned `ok: false`, included `bounded_context must contain 1-32 references` in `errors`, provided only the candidate `relative` path, and wrote no event. The probe treated the presence of `relative` as success without checking `ok` or `errors`.

The exact public npm tarball for `@engramport/sdk@0.1.0` was downloaded and exercised independently. npm reported tarball shasum `bb3106b44f246b8b39d0ca76dbf246f17a2012ac`.

- Original empty-context input: `ok=false`; expected validation error; no file written.
- Valid input with one event reference: `ok=true`; the reported event file existed.
- No SDK runtime change is required for F135.
- No npm publish occurred in this slice.

## Permanent published-surface control

`tests/fixtures/sdk-package-surface-exercise.mjs` now drives an installed packed tarball through every `EngramPortClient` method:

- `append()` writes its reported event.
- `handoff()` writes its reported event.
- `reply()` writes its reported event.
- `complete()` writes its reported event.
- `inbox()` and `inbox({ entries: true })` observe the same pending handoff.
- `createPortWatch()` wakes exactly once for that handoff.
- The original empty-context handoff is retained as a negative control: it returns `ok=false`, reports the exact validation failure, and does not increase the event count.

The packed-surface test reports:

```text
SDK_PUBLISHED_SURFACE append=written handoff=written reply=written complete=written inbox=observed watch=woke invalid_handoff=refused
```

## Discriminating mutation

`SDK_PUBLISHED_SURFACE_WRITE` changes only the packed artifact's `handoff()` wrapper into the silent-success behavior alleged by F135: it returns `ok=true` and a plausible event path without writing. The ordinary in-repository SDK test still passes against the unmodified source, while the clean installed-package surface test fails because the promised event file is absent. Restoring the package restores the control.

```text
SDK_PUBLISHED_SURFACE_WRITE baseline=0 in_repository=0 applied=t after=1 missing_write_forbidden=t restored=0
D1 mutation harness: all controls discriminate (executed=156)
```

The mutation count moved from 155 to 156. During the full run, the existing `SITE_UNPUBLISHED_INSTALL_CLAIM` mutation was also updated to inject a genuinely unpublished package name; `@engramport/sdk` is now legitimately published, so it could no longer serve as the negative fixture.

## Verification

- `node --test tests/sdk-package.test.mjs`: 3 passed, 0 failed.
- `npm run sdk:package:test`: 3 passed, 0 failed.
- `bash scripts/run-d1-mutation-harness`: all controls discriminate, `executed=156`.
- `npm test`: passed, including log verification, package tests, SDK tests, product controls, build, and rendered HTML tests.
- `npm run lint`: passed.
- `git diff --check`: passed.

## Disposition

The product finding is corrected rather than papered over: F135 now records the false-positive probe and the exact-publication reproduction. The missing test coverage was real, so the packed-surface control and discriminating mutation remain as permanent defenses. A `0.1.1` release is not justified by F135 because no runtime defect was found.
