# Port Watch PW1

PW1 is a Node-only decision core with a durable atomic file store and recording runner adapter. Run:

```sh
npm run watch:test
```

The authorized inbox interface accepts only sources constructed with `authorizedInboxSource`; there is no broad-query/client-filter variant. This encodes the boundary locally, while the future server implementation remains responsible for truthfully producing authorized results.

PW1 models active and revoked lease state only for WIP, pause/stop, and crash re-delivery tests. Database-backed atomic claims, lease expiry scheduling, and fencing tokens belong to PW3.
