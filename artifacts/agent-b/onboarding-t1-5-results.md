# Onboarding T1.5 implementation result

Implementation commit: `73432103a2be700b93e85275ac4e16e0ee42ff0b`

Node: `v26.5.0`

## Result

All T1.5 acceptance criteria are met. Git v0 now supports `strict_relay`, `free_form`, and `coordinator_led` per thread. A declaration is created before the first event at `threads/<slug>.yaml`; the first event binds the canonical declaration digest in `thread_config_sha256`. Undeclared accepted threads retain `default_thread_mode: strict_relay`, so the existing 53-event log needs no migration and strict-relay behavior remains intact.

`free_form` allows registered actors to append sequentially or as sibling replies while retaining one root, same-thread known-parent, and acyclic reply requirements. `coordinator_led` requires a known coordinator; the coordinator may append at any time, while a worker may append only in reply to a coordinator event. None of these modes treats an external invitee as an actor: an issuer can issue, accept/reject/expire/revoke, and close an invitation-shaped thread with `next: null`, including unilateral revocation of an outstanding invitation.

## Mode immutability finding

The implementation provides snapshot-structural and Git-history integrity, not an unqualified immutable datastore guarantee. The declaration digest is checked against the first event, so adding or editing only the declaration after a thread has events fails verification and cannot retroactively legalize an invalid event. A normal Git commit cryptographically binds both files in its tree.

An actor able to rewrite Git history can, however, rewrite both the declaration and the root's `thread_config_sha256` and then create a new commit that verifies. The digest is not a signature or an external anchor. Durable enforcement therefore requires thread creation and the first append to be one transaction in an append-only store whose application roles cannot update thread mode after the first event, or signed Git history anchored outside the rewriting actor's control. T1.5 does not overstate Git v0 beyond that boundary.

## T1.5 proof output

Command: `npm run proof`

```text
✓ verified 53 events across 18 thread(s) and 2 actors
✔ valid two-agent relay verifies
✔ modified content is rejected
✔ unknown schema fields are rejected
✔ actor directory ownership is enforced
✔ unknown reply targets are rejected
✔ strict relay actor transitions are enforced
✔ reply cycles are rejected
✔ missing artifacts are rejected
✔ artifact modification is rejected
✔ artifact references must remain in author prefix
✔ filename identity is enforced
✔ free_form permits one actor to publish sequential events
✔ free_form permits sibling replies
✔ coordinator_led permits coordinator followed by two worker replies
✔ strict_relay refuses an actor replying to itself and names the mode
✔ strict_relay refuses a second reply and names the mode
✔ free_form refuses an unknown parent and names the mode
✔ free_form refuses a cycle
✔ free_form refuses a second root with a precise mode error
✔ coordinator_led refuses a worker root
✔ coordinator_led refuses a worker replying to a worker
✔ unknown thread modes fail closed
✔ malformed thread mode declarations fail closed
✔ a mode may be declared while a thread is empty
✔ changing a declared mode after the first event violates its binding
✔ a per-thread mode declaration cannot be added after the first event
✔ changing mode cannot retroactively legitimize an invalid strict_relay branch
✔ coordinator_led requires a coordinator
✔ coordinator_led refuses an unknown coordinator
✔ free_form supports invitation issuance, accepted, and terminal closure without an invitee actor
✔ free_form supports invitation issuance, rejected, and terminal closure without an invitee actor
✔ free_form supports invitation issuance, expired, and terminal closure without an invitee actor
✔ free_form supports invitation issuance, revoked, and terminal closure without an invitee actor
ℹ tests 33
ℹ pass 33
ℹ fail 0
```

## Negative controls and matched errors

| Negative control | Matched verifier error |
|---|---|
| Strict actor replies to itself | `mode strict_relay violation; an actor may not reply to itself` |
| Strict parent receives two replies | `mode strict_relay violation; parent has 2 replies` |
| Free-form unknown parent | `mode free_form violation; unknown reply target` |
| Free-form cycle | `mode free_form violation; reply cycle detected` |
| Free-form second root | `mode free_form violation; thread already has a root` |
| Coordinator-led worker root | `mode coordinator_led violation; root must be authored by coordinator agent-a` |
| Coordinator-led worker replies to worker | `mode coordinator_led violation; worker agent-b must reply to coordinator agent-a` |
| Unknown mode | `unknown thread mode surprise_mode` |
| Missing mode | `unknown thread mode undefined` |
| Declaration changed after first event | `mode immutability violation` |
| Declaration added after first event | `mode immutability violation; declaration for non-empty thread late-declaration does not match its first-event binding` |
| Strict-invalid branch followed by mode relaxation | `mode immutability violation` |
| Coordinator omitted | `coordinator_led mode requires a coordinator` |
| Coordinator is not a known actor | `coordinator_led mode has unknown coordinator invitee-not-an-actor` |

Each negative has a paired positive in the same suite: the live strict relay; free-form sequential and sibling replies; coordinator plus two distinct worker replies; known parents and acyclic single-root threads; all three known modes; empty-thread declaration; immutable bound declaration; and a known coordinator.

## Required regression output

```text
npm run proof          exit 0  tests 33  pass 33  fail 0
npm run welcome:test   exit 0  tests 19  pass 19  fail 0
npm run setup:test     exit 0  tests 22  pass 22  fail 0
npm run dry-run:test   exit 0  tests  6  pass  6  fail 0
npm run session:test   exit 0  tests 12  pass 12  fail 0
npm run approval:test  exit 0  tests 25  pass 25  fail 0
npm run watch:test     exit 0  tests 16  pass 16  fail 0
npm run db:static-test exit 0  tests  6  pass  6  fail 0
npm run lint           exit 0
```

Reproduction:

```sh
npm run proof
npm run welcome:test
npm run setup:test
npm run dry-run:test
npm run session:test
npm run approval:test
npm run watch:test
npm run db:static-test
npm run lint
```

## Scope

Changed only the Git-v0 protocol/configuration, event schema extension, thread declaration documentation, Git adapter CLI/verifier, T1.5 controls, and the welcome fixture's copied verification surfaces. No accepted event was edited. No database, migration, T2, W1-5–W1-7, Port Watch implementation, Re:PORT, provider, or credential work was touched. The unrelated PNG remains untracked.
