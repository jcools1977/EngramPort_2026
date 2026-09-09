# ADR 0052 withdrawal implementation results

Actor: agent-b, Codex Builder. Date: 2026-09-09.
Handoff: `01a0863e-cc50-7be3-9fd5-bbb4a8ed693a`, thread `adr-0052-withdrawal`.
Pre-fix HEAD: `799d96e3fa772f1e4ac8a8feaff8e452ce3f1b93`.

## Observed outcome

All nine completion criteria are satisfied by the local commands and observations below. These results cover the named suites, not the full `npm test` suite. No deployment or package publication was performed.

The sender can withdraw an unanswered strict relay turn with a non-empty reason and the original addressee in `next`. The existing single-successor verifier rule governs both append validation and on-disk histories. The original inbox item disappears; the withdrawal remains available for one late completion. A late completion of a withdrawn handoff must still report that original handoff's criteria and evidence. A late completion of another event type has no criteria contract. Completion routing is limited to the original sender or null.

The CLI delegates to the same append implementation and accepts withdrawal without a second type list. The published v1 schema and frozen `EVENT_TYPES` include withdrawal. The existing schema vocabulary control now compares event types as well as completion statuses. Other self-replies remain refused. Controls and mutations use temporary scaffolds only.

`npm run withdrawal:test` reported `ADR52_MUTATIONS executed=14 killed=14 survived=0 restored=0`. The mutation driver requires the forbidden operation to return `ok=true` with no errors and the matching control to fail, rather than accepting an unrelated crash as a killed mutation. The schema-disagreement mutation must fail the existing vocabulary agreement test. The pre-fix check loads the actual event-core and verifier from the pinned commit with `git show`, then observes the unknown-event-type refusal and unchanged inbox. Both empty and whitespace-only bodies, both non-sender actors, both non-strict modes, and both late-completion destinations are exercised.

## Bound evidence read and verified

`AGENTS.md`, `PROTOCOL.md`, `engramport.yaml`, and `actors/agent-b.yaml` were read before work. Initial `npm run proof:verify` returned exit 0 and verified 512 events across 105 threads and 3 actors. `npm run engram -- inbox --actor agent-b` returned the named handoff among three pending events; only this handoff was handled.

The complete handoff envelope, its completion criteria, the ADR copy, dispatch, and bound preflight event `events/agent-c/20260909T125623Z_01a0863d-aae5-7e70-b2d7-f708feb923f8.md` were opened. Its review artifact was also opened. `shasum -a 256` produced these matching digests:

| Path | SHA-256 |
| --- | --- |
| `artifacts/agent-a/adr-0052-implementation-dispatch.md` | `136824c1afe0c93a7e90e027b61590b6067be7c64b60fbe1bbda31f695accbb0` |
| `artifacts/agent-a/adr-0052-copy.md` | `152cb336d0a4c658700249c33c438aaad8200a1c70dda9b5b6d115b8bdefa1a3` |
| `artifacts/agent-a/adr-0052-implementation-criteria-final.json` | `f328755fa4fd9b692413fcc6261bce70372d5ccb461c67126d7a5897f268aaf9` |
| `artifacts/agent-c/reviews/01a08639-cfce-7706-9e85-b81d48e6ef0a.json` | `a0dcdad57aefd635416a19e19eb41a4d03e0ead637bdaf365a63e9cd206aa1f3` |

## Criterion results

| Criterion | Status | Discriminating evidence |
| --- | --- | --- |
| `sender-withdraws` | satisfied | Sender append accepted; original absent from inbox; pre-fix unknown type; sender guard mutation accepts non-senders. |
| `empty-reason-refused` | satisfied | Empty and whitespace reasons refused with unchanged inbox; removed reason guard accepts both. |
| `non-sender-refused` | satisfied | Actors b and c refused with unchanged inbox; removed sender guard accepts both. |
| `single-successor` | satisfied | Both append orders refuse the second successor; on-disk fork refused separately; three mutation runs accept the forbidden second successor or fork. |
| `late-completion-once` | satisfied | First late completion accepted, second refused, for next=null and next=a; removed count guard accepts second. |
| `other-self-replies-still-refused` | satisfied | Every non-withdrawal type self-reply refused through append before and after the change. |
| `non-strict-refused` | satisfied | free_form and coordinator_led refused through append; removed mode guard accepts both. |
| `schema-and-verifier-agree` | satisfied | Real appended v1 withdrawal validates with Ajv draft 2020-12 and verifyLog; schema enum mutation fails the existing vocabulary control. |
| `suite-green-with-mutations` | satisfied | Named suites completed exit 0; 14 withdrawal mutations executed and killed; original historical files unchanged. |

## Scope and limits

The SDK package version is 0.4.0. `npm run sdk:buildable` and the package suite rebuilt the bundle from the adapter, and the package suite used local temporary tarballs only. Generated `packages/sdk/dist/` files remain ignored by the repository's existing `.gitignore`; no ignored build files are forced into history. The package lock remains unchanged because it is outside this handoff's bounds.

The F160 identity record, OIDC runtime guard, Docker refusals, and D1 harness are owned elsewhere and were not changed or exercised here. Neither stuck turn was withdrawn. Before creating this artifact or publishing a completion, `git diff --exit-code HEAD -- events artifacts actors docs/security` returned exit 0 with no output. A fresh `npm run proof:verify` again verified 512 events across 105 threads and 3 actors. The initial clean worktree and final diff constrain changes to the authorized shared files plus new agent-b artifacts and one completion event.

Withdrawal retires the relay wait; it does not cancel running work, establish an execution fence, or prove that no external effect occurred. Absent senders and external signing authority remain outside this remedy. Verification detects combined successor histories but is not a transactional distributed reservation.

## Commands completed

| Command | Exit | Observation |
| --- | --- | --- |
| `npm run withdrawal:test` | 0 | 24 passed; the pre-fix-only test is skipped in the current-source run, then explicitly run by the mutation driver; 14 mutations killed |
| `npm run proof` | 0 | 53 passed; 512 historical events verified |
| `npm run completion:test` | 0 | 8 passed; 5 schema-status mutations killed |
| `node --test tests/schema-v1-status.test.mjs` | 0 | 4 passed; 5 schema-status mutations killed |
| `npm run bctx:test` | 0 | 3 passed |
| `npm run sdk:buildable` | 0 | 3 passed; actual SDK bundle rebuilt |
| `npm run sdk:package:test` | 0 | 3 passed; local tarball installed and exercised; 10 init mutations killed |
| `node_modules/.bin/eslint packages/git-adapter/src/event-core.mjs packages/git-adapter/src/verify-log.mjs tests/withdrawal.test.mjs tests/run-withdrawal-mutations.mjs tests/schema-v1-status.test.mjs` | 0 | Changed JavaScript files passed lint. |
| `git diff --check` | 0 | No whitespace errors. |

## Full command output

### `npm run withdrawal:test`

```text

> engramport@0.1.0 withdrawal:test
> node --test tests/withdrawal.test.mjs && node tests/run-withdrawal-mutations.mjs

ADR52_OBS seed ok=true errors=[]
ADR52_OBS sender-withdraws ok=true errors=[]
ADR52_INBOX original=absent withdrawal=present
ADR52_OBS real-withdrawal-verify ok=true errors=[]
ADR52_SCHEMA real-withdrawal=accepted
✔ ADR52 sender withdraws and inbox retires original (36.807833ms)
﹣ ADR52 pre-fix unknown type (0.070166ms) # SKIP
ADR52_OBS seed ok=true errors=[]
ADR52_OBS empty-reason ok=false errors=["events/a/20260909T130409Z_01a08644-c81d-777b-990d-57f1e9512a57.md: withdrawal requires a non-empty reason"]
✔ ADR52 empty reason "" (9.491208ms)
ADR52_OBS seed ok=true errors=[]
ADR52_OBS empty-reason ok=false errors=["events/a/20260909T130409Z_01a08644-c827-7a85-84f0-ab7f8f0583c1.md: withdrawal requires a non-empty reason"]
✔ ADR52 empty reason " \t\n " (9.673833ms)
ADR52_OBS seed ok=true errors=[]
ADR52_OBS non-sender ok=false errors=["events/b/20260909T130409Z_01a08644-c831-70ab-b5a1-30fe5aa25ef8.md: withdrawal requires the original sender"]
✔ ADR52 non-sender b (10.050583ms)
ADR52_OBS seed ok=true errors=[]
ADR52_OBS non-sender ok=false errors=["events/c/20260909T130409Z_01a08644-c839-70ce-8a78-a0b83413d1ab.md: withdrawal requires the original sender"]
✔ ADR52 non-sender c (9.000708ms)
ADR52_OBS seed ok=true errors=[]
ADR52_OBS first-successor ok=true errors=[]
ADR52_OBS second-successor ok=false errors=["events/a/20260909T130409Z_01a08644-c83e-754a-aee4-7256a1596750.md: mode strict_relay violation; parent has 2 replies"]
✔ ADR52 single successor reply first (9.59375ms)
ADR52_OBS seed ok=true errors=[]
ADR52_OBS first-successor ok=true errors=[]
ADR52_OBS second-successor ok=false errors=["events/a/20260909T130409Z_01a08644-c848-7762-b284-02014c1e6437.md: mode strict_relay violation; parent has 2 replies"]
✔ ADR52 single successor withdrawal first (10.050917ms)
ADR52_OBS seed ok=true errors=[]
ADR52_OBS fork-withdrawal ok=true errors=[]
ADR52_OBS fork-reply ok=true errors=[]
ADR52_OBS fork-verifier ok=false errors=["events/a/20260909T130409Z_01a08644-c852-7837-ab08-55322966001b.md: mode strict_relay violation; parent has 2 replies"]
✔ ADR52 forked history verifier (15.218625ms)
ADR52_OBS seed ok=true errors=[]
ADR52_OBS withdrawal ok=true errors=[]
ADR52_OBS late-completion ok=true errors=[]
ADR52_OBS second-completion ok=false errors=["events/a/20260909T130409Z_01a08644-c865-7911-b5ce-94a66373884f.md: mode strict_relay violation; parent has 2 replies"]
✔ ADR52 late completion once next=null (14.29525ms)
ADR52_OBS seed ok=true errors=[]
ADR52_OBS withdrawal ok=true errors=[]
ADR52_OBS late-completion ok=true errors=[]
ADR52_OBS second-completion ok=false errors=["events/a/20260909T130409Z_01a08644-c872-7e9d-bf37-b6b424082ed1.md: mode strict_relay violation; parent has 2 replies"]
✔ ADR52 late completion once next=a (13.097834ms)
ADR52_OBS evidence ok=true errors=[]
ADR52_OBS handoff ok=true errors=[]
ADR52_OBS withdrawal ok=true errors=[]
ADR52_OBS missing-criteria ok=false errors=["events/b/20260909T130409Z_01a08644-c887-73a7-b9ab-ecb7d24e951d.md: criteria_results is required for a version-1 handoff completion"]
ADR52_OBS wrong-criteria ok=false errors=["events/b/20260909T130409Z_01a08644-c889-7fa8-9bc3-e232dfc263b1.md: completion missing criterion ids c1"]
ADR52_OBS late-handoff-completion ok=true errors=[]
✔ ADR52 original handoff criteria preserved (20.318458ms)
ADR52_OBS seed ok=true errors=[]
ADR52_OBS withdrawal ok=true errors=[]
ADR52_OBS non-handoff-criteria ok=false errors=["events/b/20260909T130409Z_01a08644-c897-73fe-ace3-46b7f05be096.md: criteria_results requires an original handoff"]
✔ ADR52 non-handoff criteria refused (9.06525ms)
ADR52_OBS seed ok=true errors=[]
ADR52_OBS self-message ok=false errors=["events/a/20260909T130409Z_01a08644-c89e-7e9a-b7ab-6e0947a566e4.md: mode strict_relay violation; expected next actor b","events/a/20260909T130409Z_01a08644-c89e-7e9a-b7ab-6e0947a566e4.md: mode strict_relay violation; an actor may not reply to itself"]
ADR52_OBS seed ok=true errors=[]
ADR52_OBS self-handoff ok=false errors=["events/a/20260909T130409Z_01a08644-c8a2-7684-b6f7-6d02bd9c7aa5.md: mode strict_relay violation; expected next actor b","events/a/20260909T130409Z_01a08644-c8a2-7684-b6f7-6d02bd9c7aa5.md: mode strict_relay violation; an actor may not reply to itself"]
ADR52_OBS seed ok=true errors=[]
ADR52_OBS self-reply ok=false errors=["events/a/20260909T130409Z_01a08644-c8a7-775f-bcd3-ba1b7d9ea7ad.md: mode strict_relay violation; expected next actor b","events/a/20260909T130409Z_01a08644-c8a7-775f-bcd3-ba1b7d9ea7ad.md: mode strict_relay violation; an actor may not reply to itself"]
ADR52_OBS seed ok=true errors=[]
ADR52_OBS self-completion ok=false errors=["events/a/20260909T130409Z_01a08644-c8ad-722a-9031-6448716301b6.md: mode strict_relay violation; expected next actor b","events/a/20260909T130409Z_01a08644-c8ad-722a-9031-6448716301b6.md: mode strict_relay violation; an actor may not reply to itself","events/a/20260909T130409Z_01a08644-c8ad-722a-9031-6448716301b6.md: completion must reply to a handoff"]
ADR52_OBS seed ok=true errors=[]
ADR52_OBS self-artifact ok=false errors=["events/a/20260909T130409Z_01a08644-c8b2-7976-b79e-08cc35cab187.md: mode strict_relay violation; expected next actor b","events/a/20260909T130409Z_01a08644-c8b2-7976-b79e-08cc35cab187.md: mode strict_relay violation; an actor may not reply to itself"]
ADR52_OBS seed ok=true errors=[]
ADR52_OBS self-decision ok=false errors=["events/a/20260909T130409Z_01a08644-c8b8-7422-85d5-299d0b1df05e.md: mode strict_relay violation; expected next actor b","events/a/20260909T130409Z_01a08644-c8b8-7422-85d5-299d0b1df05e.md: mode strict_relay violation; an actor may not reply to itself"]
ADR52_OBS seed ok=true errors=[]
ADR52_OBS self-task ok=false errors=["events/a/20260909T130409Z_01a08644-c8bd-7903-974a-32eeeb27b13a.md: mode strict_relay violation; expected next actor b","events/a/20260909T130409Z_01a08644-c8bd-7903-974a-32eeeb27b13a.md: mode strict_relay violation; an actor may not reply to itself"]
ADR52_OBS seed ok=true errors=[]
ADR52_OBS self-acknowledgment ok=false errors=["events/a/20260909T130409Z_01a08644-c8c2-7f17-b9d9-fdbb0b1fbbec.md: mode strict_relay violation; expected next actor b","events/a/20260909T130409Z_01a08644-c8c2-7f17-b9d9-fdbb0b1fbbec.md: mode strict_relay violation; an actor may not reply to itself"]
✔ ADR52 other self replies remain refused (49.101584ms)
ADR52_OBS seed ok=true errors=[]
ADR52_OBS non-strict ok=false errors=["events/a/20260909T130409Z_01a08644-c8ce-7c89-be87-131dce8125eb.md: withdrawal requires strict_relay"]
✔ ADR52 non-strict free_form (5.8655ms)
ADR52_OBS seed ok=true errors=[]
ADR52_OBS non-strict ok=false errors=["events/a/20260909T130409Z_01a08644-c8d4-7639-b9de-859e5c9753ca.md: withdrawal requires strict_relay"]
✔ ADR52 non-strict coordinator_led (5.82275ms)
ADR52_OBS root-withdrawal ok=false errors=["events/a/20260909T130409Z_01a08644-c8d7-7edc-8ab5-461474830b90.md: withdrawal requires a parent"]
✔ ADR52 parent required (3.729333ms)
ADR52_OBS seed ok=true errors=[]
ADR52_OBS wrong-addressee ok=false errors=["events/a/20260909T130409Z_01a08644-c8dd-7883-9073-d98439138728.md: withdrawal next must name the original addressee of an open turn"]
✔ ADR52 addressee binding null (5.736459ms)
ADR52_OBS seed ok=true errors=[]
ADR52_OBS wrong-addressee ok=false errors=["events/a/20260909T130409Z_01a08644-c8e3-7a4b-9503-97b0b965527e.md: withdrawal next must name the original addressee of an open turn"]
✔ ADR52 addressee binding c (5.891333ms)
ADR52_OBS terminal ok=true errors=[]
ADR52_OBS terminal-withdrawal ok=false errors=["events/a/20260909T130409Z_01a08644-c8ea-713d-a252-09f1b4b1acc7.md: withdrawal next must name the original addressee of an open turn"]
✔ ADR52 terminal turn cannot withdraw (6.887167ms)
ADR52_OBS seed ok=true errors=[]
ADR52_OBS withdrawal ok=true errors=[]
ADR52_OBS duplicate-withdrawal ok=false errors=["events/a/20260909T130409Z_01a08644-c8ed-7976-9c81-ba583bf05f86.md: mode strict_relay violation; parent has 2 replies"]
✔ ADR52 duplicate withdrawal refused (8.971667ms)
ADR52_OBS seed ok=true errors=[]
ADR52_OBS withdrawal ok=true errors=[]
ADR52_OBS non-completion ok=false errors=["events/b/20260909T130409Z_01a08644-c8fc-7177-9e46-596191355dd8.md: withdrawal successor must be a completion"]
✔ ADR52 withdrawal successor completion only (9.52875ms)
ADR52_OBS seed ok=true errors=[]
ADR52_OBS withdrawal ok=true errors=[]
ADR52_OBS completion-routing ok=false errors=["events/b/20260909T130409Z_01a08644-c906-7791-b105-c374107d4e3c.md: late completion next must name the sender or null"]
✔ ADR52 late completion routing (9.238375ms)
ADR52_OBS seed ok=true errors=[]
ADR52_OBS withdrawal ok=true errors=[]
ADR52_OBS wrong-completer ok=false errors=["events/a/20260909T130409Z_01a08644-c90f-7465-a516-b58cfdc5a206.md: mode strict_relay violation; expected next actor b","events/a/20260909T130409Z_01a08644-c90f-7465-a516-b58cfdc5a206.md: mode strict_relay violation; an actor may not reply to itself"]
ADR52_OBS seed ok=true errors=[]
ADR52_OBS withdrawal ok=true errors=[]
ADR52_OBS wrong-completer ok=false errors=["events/c/20260909T130410Z_01a08644-c917-72b0-9738-1acc3c4c9f0c.md: mode strict_relay violation; expected next actor b"]
✔ ADR52 late completion only addressee (18.235125ms)
ADR52_OBS seed ok=true errors=[]
events/a/20260909T130410Z_01a08644-c91f-73d2-a0c7-6d7c97280e99.md
✔ ADR52 CLI accepts withdrawal (9.207375ms)
ℹ tests 25
ℹ suites 0
ℹ pass 24
ℹ fail 0
ℹ cancelled 0
ℹ skipped 1
ℹ todo 0
ℹ duration_ms 352.694084
ADR52_MUTATIONS baseline=0
ADR52_PRE_FIX commit=799d96e3fa772f1e4ac8a8feaff8e452ce3f1b93 append=refused class=unknown-event-type self-replies=refused
TAP version 13
# ADR52_OBS seed ok=true errors=[]
# ADR52_OBS pre-fix ok=false errors=["events/a/20260909T130410Z_01a08644-cb20-7254-8ade-5b35107c3367.md: unknown event type withdrawal","events/a/20260909T130410Z_01a08644-cb20-7254-8ade-5b35107c3367.md: mode strict_relay violation; expected next actor b","events/a/20260909T130410Z_01a08644-cb20-7254-8ade-5b35107c3367.md: mode strict_relay violation; an actor may not reply to itself"]
# Subtest: ADR52 pre-fix unknown type
ok 1 - ADR52 pre-fix unknown type
  ---
  duration_ms: 14.371459
  type: 'test'
  ...
# ADR52_OBS seed ok=true errors=[]
# ADR52_OBS self-message ok=false errors=["events/a/20260909T130410Z_01a08644-cb29-7313-85c2-7ad6f9d8f268.md: mode strict_relay violation; expected next actor b","events/a/20260909T130410Z_01a08644-cb29-7313-85c2-7ad6f9d8f268.md: mode strict_relay violation; an actor may not reply to itself"]
# ADR52_OBS seed ok=true errors=[]
# ADR52_OBS self-handoff ok=false errors=["events/a/20260909T130410Z_01a08644-cb2f-7972-a55a-74f3226aea66.md: mode strict_relay violation; expected next actor b","events/a/20260909T130410Z_01a08644-cb2f-7972-a55a-74f3226aea66.md: mode strict_relay violation; an actor may not reply to itself"]
# ADR52_OBS seed ok=true errors=[]
# ADR52_OBS self-reply ok=false errors=["events/a/20260909T130410Z_01a08644-cb35-769b-94a2-bfc1b5b55ede.md: mode strict_relay violation; expected next actor b","events/a/20260909T130410Z_01a08644-cb35-769b-94a2-bfc1b5b55ede.md: mode strict_relay violation; an actor may not reply to itself"]
# ADR52_OBS seed ok=true errors=[]
# ADR52_OBS self-completion ok=false errors=["events/a/20260909T130410Z_01a08644-cb3b-781e-a8fd-486328a9867b.md: mode strict_relay violation; expected next actor b","events/a/20260909T130410Z_01a08644-cb3b-781e-a8fd-486328a9867b.md: mode strict_relay violation; an actor may not reply to itself","events/a/20260909T130410Z_01a08644-cb3b-781e-a8fd-486328a9867b.md: completion must reply to a handoff"]
# ADR52_OBS seed ok=true errors=[]
# ADR52_OBS self-artifact ok=false errors=["events/a/20260909T130410Z_01a08644-cb41-7f80-97c5-bfd46b92fac7.md: mode strict_relay violation; expected next actor b","events/a/20260909T130410Z_01a08644-cb41-7f80-97c5-bfd46b92fac7.md: mode strict_relay violation; an actor may not reply to itself"]
# ADR52_OBS seed ok=true errors=[]
# ADR52_OBS self-decision ok=false errors=["events/a/20260909T130410Z_01a08644-cb47-7101-8c9d-d554c6710494.md: mode strict_relay violation; expected next actor b","events/a/20260909T130410Z_01a08644-cb47-7101-8c9d-d554c6710494.md: mode strict_relay violation; an actor may not reply to itself"]
# ADR52_OBS seed ok=true errors=[]
# ADR52_OBS self-task ok=false errors=["events/a/20260909T130410Z_01a08644-cb4d-79db-830f-1d9f30cbd4bd.md: mode strict_relay violation; expected next actor b","events/a/20260909T130410Z_01a08644-cb4d-79db-830f-1d9f30cbd4bd.md: mode strict_relay violation; an actor may not reply to itself"]
# ADR52_OBS seed ok=true errors=[]
# ADR52_OBS self-acknowledgment ok=false errors=["events/a/20260909T130410Z_01a08644-cb53-7991-9c3e-a16249a1cb0d.md: mode strict_relay violation; expected next actor b","events/a/20260909T130410Z_01a08644-cb53-7991-9c3e-a16249a1cb0d.md: mode strict_relay violation; an actor may not reply to itself"]
# Subtest: ADR52 other self replies remain refused
ok 2 - ADR52 other self replies remain refused
  ---
  duration_ms: 55.23725
  type: 'test'
  ...
1..2
# tests 2
# suites 0
# pass 2
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 116.423959

ADR52_MUTATION name=sender-only removed=WITHDRAWAL_SENDER observation=non-sender:accepted control=failed executed=1
ADR52_MUTATION name=non-empty-reason removed=WITHDRAWAL_REASON observation=empty-reason:accepted control=failed executed=2
ADR52_MUTATION name=successor-reply-first removed=parent has ${count} replies observation=second-successor:accepted control=failed executed=3
ADR52_MUTATION name=successor-withdrawal-first removed=parent has ${count} replies observation=second-successor:accepted control=failed executed=4
ADR52_MUTATION name=forked-history-verifier removed=parent has ${count} replies observation=fork-verifier:accepted control=failed executed=5
ADR52_MUTATION name=late-completion-once removed=parent has ${count} replies observation=second-completion:accepted control=failed executed=6
ADR52_MUTATION name=strict-mode-only removed=WITHDRAWAL_MODE observation=non-strict:accepted control=failed executed=7
ADR52_MUTATION name=parent-required removed=WITHDRAWAL_PARENT observation=root-withdrawal:accepted control=failed executed=8
ADR52_MUTATION name=original-addressee removed=WITHDRAWAL_NEXT observation=wrong-addressee:accepted control=failed executed=9
ADR52_MUTATION name=open-turn removed=WITHDRAWAL_NEXT observation=terminal-withdrawal:accepted control=failed executed=10
ADR52_MUTATION name=completion-only removed=/* WITHDRAWAL_COMPLETION */ observation=non-completion:accepted control=failed executed=11
ADR52_MUTATION name=completion-routing removed=WITHDRAWAL_COMPLETION_NEXT observation=completion-routing:accepted control=failed executed=12
ADR52_MUTATION name=non-handoff-criteria removed=WITHDRAWAL_NO_CRITERIA observation=non-handoff-criteria:accepted control=failed executed=13
ADR52_MUTATION name=schema-type-disagreement existing-one-definition-control=failed executed=14
ADR52_MUTATIONS executed=14 killed=14 survived=0 restored=0
```

### `npm run proof`

```text

> engramport@0.1.0 proof
> npm run proof:verify && npm run proof:test


> engramport@0.1.0 proof:verify
> node scripts/verify-log

✓ verified 512 events across 105 thread(s) and 3 actors

> engramport@0.1.0 proof:test
> node --test tests/git-v0.test.mjs

✔ valid registered-actor relay verifies (105.660042ms)
✔ actor record filename is bound to its declared slug (212.947042ms)
✔ verification refuses unregistered Markdown event files while ignoring empty directories (621.35425ms)
✔ verification aligns recursive Markdown discovery with validation and ignores non-events (451.361875ms)
✔ uppercase Markdown forgery is accounted for and fails by path (253.283625ms)
✔ event extension policy is shared by inbox while normal append stays lowercase (503.87175ms)
events/agent-b/20260909T130303Z_01a08643-c403-7eb2-b498-3e292b94d9fc.md
✔ append with an empty artifacts flag preserves artifact-free append behavior (561.375542ms)
events/agent-b/20260909T130303Z_01a08643-c620-7f49-9c41-0a9c29aff238.md
events/agent-b/20260909T130304Z_01a08643-c776-7c29-bf61-4d3aea9087d6.md
✔ CLI terminal append normalizes --next null before hashing and preserves next validation (1066.974584ms)
events/agent-b/20260909T130304Z_01a08643-ca41-73ae-b6a1-f0d4189946cd.md
✔ append refuses an unrecognized flag before writing and preserves known-good behavior (422.842208ms)
events/agent-b/20260909T130305Z_01a08643-cbef-7acb-a977-c1e7cb5e55c6.md
✔ append refuses a second thread root without writing an event (650.930625ms)
✔ exported append and inbox core preserve the event wire surface (528.42475ms)
✔ CLI re-exports the same event-core binding the SDK must consume (0.142375ms)
✔ version-1 retry returns the existing event and preserves event count (575.69825ms)
✔ version-1 retry identity collision raises a distinct error without writing (516.604459ms)
✔ version-1 completion requires exact criterion evidence coverage (836.177708ms)
✔ live writer refuses version-0 append after cutover while historical v0 verifies (236.326541ms)
✔ listInbox and Port Watch consume the same answered-work resolver (595.351042ms)
✔ fresh copies reproduce the identical derived work-delivery set (512.35975ms)
✔ pure work resolver excludes an answered event without project sequence fields (0.188166ms)
✔ normal CLI execution cannot activate the harness core override (296.994042ms)
✔ CLI append and inbox delegate to the exported core (508.009875ms)
✔ modified content is rejected (255.20825ms)
✔ unknown schema fields are rejected (240.291ms)
✔ actor directory ownership is enforced (237.632ms)
✔ unknown reply targets are rejected (254.005541ms)
✔ strict relay actor transitions are enforced (264.6435ms)
✔ reply cycles are rejected (255.765042ms)
✔ missing artifacts are rejected (236.368791ms)
✔ artifact modification is rejected (292.683042ms)
✔ artifact references must remain in author prefix (265.412917ms)
✔ filename identity is enforced (259.116ms)
✔ free_form permits one actor to publish sequential events (270.649583ms)
✔ free_form permits sibling replies (256.877542ms)
✔ coordinator_led permits coordinator followed by two worker replies (256.424833ms)
✔ strict_relay refuses an actor replying to itself and names the mode (297.089042ms)
✔ strict_relay refuses a second reply and names the mode (261.470125ms)
✔ free_form refuses an unknown parent and names the mode (271.33875ms)
✔ free_form refuses a cycle (261.095083ms)
✔ free_form refuses a second root with a precise mode error (267.954708ms)
✔ coordinator_led refuses a worker root (251.550917ms)
✔ coordinator_led refuses a worker replying to a worker (238.828417ms)
✔ unknown thread modes fail closed (250.861958ms)
✔ malformed thread mode declarations fail closed (252.287708ms)
✔ a mode may be declared while a thread is empty (305.776ms)
✔ changing a declared mode after the first event violates its binding (274.641875ms)
✔ a per-thread mode declaration cannot be added after the first event (234.111417ms)
✔ changing mode cannot retroactively legitimize an invalid strict_relay branch (234.083458ms)
✔ coordinator_led requires a coordinator (238.442042ms)
✔ coordinator_led refuses an unknown coordinator (231.907209ms)
✔ free_form supports invitation issuance, accepted, and terminal closure without an invitee actor (233.258458ms)
✔ free_form supports invitation issuance, rejected, and terminal closure without an invitee actor (236.49825ms)
✔ free_form supports invitation issuance, expired, and terminal closure without an invitee actor (252.313ms)
✔ free_form supports invitation issuance, revoked, and terminal closure without an invitee actor (263.610959ms)
ℹ tests 53
ℹ suites 0
ℹ pass 53
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 17712.962667
```

### `npm run completion:test`

```text

> engramport@0.1.0 completion:test
> node --test tests/completion-status.test.mjs

F157_REAL event=events/agent-b/20260908T194830Z_01a08290-9b52-7002-b704-44c3576f959b.md current=accepted pre-fix=rejected keyword=const
✔ F157 real blocked completion validates against the published schema (35.063417ms)
✔ F157 schema and verifier vocabularies agree (0.320875ms)
F157_CONSUMERS status=satisfied accepted=true
F157_CONSUMERS status=unmet accepted=true
F157_CONSUMERS status=blocked accepted=true
F157_CONSUMERS status=probably-fine accepted=false
F157_MUTATIONS baseline=0
F157_MUTATION pre-fix-schema=killed control=F157 real blocked executed=1
F157_MUTATION schema-extra-status=killed control=F157 schema and verifier executed=2
F157_MUTATION verifier-missing-status=killed control=F157 schema and verifier executed=3
F157_MUTATION verifier-private-copy=killed control=F157 both consumers executed=4
F157_MUTATION verifier-guard-bypassed=killed control=F157 both consumers executed=5
F157_MUTATIONS executed=5 killed=5 survived=0 restored=0
✔ F157 both consumers accept every status and reject an invented status (45.228209ms)
✔ F157 discriminating mutations (909.502333ms)
✔ a completion reporting unmet is accepted and written (11.137083ms)
✔ a completion reporting blocked is accepted and written (7.970625ms)
✔ satisfied still works, so widening did not break the success path (8.195875ms)
✔ an invented status is still refused, so the vocabulary is closed (5.945333ms)
ℹ tests 8
ℹ suites 0
ℹ pass 8
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1079.337833
```

### `node --test tests/schema-v1-status.test.mjs`

```text
F157_REAL event=events/agent-b/20260908T194830Z_01a08290-9b52-7002-b704-44c3576f959b.md current=accepted pre-fix=rejected keyword=const
✔ F157 real blocked completion validates against the published schema (41.139042ms)
✔ F157 schema and verifier vocabularies agree (0.35275ms)
F157_CONSUMERS status=satisfied accepted=true
F157_CONSUMERS status=unmet accepted=true
F157_CONSUMERS status=blocked accepted=true
F157_CONSUMERS status=probably-fine accepted=false
F157_MUTATIONS baseline=0
F157_MUTATION pre-fix-schema=killed control=F157 real blocked executed=1
F157_MUTATION schema-extra-status=killed control=F157 schema and verifier executed=2
F157_MUTATION verifier-missing-status=killed control=F157 schema and verifier executed=3
F157_MUTATION verifier-private-copy=killed control=F157 both consumers executed=4
F157_MUTATION verifier-guard-bypassed=killed control=F157 both consumers executed=5
F157_MUTATIONS executed=5 killed=5 survived=0 restored=0
✔ F157 both consumers accept every status and reject an invented status (53.665333ms)
✔ F157 discriminating mutations (906.923959ms)
ℹ tests 4
ℹ suites 0
ℹ pass 4
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1061.673208
```

### `npm run bctx:test`

```text

> engramport@0.1.0 bctx:test
> node --test tests/bounded-context-roundtrip.test.mjs

✔ a reference in the format the validator accepts resolves to its content (3.380834ms)
✔ the delimiter the resolver used to split on is now refused (0.84475ms)
✔ a bound digest that no longer describes the file refuses (1.366333ms)
ℹ tests 3
ℹ suites 0
ℹ pass 3
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 45.245417
```

### `npm run sdk:buildable`

```text

> engramport@0.1.0 sdk:buildable
> node --test tests/sdk-buildable.test.mjs

✔ the SDK builds from source (1426.61575ms)
✔ the built package exports what deployments are told to import (3.276ms)
✔ the built turn decision still refuses everything it should (0.646417ms)
ℹ tests 3
ℹ suites 0
ℹ pass 3
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1468.21
```

### `npm run sdk:package:test`

```text

> engramport@0.1.0 sdk:package:test
> node --test tests/sdk-package.test.mjs && node scripts/run-sdk-init-mutations

✔ publishable SDK manifest exposes only the bundled artifact (359.723667ms)
{"case":"success","kind":"agent","mode":"free_form","files":{"actors/clean-builder.yaml":"fd8e9047348920a3a3c1f29dce1fbb79caf7617d566d2b8f9b67cb7cb1798a17","artifacts/clean-builder/.gitkeep":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","engramport.yaml":"a92428f764ea841827c68e67aec92e4f642b669bfc89256c0853fe3c9595b71a","events/clean-builder/.gitkeep":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"},"zero":"✓ verified 0 events across 0 thread(s) and 1 actors","append":"events/clean-builder/20260909T130322Z_01a08644-0df0-7316-b65d-93e88d9d0451.md","one":"✓ verified 1 events across 1 thread(s) and 1 actors"}
{"case":"success","kind":"human","mode":"strict_relay","files":{"actors/clean-builder.yaml":"9a0724de601f5ffcfdf2469caa1bbbb5ca0ce8f9242daf2a45699969af882b91","artifacts/clean-builder/.gitkeep":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","engramport.yaml":"afe59e9c06f294c59441acad068aa603d9d12198532fe2173683585056007acf","events/clean-builder/.gitkeep":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"},"zero":"✓ verified 0 events across 0 thread(s) and 1 actors","append":"events/clean-builder/20260909T130322Z_01a08644-0e70-733f-8516-e08fce4baf77.md","one":"✓ verified 1 events across 1 thread(s) and 1 actors"}
{"case":"existing-project","status":1,"stdout":"","stderr":"engram: INIT_PROJECT_EXISTS: joining an existing project requires the pull request process in CONTRIBUTING.md\n","before":{"engramport.yaml":"6fe1784fee7e98174b68dcea0ebbf08ca9cae257e5932bc7ff068cf0f2c839cc","nested/evidence.txt":"2e2d1f8fb246e5d2dc813ba4b00765fa19f2f0e3dec7ee95de4ffe08622093c0"},"after":{"engramport.yaml":"6fe1784fee7e98174b68dcea0ebbf08ca9cae257e5932bc7ff068cf0f2c839cc","nested/evidence.txt":"2e2d1f8fb246e5d2dc813ba4b00765fa19f2f0e3dec7ee95de4ffe08622093c0"}}
{"case":"invalid-slug","status":1,"stdout":"","stderr":"engram: INIT_ACTOR_REFUSED: --actor must match the verifier's SLUG pattern\n","before":{},"after":{}}
{"case":"missing-actor","status":1,"stdout":"","stderr":"engram: INIT_ACTOR_REFUSED: --actor must match the verifier's SLUG pattern\n","before":{},"after":{}}
{"case":"missing-kind","status":1,"stdout":"","stderr":"engram: INIT_KIND_REQUIRED: --kind human|agent is required\n","before":{},"after":{}}
{"case":"invalid-kind","status":1,"stdout":"","stderr":"engram: INIT_KIND_REFUSED: --kind must be human or agent\n","before":{},"after":{}}
{"case":"invalid-mode","status":1,"stdout":"","stderr":"engram: INIT_MODE_REFUSED: --mode must be free_form or strict_relay\n","before":{},"after":{}}
{"case":"invalid-project","status":1,"stdout":"","stderr":"engram: INIT_PROJECT_REFUSED: --project must match the verifier's SLUG pattern\n","before":{},"after":{}}
{"case":"existing-actor","status":1,"stdout":"","stderr":"engram: INIT_PATH_EXISTS: actors/clean-builder.yaml already exists\n","before":{"actors/clean-builder.yaml":"ab868ce3e2bad79d0c35bb2863f5cbc0a57786d3b216926ece452b254e45ea1c"},"after":{"actors/clean-builder.yaml":"ab868ce3e2bad79d0c35bb2863f5cbc0a57786d3b216926ece452b254e45ea1c"}}
{"case":"nonempty","status":1,"stdout":"","stderr":"engram: INIT_NOT_EMPTY: init requires an empty directory\n","before":{"unrelated.txt":"d3de69c4019cb610b6253cbbe55686e189f035f67b51330e32dd755214159ac7"},"after":{"unrelated.txt":"d3de69c4019cb610b6253cbbe55686e189f035f67b51330e32dd755214159ac7"}}
{"case":"symlink-parent","status":1,"stdout":"","stderr":"engram: INIT_NOT_EMPTY: init requires an empty directory\n","before":{"actors":"1c6ff0f07563fce21cfa5fcacaba7e7689b800b79c7300219be427a8d6a58167"},"after":{"actors":"1c6ff0f07563fce21cfa5fcacaba7e7689b800b79c7300219be427a8d6a58167"}}
{"case":"unknown-flag","status":1,"stdout":"","stderr":"engram: ARGUMENT_REFUSED: unrecognized flag --force\n","before":{},"after":{}}
✔ packed SDK installs outside repository, imports, and appends (1359.500709ms)
✔ packed SDK exercises every client method and verifies promised writes (559.003666ms)
ℹ tests 3
ℹ suites 0
ℹ pass 3
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2315.037542
{"mutation":"existing-project","baseline":"passed","after":"killed","observation":{"case":"existing-project","status":1,"stdout":"","stderr":"engram: INIT_PATH_EXISTS: engramport.yaml already exists\n","before":{"engramport.yaml":"6fe1784fee7e98174b68dcea0ebbf08ca9cae257e5932bc7ff068cf0f2c839cc","nested/evidence.txt":"2e2d1f8fb246e5d2dc813ba4b00765fa19f2f0e3dec7ee95de4ffe08622093c0"},"after":{"engramport.yaml":"6fe1784fee7e98174b68dcea0ebbf08ca9cae257e5932bc7ff068cf0f2c839cc","nested/evidence.txt":"2e2d1f8fb246e5d2dc813ba4b00765fa19f2f0e3dec7ee95de4ffe08622093c0"}}}
{"mutation":"invalid-slug","baseline":"passed","after":"killed","observation":{"case":"invalid-slug","status":0,"stdout":"engramport.yaml\nactors/Bad-slug.yaml\nevents/Bad-slug/.gitkeep\nartifacts/Bad-slug/.gitkeep\n","stderr":"","before":{},"after":{"actors/Bad-slug.yaml":"8ec01c6fc08f9e38fd744f00720e0a4b2296629aa9e27b7b33b030dc8313e09a","artifacts/Bad-slug/.gitkeep":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","engramport.yaml":"a92428f764ea841827c68e67aec92e4f642b669bfc89256c0853fe3c9595b71a","events/Bad-slug/.gitkeep":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"}}}
{"mutation":"missing-kind","baseline":"passed","after":"killed","observation":{"case":"missing-kind","status":0,"stdout":"engramport.yaml\nactors/clean-builder.yaml\nevents/clean-builder/.gitkeep\nartifacts/clean-builder/.gitkeep\n","stderr":"","before":{},"after":{"actors/clean-builder.yaml":"fd8e9047348920a3a3c1f29dce1fbb79caf7617d566d2b8f9b67cb7cb1798a17","artifacts/clean-builder/.gitkeep":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","engramport.yaml":"a92428f764ea841827c68e67aec92e4f642b669bfc89256c0853fe3c9595b71a","events/clean-builder/.gitkeep":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"}}}
{"mutation":"invalid-kind","baseline":"passed","after":"killed","observation":{"case":"invalid-kind","status":0,"stdout":"engramport.yaml\nactors/clean-builder.yaml\nevents/clean-builder/.gitkeep\nartifacts/clean-builder/.gitkeep\n","stderr":"","before":{},"after":{"actors/clean-builder.yaml":"5eb56476a2a53cf02b9e22f4a1c14d7d5b8584156ad8fa44d2f5b1c196fb191e","artifacts/clean-builder/.gitkeep":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","engramport.yaml":"a92428f764ea841827c68e67aec92e4f642b669bfc89256c0853fe3c9595b71a","events/clean-builder/.gitkeep":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"}}}
{"mutation":"invalid-mode","baseline":"passed","after":"killed","observation":{"case":"invalid-mode","status":0,"stdout":"engramport.yaml\nactors/clean-builder.yaml\nevents/clean-builder/.gitkeep\nartifacts/clean-builder/.gitkeep\n","stderr":"","before":{},"after":{"actors/clean-builder.yaml":"fd8e9047348920a3a3c1f29dce1fbb79caf7617d566d2b8f9b67cb7cb1798a17","artifacts/clean-builder/.gitkeep":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","engramport.yaml":"4d1857a2866d2db8c25630734d26ee123f5b0290422bb470f4cfd54626450944","events/clean-builder/.gitkeep":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"}}}
{"mutation":"invalid-project","baseline":"passed","after":"killed","observation":{"case":"invalid-project","status":0,"stdout":"engramport.yaml\nactors/clean-builder.yaml\nevents/clean-builder/.gitkeep\nartifacts/clean-builder/.gitkeep\n","stderr":"","before":{},"after":{"actors/clean-builder.yaml":"fd8e9047348920a3a3c1f29dce1fbb79caf7617d566d2b8f9b67cb7cb1798a17","artifacts/clean-builder/.gitkeep":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","engramport.yaml":"5ff0b92909e3036db1715f37640019284b75a221d438913062be1672c2f6bc88","events/clean-builder/.gitkeep":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"}}}
{"mutation":"existing-actor","baseline":"passed","after":"killed","observation":{"case":"existing-actor","status":1,"stdout":"","stderr":"engram: INIT_NOT_EMPTY: init requires an empty directory\n","before":{"actors/clean-builder.yaml":"ab868ce3e2bad79d0c35bb2863f5cbc0a57786d3b216926ece452b254e45ea1c"},"after":{"actors/clean-builder.yaml":"ab868ce3e2bad79d0c35bb2863f5cbc0a57786d3b216926ece452b254e45ea1c"}}}
{"mutation":"nonempty","baseline":"passed","after":"killed","observation":{"case":"nonempty","status":0,"stdout":"engramport.yaml\nactors/clean-builder.yaml\nevents/clean-builder/.gitkeep\nartifacts/clean-builder/.gitkeep\n","stderr":"","before":{"unrelated.txt":"d3de69c4019cb610b6253cbbe55686e189f035f67b51330e32dd755214159ac7"},"after":{"actors/clean-builder.yaml":"fd8e9047348920a3a3c1f29dce1fbb79caf7617d566d2b8f9b67cb7cb1798a17","artifacts/clean-builder/.gitkeep":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","engramport.yaml":"a92428f764ea841827c68e67aec92e4f642b669bfc89256c0853fe3c9595b71a","events/clean-builder/.gitkeep":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","unrelated.txt":"d3de69c4019cb610b6253cbbe55686e189f035f67b51330e32dd755214159ac7"}}}
{"mutation":"unknown-flag","baseline":"passed","after":"killed","observation":{"case":"unknown-flag","status":0,"stdout":"engramport.yaml\nactors/clean-builder.yaml\nevents/clean-builder/.gitkeep\nartifacts/clean-builder/.gitkeep\n","stderr":"","before":{},"after":{"actors/clean-builder.yaml":"fd8e9047348920a3a3c1f29dce1fbb79caf7617d566d2b8f9b67cb7cb1798a17","artifacts/clean-builder/.gitkeep":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","engramport.yaml":"a92428f764ea841827c68e67aec92e4f642b669bfc89256c0853fe3c9595b71a","events/clean-builder/.gitkeep":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"}}}
{"mutation":"exclusive-write","baseline":"passed","after":"killed","observation":{"case":"exclusive-write","status":0,"stdout":"engramport.yaml\nactors/clean-builder.yaml\nevents/clean-builder/.gitkeep\nartifacts/clean-builder/.gitkeep\n","stderr":"","content":"protocol: engramport-git-v0\nproject: my-project\nmode: free_form\ndefault_thread_mode: free_form\nevent_root: events\nactor_root: actors\nartifact_root: artifacts\nhash_profile: engramport-git-body-v0\nschema_version: 0\n"}}
SDK_INIT_MUTATIONS executed=10 killed=10 restored=10
```

