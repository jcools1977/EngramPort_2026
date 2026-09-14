# Team kit init: local results, 2026-09-14

Actor: agent-b. Branch: agent-b/team-kit. Base revision: 5738923775a0ad5cb255b3d885d9c3b53cd0f35d.
Observed at: 2026-09-14T13:17:14.389587Z. Platform: darwin arm64; worktree with real node_modules.
`PATH=/opt/homebrew/opt/node@22/bin:$PATH node -v` returned `v22.23.2`.
All npm commands below used that PATH prefix. SDK rebuilt before CLI controls.

## Result

Three criteria satisfied locally; `suite-green-0-6-0` blocked by sandbox loopback refusal.
SDK 0.6.0 is unpublished. No hosted workflows, real issues/comments, notifications,
SDK publication, remote push, or external effects were exercised.

- `init-writes-kit`: root, standalone root, .git worktree marker, coordination/ and logs/team.v1/ controls pass. No flag means no workflows. Login-only init verifies. Root/nested review snapshots accompany this report. Workflow collisions and symlinks refuse before log creation.
- `contract-and-logic-controls`: written workflows satisfy exact version, SHA action pins, minimal permissions, triggers, payload isolation and per-comment concurrency controls, including CRLF extraction. Synthetic reply uses the real SDK under the human seat with case-insensitive login matching, literal body preservation and replay refusal. Foreign/nonhuman/duplicate login controls observe the exact refusal. The same foreign-login observer kills an identity-check bypass that otherwise records the reply. The generated turn logic creates, updates, skips unchanged, and closes issues through ENGRAM_EXEC_SHIM. Push failure reports Not recorded and exits 1.
- `login-flag-and-walkthrough`: --github-login writes github: and verification passes; README step 3 explains initial opt-in, assigned issue, phone comment, exact refusal and not-recorded wording.
- `suite-green-0-6-0`: package suite passes, version and changelog are 0.6.0 unpublished; npm test exits 1 in session:test because seven durable OIDC tests cannot listen on 127.0.0.1. This criterion is blocked, not satisfied. No test was weakened or skipped to hide the refusal.

## Quoted command summaries

`npm run sdk:package:test`: exit 0.
```
# tests 12
# suites 0
# pass 12
# fail 0
# cancelled 0
# skipped 0
# todo 0
SDK_INIT_MUTATIONS executed=10 killed=10 restored=10
```
The kit's seven tests are included in those twelve.
```
LOGIN_MUTATION baseline=exact-refusal mutant=recorded observer=failed killed=true
TURN sub=. create=1 edit=1 close=1
TURN sub=coordination create=1 edit=1 close=1
```

`npm test`: exited 1 at session:test; terminal summary:
```
# tests 39
# suites 0
# pass 32
# fail 7
# cancelled 0
# skipped 0
# todo 0
```
All seven failures (route, same-name, restart, atomic, expiry, cleanup, redaction)
report `listen EPERM: operation not permitted 127.0.0.1`. Earlier Docker-gated
checks report their own environment skips in npm-test.log. Nested mutation
observers also print deliberate failing TAP; these are not additional top-level
suite failures. Do not sum raw `not ok` lines as a suite result.

The seven commands after session:test in npm test were invoked individually,
without suppressing failures: approval:test, dry-run:test, db:lock-test,
db:static-test, dispatch:test, build, and node --test tests/rendered-html.test.mjs.
```
REMAINING_SUMMARY commands=7 failed=0
```
`npm run lint`: exit 0. `git diff --check`: exit 0.
Pre-completion `npm run proof:verify`: 634 events, 139 threads, 3 actors.
The full npm test chain must be rerun in an environment permitting loopback
listeners before asserting the suite criterion is satisfied.

## Implementation and evidence provenance

Workflow sources came only from agent-b's accepted artifacts:
- lex-turn-issues-results.md (403d0cec9e61f08c83bd39416c2f2971468a3a6ef18cd54b4546a17246e5a82e)
- lex-human-reply-results.md (7a6b014aa4e650cab64222c71ea47ff83f47427c849a938611b96a010277953a)
- lex-workflow-hardening-results.md (7fc5133cde40bc81cff29e2161a815a765cb49bb483a4aea3b52e2bde6a09007)

No private Lex checkout was accessed. Actions pins are preserved from those
artifacts; this task's contracts check exact bytes, not live upstream tag identity.
The workflow install uses --prefix . so a parent package cannot redirect the SDK
installation away from the log directory. Failures after identity matching use
the Not recorded handler; the pre-identity exact refusal is preserved.

The shared CLI parser required a minimal companion edit to admit the two flags
and describe them in help. package-lock.json records the SDK workspace version.
No actor registry or accepted event/artifact was changed.

Initial controls caught an empty-inbox parsing mismatch, an unsupported JSON named
import, a mutation anchor collision and eager-import relocation failure. These
were corrected; final D1 source drift reports 125 variants, 131 loads, zero failures.
The template module now loads only for --github; existing flat adapter fixtures
retain their normal import graph. Final source and log hashes follow.

## Source bytes observed

- `packages/git-adapter/src/cli.mjs` sha256 `ae10f15cd8a20cafd8324d1918e4b3d64ca64eb316477a5b85199f1beb229556`
- `packages/git-adapter/src/init.mjs` sha256 `e32811004c1b67b03af0b58e3f0df46da22b39e84709ee82d690aabb948d8d52`
- `packages/sdk/src/github-kit.mjs` sha256 `9eba46645b440508d1d472d77d7b05d0eab36ad7764c1379ed56ced24fef2cba`
- `packages/sdk/package.json` sha256 `23c8e16d07b2d1d566ff09a0d0938a69945f9f56f9092b60396155eede25e74a`
- `package-lock.json` sha256 `f6edec26909a8f53fa0cb7f5300b89fadc05797afedd3563a8ab75e0224165ac`
- `tests/team-kit.test.mjs` sha256 `5e59811364845a18cf2ed422d9be95559027a596e918459dfdf51886cfd2b1d6`
- `tests/sdk-package.test.mjs` sha256 `b04e89cc49a00e514bf5d0edb87d1adb8a3fc34cde6ea9707f0afdd9b68f7198`
- `README.md` sha256 `66ea832bd76a4faa67de69462f718f3f223f0d1a5c70addeb666a46cc08543c9`
- `docs/changelog.md` sha256 `6d673407bebfff7cd5d382b33239fc7c7876e8000146c06c5122bc1236372ff0`

## Evidence files

- `lint.log` sha256 `93fb983433b50c97a2ab1ae90c288801583c629e15303d29376a4a5a1ae035a7`
- `nested-engram-replies.yml` sha256 `4f094c46168368853105de4b15d2c7e2061e3610b5b8d5ae9e364aac5e45f067`
- `nested-engram-turns.yml` sha256 `62f0427b1842fcca4be0d7356ce15d1f266d093c3ea1cffd91492e18b4a850a5`
- `npm-test.log` sha256 `41b19fba126070ffd5d8e9161d86076ce84da32fe7585bae0041c8144628953c`
- `remaining.log` sha256 `997024b87cb82a69453ae62683ad011dd31cdff759e9bf05efe827e9f667f435`
- `root-engram-replies.yml` sha256 `dd85ee581726dfefdf515b13dbb5240fc19326c78be6a9fcc17197c4b4bb32a6`
- `root-engram-turns.yml` sha256 `219bec73ee0e1745f1aceec4eb486bc0894db74def83c57f85dffc991c3954c9`
- `sdk-package.log` sha256 `fd8251c6f5319c42cd898575a03dd125df9405933633e505f91ff657f48d9e3e`
