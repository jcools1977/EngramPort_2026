# Local D1 harness run on da90725 with Docker, 2026-09-10 22:49Z

Every mutation that failed to apply or load, verbatim:
```
NOOP baseline=0 applied=f after=0 restored=0
not ok 1 - /Users/an2b/an2b/products/EngramPORT/tests/report-correspondent.test.mjs
PORT_WATCH_SHARED_ELIGIBILITY applied=f mutation_error=(anchor not exact, see above)
V1_RETRY_COLLISION applied=f mutation_error=(anchor not exact, see above)
V1_RETRY_MATCH applied=f mutation_error=(anchor not exact, see above)
V1_WRITER_CUTOVER applied=f mutation_error=(anchor not exact, see above)
```

Anchors reported not exact:
```
Error: anchor not exact:     if (existing.event.meta.schema_version === 1 && existing.event.meta.intent_sha256 === intentSha256) return resultFor(existing.relative, id, true); /* V1_RETRY_INTENT_MATCH */
Error: anchor not exact:     if (existing.event.meta.schema_version === 1 && existing.event.meta.intent_sha256 === intentSha256) return resultFor(existing.relative, id, true); /* V1_RETRY_INTENT_MATCH */\n    at mutate (
Error: anchor not exact:     if (existing.event.meta.schema_version === 1 && existing.event.meta.intent_sha256 === intentSha256) return resultFor(existing.relative, id, true); /* V1_RETRY_INTENT_MATCH */\n    at mutate (
Error: anchor not exact:   if (schemaVersion !== 1) throw appendError("EVENT_VERSION_REFUSED", "live append accepts schema_version 1 only"); /* V1_WRITER_CUTOVER */
Error: anchor not exact:   if (schemaVersion !== 1) throw appendError("EVENT_VERSION_REFUSED", "live append accepts schema_version 1 only"); /* V1_WRITER_CUTOVER */\n    at mutate ([stdin]:3:121)\n    at [stdin]:7:33\n  
Error: anchor not exact: .filter(({ event }) => event.meta.type !== "withdrawal" && event.meta.next === actor && !answered.has(event.meta.id))
Error: anchor not exact: .filter(({ event }) => event.meta.type !== "withdrawal" && event.meta.next === actor && !answered.has(event.meta.id))\n    at mutate ([stdin]:3:121)\n    at [stdin]:4:20\n    at runScriptInThisCo
```

Summary:
```
D1 mutation harness: executed=149 not_exercised=7 negative_control=1 expected_total=157
D1 mutation harness failed
```
