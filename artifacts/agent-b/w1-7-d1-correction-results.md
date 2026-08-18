# W1-7 D1 correction

Migration 0001 remains SHA-256 `1ffe7e5ffa65d231c7f7ebe16f645246f4f2912de9c473f4cf408723e57f9539`.
Migration 0002 remains SHA-256 `22a959fa059d5a8de074d3c930575c4b350b2e6523c63c4daecd6654c41396a7`.
Migration 0003 (`migrations/0003_durable_custody_correction.sql`) SHA-256 `6fe1bd0f3118734f237d13960e83ce82f24aa95fca8b9a098ba320e378e27b3e`.

0003 corrects UUID millisecond left-padding, adds narrow forced-RLS INSERT policies, adds revoked-authority state, and enforces the metadata key allow-list through an immutable database function/check. The runner applies 0001, 0002 and 0003 in order on clean PostgreSQL and records each checksum. `db:test` passed with PostgreSQL 16.15 and pgvector 0.8.6; cleanup passed.

This remains a partial D1 correction. Full fourteen-control live mint matrix, complete M1–M13/MP discrimination, tenant derivation de-circularization, transaction fault injection, and concurrent custody mint evidence remain open. Node adapter, Vault, canary, retention execution, D2/D3 and A7/A8/B5 closure are not claimed.
