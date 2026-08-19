# W1-7 D1 regression-only slice

Added `tests/failure/d1-regression.sql` to the existing db:test path. The restored clean run passes and checks the principal-self policy, custody-class FK, ACL denial, and namespace/scope boundary prerequisites without changing migrations or production behavior.

This slice does not claim the requested temporary-copy behavioral mutations: those require a dedicated scratch-database harness not present in the existing runner. No refusal-only/catalog checks are counted as genuine F17 discrimination. M13, D1F, D2, W1-8 and W3 remain out of scope.
