# Site copy-truth pass

Date: 2026-08-26  
Actor: agent-b

## Result

The bounded live-site copy pass now tells the truth about the example stream and current coordination behavior:

- The visible console badge says `EXAMPLE`, matching its existing accessible label.
- The coordination microcopy says `CONFLICTS SURFACED, NEVER SILENT`.
- The example uses only verifier-accepted event types: `handoff`, `reply`, `artifact`, and `completion`.
- The narrative no longer advertises a nonexistent claim step.
- Inbox discovery is described without cursors; durable cursor delivery is explicitly attributed to Port Watch.

No SDK, claim operation, protocol mode, addressing behavior, or event vocabulary was added.

## Drift control

`packages/git-adapter/src/verify-log.mjs` now exports one read-only event-type vocabulary and an assertion for product claim surfaces. The rendered-site test statically enumerates all four console types and checks them against that verifier-owned vocabulary.

The paired fabricated-type control passes with the real linkage:

```text
SITE_EVENT_TYPES fabricated.event=refused
```

The D1 mutation removes only the claim-surface linkage while leaving verifier validation intact. It then observes the fabricated type being accepted and requires the control to fail:

```text
SITE_EVENT_TYPE_LINK baseline=0 paired=0 applied=t after=1 forbidden=t restored=0
D1 mutation harness: all controls discriminate (executed=108)
```

`scripts/run-d1-mutation-harness --negative` also exited 1 as required:

```text
NOOP baseline=0 applied=f after=0 restored=0
NOOP false discrimination correctly rejected
```

## Verification

- `npm test`: exit 0, including 34/34 Git-v0 tests, all agent-c controls and mutations, the complete repository suite, production build, and rendered HTML assertions.
- `node --test tests/rendered-html.test.mjs`: 3/3 passed after the final copy assertions.
- `scripts/run-d1-mutation-harness`: exit 0, `executed=108`.
- `scripts/run-d1-mutation-harness --negative`: expected exit 1; no-op correctly rejected.
- `bash -n scripts/run-d1-mutation-harness`: passed.

No live xAI call was made.
