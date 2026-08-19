# W1-7 M13 class-gate slice

Handoff: `01a01a32-e129-7c10-9f52-ef7cd9ca7cb5`

Implemented forward-only migration `0010_m13_class_gates.sql` and wired the M13 behavioral fixture into `db:test`. The registry is revision-8/digest-bound, migrator-write-only under forced RLS, and the SECURITY DEFINER mint boundary re-reads it after authority/model checks and fails closed with `CLASS_GATE_NOT_PASSED`.

Evidence:

- `npm run db:test`: exit 0 after migration, gate seeding and behavioral M13 controls; PostgreSQL 16.15.
- `npm run lint`: exit 0.
- `npm run proof:verify`: 131 events, 29 threads, 2 actors.
- M13 fixture covers passed class positive, failed/missing gate refusal and unauthenticated generic authority refusal.
- The harness diagnosis is corrected: M13 gate ordering originally masked G3/G4 because only 3.3 was seeded as passed. The scratch build now seeds passed revision-8 gates for 3.2 and 3.12 without changing migration 0010. G1 reaches its policy mutation independently. The current scratch run still exposes a G2 fixture/constraint-path defect before a complete matrix can be claimed; no G1–G4 acceptance claim is made until that is corrected.

Scope excludes D1F, D2, W1-8 and W3. W1-7 remains active; A7/A8/B5 remain open.
