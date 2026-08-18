# W1-7 structural boundary revision

Removed all local key generation and application-memory private-key handling. Mint now uses timestamp-bearing UUIDv7-style references without cryptographic key generation. Vault signing validates exact `data.signature`, rejects malformed 200 bodies as `KMS_RESPONSE_INVALID`, pins localhost endpoint/key allowlist, catches transport failures as `KMS_UNAVAILABLE`, and redacts token serialization. The async canary path awaits signing.

Tests: W1-7 4/4; lint passed. Vault provisioning script `npm run kms:test` starts cached `hashicorp/vault:1.17`, health-checks, attempts transit setup, and tears down via trap; the local run reported the Vault dev endpoint reset during setup, so full live transit differential remains open. No larger fixture conversion is claimed. A7/A8/B5 and B1–B4 remain open; A6/B9 remain open.

Artifact digest binding: revision 8 threat-model digest `629ae3f2654aba46e4c1158fc234c6b24831a369505ccf41878af3207b091089`. No schema/threat-model/database/provider/credential work was changed. Docker cleanup and temporary cleanup completed; unrelated PNG remains untracked.
