// One decision about whether an agent may take a turn.
//
// This existed three times before it existed once: as bash in two runners, as
// JavaScript in a third, and as a fourth copy in a different repository written
// four days after a finding was recorded about exactly this duplication. Within
// hours the copies disagreed in both directions, and both disagreements were
// dangerous:
//
//   - one copy had no thread-depth cap, which is the guard that stops two
//     autonomous runners passing a turn back and forth forever;
//   - the other's "shared" decision had no human-seat refusal, so the guard that
//     stopped a model publishing a governance decision under its owner's name
//     was bolted onto each runner separately rather than covered by conformance.
//
// A guard that is duplicated is a guard that is not enforced. This is the single
// definition; deployments import it rather than restating it.
//
// It decides. It observes nothing: no filesystem, no clock, no git, no network.
// That is what lets any deployment demonstrate every refusal on its own platform
// in a second, which is the only way a bound is confirmed rather than asserted.

export const REFUSALS = Object.freeze({
  KILL_SWITCH: "kill-switch-present",
  NOT_AUTOMATABLE: "actor-is-a-human-seat",
  DIRTY_TREE: "working-tree-dirty",
  LEDGER_UNREADABLE: "rate-ledger-unreadable",
  RATE_LIMIT: "rate-limit-reached",
  THREAD_DEPTH: "thread-depth-cap-reached",
  NO_OPEN_TURN: "no-open-turn-for-actor",
  NOTHING_PUBLISHED: "agent-published-nothing",
  WRITE_BOUNDARY: "write-outside-allowed-prefixes",
});

const isCount = (n) => Number.isSafeInteger(n) && n >= 0;
const refuse = (refusal) => Object.freeze({ allowed: false, refusal });
const ALLOW = Object.freeze({ allowed: true, refusal: null });

// Order is load-bearing. The kill switch is first so that nothing else, including
// a malformed actor or an unreadable ledger, can mask it. The human-seat refusal
// is second because acting as a person is worse than acting at a bad moment.
export const BEFORE_GUARDS = Object.freeze([
  ["killSwitchPresent", REFUSALS.KILL_SWITCH, (v) => v === true],
  ["actorIsHuman", REFUSALS.NOT_AUTOMATABLE, (v) => v === true],
  ["workingTreeDirty", REFUSALS.DIRTY_TREE, (v) => v === true],
  ["runsInWindow", REFUSALS.LEDGER_UNREADABLE, (v) => !isCount(v)],
  ["maxRuns", REFUSALS.LEDGER_UNREADABLE, (v) => !isCount(v) || v === 0],
  ["rateLimitReached", REFUSALS.RATE_LIMIT, (v) => v === true],
  ["threadDepthAtCap", REFUSALS.THREAD_DEPTH, (v) => v === true],
  ["hasOpenTurn", REFUSALS.NO_OPEN_TURN, (v) => v === false],
]);

export const AFTER_GUARDS = Object.freeze([
  ["wroteOutsideAllowedPrefixes", REFUSALS.WRITE_BOUNDARY, (v) => v === true],
  ["publishedEvent", REFUSALS.NOTHING_PUBLISHED, (v) => v === false],
]);

function evaluate(guards, observed) {
  for (const [field, refusal, refuses] of guards) {
    if (refuses(observed?.[field])) return refuse(refusal);
  }
  return ALLOW;
}

/** May this turn be taken, given what was observed before invoking anything? */
export function decideBefore(observed) { return evaluate(BEFORE_GUARDS, observed); }

/** May what the agent produced be published, given what was observed after? */
export function decideAfter(observed) { return evaluate(AFTER_GUARDS, observed); }

export const HEALTHY_BEFORE = Object.freeze({
  killSwitchPresent: false, actorIsHuman: false, workingTreeDirty: false,
  runsInWindow: 0, maxRuns: 4, rateLimitReached: false,
  threadDepthAtCap: false, hasOpenTurn: true,
});
export const HEALTHY_AFTER = Object.freeze({
  wroteOutsideAllowedPrefixes: false, publishedEvent: true,
});

// Every refusal, with a minimal observation that triggers it. A deployment runs
// this to watch each bound fire on its own platform without a repository, a
// clock, or an agent.
export const DEMONSTRATIONS = Object.freeze([
  ["kill switch present", "before", { killSwitchPresent: true }, REFUSALS.KILL_SWITCH],
  ["actor is a human seat", "before", { actorIsHuman: true }, REFUSALS.NOT_AUTOMATABLE],
  ["working tree dirty", "before", { workingTreeDirty: true }, REFUSALS.DIRTY_TREE],
  ["rate ledger unreadable", "before", { runsInWindow: null }, REFUSALS.LEDGER_UNREADABLE],
  ["rate limit reached", "before", { rateLimitReached: true }, REFUSALS.RATE_LIMIT],
  ["thread depth at cap", "before", { threadDepthAtCap: true }, REFUSALS.THREAD_DEPTH],
  ["no open turn", "before", { hasOpenTurn: false }, REFUSALS.NO_OPEN_TURN],
  ["wrote outside prefixes", "after", { wroteOutsideAllowedPrefixes: true }, REFUSALS.WRITE_BOUNDARY],
  ["published nothing", "after", { publishedEvent: false }, REFUSALS.NOTHING_PUBLISHED],
]);

/** Run every demonstration. Returns { ok, results } and touches nothing. */
export function demonstrateBounds() {
  const results = [];
  const baseline = decideBefore(HEALTHY_BEFORE).allowed && decideAfter(HEALTHY_AFTER).allowed;
  for (const [name, phase, patch, expected] of DEMONSTRATIONS) {
    const observed = phase === "before"
      ? { ...HEALTHY_BEFORE, ...patch }
      : { ...HEALTHY_AFTER, ...patch };
    const got = phase === "before" ? decideBefore(observed) : decideAfter(observed);
    results.push({ name, expected, actual: got.refusal, ok: got.refusal === expected });
  }
  return { ok: baseline && results.every((r) => r.ok), baseline, results };
}
