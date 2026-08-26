import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { hashBody, hashThreadConfig, verifyLog } from "../packages/git-adapter/src/verify-log.mjs";
import { run } from "../packages/git-adapter/src/cli.mjs";

const root = path.resolve(import.meta.dirname, "..");
const surfaces = ["actors", "events", "artifacts", "schemas", "threads", "engramport.yaml"];

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

const ids = [
  "01a10000-0000-7000-8000-000000000001", "01a10000-0000-7000-8000-000000000002",
  "01a10000-0000-7000-8000-000000000003", "01a10000-0000-7000-8000-000000000004",
  "01a10000-0000-7000-8000-000000000005", "01a10000-0000-7000-8000-000000000006"
];

async function declare(directory, thread, mode, coordinator = null) {
  const config = { schema_version: 0, thread, mode, coordinator };
  await writeFile(path.join(directory, "threads", `${thread}.yaml`), `schema_version: 0\nthread: ${thread}\nmode: ${mode}\ncoordinator: ${coordinator ?? "null"}\n`);
  return config;
}

async function event(directory, { actor, thread, id, reply = null, next = null, body = "test\n", config = null, type = "message" }) {
  const sequence = ids.indexOf(id) + 1;
  const occurredAt = `2026-08-17T13:00:0${sequence}Z`;
  const metadata = [
    "schema_version: 0", `id: ${id}`, `thread: ${thread}`, `from: ${actor}`, `type: ${type}`,
    `occurred_at: ${occurredAt}`, `in_reply_to: ${reply ?? "null"}`, `next: ${next ?? "null"}`,
    `content_sha256: ${hashBody(body)}`
  ];
  if (config) metadata.push(`thread_config_sha256: ${hashThreadConfig(config)}`);
  const file = path.join(directory, "events", actor, `20260817T13000${sequence}Z_${id}.md`);
  await writeFile(file, `---\n${metadata.join("\n")}\n---\n${body}`);
  return file;
}

async function modeFixture(thread, mode, coordinator = null) {
  const directory = await fixture();
  const config = await declare(directory, thread, mode, coordinator);
  return { directory, config };
}

async function addActor(directory, slug) {
  await mkdir(path.join(directory, "events", slug), { recursive: true });
  await mkdir(path.join(directory, "artifacts", slug), { recursive: true });
  await writeFile(path.join(directory, "actors", `${slug}.yaml`), `schema_version: 0\nslug: ${slug}\ndisplay_name: Test Worker\nkind: agent\nprovider: test\ncapabilities: [testing]\nevent_directory: events/${slug}\nartifact_prefix: artifacts/${slug}\n`);
}

test("valid registered-actor relay verifies", async () => {
  const result = await verifyLog(root);
  assert.deepEqual({ ok: result.ok, actors: result.actors }, { ok: true, actors: 3 });
  // The log is append-only, so counts grow. Assert the floor set by the v0 relay, not a frozen census.
  assert.ok(result.events >= 3, `expected at least the 3 v0 relay events, saw ${result.events}`);
  assert.ok(result.threads >= 1, `expected at least the v0 architecture thread, saw ${result.threads}`);
});

test("append with an empty artifacts flag preserves artifact-free append behavior", async () => {
  const directory = await fixture();
  try {
    await declare(directory, "empty-artifacts", "free_form");
    const body = path.join(directory, "empty-artifacts-body.txt");
    await writeFile(body, "synthetic append without artifacts\n");
    assert.equal(await run(["append", "--actor", "agent-b", "--thread", "empty-artifacts", "--type", "message", "--body", body, "--artifacts", ""], directory), 0);
    const result = await verifyLog(directory);
    assert.equal(result.ok, true, result.errors.join("\n"));
    const written = (await readdir(path.join(directory, "events", "agent-b"))).filter((name) => name.includes("empty-artifacts"));
    assert.equal(written.length, 0, "event filenames carry identities, not thread names");
    const sources = await Promise.all((await readdir(path.join(directory, "events", "agent-b"))).map((name) => readFile(path.join(directory, "events", "agent-b", name), "utf8")));
    const appended = sources.find((source) => source.includes("thread: empty-artifacts"));
    assert.ok(appended);
    assert.doesNotMatch(appended, /^artifacts:/m);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

await rejects("modified content is rejected", (d) => mutate(d, "events/agent-a/20260814T141000Z_0198f2a1-1000-7000-8000-000000000001.md", (s) => `${s}\nchanged\n`), /content hash mismatch/);
await rejects("unknown schema fields are rejected", (d) => mutate(d, "events/agent-a/20260814T141000Z_0198f2a1-1000-7000-8000-000000000001.md", (s) => s.replace("thread: architecture", "thread: architecture\nauthority: root")), /unknown field authority/);
await rejects("actor directory ownership is enforced", (d) => mutate(d, "events/agent-b/20260814T143844Z_0198f2a1-1000-7000-8000-000000000002.md", (s) => s.replace("from: agent-b", "from: agent-a")), /actor-directory ownership/);
await rejects("unknown reply targets are rejected", (d) => mutate(d, "events/agent-b/20260814T143844Z_0198f2a1-1000-7000-8000-000000000002.md", (s) => s.replace("0198f2a1-1000-7000-8000-000000000001\nnext", "0198f2a1-1000-7000-8000-000000000099\nnext")), /unknown reply target/);
await rejects("strict relay actor transitions are enforced", (d) => mutate(d, "events/agent-a/20260814T141000Z_0198f2a1-1000-7000-8000-000000000001.md", (s) => s.replace("next: agent-b", "next: agent-a")), /mode strict_relay violation/);
await rejects("reply cycles are rejected", async (d) => {
  await mutate(d, "events/agent-a/20260814T141000Z_0198f2a1-1000-7000-8000-000000000001.md", (s) => s.replace("in_reply_to: null", "in_reply_to: 0198f2a1-1000-7000-8000-000000000003"));
}, /reply cycle/);
await rejects("missing artifacts are rejected", (d) => rm(path.join(d, "artifacts/agent-b/postgres-schema-review.md")), /missing artifact/);
await rejects("artifact modification is rejected", (d) => mutate(d, "artifacts/agent-b/postgres-schema-review.md", (s) => `${s}\nmutation\n`), /artifact hash mismatch/);
await rejects("artifact references must remain in author prefix", (d) => mutate(d, "events/agent-b/20260814T143844Z_0198f2a1-1000-7000-8000-000000000002.md", (s) => s.replaceAll("artifacts/agent-b/postgres-schema-review.md", "artifacts/agent-a/onboarding-welcome-protocol-design.md")), /artifact-prefix ownership violation/);
await rejects("filename identity is enforced", async (d) => {
  await rename(path.join(d, "events/agent-a/20260814T143901Z_0198f2a1-1000-7000-8000-000000000003.md"), path.join(d, "events/agent-a/20260814T143902Z_0198f2a1-1000-7000-8000-000000000003.md"));
}, /filename timestamp/);

test("free_form permits one actor to publish sequential events", async () => {
  const { directory, config } = await modeFixture("free-sequence", "free_form");
  try {
    await event(directory, { actor: "agent-a", thread: "free-sequence", id: ids[0], config });
    await event(directory, { actor: "agent-a", thread: "free-sequence", id: ids[1], reply: ids[0] });
    assert.equal((await verifyLog(directory)).ok, true);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("free_form permits sibling replies", async () => {
  const { directory, config } = await modeFixture("free-siblings", "free_form");
  try {
    await event(directory, { actor: "agent-a", thread: "free-siblings", id: ids[0], config });
    await event(directory, { actor: "agent-a", thread: "free-siblings", id: ids[1], reply: ids[0] });
    await event(directory, { actor: "agent-b", thread: "free-siblings", id: ids[2], reply: ids[0] });
    assert.equal((await verifyLog(directory)).ok, true);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("coordinator_led permits coordinator followed by two worker replies", async () => {
  const { directory, config } = await modeFixture("coordinator-positive", "coordinator_led", "agent-a");
  try {
    await addActor(directory, "agent-c");
    await event(directory, { actor: "agent-a", thread: "coordinator-positive", id: ids[0], config });
    await event(directory, { actor: "agent-b", thread: "coordinator-positive", id: ids[1], reply: ids[0] });
    await event(directory, { actor: "agent-c", thread: "coordinator-positive", id: ids[2], reply: ids[0] });
    assert.equal((await verifyLog(directory)).ok, true);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

await rejects("strict_relay refuses an actor replying to itself and names the mode", async (d) => {
  const config = await declare(d, "strict-self", "strict_relay");
  await event(d, { actor: "agent-a", thread: "strict-self", id: ids[0], next: "agent-a", config });
  await event(d, { actor: "agent-a", thread: "strict-self", id: ids[1], reply: ids[0] });
}, /mode strict_relay violation; an actor may not reply to itself/);

await rejects("strict_relay refuses a second reply and names the mode", async (d) => {
  const config = await declare(d, "strict-branch", "strict_relay");
  await event(d, { actor: "agent-a", thread: "strict-branch", id: ids[0], next: "agent-b", config });
  await event(d, { actor: "agent-b", thread: "strict-branch", id: ids[1], reply: ids[0], next: "agent-a" });
  await event(d, { actor: "agent-b", thread: "strict-branch", id: ids[2], reply: ids[0], next: "agent-a" });
}, /mode strict_relay violation; parent has 2 replies/);

await rejects("free_form refuses an unknown parent and names the mode", async (d) => {
  const config = await declare(d, "free-unknown", "free_form");
  await event(d, { actor: "agent-a", thread: "free-unknown", id: ids[0], config });
  await event(d, { actor: "agent-b", thread: "free-unknown", id: ids[1], reply: ids[5] });
}, /mode free_form violation; unknown reply target/);

await rejects("free_form refuses a cycle", async (d) => {
  const config = await declare(d, "free-cycle", "free_form");
  const root = await event(d, { actor: "agent-a", thread: "free-cycle", id: ids[0], config });
  await event(d, { actor: "agent-b", thread: "free-cycle", id: ids[1], reply: ids[0] });
  await mutate(d, path.relative(d, root), (source) => source.replace("in_reply_to: null", `in_reply_to: ${ids[1]}`));
}, /reply cycle detected/);

await rejects("free_form refuses a second root with a precise mode error", async (d) => {
  const config = await declare(d, "free-root", "free_form");
  await event(d, { actor: "agent-a", thread: "free-root", id: ids[0], config });
  await event(d, { actor: "agent-b", thread: "free-root", id: ids[1], config });
}, /mode free_form violation; thread already has a root/);

await rejects("coordinator_led refuses a worker root", async (d) => {
  const config = await declare(d, "coordinator-root", "coordinator_led", "agent-a");
  await event(d, { actor: "agent-b", thread: "coordinator-root", id: ids[0], config });
}, /mode coordinator_led violation; root must be authored by coordinator agent-a/);

await rejects("coordinator_led refuses a worker replying to a worker", async (d) => {
  const config = await declare(d, "coordinator-worker", "coordinator_led", "agent-a");
  await event(d, { actor: "agent-a", thread: "coordinator-worker", id: ids[0], config });
  await event(d, { actor: "agent-b", thread: "coordinator-worker", id: ids[1], reply: ids[0] });
  await event(d, { actor: "agent-b", thread: "coordinator-worker", id: ids[2], reply: ids[1] });
}, /mode coordinator_led violation; worker agent-b must reply to coordinator agent-a/);

await rejects("unknown thread modes fail closed", async (d) => {
  await declare(d, "unknown-mode", "surprise_mode");
}, /unknown thread mode surprise_mode/);

await rejects("malformed thread mode declarations fail closed", async (d) => {
  await writeFile(path.join(d, "threads", "malformed-mode.yaml"), "schema_version: 0\nthread: malformed-mode\ncoordinator: null\n");
}, /unknown thread mode undefined/);

test("a mode may be declared while a thread is empty", async () => {
  const { directory } = await modeFixture("empty-mode", "free_form");
  try { assert.equal((await verifyLog(directory)).ok, true); }
  finally { await rm(directory, { recursive: true, force: true }); }
});

await rejects("changing a declared mode after the first event violates its binding", async (d) => {
  const config = await declare(d, "immutable-mode", "free_form");
  await event(d, { actor: "agent-a", thread: "immutable-mode", id: ids[0], config });
  await mutate(d, "threads/immutable-mode.yaml", (source) => source.replace("mode: free_form", "mode: strict_relay"));
}, /mode immutability violation/);

await rejects("a per-thread mode declaration cannot be added after the first event", async (d) => {
  await event(d, { actor: "agent-a", thread: "late-declaration", id: ids[0], next: "agent-b" });
  await declare(d, "late-declaration", "free_form");
}, /mode immutability violation; declaration for non-empty thread late-declaration does not match its first-event binding/);

await rejects("changing mode cannot retroactively legitimize an invalid strict_relay branch", async (d) => {
  const config = await declare(d, "retroactive-mode", "strict_relay");
  await event(d, { actor: "agent-a", thread: "retroactive-mode", id: ids[0], next: "agent-b", config });
  await event(d, { actor: "agent-b", thread: "retroactive-mode", id: ids[1], reply: ids[0] });
  await event(d, { actor: "agent-b", thread: "retroactive-mode", id: ids[2], reply: ids[0] });
  await mutate(d, "threads/retroactive-mode.yaml", (source) => source.replace("mode: strict_relay", "mode: free_form"));
}, /mode immutability violation/);

await rejects("coordinator_led requires a coordinator", async (d) => {
  await declare(d, "missing-coordinator", "coordinator_led");
}, /coordinator_led mode requires a coordinator/);

await rejects("coordinator_led refuses an unknown coordinator", async (d) => {
  await declare(d, "unknown-coordinator", "coordinator_led", "invitee-not-an-actor");
}, /unknown coordinator invitee-not-an-actor/);

for (const terminal of ["accepted", "rejected", "expired", "revoked"]) {
  test(`free_form supports invitation issuance, ${terminal}, and terminal closure without an invitee actor`, async () => {
    const { directory, config } = await modeFixture(`invitation-${terminal}`, "free_form");
    try {
      await event(directory, { actor: "agent-a", thread: `invitation-${terminal}`, id: ids[0], config, type: "handoff", body: "invitation issued for external subject\n" });
      await event(directory, { actor: "agent-a", thread: `invitation-${terminal}`, id: ids[1], reply: ids[0], type: "decision", body: `invitation ${terminal}\n` });
      await event(directory, { actor: "agent-a", thread: `invitation-${terminal}`, id: ids[2], reply: ids[1], type: "completion", body: "invitation thread closed\n" });
      const result = await verifyLog(directory);
      assert.equal(result.ok, true, result.errors.join("\n"));
      await assert.rejects(readFile(path.join(directory, "actors", "invitee.yaml")), /ENOENT/);
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
}
