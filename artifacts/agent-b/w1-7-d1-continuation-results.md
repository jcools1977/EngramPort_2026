# W1-7 D1 continuation

Historical artifact `artifacts/agent-b/w1-7-d1-results.md` is restored byte-for-byte with SHA-256 `c4cb4020ac1f7146136be009b35a6c0e121f57ffcd609d17750bfc5bf4bcafdf`.

Migration 0004 is forward-only and preserves 0001–0003. It tightens the mint boundary’s namespace/model/metadata checks and records its checksum through the existing runner. Prior checksums remain unchanged.

The D1 matrix remains partial: MP/reference padding, write-policy, authority expiry/revocation, metadata-key, and namespace guards are implemented; M2/M3 tenant derivation remains blocked by the existing forced-RLS membership policy’s tenant-GUC dependency; M7 scope containment, M9 live collision, M11/M12 fault injection, and genuine overlapping mint evidence remain unimplemented. No refusal-only claims are counted.

Node adapter, Vault binding, detector-value enforcement, canary, retention execution, D2/D3, W1-8, W3, and A7/A8/B5 closure remain out of scope.
