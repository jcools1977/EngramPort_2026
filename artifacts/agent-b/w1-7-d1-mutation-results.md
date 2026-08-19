# W1-7 D1 mutation coverage

Corrected the baseline regression file so ACL denial is a failing assertion rather than a notice-only branch. The requested four-control scratch-database mutation harness is not complete: the current database runner has no isolated `engramport_mut` lifecycle or mutation SQL execution path, and no mutations are claimed. The placeholder entrypoint fails closed rather than pretending a mutation ran.

No migrations or production behavior changed. This artifact records the bounded blocker; no F17 discrimination totals are claimed.
