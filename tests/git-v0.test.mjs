import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { verifyLog } from "../packages/git-adapter/src/verify-log.mjs";

const root = path.resolve(import.meta.dirname, "..");
const surfaces = ["actors", "events", "artifacts", "schemas", "engramport.yaml"];

async function fixture() {
  const directory = await mkdtemp(path.join(os.tmpdir(), "engramport-v0-"));
  for (const surface of surfaces) await cp(path.join(root, surface), path.join(directory, surface), { recursive: true });
  return directory;
}

async function mutate(directory, relative, transform) {
  const file = path.join(directory, relative);
  await writeFile(file, transform(await readFile(file, "utf8")));
}

async function rejects(name, mutation, pattern) {
  await test(name, async () => {
    const directory = await fixture();
    try {
      await mutation(directory);
      const result = await verifyLog(directory);
      assert.equal(result.ok, false);
      assert.match(result.errors.join("\n"), pattern);
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
}

test("valid two-agent relay verifies", async () => {
  const result = await verifyLog(root);
  assert.deepEqual({ ok: result.ok, actors: result.actors }, { ok: true, actors: 2 });
  // The log is append-only, so counts grow. Assert the floor set by the v0 relay, not a frozen census.
  assert.ok(result.events >= 3, `expected at least the 3 v0 relay events, saw ${result.events}`);
  assert.ok(result.threads >= 1, `expected at least the v0 architecture thread, saw ${result.threads}`);
});

await rejects("modified content is rejected", (d) => mutate(d, "events/agent-a/20260814T141000Z_0198f2a1-1000-7000-8000-000000000001.md", (s) => `${s}\nchanged\n`), /content hash mismatch/);
await rejects("unknown schema fields are rejected", (d) => mutate(d, "events/agent-a/20260814T141000Z_0198f2a1-1000-7000-8000-000000000001.md", (s) => s.replace("thread: architecture", "thread: architecture\nauthority: root")), /unknown field authority/);
await rejects("actor directory ownership is enforced", (d) => mutate(d, "events/agent-b/20260814T143844Z_0198f2a1-1000-7000-8000-000000000002.md", (s) => s.replace("from: agent-b", "from: agent-a")), /actor-directory ownership/);
await rejects("unknown reply targets are rejected", (d) => mutate(d, "events/agent-b/20260814T143844Z_0198f2a1-1000-7000-8000-000000000002.md", (s) => s.replace("0198f2a1-1000-7000-8000-000000000001\nnext", "0198f2a1-1000-7000-8000-000000000099\nnext")), /unknown reply target/);
await rejects("strict relay actor transitions are enforced", (d) => mutate(d, "events/agent-a/20260814T141000Z_0198f2a1-1000-7000-8000-000000000001.md", (s) => s.replace("next: agent-b", "next: agent-a")), /strict-relay violation/);
await rejects("reply cycles are rejected", async (d) => {
  await mutate(d, "events/agent-a/20260814T141000Z_0198f2a1-1000-7000-8000-000000000001.md", (s) => s.replace("in_reply_to: null", "in_reply_to: 0198f2a1-1000-7000-8000-000000000003"));
}, /reply cycle/);
await rejects("missing artifacts are rejected", (d) => rm(path.join(d, "artifacts/agent-b/postgres-schema-review.md")), /missing artifact/);
await rejects("artifact modification is rejected", (d) => mutate(d, "artifacts/agent-b/postgres-schema-review.md", (s) => `${s}\nmutation\n`), /artifact hash mismatch/);
await rejects("artifact references must remain in author prefix", (d) => mutate(d, "events/agent-b/20260814T143844Z_0198f2a1-1000-7000-8000-000000000002.md", (s) => s.replaceAll("artifacts/agent-b/postgres-schema-review.md", "artifacts/agent-a/onboarding-welcome-protocol-design.md")), /artifact-prefix ownership violation/);
await rejects("filename identity is enforced", async (d) => {
  await rename(path.join(d, "events/agent-a/20260814T143901Z_0198f2a1-1000-7000-8000-000000000003.md"), path.join(d, "events/agent-a/20260814T143902Z_0198f2a1-1000-7000-8000-000000000003.md"));
}, /filename timestamp/);
