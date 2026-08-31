import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const moduleSpecifier = process.env.CONTRIBUTION_LEDGER_MODULE ?? new URL("../packages/git-adapter/src/contribution-ledger.mjs", import.meta.url).href;
const { buildContributionLedger, renderContributionLedger } = await import(moduleSpecifier);
const billingModes = { "agent-a": "subscription", "agent-b": "subscription", "agent-c": "metered" };

async function independentAgentCTotals() {
  const directory = path.join(root, "artifacts/agent-c/reviews");
  const files = (await readdir(directory)).filter((name) => name.endsWith(".json")).sort();
  let totalTokens = 0;
  let costTicks = 0;
  for (const name of files) {
    const review = JSON.parse(await readFile(path.join(directory, name), "utf8"));
    totalTokens += review.token_use.total_tokens;
    costTicks += review.provider_cost.cost_in_usd_ticks;
  }
  return { reviews: files.length, totalTokens, costTicks };
}

test("contribution ledger reports every registered actor from the verified log", async () => {
  const ledger = await buildContributionLedger({ root, billingModes });
  assert.deepEqual(ledger.actors.map(({ actor }) => actor), ["agent-a", "agent-b", "agent-c"]);
  assert.equal(ledger.actors.reduce((sum, actor) => sum + actor.work.events_authored, 0), ledger.event_count);
  for (const actor of ledger.actors) assert.ok(actor.work.events_authored > 0, `${actor.actor} must have observed work`);
  assert.ok(ledger.actors.find(({ actor }) => actor === "agent-a").work.handoffs_accepted > 0);
  assert.ok(ledger.actors.find(({ actor }) => actor === "agent-b").work.completions > 0);
  console.log(`CONTRIBUTION_LEDGER actors=${ledger.actors.length} events=${ledger.event_count} source=${ledger.source}`);
});

test("agent-c metered totals reconcile with every referenced review artifact", async () => {
  const ledger = await buildContributionLedger({ root, billingModes });
  const expected = await independentAgentCTotals();
  const agentC = ledger.actors.find(({ actor }) => actor === "agent-c");
  assert.deepEqual(
    { reviews: agentC.metered.reviews, totalTokens: agentC.metered.total_tokens, costTicks: agentC.metered.cost_in_usd_ticks },
    expected,
  );
  assert.ok(expected.reviews >= 17, "the 17-review handoff baseline must remain represented");
  assert.ok(expected.totalTokens >= 308_833, "the handoff token baseline must remain represented");
  assert.ok(expected.costTicks >= 12_552_660_000, "the handoff cost baseline must remain represented");
  assert.equal(Number(agentC.metered.cost_usd), expected.costTicks / 10_000_000_000);
  console.log(`CONTRIBUTION_METERED actor=agent-c reviews=${expected.reviews} tokens=${expected.totalTokens} usd_ticks=${expected.costTicks}`);
});

test("subscription contribution renders work without a fictional currency figure", async () => {
  const ledger = await buildContributionLedger({ root, billingModes });
  const rendered = renderContributionLedger(ledger);
  const agentALine = rendered.split("\n").find((line) => line.startsWith("| agent-a |"));
  assert.match(agentALine, /subscription capacity; currency unavailable/);
  assert.doesNotMatch(agentALine, /\$/);

  const poisoned = structuredClone(ledger);
  poisoned.actors.find(({ actor }) => actor === "agent-a").metered = {
    reviews: 1, total_tokens: 1, currency: "USD", cost_in_usd_ticks: 10_000_000, cost_usd: "0.001",
  };
  assert.throws(() => renderContributionLedger(poisoned), /SUBSCRIPTION_CURRENCY_REFUSED: agent-a has no per-action currency evidence/);
  console.log("CONTRIBUTION_SUBSCRIPTION actor=agent-a work=observed currency=refused");
});
