import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { hashBody, hashThreadConfig, parseEvent, verifyLog } from "../packages/git-adapter/src/verify-log.mjs";

const repository = path.resolve(import.meta.dirname, "..");
const moduleSpecifier = process.env.AGENT_C_SUPERVISOR_MODULE ?? pathToFileURL(path.join(repository, "packages/agent-c-supervisor/src/index.mjs")).href;
const supervisor = await import(moduleSpecifier);
const selected = process.env.AGENT_C_TEST_CASE ?? "all";
const credential = "xai-synthetic-unit-credential-1234567890";
const fixedReview = {
  dispatch_feasibility: "conditional",
  unique_finding_produced: true,
  summary: "One explicit prerequisite remains.",
  findings: ["The dispatch requires a named prerequisite before execution."]
};
const fixedResultReview = {
  result_verdict: "conditional",
  unique_finding_produced: true,
  summary: "The delivered result still needs one named proof.",
  findings: ["The result evidence omits the required negative control."]
};
const fixedUsage = { input_tokens: 41, output_tokens: 17, total_tokens: 58, cost_in_usd_ticks: 158500 };

function check(name, operation) { test(name, { skip: selected !== "all" && selected !== name }, operation); }
function stubModel(review = fixedReview) { return { review: async () => ({ review, model: "grok-synthetic", usage: fixedUsage }) }; }

async function fixture({ next = "agent-c", targetType = "handoff", isolated = false, actor = "agent-a" } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "engramport-agent-c-"));
  for (const surface of ["actors", "events", "artifacts", "schemas", "threads", "engramport.yaml", "AGENTS.md"]) await cp(path.join(repository, surface), path.join(root, surface), { recursive: true });
  if (isolated) {
    await rm(path.join(root, "events"), { recursive: true, force: true });
    await rm(path.join(root, "threads"), { recursive: true, force: true });
    for (const actor of ["agent-a", "agent-b", "agent-c"]) await mkdir(path.join(root, "events", actor), { recursive: true });
    await mkdir(path.join(root, "threads"), { recursive: true });
  }
  await mkdir(path.join(root, "docs", "design"), { recursive: true });
  await cp(path.join(repository, "docs/design/agent-c-review-prompt.md"), path.join(root, "docs/design/agent-c-review-prompt.md"));
  await mkdir(path.join(root, "scripts"), { recursive: true });
  await cp(path.join(repository, "scripts/engram"), path.join(root, "scripts/engram"));
  await mkdir(path.join(root, "packages"), { recursive: true });
  await cp(path.join(repository, "packages/git-adapter"), path.join(root, "packages/git-adapter"), { recursive: true });
  const thread = `agent-c-synthetic-${targetType}-${next}`;
  const declaration = { schema_version: 0, thread, mode: "strict_relay", coordinator: null };
  await writeFile(path.join(root, "threads", `${thread}.yaml`), `schema_version: 0\nthread: ${thread}\nmode: strict_relay\ncoordinator: null\n`);
  async function writeEvent({ actor, id, occurredAt, type, reply = null, eventNext, body, rootEvent = false }) {
    const binding = rootEvent ? `\nthread_config_sha256: ${hashThreadConfig(declaration)}` : "";
    const source = `---\nschema_version: 0\nid: ${id}\nthread: ${thread}\nfrom: ${actor}\ntype: ${type}\noccurred_at: ${occurredAt}\nin_reply_to: ${reply ?? "null"}\nnext: ${eventNext ?? "null"}\ncontent_sha256: ${hashBody(body)}${binding}\n---\n${body}`;
    const relative = `events/${actor}/${occurredAt.replace(/[-:]/g, "")}_${id}.md`;
    await writeFile(path.join(root, relative), source);
    return relative;
  }
  let id;
  let relative;
  if (targetType === "reply") {
    const rootId = "01a03e50-0000-7000-8000-000000000101";
    const reviewId = "01a03e50-0000-7000-8000-000000000102";
    id = "01a03e50-0000-7000-8000-000000000103";
    await writeEvent({ actor: "agent-a", id: rootId, occurredAt: "2026-08-26T13:59:59Z", type: "handoff", eventNext: "agent-c", body: "Initial synthetic review request.\n", rootEvent: true });
    await writeEvent({ actor: "agent-c", id: reviewId, occurredAt: "2026-08-26T14:00:00Z", type: "reply", reply: rootId, eventNext: "agent-a", body: "Synthetic review finding.\n" });
    relative = await writeEvent({ actor: "agent-a", id, occurredAt: "2026-08-26T14:00:01Z", type: "reply", reply: reviewId, eventNext: next, body: "Review the corrected synthetic result.\n" });
  } else {
    id = next === "agent-c" ? "01a03e50-0000-7000-8000-000000000001" : "01a03e50-0000-7000-8000-000000000002";
    const occurredAt = next === "agent-c" ? "2026-08-26T14:00:01Z" : "2026-08-26T14:00:02Z";
    relative = await writeEvent({ actor, id, occurredAt, type: "handoff", eventNext: next, body: "Review whether this synthetic dispatch has all prerequisites.\n", rootEvent: true });
  }
  return { root, relative, id, thread };
}

async function runPoller(root) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(repository, "scripts/poll-agent-c-inbox")], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", reject);
    child.once("close", (code) => resolve({ code, stdout, stderr }));
  });
}

check("credential-reference", async () => {
  assert.equal(supervisor.requireResolvedCredential({ XAI_API_KEY: credential }), credential);
  assert.throws(() => supervisor.requireResolvedCredential({ XAI_API_KEY: "op://vault/item/field" }), (error) => error.code === "CREDENTIAL_UNRESOLVED" && !error.message.includes("op://"));
  assert.throws(() => supervisor.requireResolvedCredential({}), (error) => error.code === "CREDENTIAL_UNRESOLVED");
});

check("credential-shape", () => {
  assert.equal(supervisor.requireResolvedCredential({ XAI_API_KEY: credential }), credential);
  for (const malformed of [`XAI_API_KEY=${credential}`, `${credential} trailing`, `${credential}\n`]) {
    assert.throws(() => supervisor.requireResolvedCredential({ XAI_API_KEY: malformed }), (error) => error.code === "CREDENTIAL_MALFORMED" && !error.message.includes(credential));
  }
});

check("write-prefix", async () => {
  const { root } = await fixture();
  try {
    const store = new supervisor.AgentCOutputStore(root);
    const accepted = await store.writeArtifact("artifacts/agent-c/positive.json", { positive: true }, credential);
    assert.equal(accepted.relative, "artifacts/agent-c/positive.json");
    await assert.rejects(store.writeArtifact("production-code.mjs", "mutation", credential), (error) => error.code === "WRITE_PREFIX_REFUSED");
    await assert.rejects(store.writeArtifact("artifacts/agent-c/../../production-code.mjs", "mutation", credential), (error) => error.code === "WRITE_PREFIX_REFUSED");
  } finally { await rm(root, { recursive: true, force: true }); }
});

check("turn-enforcement", async () => {
  const positive = await fixture();
  const negative = await fixture({ next: "agent-b" });
  try {
    assert.equal((await supervisor.assertOpenAgentCTurn(positive.root, positive.relative)).event.meta.next, "agent-c");
    await assert.rejects(supervisor.assertOpenAgentCTurn(negative.root, negative.relative), (error) => error.code === "TURN_REFUSED");
  } finally {
    await rm(positive.root, { recursive: true, force: true });
    await rm(negative.root, { recursive: true, force: true });
  }
});

check("reply-target", async () => {
  const { root, relative } = await fixture({ targetType: "reply", isolated: true });
  try {
    const turn = await supervisor.assertOpenAgentCTurn(root, relative);
    assert.equal(turn.event.meta.type, "reply");
    assert.equal(turn.event.meta.next, "agent-c");
    assert.equal(turn.relayCount, 2);
  } finally { await rm(root, { recursive: true, force: true }); }
});

check("result-review", async () => {
  const { root, relative } = await fixture({ targetType: "reply", isolated: true });
  try {
    let requestBody;
    const resultPayload = { model: "grok-synthetic", choices: [{ message: { content: JSON.stringify(fixedResultReview) } }], usage: { prompt_tokens: 41, completion_tokens: 17, total_tokens: 58, cost_in_usd_ticks: 158500 } };
    const client = new supervisor.XaiResponsesClient({ credential, model: "grok-synthetic", fetchImpl: async (_url, init) => { requestBody = JSON.parse(init.body); return new Response(JSON.stringify(resultPayload)); } });
    assert.deepEqual((await client.review("Review delivered synthetic work.", "result")).review, fixedResultReview);
    const resultSchema = requestBody.response_format.json_schema.schema;
    assert.ok(resultSchema.required.includes("result_verdict"));
    assert.equal(Object.hasOwn(resultSchema.properties, "dispatch_feasibility"), false);

    const appended = [];
    const result = await supervisor.runAgentCReview({
      root,
      targetRelative: relative,
      reviewMode: "result",
      env: { XAI_API_KEY: credential },
      modelClient: stubModel(fixedResultReview),
      appendEvent: async (_root, input) => appended.push({ ...input, bodyText: await readFile(path.join(root, input.body), "utf8") })
    });
    assert.equal(appended.length, 1);
    assert.equal(result.measurement.review_mode, "result");
    assert.equal(result.measurement.result_verdict, "conditional");
    assert.equal(Object.hasOwn(result.measurement, "dispatch_feasibility"), false);
    assert.match(appended[0].bodyText, /^# Agent-c result review\n/);

    const unknownKeyReview = { ...fixedResultReview, dispatch_feasibility: "feasible" };
    await assert.rejects(
      supervisor.runAgentCReview({ root, targetRelative: relative, reviewMode: "result", env: { XAI_API_KEY: credential }, modelClient: stubModel(unknownKeyReview), appendEvent: async () => assert.fail("invalid result review must not append") }),
      (error) => error.code === "MODEL_OUTPUT_INVALID"
    );
  } finally { await rm(root, { recursive: true, force: true }); }
});

check("inbox-poller", async () => {
  const positive = await fixture({ targetType: "reply", isolated: true });
  const negative = await fixture({ actor: "agent-b", isolated: true });
  try {
    const actionable = await runPoller(positive.root);
    assert.equal(actionable.code, 0);
    assert.equal(actionable.stderr, "");
    assert.equal(actionable.stdout, `${positive.relative}\n`);

    const silent = await runPoller(negative.root);
    assert.equal(silent.code, 0);
    assert.equal(silent.stderr, "");
    assert.equal(silent.stdout, "", "poller must stay silent when agent-c has no actionable turn");
    assert.deepEqual(
      await supervisor.pollAgentCInbox({ root: negative.root }),
      [],
      "injected supervisor must preserve the same non-actionable-turn silence boundary"
    );
  } finally {
    await rm(positive.root, { recursive: true, force: true });
    await rm(negative.root, { recursive: true, force: true });
  }
});

check("credential-egress", async () => {
  const positive = await fixture();
  const negative = await fixture();
  try {
    const artifactDirectory = path.join(negative.root, "artifacts", "agent-c");
    const eventDirectory = path.join(negative.root, "events", "agent-c");
    const artifactBaseline = (await readdir(artifactDirectory, { recursive: true })).sort();
    const eventBaseline = (await readdir(eventDirectory, { recursive: true })).sort();
    const appended = [];
    await supervisor.runAgentCReview({ root: positive.root, targetRelative: positive.relative, env: { XAI_API_KEY: credential }, modelClient: stubModel(), appendEvent: async (_root, input) => appended.push(input) });
    assert.equal(appended.length, 1);
    const leaking = { ...fixedReview, summary: `Model echoed ${credential}` };
    let failure;
    try { await supervisor.runAgentCReview({ root: negative.root, targetRelative: negative.relative, env: { XAI_API_KEY: credential }, modelClient: stubModel(leaking), appendEvent: async () => assert.fail("append must not run") }); }
    catch (error) { failure = error; }
    assert.equal(failure?.code, "CREDENTIAL_OUTPUT_REFUSED");
    assert.equal(JSON.stringify(failure).includes(credential), false);
    assert.deepEqual((await readdir(artifactDirectory, { recursive: true })).sort(), artifactBaseline);
    assert.deepEqual((await readdir(eventDirectory, { recursive: true })).sort(), eventBaseline);
  } finally {
    await rm(positive.root, { recursive: true, force: true });
    await rm(negative.root, { recursive: true, force: true });
  }
});

check("stubbed-review-appends-through-cli", async () => {
  const { root, relative, id } = await fixture();
  try {
    const eventDirectory = path.join(root, "events", "agent-c");
    const before = (await readdir(eventDirectory)).filter((name) => name.endsWith(".md"));
    const moments = [new Date("2026-08-26T14:01:00Z"), new Date("2026-08-26T14:01:02Z")];
    const result = await supervisor.runAgentCReview({ root, targetRelative: relative, env: { XAI_API_KEY: credential, XAI_MODEL: "grok-synthetic" }, modelClient: stubModel(), clock: () => moments.shift() });
    assert.equal((await verifyLog(root)).ok, true);
    const names = (await readdir(eventDirectory)).filter((name) => name.endsWith(".md"));
    assert.equal(names.length, before.length + 1);
    const appendedName = names.find((name) => !before.includes(name));
    const event = parseEvent(await readFile(path.join(eventDirectory, appendedName), "utf8"));
    assert.equal(event.meta.in_reply_to, id);
    assert.equal(event.meta.next, "agent-a");
    assert.deepEqual(result.measurement.token_use, { input_tokens: 41, output_tokens: 17, total_tokens: 58 });
    assert.deepEqual(result.measurement.provider_cost, { currency: "USD", cost_in_usd_ticks: 158500, cost_usd: 0.00001585 });
    assert.equal(result.measurement.finding_disposition, "pending");
    assert.equal(result.measurement.relay_count, 1);
  } finally { await rm(root, { recursive: true, force: true }); }
});

check("xai-client-metrics", async () => {
  let authorization;
  const payload = { model: "grok-synthetic", choices: [{ message: { content: JSON.stringify(fixedReview) } }], usage: { prompt_tokens: 41, completion_tokens: 17, total_tokens: 58, cost_in_usd_ticks: 158500 } };
  const client = new supervisor.XaiResponsesClient({ credential, model: "grok-synthetic", fetchImpl: async (_url, init) => { authorization = init.headers.Authorization; return new Response(JSON.stringify(payload)); } });
  const result = await client.review("Synthetic repository context without credentials.");
  assert.equal(authorization, `Bearer ${credential}`);
  assert.deepEqual(result.usage, fixedUsage);
  assert.deepEqual(result.review, fixedReview);
});

check("provider-diagnosis", async () => {
  const client = new supervisor.XaiResponsesClient({
    credential,
    fetchImpl: async () => new Response(JSON.stringify({ error: { message: "Incorrect API key provided." } }), { status: 401 })
  });
  await assert.rejects(client.review("Synthetic repository context without credentials."), (error) => {
    assert.equal(error.code, "MODEL_CALL_FAILED");
    assert.equal(error.providerStatus, 401);
    assert.equal(error.providerError, "Incorrect API key provided.");
    assert.match(error.message, /Incorrect API key provided\./);
    return true;
  });
});

check("provider-error-egress", async () => {
  const client = new supervisor.XaiResponsesClient({
    credential,
    fetchImpl: async () => new Response(JSON.stringify({ error: { message: `Provider echoed ${credential}` } }), { status: 401 })
  });
  await assert.rejects(client.review("Synthetic repository context without credentials."), (error) => {
    assert.equal(error.code, "CREDENTIAL_OUTPUT_REFUSED");
    assert.equal(error.message.includes(credential), false);
    assert.equal(JSON.stringify(error).includes(credential), false);
    return true;
  });
});
