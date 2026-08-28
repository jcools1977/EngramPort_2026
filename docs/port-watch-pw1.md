# Port Watch PW1

PW1 is a Node-only decision core for Git v0 work deliveries, with a file-backed control store, disposable inbox cache, local atomic WIP claims, and a recording runner adapter. Run:

```sh
npm run watch:test
```

The Git source delegates work eligibility to the same resolver as `engram inbox`: an event is eligible when it is addressed to the actor and no event replies to its id. Its delivery shape comes directly from accepted event metadata and contains no synthetic `project_seq` or `implementation_authority`. Work is disposed only by an accepted reply in the Port Log. Observation delivery remains out of scope until its protocol rule is settled.

The authorized inbox interface accepts only sources constructed with `authorizedInboxSource`; there is no broad-query/client-filter variant. The inbox cache is keyed to a digest of the relevant Git log state. It may be deleted at any time: deletion causes recomputation, not a different work set.

The file claim store reserves the `(agent, project)` WIP slot before invoking a runner, so concurrent Port Watch processes sharing that claim root cannot both invoke for the same slot. These claims are local runtime state, not delivery position or disposition. Cross-host/database-backed atomic claims, lease scheduling, and fencing tokens still belong to PW3.

Legacy stored cursors and completion arrays are not imported because the accepted log has no equivalent position. An inactive legacy position is removed and audited. A legacy `active_run` blocks migration until an operator explicitly expires it; expiry is audited and the work is eligible for at-least-once redelivery. No in-flight work is silently discarded.
