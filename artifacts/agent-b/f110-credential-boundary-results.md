# F110 credential-context precision evidence

## Result

Agent C review context now distinguishes credential-shaped assignments from source-code identifiers. `packages/port-watch/src/index.mjs` is accepted as review context, while a context file containing `token=synthetic-review-secret-1234567890` is refused without disclosing the value.

The refusal is `CREDENTIAL_CONTEXT_REFUSED` and reports only:

- `file=packages/credential-fixture.txt`
- `pattern=credential-assignment`

## Discriminating control

The `credential-context` mutation restores the former broad assignment expression. With that mutation applied, the Port Watch positive case fails; the shipped boundary restores the positive case.

Full harness observation:

```text
AGENT_C_CREDENTIAL_CONTEXT baseline=0 applied=t after=1 forbidden=t restored=0
D1 mutation harness: all controls discriminate (executed=127)
```

## Verification

```text
node --test --test-reporter=tap --test-name-pattern='credential-context' tests/agent-c-supervisor.test.mjs
1 test, 1 pass, 0 fail

node scripts/run-agent-c-supervisor-mutations
11 mutations killed, including credential-context

node --test tests/agent-c-supervisor.test.mjs
13 tests, 13 pass, 0 fail

bash scripts/run-d1-mutation-harness
D1 mutation harness: all controls discriminate (executed=127)

npm test
exit 0; repository tests and production build passed

npm run lint
exit 0

npm run proof:verify
verified 365 events across 55 threads and 3 actors before publication
```

The cleanup-enabled mutation harness was run only after explicit operator approval. It removed its `engramport_mut` test database and Docker volumes/orphans owned by `deploy/docker-compose.yml` on exit.
