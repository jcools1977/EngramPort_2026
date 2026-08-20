# D2 final bounded revision

Updated the D2 live path to the published `127.0.0.1:55432` endpoint with the committed synthetic SCRAM credential and bounded pg connection/test timeouts. The D2 fixture is ordered after accepted D1/D1F controls. Scrub failures destroy dirty pooled clients via `client.release(error)`. Unit d2:test and lint pass. The live PostgreSQL fixture still did not complete in this runner (bounded invocation was interrupted after no result); no live mutation totals are claimed.
