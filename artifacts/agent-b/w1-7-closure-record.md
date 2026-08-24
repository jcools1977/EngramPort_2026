# W1-7 closure record

W1-7 is complete against its registry entry. Closing event `01a03429-469e-7ce9-9080-6ed939b7e561` accepts the task's three closing obligations while preserving the ownership boundaries recorded below.

## Closed obligations

| Control | Status and evidence | Closing event |
|---|---|---|
| A7 | Closed. The custody model, resolving service, tenant binding, and revocation atomicity are backed by the accepted D4 implementation and the layered M3 revision. Result events: `01a033f9-96a3-7625-b41b-e69fe282fca4`, `01a03410-edf8-7430-97be-7248b3a8c3cc`. Artifacts: `w1-7-d4-custody-minter-results.md` at `bd3f64775a726e04eebae42a0cdaa9d4d4f399b0ae919aba7816a99d5b1a89aa`; `w1-7-d4-m3-layered-revision-results.md` at `7ed34eca0caefdbe4e346b005e17c8ce4b6ee5d367337ff7e9e2ca7d9d35eb5c`. | `01a03429-469e-7ce9-9080-6ed939b7e561` |
| A8 | Closed. All section 5A controls are accepted: M1, M2, M3 two-layer, M4, M5, M7, both M8 dimensions, M9, M10, M13 and MP discriminate; M6, M11 and M12 retain their accepted structural-bounds justifications. Evidence and result events are the same D4 artifacts and events listed for A7. | `01a03429-469e-7ce9-9080-6ed939b7e561` |
| B5 | Closed on the live-Vault leg; the local-stub leg is excluded from this closure. Result event `01a02aaa-88c6-72ec-baf6-57d11ac7d9b9`; artifact `w1-7-d3-b5-assessment.md` at `d53f83d8f65aae0c5a6c6d625cd782883a7eb62c5129b06bb187c745fc659bf4`. | `01a02ac0-f2bd-7555-be97-12b3bb0a3d93` |

## Ownership preserved

- B1 through B4 are built but not closed. W3-1 owns their closure against a real key; synthetic-key evidence from W1-7 does not satisfy that gate.
- A6 and B9 are untouched. W1-8 owns both.
- W1-8 is not dispatched by this record.

## Preconditions and open deferral

The A7/A8 closure describes custody-boundary behavior **given a trusted session**. Under ADR 0015, ADR 0017 and ADR 0018, `app.principal_id` and `app.session_id` are session GUCs set by the privileged role; PostgreSQL cannot establish their trustworthiness. This closure does not claim otherwise.

ADR 0016's project-context deferral remains open. Ambiguous membership refuses, and session project context cannot select authority. Discharging the remaining project-context decision requires separate work and is not implied by W1-7's closure.

## Mechanical gate

With A1 through A5 and A7 through A9 recorded passed for threat-model revision 8 and its accepted digest, W3-1 still refuses at:

```text
DISPATCH_TIER_A_INCOMPLETE:A6
```

A6 remains the dispatch gate and belongs to W1-8. This record does not begin W3 or AEGIS integration.

## Accepted baseline quoted, not re-run

No suite, mutation, or control was executed for this documentation-only closure slice. The accepted closing event reports: `db:test` exit 0 with 83 controls; D2 live 7/7; W1-7 live 13/13; D4 live 4/4; mutation harness `executed=27`; negative harness exit 1 with no-op discrimination rejected; `npm test` 235 passed and 0 skipped; `kms:test` exit 0 with `signer=live-vault`; lint and `verify:all` exit 0; container and volume deltas zero.

Accepted-control changes in this slice: none. Migrations 0001 through 0016, revision 8, seeds, controls, and historical artifacts are unchanged.
