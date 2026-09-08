// Guards for the guard set.
//
// The decision existed four times before it existed once, and within hours the
// copies disagreed in both directions: one lacked the thread-depth cap that
// stops two runners looping forever, the other lacked the human-seat refusal
// that stopped a model publishing a decision under its owner's name.
//
// So these tests are not only about today's nine bounds. They are about the
// shape of the failure: a refusal that exists but is never demonstrated, and an
// ordering that lets one condition mask another.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  REFUSALS, BEFORE_GUARDS, AFTER_GUARDS, DEMONSTRATIONS,
  decideBefore, decideAfter, demonstrateBounds,
  HEALTHY_BEFORE, HEALTHY_AFTER,
} from "../packages/git-adapter/src/turn-decision.mjs";

test("a healthy observation is allowed in both phases", () => {
  assert.equal(decideBefore(HEALTHY_BEFORE).allowed, true);
  assert.equal(decideAfter(HEALTHY_AFTER).allowed, true);
});

test("every declared refusal has a demonstration", () => {
  // Adding a guard without a way to watch it fire is how a bound becomes
  // asserted rather than confirmed. This fails the moment that happens.
  const demonstrated = new Set(DEMONSTRATIONS.map(([, , , refusal]) => refusal));
  const declared = Object.values(REFUSALS);
  const missing = declared.filter((r) => !demonstrated.has(r));
  assert.deepEqual(missing, [], `refusals with no demonstration: ${missing.join(", ")}`);
});

test("every demonstration names a refusal the decision can actually produce", () => {
  const declared = new Set(Object.values(REFUSALS));
  const stray = DEMONSTRATIONS.map(([, , , r]) => r).filter((r) => !declared.has(r));
  assert.deepEqual(stray, [], `demonstrations for unknown refusals: ${stray.join(", ")}`);
});

test("every guard field is reachable, so no guard is dead code", () => {
  const covered = new Set(DEMONSTRATIONS.map(([, , patch]) => Object.keys(patch)[0]));
  const fields = [...BEFORE_GUARDS, ...AFTER_GUARDS].map(([field]) => field);
  // maxRuns shares its refusal with runsInWindow; both route to LEDGER_UNREADABLE.
  const unreachable = fields.filter((f) => !covered.has(f) && f !== "maxRuns");
  assert.deepEqual(unreachable, [], `guards nothing demonstrates: ${unreachable.join(", ")}`);
});

test("the kill switch cannot be masked by any other condition", () => {
  // It was previously read after the actor record, so a missing record hid it.
  const everythingWrong = {
    killSwitchPresent: true, actorIsHuman: true, workingTreeDirty: true,
    runsInWindow: null, maxRuns: 0, rateLimitReached: true,
    threadDepthAtCap: true, hasOpenTurn: false,
  };
  assert.equal(decideBefore(everythingWrong).refusal, REFUSALS.KILL_SWITCH);
});

test("acting as a person outranks every condition except the stop", () => {
  const observed = {
    ...HEALTHY_BEFORE, actorIsHuman: true, workingTreeDirty: true,
    rateLimitReached: true, hasOpenTurn: false,
  };
  assert.equal(decideBefore(observed).refusal, REFUSALS.NOT_AUTOMATABLE);
});

test("an unreadable ledger refuses rather than counting as zero", () => {
  for (const bad of [null, undefined, -1, 1.5, "0", NaN]) {
    assert.equal(decideBefore({ ...HEALTHY_BEFORE, runsInWindow: bad }).refusal,
      REFUSALS.LEDGER_UNREADABLE, `runsInWindow=${String(bad)}`);
  }
  assert.equal(decideBefore({ ...HEALTHY_BEFORE, runsInWindow: 0 }).allowed, true);
});

test("demonstrateBounds reports every bound firing, and notices when one does not", () => {
  const run = demonstrateBounds();
  assert.equal(run.ok, true);
  assert.equal(run.results.length, DEMONSTRATIONS.length);
  assert.ok(run.results.every((r) => r.ok));
});
