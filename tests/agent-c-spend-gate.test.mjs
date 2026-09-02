// The daily spend ceiling must refuse, not merely report.
//
// The supervisor measured provider cost exactly and enforced nothing with it.
// ADR 0036's $10/day existed only in prose. Every case below asserts a refusal
// and is paired with the nearest allowed case, so the gate cannot pass by
// refusing everything.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  decide,
  ticksSpentOn,
  utcDay,
  USD_TICKS_PER_DOLLAR as T,
  DEFAULT_DAILY_CAP_TICKS,
  DEFAULT_RESERVE_TICKS,
} from "../packages/agent-c-supervisor/src/spend-gate.mjs";

const base = { disabled: false, spentTicks: 0, capTicks: 10 * T, reserveTicks: 1 * T };
const review = (day, ticks) => ({
  relative: `artifacts/agent-c/reviews/${day}.json`,
  review: { review_completed_at: `${day}T12:00:00.000Z`, provider_cost: { cost_in_usd_ticks: ticks } },
});

test("a run under the ceiling is allowed", () => {
  const d = decide({ ...base, spentTicks: 5 * T });
  assert.equal(d.allowed, true);
  assert.equal(d.remainingTicks, 5 * T);
});

test("the kill switch refuses, and its absence does not", () => {
  assert.equal(decide({ ...base, disabled: true }).code, "KILL_SWITCH");
  assert.equal(decide({ ...base, disabled: false }).allowed, true);
});

test("reaching the ceiling refuses; one tick short still runs", () => {
  assert.equal(decide({ ...base, spentTicks: 10 * T }).code, "DAILY_CAP_REACHED");
  assert.equal(decide({ ...base, spentTicks: 10 * T - 1, reserveTicks: 0 }).allowed, true);
});

test("a run that would cross the ceiling is refused before it spends", () => {
  // 9.5 spent, 1.00 reserve: the run itself is affordable only if the reserve is ignored.
  const d = decide({ ...base, spentTicks: 95 * T / 10 });
  assert.equal(d.code, "WOULD_EXCEED_CAP");
  assert.equal(decide({ ...base, spentTicks: 9 * T }).allowed, true);
});

test("an unreadable spend total refuses rather than counting as zero", () => {
  for (const bad of [undefined, null, NaN, -1, 1.5, "0"]) {
    assert.equal(decide({ ...base, spentTicks: bad }).code, "SPEND_UNREADABLE", `spent=${String(bad)}`);
  }
  assert.equal(decide({ ...base, spentTicks: 0 }).allowed, true);
});

test("a missing or nonsensical cap refuses rather than defaulting to unlimited", () => {
  for (const bad of [undefined, null, 0, -5, NaN, Infinity]) {
    assert.equal(decide({ ...base, capTicks: bad }).code, "CAP_UNCONFIGURED", `cap=${String(bad)}`);
  }
  assert.equal(decide({ ...base, capTicks: 1, reserveTicks: 0 }).allowed, true);
});

test("spend is summed only for the day in question", () => {
  const rows = [review("2026-09-02", 3 * T), review("2026-09-01", 7 * T), review("2026-09-02", 2 * T)];
  assert.equal(ticksSpentOn(rows, "2026-09-02"), 5 * T);
  assert.equal(ticksSpentOn(rows, "2026-09-01"), 7 * T);
  assert.equal(ticksSpentOn(rows, "2026-08-30"), 0);
});

test("a review with an unreadable cost throws instead of being skipped", () => {
  const good = review("2026-09-02", 1 * T);
  for (const mutate of [
    (r) => { delete r.review.provider_cost.cost_in_usd_ticks; },
    (r) => { r.review.provider_cost.cost_in_usd_ticks = "1"; },
    (r) => { r.review.provider_cost.cost_in_usd_ticks = -1; },
    (r) => { delete r.review.review_completed_at; },
    (r) => { r.review.review_completed_at = "not-a-date"; },
  ]) {
    const row = JSON.parse(JSON.stringify(good));
    mutate(row);
    assert.throws(() => ticksSpentOn([row], "2026-09-02"), /readable/);
  }
  // The unmutated row must still sum, or the assertions above prove nothing.
  assert.equal(ticksSpentOn([good], "2026-09-02"), 1 * T);
});

test("the shipped defaults are the ones ADR 0036 states", () => {
  assert.equal(DEFAULT_DAILY_CAP_TICKS, 10 * T);
  assert.ok(DEFAULT_RESERVE_TICKS > 0 && DEFAULT_RESERVE_TICKS < DEFAULT_DAILY_CAP_TICKS);
});

test("day bucketing is UTC and does not drift with local time", () => {
  assert.equal(utcDay("2026-09-02T23:59:59.999Z"), "2026-09-02");
  assert.equal(utcDay("2026-09-03T00:00:00.000Z"), "2026-09-03");
});
