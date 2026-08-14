# PostgreSQL schema review

## Result

No blocking tenant-integrity flaw was found in the proposed event model after adding forced RLS to every tenant-scoped table and requiring service-mediated canonical writes.

## Required controls

1. Authorization predicates execute before lexical or vector candidate limiting.
2. Application roles cannot bypass, update, or delete canonical events.
3. Actor delegation is checked inside the append transaction.
4. Cross-tenant event-ID guessing and semantic-search leakage remain mandatory failure tests.

## Open risk

Project-sequence allocation locks one project row per append. Benchmark before introducing range allocation because gaps would complicate the v1 chain contract.

