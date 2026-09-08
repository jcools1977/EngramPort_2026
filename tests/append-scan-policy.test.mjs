import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const sourceRoot = process.env.F156_SOURCE_ROOT ?? path.resolve(import.meta.dirname, "..");
const fromSource = (file) => import(pathToFileURL(path.join(sourceRoot, file)).href);
const { appendEvent } = await fromSource("packages/git-adapter/src/event-core.mjs");
const { MAX_CONTEXT_BYTES } = await fromSource("packages/git-adapter/src/credential-boundary.mjs");
const { XaiResponsesClient } = await fromSource("packages/agent-c-supervisor/src/index.mjs");
const selected = process.env.F156_CASE;
const check = (name, work) => test(name, { skip: selected && selected !== name }, work);
const clean = "apple river house green stone field cloud light bread water ".repeat(1600);
const planted = `${clean}\nBearer ${"synthetic".repeat(8)}\n`;
const sha = (value) => createHash("sha256").update(value).digest("hex");

async function appendFixture(t, { artifact = "evidence\n", body = "result\n", envelopeText } = {}) {
  const root = await mkdtemp(path.join(tmpdir(), "f156-append-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const dir of ["actors", "events/a", "artifacts/a", "threads"]) await mkdir(path.join(root, dir), { recursive: true });
  await writeFile(path.join(root, "engramport.yaml"), "protocol: engramport-git-v0\nproject: t\nmode: free_form\ndefault_thread_mode: free_form\n");
  await writeFile(path.join(root, "actors/a.yaml"), "slug: a\ndisplay_name: A\nkind: agent\nevent_directory: events/a\nartifact_prefix: artifacts/a\n");
  await writeFile(path.join(root, "artifacts/a/e.md"), artifact);
  const input = { actor: "a", thread: "t", type: "message", body, artifacts: [`artifacts/a/e.md#sha256=${sha(artifact)}`] };
  if (envelopeText !== undefined) input.boundedContext = [{ type: "event", event_id: envelopeText }];
  return { root, input, run: () => appendEvent(input, { cwd: root }) };
}

async function accepted(fixture) {
  const result = await fixture.run();
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  const written = await readFile(path.join(fixture.root, result.relative), "utf8");
  assert.ok(written.includes(fixture.input.artifacts[0]));
  return result;
}
async function refused(fixture, code, bytes) {
  await assert.rejects(fixture.run, (error) => {
    assert.equal(error.code, code);
    if (bytes !== undefined) {
      assert.equal(error.bytes, bytes);
      assert.equal(error.limit, MAX_CONTEXT_BYTES);
      assert.ok(error.message.includes(`bytes=${bytes}`));
      assert.ok(error.message.includes(`limit=${MAX_CONTEXT_BYTES}`));
    }
    console.log(`OBSERVED append code=${error.code}${bytes === undefined ? "" : ` bytes=${error.bytes} limit=${error.limit}`}`);
    return true;
  });
  assert.deepEqual(await readdir(path.join(fixture.root, "events/a")), [], "refusal must leave no event");
}

check("clean-large-artifact", async (t) => {
  assert.ok(Buffer.byteLength(clean) > 65536);
  await accepted(await appendFixture(t, { artifact: clean }));
  console.log(`OBSERVED append clean artifact bytes=${Buffer.byteLength(clean)} accepted=true`);
});
check("artifact-size", async (t) => {
  await accepted(await appendFixture(t, { artifact: "x".repeat(MAX_CONTEXT_BYTES) }));
  await refused(await appendFixture(t, { artifact: "x".repeat(MAX_CONTEXT_BYTES + 1) }), "SCAN_INPUT_TOO_LARGE", MAX_CONTEXT_BYTES + 1);
});
check("artifact-credential", async (t) => {
  assert.ok(planted.indexOf("Bearer") > 65536);
  await accepted(await appendFixture(t, { artifact: clean }));
  await refused(await appendFixture(t, { artifact: planted }), "CREDENTIAL_INPUT_REFUSED");
});
check("body-size", async (t) => {
  await accepted(await appendFixture(t, { body: "x".repeat(MAX_CONTEXT_BYTES) }));
  await refused(await appendFixture(t, { body: "x".repeat(MAX_CONTEXT_BYTES + 1) }), "SCAN_INPUT_TOO_LARGE", MAX_CONTEXT_BYTES + 1);
});
check("body-credential", async (t) => {
  await accepted(await appendFixture(t, { body: clean }));
  await refused(await appendFixture(t, { body: planted }), "CREDENTIAL_INPUT_REFUSED");
});
check("envelope-size", async (t) => {
  // Empty context has a known structural refusal. The scanner must allow it
  // through to that verifier, then distinguish an oversized serialized envelope.
  const small = await appendFixture(t, { envelopeText: clean });
  assert.equal((await small.run()).ok, false);
  const large = await appendFixture(t, { envelopeText: "x".repeat(MAX_CONTEXT_BYTES) });
  const bytes = Buffer.byteLength(JSON.stringify({ boundedContext: large.input.boundedContext }));
  await refused(large, "SCAN_INPUT_TOO_LARGE", bytes);
});
check("envelope-credential", async (t) => {
  const small = await appendFixture(t, { envelopeText: clean });
  assert.equal((await small.run()).ok, false);
  await refused(await appendFixture(t, { envelopeText: planted }), "CREDENTIAL_INPUT_REFUSED");
});
check("utf8-and-escaping", async (t) => {
  // JSON encoding is larger than the original text. The custody policy is UTF-8.
  await accepted(await appendFixture(t, { artifact: "\n".repeat(MAX_CONTEXT_BYTES) }));
  await accepted(await appendFixture(t, { artifact: "é".repeat(Math.floor(MAX_CONTEXT_BYTES / 2)) }));
  const oversized = "é".repeat(Math.floor(MAX_CONTEXT_BYTES / 2) + 1);
  await refused(await appendFixture(t, { artifact: oversized }), "SCAN_INPUT_TOO_LARGE", Buffer.byteLength(oversized));
});

function clientFixture() {
  let calls = 0;
  const client = new XaiResponsesClient({ credential: "synthetic-model-key", fetchImpl: async () => {
    calls++;
    return { ok: true, text: async () => JSON.stringify({ choices: [{ message: { content: JSON.stringify({ dispatch_feasibility: "feasible", unique_finding_produced: false, summary: "Synthetic review.", findings: [] }) } }], usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2, cost_in_usd_ticks: 1 } }) };
  } });
  return { client, calls: () => calls };
}
check("supervisor-shared-limit", async () => {
  const { client, calls } = clientFixture();
  await client.review("\n".repeat(MAX_CONTEXT_BYTES));
  assert.equal(calls(), 1);
  await assert.rejects(() => client.review("x".repeat(MAX_CONTEXT_BYTES + 1)), (error) => {
    assert.equal(error.code, "SCAN_INPUT_TOO_LARGE");
    assert.equal(error.bytes, MAX_CONTEXT_BYTES + 1);
    assert.equal(error.limit, MAX_CONTEXT_BYTES);
    return true;
  });
  assert.equal(calls(), 1, "oversize must not call the provider");
});
check("supervisor-credential", async () => {
  const { client, calls } = clientFixture();
  await client.review(clean);
  await assert.rejects(() => client.review(planted), { code: "CREDENTIAL_CONTEXT_REFUSED" });
  assert.equal(calls(), 1);
});
