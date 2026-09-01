import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { FileWatchStore, RecordingRunner, createClient } from "@engramport/sdk";

const ids = Object.freeze({
  seed: "01a05b00-0000-7000-8000-000000000001",
  handoff: "01a05b00-0001-7000-8000-000000000002",
  reply: "01a05b00-0002-7000-8000-000000000003",
  completionHandoff: "01a05b00-0003-7000-8000-000000000004",
  completion: "01a05b00-0004-7000-8000-000000000005",
  watchHandoff: "01a05b00-0005-7000-8000-000000000006",
  refusedHandoff: "01a05b00-0006-7000-8000-000000000007",
});

const cwd = await mkdtemp(path.join(os.tmpdir(), "engramport-packed-surface-"));
const exists = (relative) => access(path.join(cwd, relative)).then(() => true, () => false);
try {
  for (const relative of ["actors", "events/alice", "events/bob", "artifacts/alice", "artifacts/bob", "threads"]) {
    await mkdir(path.join(cwd, relative), { recursive: true });
  }
  await writeFile(path.join(cwd, "engramport.yaml"), "protocol: engramport-git-v0\nproject: packed-surface\nmode: strict_relay\ndefault_thread_mode: strict_relay\n");
  for (const actor of ["alice", "bob"]) {
    await writeFile(path.join(cwd, "actors", `${actor}.yaml`), `schema_version: 0\nslug: ${actor}\ndisplay_name: ${actor}\nkind: agent\nprovider: synthetic\ncapabilities: [testing]\nevent_directory: events/${actor}\nartifact_prefix: artifacts/${actor}\n`);
  }

  const alice = createClient({ actor: "alice", cwd });
  const bob = createClient({ actor: "bob", cwd });
  const seed = await alice.append({ thread: "surface-seed", type: "message", body: "seed\n" }, { id: ids.seed });
  const handoff = await alice.handoff({
    thread: "surface-reply", body: "reply work\n", next: "bob",
    boundedContext: [{ type: "event", event_id: seed.event_id }],
    completionCriteria: [{ id: "reply", statement: "Reply.", evidence_classes: ["event"] }],
  }, { id: ids.handoff });
  const reply = await bob.reply({ thread: "surface-reply", inReplyTo: handoff.event_id, body: "replied\n", next: null }, { id: ids.reply });
  const completionHandoff = await alice.handoff({
    thread: "surface-complete", body: "complete work\n", next: "bob",
    boundedContext: [{ type: "event", event_id: seed.event_id }],
    completionCriteria: [{ id: "complete", statement: "Complete.", evidence_classes: ["event"] }],
  }, { id: ids.completionHandoff });
  const completion = await bob.complete({
    thread: "surface-complete", inReplyTo: completionHandoff.event_id, body: "completed\n", next: null,
    criteriaResults: [{ criterion_id: "complete", status: "satisfied", evidence: [{ type: "event", event_id: seed.event_id }] }],
  }, { id: ids.completion });
  const watchHandoff = await alice.handoff({
    thread: "surface-watch", body: "watch work\n", next: "bob",
    boundedContext: [{ type: "event", event_id: seed.event_id }],
    completionCriteria: [{ id: "wake", statement: "Wake.", evidence_classes: ["event"] }],
  }, { id: ids.watchHandoff });

  for (const [method, result] of Object.entries({ append: seed, handoff, reply, complete: completion, watchHandoff })) {
    assert.equal(result.ok, true, `${method} must report acceptance`);
    assert.equal(await exists(result.relative), true, `${method} must write the reported event`);
  }

  const inbox = await bob.inbox();
  const inboxEntries = await bob.inbox({ entries: true });
  assert.deepEqual(inbox, [watchHandoff.relative]);
  assert.equal(inboxEntries[0].event_id, watchHandoff.event_id);

  const store = new FileWatchStore(path.join(cwd, "runtime/watch.json"));
  const runner = new RecordingRunner();
  const watch = bob.createPortWatch({ store, runner, state: async () => "git-v1:packed-surface" });
  await watch.configure("bob", "packed-surface", { enabled: true });
  const wake = await watch.tick("bob", "packed-surface");
  assert.equal(wake.action, "wake");
  assert.equal(wake.event.event_id, watchHandoff.event_id);
  assert.equal(runner.invocations.length, 1);

  const beforeRefusal = (await readdir(path.join(cwd, "events/alice"))).length;
  const refused = await alice.handoff({
    thread: "surface-refused", body: "invalid empty context\n", next: "bob", boundedContext: [],
    completionCriteria: [{ id: "refused", statement: "Refuse.", evidence_classes: ["event"] }],
  }, { id: ids.refusedHandoff });
  assert.equal(refused.ok, false, "invalid handoff must report refusal rather than success");
  assert.match(refused.errors.join("\n"), /bounded_context must contain 1-32 references/);
  assert.equal(await exists(refused.relative), false, "a refused handoff must not write its candidate path");
  assert.equal((await readdir(path.join(cwd, "events/alice"))).length, beforeRefusal);

  console.log("SDK_PUBLISHED_SURFACE append=written handoff=written reply=written complete=written inbox=observed watch=woke invalid_handoff=refused");
} finally {
  await rm(cwd, { recursive: true, force: true });
}
