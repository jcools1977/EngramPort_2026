# W1-7 M13 class-gate slice

Handoff: `01a01a32-e129-7c10-9f52-ef7cd9ca7cb5`

Implemented forward-only migration `0010_m13_class_gates.sql` and wired the M13 behavioral fixture into `db:test`. The registry is revision-8/digest-bound, migrator-write-only under forced RLS, and the SECURITY DEFINER mint boundary re-reads it after authority/model checks and fails closed with `CLASS_GATE_NOT_PASSED`.

Evidence:

- `npm run db:test`: exit 0 after migration, gate seeding and behavioral M13 controls; PostgreSQL 16.15.
- `npm run lint`: exit 0.
- `npm run proof:verify`: 131 events, 29 threads, 2 actors.
- M13 fixture covers passed class positive, failed/missing gate refusal and unauthenticated generic authority refusal.
- The pre-existing D1 scratch harness currently does not reach a clean G1–G4 matrix after 0010 because its maintenance-role membership fixture is masked by the existing broad read policy and M13 gate ordering; no discrimination claim is made for that harness in this result.

Scope excludes D1F, D2, W1-8 and W3. W1-7 remains active; A7/A8/B5 remain open.
