import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const verifierSpecifier = process.env.GIT_ADAPTER_VERIFY_MODULE ?? pathToFileURL(path.join(root, "packages/git-adapter/src/verify-log.mjs")).href;
const { hashBody, hashThreadConfig, verifyLog } = await import(verifierSpecifier);
const cliSpecifier = process.env.GIT_ADAPTER_CLI_MODULE ?? pathToFileURL(path.join(root, "packages/git-adapter/src/cli.mjs")).href;
const { run } = await import(cliSpecifier);
const coreSpecifier = pathToFileURL(path.join(root, "packages/git-adapter/src/event-core.mjs")).href;
const { appendEvent, listInbox } = await import(coreSpecifier);
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

test("verification refuses unregistered Markdown event files while ignoring empty directories", async () => {
  const directory = await fixture();
  const rogueDirectory = path.join(directory, "events", "agent-rogue");
  const rogueEvent = path.join(rogueDirectory, "forged-decision.md");
  try {
    await mkdir(rogueDirectory);
    assert.equal((await verifyLog(directory)).ok, true);
    await writeFile(path.join(rogueDirectory, ".gitkeep"), "");
    assert.equal((await verifyLog(directory)).ok, true);
    await writeFile(rogueEvent, "forged event data\n");
    const forged = await verifyLog(directory);
    assert.equal(forged.ok, false);
    assert.match(forged.errors.join("\n"), /events\/agent-rogue\/forged-decision\.md: event file is not directly enumerated by a registered actor event_directory/);
    await rm(rogueEvent);
    assert.equal((await verifyLog(directory)).ok, true);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("verification aligns recursive Markdown discovery with validation and ignores non-events", async () => {
  const directory = await fixture();
  const nestedDirectory = path.join(directory, "events", "agent-a", "sneaky");
  const nestedEvent = path.join(nestedDirectory, "forged.md");
  const nonEventDirectory = path.join(directory, "events", "rogue2");
  try {
    await mkdir(nestedDirectory);
    const generated = await event(directory, { actor: "agent-a", thread: "nested-forgery", id: ids[0], type: "decision" });
    await rename(generated, nestedEvent);
    const nested = await verifyLog(directory);
    assert.equal(nested.ok, false);
    assert.match(nested.errors.join("\n"), /events\/agent-a\/sneaky\/forged\.md: event file is not directly enumerated by a registered actor event_directory/);
    await rm(nestedEvent);
    assert.equal((await verifyLog(directory)).ok, true);

    // Non-Markdown files are not event candidates, so accepting them is deliberate rather than an enumeration gap.
    await mkdir(nonEventDirectory);
    await writeFile(path.join(nonEventDirectory, "forged.txt"), "not an event\n");
    assert.equal((await verifyLog(directory)).ok, true);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("uppercase Markdown forgery is accounted for and fails by path", async () => {
  const directory = await fixture();
  const nestedDirectory = path.join(directory, "events", "agent-a", "sneaky2");
  const uppercaseEvent = path.join(nestedDirectory, "FORGED.MD");
  try {
    await mkdir(nestedDirectory);
    const generated = await event(directory, { actor: "agent-a", thread: "uppercase-forgery", id: ids[0], type: "decision" });
    await rename(generated, uppercaseEvent);
    const result = await verifyLog(directory);
    assert.equal(result.ok, false);
    assert.match(result.errors.join("\n"), /events\/agent-a\/sneaky2\/FORGED\.MD: event file is not directly enumerated by a registered actor event_directory/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("event extension policy is shared by inbox while normal append stays lowercase", async () => {
  const directory = await fixture();
  const output = [];
  const originalLog = console.log;
  try {
    const uppercaseGenerated = await event(directory, { actor: "agent-a", thread: "uppercase-open", id: ids[0], next: "agent-b" });
    const uppercaseEvent = uppercaseGenerated.replace(/\.md$/, ".MD");
    await rename(uppercaseGenerated, uppercaseEvent);
    const nonEventDirectory = path.join(directory, "events", "rogue2");
    await mkdir(nonEventDirectory);
    await writeFile(path.join(nonEventDirectory, "forged.txt"), "deliberately not an event\n");

    const body = path.join(directory, "normal-lowercase-body.txt");
    await writeFile(body, "normal lowercase append\n");
    console.log = (...parts) => output.push(parts.join(" "));
    assert.equal(await run(["append", "--actor", "agent-a", "--thread", "lowercase-open", "--type", "message", "--body", body, "--next", "agent-b"], directory), 0);
    assert.equal(await run(["inbox", "--actor", "agent-b"], directory), 0);
    assert.ok(output.includes(path.relative(directory, uppercaseEvent)), "uppercase Markdown event must appear in inbox");
    assert.ok(output.some((line) => /^events\/agent-a\/.*\.md$/.test(line)), "normal append must remain lowercase and appear in inbox");
  } finally {
    console.log = originalLog;
    await rm(directory, { recursive: true, force: true });
  }
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

test("append refuses an unrecognized flag before writing and preserves known-good behavior", async () => {
  const directory = await fixture();
  try {
    await declare(directory, "argument-refusal", "free_form");
    const body = path.join(directory, "argument-refusal-body.txt");
    await writeFile(body, "synthetic append with strict arguments\n");
    const eventDirectory = path.join(directory, "events", "agent-b");
    const before = await readdir(eventDirectory);
    await assert.rejects(
      run(["append", "--actor", "agent-b", "--thread", "argument-refusal", "--type", "message", "--body", body, "--in-reply-to", ids[0]], directory),
      (error) => error.code === "ARGUMENT_REFUSED" && error.message.includes("--in-reply-to")
    );
    assert.deepEqual(await readdir(eventDirectory), before);
    assert.equal(await run(["append", "--actor", "agent-b", "--thread", "argument-refusal", "--type", "message", "--body", body], directory), 0);
    assert.equal((await readdir(eventDirectory)).length, before.length + 1);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("append refuses a second thread root without writing an event", async () => {
  const directory = await fixture();
  const errors = [];
  const originalError = console.error;
  try {
    await declare(directory, "second-root-refusal", "free_form");
    const firstBody = path.join(directory, "first-root-body.txt");
    const secondBody = path.join(directory, "second-root-body.txt");
    await writeFile(firstBody, "first root\n");
    await writeFile(secondBody, "second root\n");
    const eventDirectory = path.join(directory, "events", "agent-b");
    assert.equal(await run(["append", "--actor", "agent-b", "--thread", "second-root-refusal", "--type", "message", "--body", firstBody], directory), 0);
    const afterFirst = await readdir(eventDirectory);
    console.error = (...parts) => errors.push(parts.join(" "));
    assert.equal(await run(["append", "--actor", "agent-b", "--thread", "second-root-refusal", "--type", "message", "--body", secondBody], directory), 1);
    assert.deepEqual(await readdir(eventDirectory), afterFirst, "refused append must leave the event count unchanged");
    assert.match(errors.join("\n"), /thread already has a root/);
  } finally {
    console.error = originalError;
    await rm(directory, { recursive: true, force: true });
  }
});

test("exported append and inbox core preserve the event wire surface", async () => {
  const directory = await fixture();
  const id = "01a03fb0-0000-7000-8000-000000000001";
  const now = Date.parse("2026-08-26T20:00:00Z");
  try {
    await declare(directory, "core-wire-surface", "free_form");
    const body = "core wire body\n";
    const result = await appendEvent({ actor: "agent-b", thread: "core-wire-surface", type: "handoff", body, next: "agent-a" }, { cwd: directory, id, now });
    const relative = `events/agent-b/20260826T200000Z_${id}.md`;
    assert.deepEqual(result, { ok: true, errors: [], relative });
    assert.equal(await readFile(path.join(directory, relative), "utf8"), `---\nschema_version: 0\nid: ${id}\nthread: core-wire-surface\nfrom: agent-b\ntype: handoff\noccurred_at: 2026-08-26T20:00:00Z\nin_reply_to: null\nnext: agent-a\ncontent_sha256: ${hashBody(body)}\nthread_config_sha256: ${hashThreadConfig({ schema_version: 0, thread: "core-wire-surface", mode: "free_form", coordinator: null })}\n---\n${body}`);
    assert.ok((await listInbox({ actor: "agent-a", cwd: directory })).includes(relative));
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("CLI append and inbox delegate to the exported core", async () => {
  const directory = await fixture();
  const output = [];
  const originalLog = console.log;
  try {
    await declare(directory, "core-cli-delegation", "free_form");
    const body = path.join(directory, "core-cli-body.txt");
    await writeFile(body, "CLI delegation body\n");
    const eventDirectory = path.join(directory, "events", "agent-b");
    const before = await readdir(eventDirectory);
    console.log = (...parts) => output.push(parts.join(" "));
    assert.equal(await run(["append", "--actor", "agent-b", "--thread", "core-cli-delegation", "--type", "handoff", "--body", body, "--next", "agent-a"], directory), 0);
    const after = await readdir(eventDirectory);
    assert.equal(after.length, before.length + 1, "CLI append must land the event written by the core");
    const relative = output.at(-1);
    assert.match(relative, /^events\/agent-b\/.*\.md$/);
    const beforeInboxOutput = output.length;
    assert.equal(await run(["inbox", "--actor", "agent-a"], directory), 0);
    assert.ok(output.slice(beforeInboxOutput).includes(relative), "CLI inbox must print the core result");
  } finally {
    console.log = originalLog;
    await rm(directory, { recursive: true, force: true });
  }
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
