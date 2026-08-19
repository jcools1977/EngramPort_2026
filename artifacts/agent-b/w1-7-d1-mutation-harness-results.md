# D1 mutation harness result

Added the behavioral SQL fixture and mutation list, and replaced the placeholder entrypoint with the isolated scratch-database lifecycle structure. The current run is blocked during scratch build because migrations require `vector`/`pgcrypto` extension creation under the migration role; the harness must provision those extensions as the PostgreSQL bootstrap role before applying migrations. No four-control discrimination totals are claimed.

No migrations or production behavior changed. The baseline regression assertions remain fail-closed. W1-7/D1 remains active.
