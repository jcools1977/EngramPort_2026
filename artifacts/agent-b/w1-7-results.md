# W1-7 custody and synthetic boundary result

Evidence binds to threat-model revision 8 digest `629ae3f2654aba46e4c1158fc234c6b24831a369505ccf41878af3207b091089`.

Implemented `AtomicCustodyStore`, closed namespace minting, all-or-none rollback at row/bind/audit faults, tenant/project resolution, synthetic non-exportable/exportable differential signing controls, policy isolation, differential canary observers, and six retention clock starts. W1-7 suite: 5/5 tests passed. M1–M13/MP synthetic controls: 12/12 exercised; retention: 6/6 clock-start checks; canary sinks: 6/6 vulnerable detection plus protected signing.

Important bounded finding: this environment did not provide the verified Vault transit emulator endpoint. The signing tests therefore demonstrate the API contract with an isolated synthetic Node boundary, not the required non-production KMS/HSM. B1–B4 are reported as synthetic-only demonstrations and remain open for W3-1; A7/A8/B5 are not claimed closed pending the real Vault-backed custody boundary and live canary execution. F18 is recorded by this bounded result without modifying digest-pinned revision 8.

Existing regressions and live `db:test` remain green (PostgreSQL 16.15, pgvector 0.8.6; 77 assertions, 0 errors). No real credentials or provider material used. A2 is closed; A6/B9 remain open; W1-8/W3 remain undispatched/ineligible. Docker and temporary-file cleanup are clean; only the unrelated PNG remains untracked.
