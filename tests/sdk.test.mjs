import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const sdk = await import(process.env.ENGRAMPORT_SDK_MODULE ?? "@engramport/sdk");

const ids = Object.freeze({
  delegated: "01a04e00-0000-7000-8000-000000000001",
  seed: "01a04e00-0001-7000-8000-000000000002",
  handoff: "01a04e00-0002-7000-8000-000000000003",
  reply: "01a04e00-0003-7000-8000-000000000004",
  artifact: "01a04e00-0004-7000-8000-000000000005",
  unknown: "01a04e00-0005-7000-8000-000000000006",
  watchSeed: "01a04e00-0006-7000-8000-000000000007",
  watchHandoff: "01a04e00-0007-7000-8000-000000000008",
});

async function fixture() {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "engramport-sdk-"));
  for (const directory of ["actors", "events/agent-a", "events/agent-b", "artifacts/agent-a", "artifacts/agent-b", "threads"]) {
    await mkdir(path.join(cwd, directory), { recursive: true });
  }
  await writeFile(path.join(cwd, "engramport.yaml"), "protocol: engramport-git-v0\nproject: sdk-test\nmode: strict_relay\ndefault_thread_mode: strict_relay\n");
  for (const actor of ["agent-a", "agent-b"]) {
    await writeFile(path.join(cwd, "actors", `${actor}.yaml`), `schema_version: 0\nslug: ${actor}\ndisplay_name: ${actor}\nkind: agent\nprovider: test\ncapabilities: [testing]\nevent_directory: events/${actor}\nartifact_prefix: artifacts/${actor}\n`);
  }
  return cwd;
}

async function cleanup(cwd) { await rm(cwd, { recursive: true, force: true }); }

test("workspace resolves the advertised private SDK manifest without publishing", async () => {
  const [rootManifest, sdkManifest] = await Promise.all([
    readFile(path.join(root, "package.json"), "utf8").then(JSON.parse),
    readFile(path.join(root, "packages/sdk/package.json"), "utf8").then(JSON.parse),
  ]);
  assert.ok(rootManifest.workspaces.includes("packages/sdk"));
  assert.equal(sdkManifest.name, "@engramport/sdk");
  assert.equal(sdkManifest.private, true, "this slice must not publish the package");
  assert.match(import.meta.resolve("@engramport/sdk"), /packages\/sdk\/src\/index\.mjs$/);
});

test("SDK append delegates to event-core", async () => {
  const cwd = await fixture();
  try {
    const client = sdk.createClient({ actor: "agent-b", cwd });
    const result = await client.append({ thread: "sdk-delegation", type: "message", body: "shared writer\n" }, { id: ids.delegated });
    assert.equal(result.ok, true);
    await access(path.join(cwd, result.relative));
    assert.equal((await readdir(path.join(cwd, "events/agent-b"))).length, 1, "SDK append must land the event written by event-core");
  } finally { await cleanup(cwd); }
});

test("SDK exposes typed append, inbox, causal reply, bounded handoff, and intent retry", async () => {
  const cwd = await fixture();
  try {
    const agentA = sdk.createClient({ actor: "agent-a", cwd });
    const agentB = sdk.createClient({ actor: "agent-b", cwd });
    const seedInput = { thread: "sdk-seed", type: "message", body: "context seed\n" };
    const seed = await agentA.append(seedInput, { id: ids.seed });
    const retried = await agentA.append(seedInput, { id: ids.seed });
    assert.equal(retried.reused, true);
    assert.equal(retried.relative, seed.relative);

    const handoff = await agentA.handoff({
      thread: "sdk-handoff", body: "bounded work\n", next: "agent-b",
      boundedContext: [{ type: "event", event_id: seed.event_id }],
      completionCriteria: [{ id: "deliver", statement: "Return event evidence.", evidence_classes: ["event"] }],
    }, { id: ids.handoff });
    assert.equal(handoff.ok, true);
    assert.ok((await agentB.inbox()).includes(handoff.relative));
    const [entry] = (await agentB.inbox({ entries: true })).filter((item) => item.event_id === handoff.event_id);
    assert.equal(entry.type, "handoff");

    const reply = await agentB.reply({ thread: "sdk-handoff", inReplyTo: handoff.event_id, body: "causal reply\n", next: null }, { id: ids.reply });
    assert.equal(reply.ok, true);
    assert.equal((await agentB.inbox()).includes(handoff.relative), false);
    const replySource = await readFile(path.join(cwd, reply.relative), "utf8");
    assert.match(replySource, new RegExp(`in_reply_to: ${handoff.event_id}`));
    assert.match(replySource, /^intent_sha256: [0-9a-f]{64}$/m);
  } finally { await cleanup(cwd); }
});

test("SDK exposes the existing Port Watch delivery path without implementing another resolver", async () => {
  const cwd = await fixture();
  try {
    const agentA = sdk.createClient({ actor: "agent-a", cwd });
    const agentB = sdk.createClient({ actor: "agent-b", cwd });
    const seed = await agentA.append({ thread: "watch-seed", type: "message", body: "watch context\n" }, { id: ids.watchSeed });
    const handoff = await agentA.handoff({
      thread: "watch-handoff", body: "wake on this\n", next: "agent-b",
      boundedContext: [{ type: "event", event_id: seed.event_id }],
      completionCriteria: [{ id: "wake", statement: "Deliver the addressed event.", evidence_classes: ["event"] }],
    }, { id: ids.watchHandoff });
    const store = new sdk.FileWatchStore(path.join(cwd, "runtime/watch.json"));
    const runner = new sdk.RecordingRunner();
    const watch = agentB.createPortWatch({ store, runner, state: async () => "git-v1:test" });
    await watch.configure("agent-b", "sdk-project", { enabled: true });
    const wake = await watch.tick("agent-b", "sdk-project");
    assert.equal(wake.action, "wake");
    assert.equal(wake.event.event_id, handoff.event_id);
    assert.equal(runner.invocations.length, 1);
  } finally { await cleanup(cwd); }
});

test("unregistered actor and out-of-prefix artifact are honestly refused without authorization claims", async () => {
  const cwd = await fixture();
  try {
    const missing = sdk.createClient({ actor: "agent-missing", cwd });
    const unregistered = await missing.append({ thread: "unknown-actor", type: "message", body: "not enrolled\n" }, { id: ids.unknown });
    assert.equal(unregistered.ok, false);
    assert.match(unregistered.errors.join("\n"), /event file is not directly enumerated by a registered actor event_directory/);
    await assert.rejects(access(path.join(cwd, "events/agent-missing")));

    const artifactPath = path.join(cwd, "artifacts/agent-a/foreign.md");
    await writeFile(artifactPath, "foreign evidence\n");
    const digest = createHash("sha256").update(await readFile(artifactPath)).digest("hex");
    const agentB = sdk.createClient({ actor: "agent-b", cwd });
    const refused = await agentB.append({
      thread: "artifact-boundary", type: "artifact", body: "foreign artifact reference\n",
      artifacts: [`artifacts/agent-a/foreign.md#sha256=${digest}`],
    }, { id: ids.artifact });
    assert.equal(refused.ok, false);
    assert.match(refused.errors.join("\n"), /artifact-prefix ownership violation/);
    assert.equal((await readdir(path.join(cwd, "events/agent-b"))).length, 0, "artifact-prefix refusal must write no event");
  } finally { await cleanup(cwd); }
});

test("SDK publishes four claim qualifiers with honest dependency coverage", async () => {
  assert.deepEqual(sdk.CLAIM_COVERAGE.map(({ id, coverage }) => [id, coverage]), [
    ["publish", "full"], ["discover", "full-with-dependency"], ["respond", "full"], ["handoff", "full"],
  ]);
  const readme = await readFile(path.join(root, "packages/sdk/README.md"), "utf8");
  assert.match(readme, /Never-overwrite is structural/);
  assert.match(readme, /not that cross-machine networking or availability works/);
  assert.match(readme, /requires the PostgreSQL control stream to be reachable/);
  assert.match(readme, /neither authenticates a caller nor proves possession/);
  assert.match(readme, /registry check is log structure validation, not enrollment or authorization/);
});
