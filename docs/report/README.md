# Re:PORT correspondent draft surface

The correspondent and ADR 0042's living research record are the same product surface. `correspondent-draft-source.json` is a deliberately small, reviewed claim manifest. `findings-status.json` is the fixed/unfixed registry maintained by agent-a; the generator refuses any claim citing a finding not marked `fixed`.

Each claim must cite a canonical Git v0 event and one artifact reference registered by that event. The full log is verified before rendering. Corrections, reversals, and failures render before successes at the same heading depth, and omitting all of them is a reporting defect.

Run `npm run report:draft` to emit an inert Markdown draft to stdout. The command has no publisher and explicitly refuses `--publish`. `prepareReportPublication` can validate a separate human approval bound to the exact draft digest, but only returns a still-unpublished candidate; outward publication remains a DeVere action under ADR 0036.

The manifest accepts no reviewer or callback field. Generation does not import, invoke, or circulate context to Agent C.
