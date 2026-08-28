# Port Watch Git v0 work-delivery results

## Result

Port Watch now derives work eligibility from accepted Git events instead of a stored delivery cursor. The exported `resolveWorkInbox` function is the single eligibility resolver used by both `listInbox` and the Git-backed Port Watch source. Its shared delivery type is a direct projection of the accepted event: addressed to the actor and not answered by any accepted `in_reply_to`.

Runner completion does not dispose work. An accepted reply in the Port Log is the disposition, so an unanswered item is deliberately eligible for at-least-once redelivery. Observation delivery was not implemented because the protocol has no accepted observation-disposition rule.

The inbox cache is keyed to a digest of relevant Git state. A deterministic probe showed that deleting it increases loader work but reproduces the same delivery set. Two independently constructed Port Watch instances sharing a claim root contend on an atomic filesystem claim before the runner call; the test observes one runner invocation and one `wip_limit` loser.

## Legacy state

Inactive legacy cursors and completion arrays are removed and audited rather than imported as synthetic log position. A legacy `active_run` blocks migration until an operator explicitly expires it. Explicit expiry records at-least-once redelivery, so in-flight work is never silently declared disposed.

The claim store is local runtime coordination for processes sharing its filesystem root. It is not cross-host consensus or delivery position; database-backed claims and fencing remain PW3 work.

## Evidence

- Fresh-copy test: two copied accepted-log surfaces yield byte-identical work-delivery arrays.
- Cache probe: same state hits; changed state misses; cache deletion rebuilds the same set.
- Duplicate-wake probe: concurrent ticks and separate store instances produce exactly one observed runner invocation.
- Focused suites: `watch:test` 19/19; `proof:test` 48/48; `report:correspondent:test` 6/6.
- Full repository suite: `npm test` exit 0 after Docker access was granted; `npm run lint` exit 0; `git diff --check` exit 0.
- Canonical mutation harness: exit 0, `executed=135`, moved from the observed `executed=130`.

## Discriminating mutations added

- `PORT_WATCH_SHARED_ELIGIBILITY`: removes answered-event exclusion; the shared resolver integration test fails.
- `PORT_WATCH_LOG_DERIVED_POSITION`: stores a completion cursor; the no-position test fails.
- `PORT_WATCH_CACHE_LOG_STATE`: reuses stale cache data across log states; the changed-state test fails.
- `PORT_WATCH_ATOMIC_CLAIM`: bypasses the losing claim branch; the test observes duplicate runner invocation.
- `PORT_WATCH_LEGACY_ACTIVE_RUN_GUARD`: imports an unresolved active run; the explicit-migration test fails.

Each shipped baseline and restored rerun passed, and each mutation failed its named property.
