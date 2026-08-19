# W1-7 D1 mutation harness complete matrix

Harness commit: pending.

| Control | baseline | mutation verified | forbidden outcome | restored |
|---|---:|---|---|---:|
| G1 membership policy | 0 | true | foreign membership visible; exit 3 | 0 |
| G2 custody-class FK | 0 | true | unmapped class accepted; exit 3 | 0 |
| G3 M7 scope | 0 | true | unheld scope minted; exit 3 | 0 |
| G4 M8 namespace | 0 | true | shape/installation path accepted; exit 3 | 0 |

No-op mutation: baseline 0, mutation not applied, forbidden behavior absent, restored 0; harness rejects false discrimination. Executed controls: 4 genuine controls plus the no-op negative control. Scratch extensions were installed through `deploy/init-extensions.sql`; migrations ran as `engram_migrator`; probes ran as `engram_maintenance`; scratch database and Docker resources were removed by trap cleanup.
