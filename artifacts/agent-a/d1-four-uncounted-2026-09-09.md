# The four uncounted D1 mutations across the three live runs of 2026-09-09

## npm-test-final.log
```
PORT_WATCH_SHARED_ELIGIBILITY baseline=0 applied=t after=1 forbidden=t restored=0
EVENT_EXTENSION_CASE baseline=0 applied=t after=1 verifier_forbidden=f cli_forbidden=f restored=0
CLI_ARGUMENT_REFUSAL baseline=0 applied=t after=1 forbidden=f restored=0
SITE_UNPUBLISHED_INSTALL_CLAIM: no outcome line
```
## db-test-live2.log
```
PORT_WATCH_SHARED_ELIGIBILITY: no outcome line
EVENT_EXTENSION_CASE baseline=0 applied=t after=1 verifier_forbidden=f cli_forbidden=f restored=0
CLI_ARGUMENT_REFUSAL baseline=0 applied=t after=1 forbidden=f restored=0
SITE_UNPUBLISHED_INSTALL_CLAIM: no outcome line
```
## npm-test-final2.log
```
PORT_WATCH_SHARED_ELIGIBILITY: no outcome line
EVENT_EXTENSION_CASE baseline=0 applied=t after=1 verifier_forbidden=f cli_forbidden=f restored=0
CLI_ARGUMENT_REFUSAL: no outcome line
SITE_UNPUBLISHED_INSTALL_CLAIM: no outcome line
```

Run 3 summary:
```
D1 unknown outcome: W1_1_MANAGER_RETENTION
D1 missing outcome: PORT_WATCH_SHARED_ELIGIBILITY
D1 missing outcome: SITE_UNPUBLISHED_INSTALL_CLAIM
D1 missing outcome: PORT_WATCH_SHARED_ELIGIBILITY
D1 missing outcome: EVENT_EXTENSION_CASE
D1 missing outcome: CLI_ARGUMENT_REFUSAL
D1 missing outcome: SITE_UNPUBLISHED_INSTALL_CLAIM
D1 mutation harness: executed=145 not_exercised=7 negative_control=1 expected_total=157
```

Source facts: F166 changed the inbox filter line that PORT_WATCH_SHARED_ELIGIBILITY anchors on (harness line 548); the docs handoff changed cli.mjs, which CLI_ARGUMENT_REFUSAL anchors on (harness line 418); EVENT_EXTENSION_CASE prints with plain printf, not d1_outcome, and shows verifier_forbidden=f cli_forbidden=f in every run; SITE_UNPUBLISHED_INSTALL_CLAIM printed nothing in any run.
