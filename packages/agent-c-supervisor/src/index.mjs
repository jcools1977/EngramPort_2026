import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { mkdir, open, readFile, readdir, realpath, rm } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { detectCredential } from "../../git-adapter/src/credential-boundary.mjs";
import { parseEvent, parseRecord, verifyLog } from "../../git-adapter/src/verify-log.mjs";

const AGENT_C = "agent-c";
const REVIEWER = "agent-a";
const ARTIFACT_PREFIX = "artifacts/agent-c";
const EVENT_PREFIX = "events/agent-c";
const TICKS_PER_USD = 10_000_000_000;
const MAX_CONTEXT_BYTES = 1_000_000;
const MAX_OUTPUT_BYTES = 128_000;

export class AgentCSupervisorError extends Error {
  constructor(code, { providerStatus, providerError } = {}) {
    const diagnosis = providerError ? `: ${providerError}` : "";
    super(`${code}: refused${diagnosis}`);
    this.name = "AgentCSupervisorError";
    this.code = code;
    if (providerStatus !== undefined) this.providerStatus = providerStatus;
    if (providerError !== undefined) this.providerError = providerError;
  }
}

function refuse(code, details) { throw new AgentCSupervisorError(code, details); }
function slash(value) { return value.replaceAll(path.sep, "/"); }

function scrubReferences(value) {
  return value
    .replace(/(?:api[_-]?key|client[_-]?secret|password|token)\s*[:=]\s*op:\/\/[^\s"']+/gi, "CREDENTIAL_REFERENCE")
    .replace(/op:\/\/[^\s"']+/g, "OP_REFERENCE");
}

function assertNoCredential(value, credential, code = "CREDENTIAL_OUTPUT_REFUSED") {
  const serialized = typeof value === "string" ? value : JSON.stringify(value);
  if (credential && serialized.includes(credential)) refuse(code);
  if (detectCredential(scrubReferences(serialized)).hit) refuse(code);
}

export function requireResolvedCredential(env = process.env) {
  const credential = env.XAI_API_KEY;
  if (typeof credential !== "string" || !credential || credential.startsWith("op://")) refuse("CREDENTIAL_UNRESOLVED");
  if (/\s/.test(credential) || /^[A-Za-z_][A-Za-z0-9_]*=/.test(credential)) refuse("CREDENTIAL_MALFORMED");
  return credential;
}

function resolveBounded(root, relative, prefix) {
  if (typeof relative !== "string" || path.isAbsolute(relative) || relative.includes("\0")) refuse("WRITE_PREFIX_REFUSED");
  const absolute = path.resolve(root, relative);
  const boundary = path.resolve(root, prefix);
  if (absolute !== boundary && !absolute.startsWith(`${boundary}${path.sep}`)) refuse("WRITE_PREFIX_REFUSED");
  return { absolute, boundary, relative: slash(path.relative(root, absolute)) };
}

export function assertAgentCWritePath(relative) {
  if (!(relative === ARTIFACT_PREFIX || relative.startsWith(`${ARTIFACT_PREFIX}/`) || relative === EVENT_PREFIX || relative.startsWith(`${EVENT_PREFIX}/`))) refuse("WRITE_PREFIX_REFUSED");
  return relative;
}

async function safeParent(root, absolute, boundary) {
  await mkdir(boundary, { recursive: true });
  await mkdir(path.dirname(absolute), { recursive: true });
  const [rootReal, boundaryReal, parentReal] = await Promise.all([realpath(root), realpath(boundary), realpath(path.dirname(absolute))]);
  if (!boundaryReal.startsWith(`${rootReal}${path.sep}`) || (parentReal !== boundaryReal && !parentReal.startsWith(`${boundaryReal}${path.sep}`))) refuse("WRITE_PREFIX_REFUSED");
}

export class AgentCOutputStore {
  constructor(root) { this.root = path.resolve(root); }

  async writeArtifact(relative, value, credential = null) {
    assertAgentCWritePath(relative);
    const target = resolveBounded(this.root, relative, ARTIFACT_PREFIX);
    assertNoCredential(value, credential);
    await safeParent(this.root, target.absolute, target.boundary);
    const handle = await open(target.absolute, fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_NOFOLLOW, 0o600)
      .catch((error) => { if (error.code === "EEXIST" || error.code === "ELOOP") refuse("WRITE_REFUSED"); throw error; });
    const bytes = typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`;
    try { await handle.writeFile(bytes, "utf8"); }
    finally { await handle.close(); }
    return { relative: target.relative, sha256: createHash("sha256").update(bytes).digest("hex") };
  }

  async removeArtifact(relative) {
    assertAgentCWritePath(relative);
    const target = resolveBounded(this.root, relative, ARTIFACT_PREFIX);
    await rm(target.absolute, { force: true });
  }
}

async function actorEventFiles(root) {
  const actors = await readdir(path.join(root, "actors"));
  const files = [];
  for (const actorFile of actors.filter((name) => name.endsWith(".yaml"))) {
    const record = parseRecord(await readFile(path.join(root, "actors", actorFile), "utf8"), actorFile);
    for (const name of await readdir(path.join(root, record.event_directory))) if (name.endsWith(".md")) files.push(path.join(root, record.event_directory, name));
  }
  return files;
}

async function effectiveMode(root, thread) {
  try { return parseRecord(await readFile(path.join(root, "threads", `${thread}.yaml`), "utf8"), `${thread}.yaml`).mode; }
  catch (error) {
    if (error.code !== "ENOENT") throw error;
    const project = parseRecord(await readFile(path.join(root, "engramport.yaml"), "utf8"), "engramport.yaml");
    return project.default_thread_mode ?? project.mode;
  }
}

export async function assertOpenAgentCTurn(root, targetRelative) {
  const verification = await verifyLog(root);
  if (!verification.ok) refuse("LOG_INVALID");
  const targetPath = path.resolve(root, targetRelative);
  const eventRoot = path.resolve(root, "events");
  if (!targetPath.startsWith(`${eventRoot}${path.sep}`)) refuse("TARGET_REFUSED");
  let event;
  try { event = parseEvent(await readFile(targetPath, "utf8"), targetRelative); }
  catch { refuse("TARGET_REFUSED"); }
  if (event.meta.next !== AGENT_C) refuse("TURN_REFUSED");
  if (event.meta.from !== REVIEWER || !["handoff", "reply"].includes(event.meta.type)) refuse("TARGET_REFUSED"); /* AGENT_C_REVIEW_TARGET_TYPES */
  if (await effectiveMode(root, event.meta.thread) !== "strict_relay") refuse("MODE_REFUSED");
  const parsed = [];
  for (const file of await actorEventFiles(root)) parsed.push(parseEvent(await readFile(file, "utf8"), path.relative(root, file)));
  if (parsed.some((candidate) => candidate.meta.in_reply_to === event.meta.id)) refuse("TURN_REFUSED");
  const byId = new Map(parsed.map((candidate) => [candidate.meta.id, candidate]));
  let relayCount = 0;
  let cursor = event;
  while (cursor.meta.in_reply_to) { relayCount += 1; cursor = byId.get(cursor.meta.in_reply_to); if (!cursor) refuse("LOG_INVALID"); }
  return { event, relayCount };
}

async function readBoundedContextFile(root, relative) {
  if (path.isAbsolute(relative) || relative.includes("\0")) refuse("CONTEXT_PATH_REFUSED");
  if (slash(relative).split("/").some((segment) => segment.startsWith("."))) refuse("CONTEXT_PATH_REFUSED");
  const absolute = path.resolve(root, relative);
  const rootReal = await realpath(root);
  const fileReal = await realpath(absolute).catch(() => refuse("CONTEXT_PATH_REFUSED"));
  if (!fileReal.startsWith(`${rootReal}${path.sep}`) || fileReal.includes(`${path.sep}.git${path.sep}`)) refuse("CONTEXT_PATH_REFUSED");
  const content = await readFile(fileReal, "utf8");
  if (Buffer.byteLength(content) > MAX_CONTEXT_BYTES) refuse("CONTEXT_TOO_LARGE");
  return { relative: slash(path.relative(root, fileReal)), content };
}

export async function buildReviewPrompt(root, turn, contextPaths = [], reviewMode = "dispatch") {
  if (!Object.hasOwn(REVIEW_CONTRACTS, reviewMode)) refuse("REVIEW_MODE_REFUSED");
  const prompt = await readBoundedContextFile(root, "docs/design/agent-c-review-prompt.md");
  const fixed = ["AGENTS.md", "engramport.yaml", ...contextPaths];
  const seen = new Set();
  const records = [];
  for (const relative of fixed) {
    if (seen.has(relative)) continue;
    seen.add(relative);
    records.push(await readBoundedContextFile(root, relative));
  }
  records.push({ relative: turn.event.relative ?? "target-event", content: turn.event.body });
  const artifactPaths = (turn.event.meta.artifacts ?? []).map((reference) => reference.split("#", 1)[0]);
  for (const relative of artifactPaths) if (!seen.has(relative)) records.push(await readBoundedContextFile(root, relative));
  const context = records.map(({ relative, content }) => `\n<repository-file path=${JSON.stringify(relative)}>\n${content}\n</repository-file>`).join("");
  const modeInstruction = reviewMode === "dispatch"
    ? "Review mode: dispatch. Assess whether the proposed dispatch is feasible. Return dispatch_feasibility."
    : "Review mode: result. Assess the delivered work and supplied evidence against its requirements, not the feasibility of its instructions. Return result_verdict.";
  const combined = `${prompt.content}\n\n${modeInstruction}\n\nTarget event metadata:\n${JSON.stringify({ id: turn.event.meta.id, thread: turn.event.meta.thread, from: turn.event.meta.from, next: turn.event.meta.next })}\n${context}`;
  if (Buffer.byteLength(combined) > MAX_CONTEXT_BYTES) refuse("CONTEXT_TOO_LARGE");
  return combined;
}

const commonReviewProperties = {
  unique_finding_produced: { type: "boolean" },
  summary: { type: "string", maxLength: 4000 },
  findings: { type: "array", maxItems: 20, items: { type: "string", maxLength: 4000 } }
};

const REVIEW_CONTRACTS = Object.freeze({
  dispatch: {
    verdictKey: "dispatch_feasibility",
    verdicts: ["feasible", "conditional", "infeasible"],
    schema: {
      name: "agent_c_dispatch_review",
      strict: true,
      schema: {
        type: "object",
        additionalProperties: false,
        properties: { dispatch_feasibility: { type: "string", enum: ["feasible", "conditional", "infeasible"] }, ...commonReviewProperties },
        required: ["dispatch_feasibility", "unique_finding_produced", "summary", "findings"]
      }
    }
  },
  result: {
    verdictKey: "result_verdict",
    verdicts: ["verified", "conditional", "rejected"],
    schema: {
      name: "agent_c_result_review",
      strict: true,
      schema: {
        type: "object",
        additionalProperties: false,
        properties: { result_verdict: { type: "string", enum: ["verified", "conditional", "rejected"] }, ...commonReviewProperties },
        required: ["result_verdict", "unique_finding_produced", "summary", "findings"]
      }
    }
  }
});

function parseReview(value, credential, reviewMode = "dispatch") {
  assertNoCredential(value, credential);
  const contract = REVIEW_CONTRACTS[reviewMode]; /* AGENT_C_REVIEW_MODE_CONTRACT */
  if (!contract) refuse("REVIEW_MODE_REFUSED");
  let review;
  try { review = typeof value === "string" ? JSON.parse(value) : value; }
  catch { refuse("MODEL_OUTPUT_INVALID"); }
  const keys = Object.keys(review ?? {}).sort();
  const expectedKeys = [contract.verdictKey, "findings", "summary", "unique_finding_produced"].sort();
  if (JSON.stringify(keys) !== JSON.stringify(expectedKeys)) refuse("MODEL_OUTPUT_INVALID");
  if (!contract.verdicts.includes(review[contract.verdictKey])) refuse("MODEL_OUTPUT_INVALID");
  if (typeof review.unique_finding_produced !== "boolean" || typeof review.summary !== "string" || !Array.isArray(review.findings) || review.findings.some((item) => typeof item !== "string")) refuse("MODEL_OUTPUT_INVALID");
  if (review.unique_finding_produced !== (review.findings.length > 0)) refuse("MODEL_OUTPUT_INVALID");
  if (Buffer.byteLength(JSON.stringify(review)) > MAX_OUTPUT_BYTES) refuse("MODEL_OUTPUT_INVALID");
  return review;
}

export class XaiResponsesClient {
  constructor({ credential, model = "grok-4.6", fetchImpl = globalThis.fetch }) { this.credential = credential; this.model = model; this.fetchImpl = fetchImpl; }

  async review(prompt, reviewMode = "dispatch") {
    assertNoCredential(prompt, this.credential, "CREDENTIAL_CONTEXT_REFUSED");
    const contract = REVIEW_CONTRACTS[reviewMode];
    if (!contract) refuse("REVIEW_MODE_REFUSED");
    let response;
    try {
      response = await this.fetchImpl("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        redirect: "error",
        headers: { Authorization: `Bearer ${this.credential}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: this.model, messages: [{ role: "user", content: prompt }], response_format: { type: "json_schema", json_schema: contract.schema } })
      });
    } catch { refuse("MODEL_CALL_FAILED"); }
    if (!response?.ok) {
      let responseText;
      try { responseText = await response?.text(); }
      catch { refuse("MODEL_CALL_FAILED", { providerStatus: response?.status }); }
      if (Buffer.byteLength(responseText) > MAX_OUTPUT_BYTES) refuse("MODEL_RESPONSE_INVALID");
      assertNoCredential(responseText, this.credential);
      let providerError = responseText;
      try {
        const parsed = JSON.parse(responseText);
        providerError = parsed?.error?.message ?? parsed?.error ?? parsed?.message ?? responseText;
        if (typeof providerError !== "string") providerError = JSON.stringify(providerError);
      } catch { providerError = responseText; }
      refuse("MODEL_CALL_FAILED", { providerStatus: response.status, providerError });
    }
    let payload;
    try {
      const responseText = await response.text();
      if (Buffer.byteLength(responseText) > MAX_OUTPUT_BYTES) refuse("MODEL_RESPONSE_INVALID");
      payload = JSON.parse(responseText);
    }
    catch { refuse("MODEL_RESPONSE_INVALID"); }
    assertNoCredential(payload, this.credential);
    const usage = payload.usage ?? {};
    for (const key of ["prompt_tokens", "completion_tokens", "total_tokens", "cost_in_usd_ticks"]) if (!Number.isSafeInteger(usage[key]) || usage[key] < 0) refuse("MODEL_METRICS_MISSING");
    const review = parseReview(payload.choices?.[0]?.message?.content, this.credential, reviewMode);
    return { review, model: payload.model ?? this.model, usage: { input_tokens: usage.prompt_tokens, output_tokens: usage.completion_tokens, total_tokens: usage.total_tokens, cost_in_usd_ticks: usage.cost_in_usd_ticks } };
  }
}

export async function appendEventWithCli(root, { thread, reply, next, body, artifact }) {
  const script = path.join(root, "scripts", "engram");
  const args = [script, "append", "--actor", AGENT_C, "--thread", thread, "--type", "reply", "--body", body, "--reply", reply, "--next", next, "--artifacts", `${artifact.relative}#sha256=${artifact.sha256}`];
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd: root, stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => { if (stderr.length < 4096) stderr += chunk; });
    child.once("error", () => reject(new AgentCSupervisorError("APPEND_FAILED")));
    child.once("close", (code) => code === 0 ? resolve() : reject(new AgentCSupervisorError(stderr.includes("strict_relay") ? "TURN_REFUSED" : "APPEND_FAILED")));
  });
}

function eventBody(review, measurement, reviewMode) {
  const findings = review.findings.length ? review.findings.map((finding) => `- ${finding}`).join("\n") : "- None.";
  const verdict = reviewMode === "dispatch" ? `Dispatch feasibility: **${review.dispatch_feasibility}**` : `Result verdict: **${review.result_verdict}**`;
  const heading = reviewMode === "dispatch" ? "Agent-c pre-flight review" : "Agent-c result review";
  return `# ${heading}\n\n${verdict}  \nUnique finding produced: **${review.unique_finding_produced}**  \nFinding disposition: **pending**\n\n${review.summary}\n\n## Findings\n\n${findings}\n\nMeasurement: ${measurement.token_use.total_tokens} tokens, ${measurement.provider_cost.cost_in_usd_ticks} USD ticks, relay count ${measurement.relay_count}.\n`;
}

export async function runAgentCReview({ root = process.cwd(), targetRelative, contextPaths = [], reviewMode = "dispatch", env = process.env, modelClient = null, appendEvent = appendEventWithCli, clock = () => new Date() }) {
  const credential = requireResolvedCredential(env);
  const turn = await assertOpenAgentCTurn(root, targetRelative);
  const prompt = await buildReviewPrompt(root, turn, contextPaths, reviewMode);
  const client = modelClient ?? new XaiResponsesClient({ credential, model: env.XAI_MODEL ?? "grok-4.6" });
  const startedAt = clock().toISOString();
  const result = await client.review(prompt, reviewMode);
  const completedAt = clock().toISOString();
  const review = parseReview(result.review, credential, reviewMode);
  const usage = result.usage ?? {};
  for (const key of ["input_tokens", "output_tokens", "total_tokens", "cost_in_usd_ticks"]) if (!Number.isSafeInteger(usage[key]) || usage[key] < 0) refuse("MODEL_METRICS_MISSING");
  const measurement = {
    schema_version: 0,
    target_event_id: turn.event.meta.id,
    target_thread: turn.event.meta.thread,
    review_mode: reviewMode,
    provider: "xai",
    model: result.model ?? env.XAI_MODEL ?? "grok-4.6",
    [REVIEW_CONTRACTS[reviewMode].verdictKey]: review[REVIEW_CONTRACTS[reviewMode].verdictKey],
    unique_finding_produced: review.unique_finding_produced,
    finding_disposition: "pending",
    review_started_at: startedAt,
    review_completed_at: completedAt,
    candidate_to_disposition_ms: null,
    relay_count: turn.relayCount + 1,
    token_use: { input_tokens: usage.input_tokens, output_tokens: usage.output_tokens, total_tokens: usage.total_tokens },
    provider_cost: { currency: "USD", cost_in_usd_ticks: usage.cost_in_usd_ticks, cost_usd: usage.cost_in_usd_ticks / TICKS_PER_USD },
    summary: review.summary,
    findings: review.findings
  };
  assertNoCredential(measurement, credential);
  const store = new AgentCOutputStore(root);
  const stem = turn.event.meta.id;
  const artifact = await store.writeArtifact(`${ARTIFACT_PREFIX}/reviews/${stem}.json`, measurement, credential);
  const pending = `${ARTIFACT_PREFIX}/.pending-${stem}.md`;
  await store.writeArtifact(pending, eventBody(review, measurement, reviewMode), credential);
  try {
    await assertOpenAgentCTurn(root, targetRelative);
    await appendEvent(root, { thread: turn.event.meta.thread, reply: turn.event.meta.id, next: REVIEWER, body: pending, artifact });
  } finally { await store.removeArtifact(pending); }
  return { artifact, measurement };
}

async function readAgentCInboxWithCli(root) {
  const script = path.join(root, "scripts", "engram");
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, "inbox", "--actor", AGENT_C], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { if (stdout.length < MAX_OUTPUT_BYTES) stdout += chunk; });
    child.stderr.on("data", (chunk) => { if (stderr.length < 4096) stderr += chunk; });
    child.once("error", () => reject(new AgentCSupervisorError("INBOX_FAILED")));
    child.once("close", (code) => {
      if (code !== 0) reject(new AgentCSupervisorError(stderr.includes("invalid") ? "LOG_INVALID" : "INBOX_FAILED"));
      else resolve(stdout.split(/\r?\n/).filter((line) => line.startsWith("events/")));
    });
  });
}

export async function pollAgentCInbox({ root = process.cwd() } = {}) {
  const actionable = [];
  for (const relative of await readAgentCInboxWithCli(root)) {
    try {
      await assertOpenAgentCTurn(root, relative);
      actionable.push(relative);
    } catch (error) {
      if (!["TARGET_REFUSED", "MODE_REFUSED", "TURN_REFUSED"].includes(error.code)) throw error;
    }
  }
  return actionable;
}
