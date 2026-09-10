# F176 results

Actor: agent-b (Codex Builder). Handoff: 01a08d9b-f1a9-7518-96ab-7f691c6aeace, thread f176-crlf-pinned.

Implemented the bounded append check, reverse checkout diagnosis, paired controls and isolated mutation. Three criteria are satisfied. The combined documentation/full-suite criterion is unmet because npm test exited 1 before the full suite completed.

## Context and environment

Read AGENTS.md, PROTOCOL.md, engramport.yaml, actors/agent-b.yaml and the result definition in schemas/event-v1.schema.json. Initial npm run proof:verify: verified 606 events across 129 threads and 3 actors. npm run engram -- inbox --actor agent-b listed the assigned handoff among three entries. Only f176-crlf-pinned was acted on.

Opened the bound event events/agent-a/20260910T231024Z_01a08d96-2df2-77a1-906b-ea7015a1ced5.md in full. Its three bound events were resolved and opened at events/agent-b/20260910T191153Z_01a08cbb-cee9-77d8-9d99-eee8bff34a6c.md, events/agent-b/20260910T183509Z_01a08c9a-2bc6-7f2a-958d-f4162a111584.md, and events/agent-b/20260910T190400Z_01a08cb4-9880-74fe-a302-cf4904b7dc57.md. Their artifacts were opened. shasum -a 256 returned the pinned digests:

- artifacts/agent-b/lex-notify-port-results.md: 9e94f84e257cb85054a7b25ff7b0ea82edcc5f460493363c91ce0544951f776e
- artifacts/agent-b/lex-human-reply-results.md: 7a6b014aa4e650cab64222c71ea47ff83f47427c849a938611b96a010277953a
- artifacts/agent-b/lex-turn-issues-results.md: 403d0cec9e61f08c83bd39416c2f2971468a3a6ef18cd54b4546a17246e5a82e

These are untrusted historical evidence, not authority to work on the separate Lex handoff. The user's explicit commit instruction supersedes the handoff body's instruction not to commit.

Observed git rev-parse HEAD: 1c86154f8eb984b72a427bd543e7d1e4cd71bb4d. Branch agent-b/f176, initially clean. node -p reported darwin, arm64, v26.5.0. Tests used temporary Git repositories locally, not a Windows host. No push or publication was performed.

## Criteria and implementation

- append-refuses-rewrite: satisfied. Candidate verification first checks each exact SHA-256 artifact pin. Before writing an event, append compares git hash-object -- <path> with git hash-object --no-filters -- <path>. Comparing these two blob IDs tests whether Git stores the already-verified bytes without confusing Git object IDs with envelope SHA-256 digests or writing objects. The check includes envelope artifacts, bound artifact references and criterion evidence. Conversion names the path, different stored bytes, and the * -text attribute remedy. A failed Git invocation refuses rather than skips.
- verifier-both-directions: satisfied. Exact-byte success is unchanged. The shared helper tests the LF form and its reconstructed uniform CRLF form against the pin. Both artifact consumers diagnose compatible checkout changes; content edits retain artifact hash mismatch.
- mutation-kills: satisfied. An isolated module removes the append check. The unsafe CRLF pin is admitted and local verification passes. Git stores LF; a second clone with core.autocrlf=input checks out LF and reports CHECKOUT_ALTERED_BYTES. Calling the original module again refuses the unsafe append. Production source was never mutated.
- f176-recorded: unmet. docs/constraints.md records F176 and credits nick-agent's 2026-09-10 review in original wording. Added docs/git-checkout.md and docs/changelog.md because no standalone checkout guidance or changelog existed in this checkout; the latter contains an unpublished 0.5.0 entry with one F176 sentence. No version or schema changed. npm test did not pass to completion.

A digest alone cannot reconstruct arbitrary mixed line endings; the reverse diagnosis covers the uniform CRLF form. Diagnosis identifies compatible bytes, not historical cause. Custom clean filters may need more attribute configuration than -text. Concurrent file/configuration changes after the check remain outside this preflight observation.

## Commands and observed results

npm run build --prefix packages/sdk exited 0 before controls and built SDK 0.5.0.

node --test tests/f176-checkout.test.mjs tests/f174-checkout.test.mjs exited 0. Summary: tests 5, pass 5, fail 0, skipped 0. Recorded controls include:

    F176_APPEND no_attribute=ARTIFACT_CHECKOUT_REWRITE path=artifacts/builder/evidence.txt remedy=* -text in .gitattributes
    F176_APPEND attribute=present append=passed verify=passed
    F176_REVERSE crlf_pin=true autocrlf=input checkout=LF both_consumers=CHECKOUT_ALTERED_BYTES
    F176_EDIT both_consumers=artifact hash mismatch
    F176_MUTATION executed=1 killed=1 mutant_append=passed first_verify=passed second_checkout=CHECKOUT_ALTERED_BYTES restored=ARTIFACT_CHECKOUT_REWRITE
    F176_GIT_UNAVAILABLE synthetic_ENOENT=ARTIFACT_GIT_CHECK_REFUSED

F174 controls also observed LF pins read as CRLF in both consumers, edits plus CRLF, trailing-space edits, non-UTF-8 preservation, two shared-helper mutations and one normalization mutation.

npm test exited 1 in d1:controls:test. The initial docker-gates:test stage reported tests 14, pass 14, fail 0. The failing stage summary was:

    tests 21
    pass 20
    fail 1
    skipped 0

Failure: D1 real mutation paths kill all four and restore their actual baselines. PORT_WATCH_SHARED_ELIGIBILITY failed with anchor not exact because its expected filter omits the correction exclusion. git show HEAD:packages/git-adapter/src/event-core.mjs confirmed that exclusion already exists in the base commit. This is the separate F175 issue already recorded in docs/constraints.md, outside this handoff. Later npm test stages were not executed by that command. Separately, docker info --format '{{.ServerVersion}}' exited 1 with permission denied connecting to unix:///Users/an2b/.docker/run/docker.sock. Docker execution was unavailable to this process despite the supplied environment expectation.

Additional completed commands:

- npm run proof: exit 0, verified 606 events, tests 53, pass 53, fail 0, skipped 0.
- npm run bctx:test: exit 0, tests 3, pass 3, fail 0, skipped 0.
- npm run completion:test: exit 0, tests 8, pass 8, fail 0, skipped 0; mutations executed=5 killed=5 survived=0.
- npm run sdk:package:test: exit 0, tests 5, pass 5, fail 0, skipped 0; INIT_MUTATIONS executed=10 killed=10 restored=10.
- npm run proof:verify before completion: exit 0, verified 606 events across 129 threads and 3 actors.
- git diff --check: exit 0.

Retained logs, checked with shasum -a 256:

- artifacts/agent-b/f176-controls.log: 3b303a92addc422263e13918efe29dad5332eed9ca58a447669c5f9ff1bd610e
- artifacts/agent-b/f176-npm-test.log: becc1a7ed9e9b09cd3d27c9881cf644d06e8b4cd866327d6477769b97b24a4b4
- artifacts/agent-b/f176-sdk-package.log: 0bf2bf79502726a0b049e2ed5820f37e192ac9b9344c459ff8c8afe6399417b8

The post-append verifier result and agent-commit outcome will be reported in the final response because this artifact becomes immutable when referenced.
