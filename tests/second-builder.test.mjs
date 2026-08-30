import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const sdk = await import(process.env.ENGRAMPORT_SDK_MODULE ?? "@engramport/sdk");

const ids = Object.freeze({
  published: "01a05400-0001-7000-8000-000000000001",
  handoff: "01a05400-0002-7000-8000-000000000002",
  completion: "01a05400-0003-7000-8000-000000000003",
  impersonation: "01a05400-0004-7000-8000-000000000004",
});

async function fixture() {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "engramport-second-builder-"));
  for (const directory of [
    "actors", "events/builder-one", "events/builder-two",
    "artifacts/builder-one", "artifacts/builder-two", "threads", "runtime",
  ]) await mkdir(path.join(cwd, directory), { recursive: true });
  await writeFile(path.join(cwd, "engramport.yaml"), [
    "protocol: engramport-git-v0",
    "project: second-builder-test",
    "mode: strict_relay",
    "default_thread_mode: strict_relay",
    "",
  ].join("\n"));
  for (const actor of ["builder-one", "builder-two"]) {
    await writeFile(path.join(cwd, "actors", `${actor}.yaml`), [
      "schema_version: 0",
      `slug: ${actor}`,
      `display_name: ${actor}`,
      "kind: agent",
      "provider: synthetic",
      "capabilities: [implementation, testing]",
      `event_directory: events/${actor}`,
      `artifact_prefix: artifacts/${actor}`,
      "",
    ].join("\n"));
  }
  return cwd;
}

test("synthetic second builder completes the public SDK path and exposes the authorization gaps", async () => {
  const cwd = await fixture();
  try {
    const builderOne = sdk.createClient({ actor: "builder-one", cwd });
    const builderTwo = sdk.createClient({ actor: "builder-two", cwd });

    const published = await builderTwo.append({
      thread: "second-builder-publish", type: "message", body: "builder two is present\n",
    }, { id: ids.published });
    assert.equal(published.ok, true);
    assert.deepEqual(await builderTwo.inbox(), []);

    const handoff = await builderOne.handoff({
      thread: "second-builder-work",
      body: "complete this bounded synthetic task\n",
      next: "builder-two",
      boundedContext: [{ type: "event", event_id: published.event_id }],
      completionCriteria: [{
        id: "round-trip",
        statement: "Builder two returns a completion with event evidence.",
        evidence_classes: ["event"],
      }],
    }, { id: ids.handoff });
    const inbox = await builderTwo.inbox({ entries: true });
    assert.deepEqual(inbox.map(({ event_id }) => event_id), [handoff.event_id]);

    const completion = await builderTwo.complete({
      thread: "second-builder-work",
      inReplyTo: handoff.event_id,
      body: "bounded synthetic task complete\n",
      next: null,
      criteriaResults: [{
        criterion_id: "round-trip",
        status: "satisfied",
        evidence: [{ type: "event", event_id: published.event_id }],
      }],
    }, { id: ids.completion });
    assert.equal(completion.ok, true);
    assert.deepEqual(await builderTwo.inbox(), []);
    const completionSource = await readFile(path.join(cwd, completion.relative), "utf8");
    assert.match(completionSource, /^type: completion$/m);
    assert.match(completionSource, /^from: builder-two$/m);
    assert.match(completionSource, new RegExp(`^in_reply_to: ${handoff.event_id}$`, "m"));
    assert.match(completionSource, /"criterion_id":"round-trip","status":"satisfied"/);

    // This deliberately records F111 rather than fixing it: the caller can select
    // another registered actor because the SDK has no authenticated caller binding.
    const builderTwoAsBuilderOne = sdk.createClient({ actor: "builder-one", cwd });
    const impersonated = await builderTwoAsBuilderOne.append({
      thread: "second-builder-impersonation", type: "message", body: "authored by builder two as builder one\n",
    }, { id: ids.impersonation });
    assert.equal(impersonated.ok, true);
    assert.match(await readFile(path.join(cwd, impersonated.relative), "utf8"), /^from: builder-one$/m);

    const controlFile = path.join(cwd, "runtime", "watch.json");
    const ownerStore = new sdk.FileWatchStore(controlFile);
    const ownerWatch = builderOne.createPortWatch({
      store: ownerStore,
      runner: new sdk.RecordingRunner(),
      state: async () => "git-v1:second-builder",
    });
    await ownerWatch.configure("builder-one", "shared-project", { enabled: true });

    // File disposition has no caller identity either. Anyone with the shared path
    // can read and mutate another builder's control state through the exported store.
    const attackerStore = new sdk.FileWatchStore(controlFile);
    const observed = await attackerStore.read();
    assert.equal(observed.agents["builder-one:shared-project"].status, "enabled");
    await attackerStore.transaction((state) => {
      state.agents["builder-one:shared-project"].status = "stopped";
      state.events.push({ kind: "second-builder.cross-builder-write", agent: "builder-one", project: "shared-project" });
      return state;
    });
    const tampered = await ownerStore.read();
    assert.equal(tampered.agents["builder-one:shared-project"].status, "stopped");
    assert.equal(tampered.events.at(-1).kind, "second-builder.cross-builder-write");

    console.log("SECOND_BUILDER_SDK append=accepted inbox=discovered completion=accepted impersonation=accepted disposition_read=accepted disposition_write=accepted");
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});
