import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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
function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
const boundTargetRelative = "events/agent-a/20260902T115704Z_01a061fa-d7f1-7b9b-824d-185c792cd3e6.md";
const boundEventRelative = "events/agent-a/20260830T221713Z_01a054bf-8947-7931-9b3e-8beff07f01cf.md";

async function boundContextFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "engramport-bound-context-"));
  for (const surface of ["actors", "events", "artifacts", "engramport.yaml", "AGENTS.md"]) await cp(path.join(repository, surface), path.join(root, surface), { recursive: true });
  await mkdir(path.join(root, "docs", "design"), { recursive: true });
  await cp(path.join(repository, "docs/design/agent-c-review-prompt.md"), path.join(root, "docs/design/agent-c-review-prompt.md"));
  const event = parseEvent(await readFile(path.join(root, boundTargetRelative), "utf8"), boundTargetRelative);
  return { root, event };
}

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

check("credential-context", async () => {
  const { root, relative } = await fixture();
  const portWatch = "packages/port-watch/src/index.mjs";
  const genuine = "packages/credential-fixture.txt";
  const secret = "synthetic-review-secret-1234567890";
  try {
    await mkdir(path.join(root, "packages", "port-watch", "src"), { recursive: true });
    await cp(path.join(repository, portWatch), path.join(root, portWatch));
    await writeFile(path.join(root, genuine), `token=${secret}\n`);
    const turn = await supervisor.assertOpenAgentCTurn(root, relative);
    assert.match(await supervisor.buildReviewPrompt(root, turn, [portWatch]), /<repository-file path="packages\/port-watch\/src\/index\.mjs">/);
    await assert.rejects(supervisor.buildReviewPrompt(root, turn, [genuine]), (error) => {
      assert.equal(error.code, "CREDENTIAL_CONTEXT_REFUSED");
      assert.match(error.message, /file=packages\/credential-fixture\.txt/);
      assert.match(error.message, /pattern=credential-assignment/);
      assert.equal(error.message.includes(secret), false);
      return true;
    });
  } finally { await rm(root, { recursive: true, force: true }); }
});

check("bounded-context-delivery", async () => {
  const { root, event } = await boundContextFixture();
  try {
    const delivered = await supervisor.buildReviewPrompt(root, { event });
    assert.match(delivered, /Pre-flight: the verified builder subject/);
    const oldAssembly = await supervisor.buildReviewPrompt(root, { event: { ...event, meta: { ...event.meta, bounded_context: [] } } });
    assert.doesNotMatch(oldAssembly, /Pre-flight: the verified builder subject/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

check("bounded-context-missing-event", async () => {
  const { root, event } = await boundContextFixture();
  try {
    const missing = { ...event, meta: { ...event.meta, bounded_context: [{ type: "event", event_id: "01a00000-0000-7000-8000-000000000000" }] } };
    await assert.rejects(supervisor.buildReviewPrompt(root, { event: missing }), (error) => error.code === "CONTEXT_EVENT_NOT_FOUND");
  } finally { await rm(root, { recursive: true, force: true }); }
});

check("bounded-context-event-digest", async () => {
  const { root, event } = await boundContextFixture();
  try {
    await writeFile(path.join(root, boundEventRelative), `${await readFile(path.join(root, boundEventRelative), "utf8")}altered\n`);
    await assert.rejects(supervisor.buildReviewPrompt(root, { event }), (error) => error.code === "CONTEXT_DIGEST_MISMATCH");
  } finally { await rm(root, { recursive: true, force: true }); }
});

check("bounded-context-artifact-digest", async () => {
  const { root, event } = await boundContextFixture();
  const relative = "artifacts/agent-a/bounded-context-synthetic.txt";
  try {
    const original = "bounded artifact evidence\n";
    await writeFile(path.join(root, relative), original);
    const ref = `${relative}#sha256=${sha256(original)}`;
    assert.match(await supervisor.buildReviewPrompt(root, { event: { ...event, meta: { ...event.meta, bounded_context: [{ type: "artifact", ref }] } } }), /bounded artifact evidence/);
    await writeFile(path.join(root, relative), "stale artifact evidence\n");
    await assert.rejects(supervisor.buildReviewPrompt(root, { event: { ...event, meta: { ...event.meta, bounded_context: [{ type: "artifact", ref }] } } }), (error) => error.code === "CONTEXT_DIGEST_MISMATCH");
  } finally { await rm(root, { recursive: true, force: true }); }
});

check("legacy-artifact-digest", async () => {
  const { root, event } = await boundContextFixture();
  const relative = "artifacts/agent-a/legacy-context-synthetic.txt";
  try {
    await writeFile(path.join(root, relative), "changed legacy evidence\n");
    const stale = `${relative}#sha256=${sha256("original legacy evidence\n")}`;
    await assert.rejects(supervisor.buildReviewPrompt(root, { event: { ...event, meta: { ...event.meta, artifacts: [stale] } } }), (error) => error.code === "CONTEXT_DIGEST_MISMATCH");
  } finally { await rm(root, { recursive: true, force: true }); }
});

check("bounded-context-size", async () => {
  const { root, event } = await boundContextFixture();
  const relative = "artifacts/agent-a/oversized-context.txt";
  try {
    const oversized = "x".repeat(1_000_001);
    await writeFile(path.join(root, relative), oversized);
    const ref = `${relative}#sha256=${sha256(oversized)}`;
    await assert.rejects(supervisor.buildReviewPrompt(root, { event: { ...event, meta: { ...event.meta, bounded_context: [{ type: "artifact", ref }] } } }), (error) => error.code === "CONTEXT_TOO_LARGE");
  } finally { await rm(root, { recursive: true, force: true }); }
});

check("bounded-context-deduplication", async () => {
  const { root, event } = await boundContextFixture();
  try {
    const prompt = await supervisor.buildReviewPrompt(root, { event }, [boundEventRelative]);
    assert.equal(prompt.split(`<repository-file path=${JSON.stringify(boundEventRelative)}>`).length - 1, 1);
  } finally { await rm(root, { recursive: true, force: true }); }
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

check("scheduled-poller-silence", async () => {
  const effects = { logs: [], notifications: [], writes: [] };
  let seen = "";
  const dependencies = {
    readSeen: async () => seen,
    writeSeen: async (value) => { seen = value; effects.writes.push(value); },
    log: async (value) => effects.logs.push(value),
    notify: async (value) => effects.notifications.push(value)
  };
  const idle = await supervisor.processScheduledAgentCPoll({ ...dependencies, poll: async () => [] });
  assert.deepEqual(idle, { status: "idle", actionable: [] });
  assert.deepEqual(effects, { logs: [], notifications: [], writes: [] }, "no actionable turn must produce no scheduled-poller output");

  const relative = "events/agent-a/20260827T000000Z_synthetic.md";
  const pending = await supervisor.processScheduledAgentCPoll({ ...dependencies, poll: async () => [relative] });
  assert.equal(pending.status, "pending");
  assert.deepEqual(effects.logs, ["PENDING 1 actionable agent-c turn(s)"]);
  assert.deepEqual(effects.notifications, ["1 Agent C review turn pending."]);
  assert.equal(effects.writes.length, 1);

  const unchanged = await supervisor.processScheduledAgentCPoll({ ...dependencies, poll: async () => [relative] });
  assert.equal(unchanged.status, "unchanged");
  assert.equal(effects.logs.length, 1, "an unchanged actionable set must not notify repeatedly");
  assert.equal(effects.notifications.length, 1);
});

check("credential-unavailable-reporting", async () => {
  const effects = { logs: [], notifications: [], invoked: 0 };
  const unavailable = await supervisor.runAgentCWithServiceAccount({
    readToken: async () => { throw new Error("synthetic keychain locked"); },
    invoke: async () => { effects.invoked += 1; return 0; },
    log: async (value) => effects.logs.push(value),
    notify: async (value) => effects.notifications.push(value)
  });
  assert.deepEqual(unavailable, { status: "failed", code: "CREDENTIAL_UNAVAILABLE" });
  assert.deepEqual(effects.logs, ["ERROR CREDENTIAL_UNAVAILABLE"]);
  assert.deepEqual(effects.notifications, ["Agent C credential unavailable; review was not started."]);
  assert.equal(effects.invoked, 0, "a missing credential must not reach the model runner");

  let received;
  const available = await supervisor.runAgentCWithServiceAccount({
    readToken: async () => "ops_synthetic_service_account_token",
    invoke: async (value) => { received = value; return 0; },
    log: async (value) => effects.logs.push(value),
    notify: async (value) => effects.notifications.push(value)
  });
  assert.deepEqual(available, { status: "completed" });
  assert.equal(received, "ops_synthetic_service_account_token");
  assert.equal(effects.logs.at(-1), "REVIEW_COMPLETED");
});
