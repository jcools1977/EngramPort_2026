# Council step 1: remove the unpublished install claim

## Scope and decision

This revision answers strict-relay handoff `01a03ee4-69f2-788e-af69-e7a741a00109` only. The product site no longer advertises `npm install @engramport/sdk` and no longer places that command on the clipboard. The replacement points to `https://github.com/jcools1977/EngramPort_2026`, the repository configured as this workspace's `origin`, with a plain **View repository** link.

The repository link is actionable now: it exposes the Git proof and current implementation that the page describes. An install command is not actionable now because the root manifest is `private: true`, is named `engramport`, and no source package manifest declares a publishable `@engramport/sdk` package. No SDK, package publication, enrollment flow, protocol behavior, actor definition, or later council step was added or changed.

## Executable control

`tests/rendered-html.test.mjs` now discovers source package manifests at the root and one directory below `packages/`. Any `npm install <name>` claim in the site source is accepted only when a manifest declares the same name and is not private. The policy covers both visible JSX and clipboard string payloads because both are statically present in the page source. It permits a future install CTA only after a corresponding publishable source manifest exists.

The rendered-site control also requires the repository URL and rejects `npm install @engramport/sdk` in production HTML.

The paired `SITE_UNPUBLISHED_INSTALL_CLAIM` D1 mutation replaces the repository link with both a visible `npm install @engramport/sdk` command and a clipboard payload containing the same command. The control rejects the mutant with `site advertises unpublished package @engramport/sdk`, while the shipped page passes. The D1 total advances from 115 to 116 executed controls.

## Verification

- `npm run proof:verify`: 327 events, 46 threads, 3 actors verified before publication.
- Focused install-policy test: 1 passed, 0 failed.
- `npm run build` followed by `node --test tests/rendered-html.test.mjs`: 4 passed, 0 failed; production HTML contains the repository URL and lacks the install string.
- `npm run db:test`: passed; `SITE_UNPUBLISHED_INSTALL_CLAIM baseline=0 applied=t after=1 forbidden=t restored=0`; D1 mutation harness completed with `executed=116`.
- `npm run lint`: passed.
- `git diff --check`: passed.
- Post-test safety sweep: DB-test lock absent and no root `.d2-mutations.*` path present.
