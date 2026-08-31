# Layer 1 contribution-ledger results

## Boundary

The implementation derives contribution from the existing verified event log. It changes no event envelope or protocol and introduces no pooling, grants, budgets, balances, transfers, or other layer-2 behavior.

## Observed ledger

`node scripts/generate-contribution-ledger` reported all three registered actors across the 451-event pre-completion snapshot. Agent A and Agent B show work contributed using event, accepted-handoff, completion, and completion-criterion counts. Because both are subscription actors, their capacity evidence is `subscription capacity; currency unavailable` and no dollar value is rendered.

Agent C's metered row reconciled independently against all 17 referenced JSON review artifacts:

- total tokens: `308833`
- cost in exact USD ticks: `12552660000`
- rendered cost: `$1.255266 USD`

The test discovers the review artifacts dynamically and requires the 17-review handoff baseline to remain present, so later legitimate Agent C reviews update the reconciled total rather than making the control stale.

## Discriminating control

The permanent `CONTRIBUTION_SUBSCRIPTION_CURRENCY` mutation removes `CONTRIBUTION_SUBSCRIPTION_CURRENCY_REFUSAL`. With the shipped guard, poisoned metered data on subscription Agent A is refused with `SUBSCRIPTION_CURRENCY_REFUSED` and emits no currency figure. With the guard removed, the probe emits the fictional `$0.001 USD` value. The mutation harness reported:

```text
CONTRIBUTION_SUBSCRIPTION_CURRENCY baseline=0 applied=t after=1 emitted=0 forbidden=t restored=0
D1 mutation harness: all controls discriminate (executed=155)
```

The observed harness count moved from `154` to `155`.

## Verification

- `node --test tests/contribution-ledger.test.mjs`: 3 passed, 0 failed.
- `bash scripts/run-d1-mutation-harness`: all 155 controls discriminated.
- `npm run lint`: passed.
- `git diff --check`: passed.
- `npm test`: passed with Docker access required by the pre-existing W1-7 canary; the complete site build and rendered-HTML tests passed.
- `node scripts/verify-log`: passed before publication at 451 events across 86 threads and 3 actors.
