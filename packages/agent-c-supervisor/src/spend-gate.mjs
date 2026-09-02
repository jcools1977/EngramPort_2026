// Decides whether an unattended agent-c run may spend money.
//
// The supervisor already measured provider cost exactly, in integer USD ticks,
// and enforced nothing with it. ADR 0036 sets a $10 daily ceiling and no code
// read that number, so the cap was a report rather than a control. F144.
//
// Spend is derived from the review artifacts the log already carries, not from
// a side ledger: events are truth and everything else is a projection that can
// be deleted and rebuilt. A separate spend file would be a second truth that
// can disagree with the first.
//
// Every refusal path fails closed. An unreadable measurement means the run is
// refused, because "I cannot tell what I have spent" must never be treated as
// "I have spent nothing". That inversion is how a cap becomes decorative.

export const USD_TICKS_PER_DOLLAR = 10_000_000_000;

// ADR 0036: metered provider calls up to $10/day.
export const DEFAULT_DAILY_CAP_TICKS = 10 * USD_TICKS_PER_DOLLAR;

// Held back before a run whose cost is not yet known. Observed agent-c reviews
// cost about $0.072; a $1.00 reserve is deliberately far above that, so an
// unusually expensive run cannot cross the ceiling it was cleared under.
export const DEFAULT_RESERVE_TICKS = 1 * USD_TICKS_PER_DOLLAR;

const isCount = (n) => Number.isSafeInteger(n) && n >= 0;

export function utcDay(date) {
  return new Date(date).toISOString().slice(0, 10);
}

// Throws rather than skipping a malformed record: a review whose cost cannot be
// read is exactly the case where silently counting zero is most dangerous.
export function ticksSpentOn(reviews, day) {
  let total = 0;
  for (const { relative, review } of reviews) {
    const completed = review?.measurement?.review_completed_at ?? review?.review_completed_at;
    const ticks =
      review?.measurement?.provider_cost?.cost_in_usd_ticks ??
      review?.provider_cost?.cost_in_usd_ticks;
    if (typeof completed !== "string" || Number.isNaN(Date.parse(completed))) {
      throw new Error(`${relative}: review has no readable completion timestamp`);
    }
    if (!isCount(ticks)) {
      throw new Error(`${relative}: review has no readable USD tick count`);
    }
    if (utcDay(completed) === day) total += ticks;
  }
  if (!isCount(total)) throw new Error("spend total left the safe integer range");
  return total;
}

export function decide({ disabled, spentTicks, capTicks, reserveTicks }) {
  if (disabled) return { allowed: false, code: "KILL_SWITCH" };
  if (!Number.isSafeInteger(capTicks) || capTicks <= 0) {
    return { allowed: false, code: "CAP_UNCONFIGURED" };
  }
  if (!isCount(reserveTicks)) return { allowed: false, code: "RESERVE_UNCONFIGURED" };
  if (!isCount(spentTicks)) return { allowed: false, code: "SPEND_UNREADABLE" };
  if (spentTicks >= capTicks) {
    return { allowed: false, code: "DAILY_CAP_REACHED", spentTicks, capTicks };
  }
  if (spentTicks + reserveTicks > capTicks) {
    return { allowed: false, code: "WOULD_EXCEED_CAP", spentTicks, capTicks, reserveTicks };
  }
  return { allowed: true, spentTicks, capTicks, remainingTicks: capTicks - spentTicks };
}

export function formatUsd(ticks) {
  return (ticks / USD_TICKS_PER_DOLLAR).toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
}
