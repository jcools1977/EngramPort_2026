import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { discoverEventFiles, parseEvent, readActors, verifyLog } from "./verify-log.mjs";

const USD_TICKS_PER_DOLLAR = 10_000_000_000;

function usdFromTicks(ticks) {
  const whole = Math.floor(ticks / USD_TICKS_PER_DOLLAR);
  const fractional = String(ticks % USD_TICKS_PER_DOLLAR).padStart(10, "0").replace(/0+$/, "");
  return fractional ? `${whole}.${fractional}` : String(whole);
}

function emptyActor(actor, billingMode) {
  return {
    actor: actor.slug,
    provider: actor.provider ?? null,
    billing_mode: billingMode,
    work: {
      events_authored: 0,
      handoffs_accepted: 0,
      completions: 0,
      criteria_satisfied: 0,
      criteria_total: 0,
    },
    metered: null,
  };
}

function referencedReviewArtifacts(entries, actor) {
  const prefix = `${actor.artifactPrefix}/reviews/`;
  return [...new Set(entries
    .filter(({ event }) => event.meta.from === actor.slug)
    .flatMap(({ event }) => event.meta.artifacts ?? [])
    .map((reference) => reference.split("#", 1)[0])
    .filter((relative) => relative.startsWith(prefix) && relative.endsWith(".json")))].sort();
}

async function readMeteredEvidence(root, entries, actor, provider) {
  const reviews = referencedReviewArtifacts(entries, actor);
  if (!reviews.length) return { reviews: 0, total_tokens: 0, currency: "USD", cost_in_usd_ticks: 0, cost_usd: "0" };
  let totalTokens = 0;
  let costTicks = 0;
  for (const relative of reviews) {
    const review = JSON.parse(await readFile(path.join(root, relative), "utf8"));
    assert.equal(review.target_event_id, path.basename(relative, ".json"), `${relative}: target event must match artifact filename`);
    assert.equal(review.provider, provider, `${relative}: provider must match actor registry`);
    assert.equal(review.provider_cost?.currency, "USD", `${relative}: only explicit USD metering is supported`);
    assert.ok(Number.isSafeInteger(review.token_use?.total_tokens) && review.token_use.total_tokens >= 0, `${relative}: total tokens must be a non-negative integer`);
    assert.ok(Number.isSafeInteger(review.provider_cost?.cost_in_usd_ticks) && review.provider_cost.cost_in_usd_ticks >= 0, `${relative}: USD ticks must be a non-negative integer`);
    totalTokens += review.token_use.total_tokens;
    costTicks += review.provider_cost.cost_in_usd_ticks;
  }
  assert.ok(Number.isSafeInteger(totalTokens) && Number.isSafeInteger(costTicks), "metered totals must remain exact safe integers");
  return { reviews: reviews.length, total_tokens: totalTokens, currency: "USD", cost_in_usd_ticks: costTicks, cost_usd: usdFromTicks(costTicks) };
}

export async function buildContributionLedger({ root = process.cwd(), billingModes = {} } = {}) {
  await verifyLog(root, { throwOnError: true });
  const actors = await readActors(root);
  const files = await discoverEventFiles(path.join(root, "events"));
  const entries = await Promise.all(files.sort().map(async (file) => ({
    file,
    event: parseEvent(await readFile(file, "utf8"), path.relative(root, file)),
  })));
  const actorProviders = new Map();
  for (const actor of actors.values()) {
    const source = await readFile(path.join(root, "actors", `${actor.slug}.yaml`), "utf8");
    const provider = source.match(/^provider:\s*([^\s]+)\s*$/m)?.[1] ?? null;
    actorProviders.set(actor.slug, provider);
  }
  const byActor = new Map([...actors.values()].sort((left, right) => left.slug.localeCompare(right.slug)).map((actor) => [
    actor.slug,
    emptyActor({ ...actor, provider: actorProviders.get(actor.slug) }, billingModes[actor.slug] ?? "unmetered"),
  ]));

  for (const { event } of entries) {
    const contribution = byActor.get(event.meta.from);
    assert.ok(contribution, `event ${event.meta.id} names an unregistered actor`);
    contribution.work.events_authored += 1;
    if (event.meta.type === "completion") {
      contribution.work.completions += 1;
      const results = event.meta.criteria_results ?? [];
      contribution.work.criteria_total += results.length;
      contribution.work.criteria_satisfied += results.filter(({ status }) => status === "satisfied").length;
    }
  }

  const answered = new Set(entries
    .filter(({ event }) => event.meta.in_reply_to)
    .map(({ event }) => `${event.meta.from}\0${event.meta.in_reply_to}`));
  for (const { event } of entries.filter(({ event }) => event.meta.type === "handoff" && event.meta.next)) {
    if (answered.has(`${event.meta.next}\0${event.meta.id}`)) byActor.get(event.meta.next).work.handoffs_accepted += 1;
  }

  for (const actor of actors.values()) {
    const contribution = byActor.get(actor.slug);
    if (contribution.billing_mode === "metered") contribution.metered = await readMeteredEvidence(root, entries, actor, actorProviders.get(actor.slug));
  }

  return {
    schema_version: 1,
    source: "verified-engramport-log",
    event_count: entries.length,
    actors: [...byActor.values()],
  };
}

function criteriaCell(work) {
  return work.criteria_total ? `${work.criteria_satisfied}/${work.criteria_total}` : "none declared";
}

export function renderContributionLedger(ledger) {
  for (const actor of ledger.actors) {
    if (actor.billing_mode === "subscription" && actor.metered !== null) { /* CONTRIBUTION_SUBSCRIPTION_CURRENCY_REFUSAL */
      throw new Error(`SUBSCRIPTION_CURRENCY_REFUSED: ${actor.actor} has no per-action currency evidence`);
    }
  }
  const lines = [
    "# EngramPort contribution ledger",
    "",
    `Derived from ${ledger.event_count} verified events. Work and money are separate measures; no common unit is inferred.`,
    "",
    "| Actor | Events | Handoffs accepted | Completions | Criteria coverage | Capacity evidence |",
    "| --- | ---: | ---: | ---: | ---: | --- |",
  ];
  for (const actor of ledger.actors) {
    const capacity = actor.metered
      ? `${actor.metered.total_tokens.toLocaleString("en-US")} tokens; $${actor.metered.cost_usd} ${actor.metered.currency} (${actor.metered.reviews} reviews)`
      : actor.billing_mode === "subscription"
        ? "subscription capacity; currency unavailable"
        : "work observed; currency unavailable";
    lines.push(`| ${actor.actor} | ${actor.work.events_authored} | ${actor.work.handoffs_accepted} | ${actor.work.completions} | ${criteriaCell(actor.work)} | ${capacity} |`);
  }
  return `${lines.join("\n")}\n`;
}

export const contributionLedgerInternals = Object.freeze({ USD_TICKS_PER_DOLLAR, usdFromTicks });
