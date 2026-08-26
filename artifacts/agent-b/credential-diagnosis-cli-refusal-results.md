# Credential diagnosis and CLI argument-refusal results

Implemented the bounded `agent-c-harness` handoff without a live provider call, vault change, SDK, protocol change, or claim operation.

## Delivered behavior

- `requireResolvedCredential` still reports absent and unresolved references as `CREDENTIAL_UNRESOLVED`, but assignment-shaped values and values containing whitespace now fail as `CREDENTIAL_MALFORMED`. The check is shape-based and does not depend on an xAI vendor prefix.
- Non-success xAI responses now carry `providerStatus`, `providerError`, and the provider text in the raised `MODEL_CALL_FAILED` error.
- The complete non-success body passes through `assertNoCredential` before provider text can be attached to an error. A stubbed 401 response that echoes the synthetic credential is refused as `CREDENTIAL_OUTPUT_REFUSED`; the credential is absent from the error message and serialized error.
- The Git adapter CLI now maintains an allowlist for every supported command profile and raises `ARGUMENT_REFUSED` with the offending flag before command side effects. The `--in-reply-to` negative leaves the actor event directory byte-for-byte unchanged, while the matching known-good append still succeeds.

## Discriminating controls

The canonical D1 registry added four controls:

- `AGENT_C_CREDENTIAL_SHAPE`
- `AGENT_C_PROVIDER_DIAGNOSIS`
- `AGENT_C_PROVIDER_ERROR_EGRESS`
- `CLI_ARGUMENT_REFUSAL`

Each observed `baseline=0 applied=t after=1 forbidden=t restored=0`. The full harness exited 0 with `executed=112`, up from 108. The separate no-op negative observed `baseline=0 applied=f after=0 restored=0`, exited 1, and reported `NOOP false discrimination correctly rejected`.

The standalone supervisor mutation runner also killed all seven registered variants, including the three new provider/credential controls.

## Verification

- `node --test tests/agent-c-supervisor.test.mjs`: 9 passed, 0 failed.
- `node scripts/run-agent-c-supervisor-mutations`: 7/7 mutations killed.
- `node --test tests/git-v0.test.mjs`: 35 passed, 0 failed; all 34 pre-existing tests remain green and the new CLI control passes.
- `npm test` with the Docker-backed canary available: exit 0, including build and rendered-HTML drift control.
- `npm run lint`: exit 0.
- `git diff --check`: exit 0.
- No `.d2-mutations.*` scratch path or DB-test lock remained after either harness execution.
