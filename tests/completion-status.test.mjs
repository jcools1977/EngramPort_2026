// A completion must be able to report failure.
//
// The envelope previously accepted only `satisfied`. A builder that did the
// work published machine-readable results; a builder that was blocked could
// only write prose, so the structured record could not represent failure and
// any report derived from the log showed a blocked thread as identical to an
// unanswered one.
//
// Found by a builder refusing to relabel unperformed work as satisfied, and
// saying plainly that the envelope left it no honest option.
//
// These tests append real events and verify a real log. An earlier draft
// inspected the validator's source text for the string "unmet", which would
// have passed against a validator that never ran, and is the defect recorded
// as F149.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const { appendEvent } = await import("../packages/git-adapter/src/event-core.mjs");

function project() {
  const root = mkdtempSync(join(tmpdir(), "completion-status-"));
  for (const d of ["actors", "events/a", "artifacts/a", "threads"]) mkdirSync(join(root, d), { recursive: true });
  writeFileSync(join(root, "engramport.yaml"),
    "protocol: engramport-git-v0\nproject: t\nmode: free_form\ndefault_thread_mode: free_form\n");
  writeFileSync(join(root, "actors/a.yaml"),
    "slug: a\ndisplay_name: A\nkind: agent\nevent_directory: events/a\nartifact_prefix: artifacts/a\n");
  writeFileSync(join(root, "artifacts/a/e.md"), "evidence\n");
  return root;
}

async function completionWith(status) {
  const root = project();
  try {
    const handoff = await appendEvent({
      actor: "a", thread: "t", type: "handoff", body: "ask\n", next: "a",
      boundedContext: [{ type: "artifact", ref: "artifacts/a/e.md#sha256=" +
        (await import("node:crypto")).createHash("sha256").update("evidence\n").digest("hex") }],
      completionCriteria: [{ id: "c1", statement: "s", evidence_classes: ["artifact"] }],
    }, { cwd: root });
    if (!handoff.ok) return { stage: "handoff", ok: false, errors: handoff.errors };

    const id = readFileSync(join(root, handoff.relative), "utf8").match(/^id: (.*)$/m)[1];
    const done = await appendEvent({
      actor: "a", thread: "t", type: "completion", body: "done\n", next: null, reply: id,
      criteriaResults: [{
        criterion_id: "c1", status,
        evidence: [{ type: "artifact", ref: "artifacts/a/e.md#sha256=" +
          (await import("node:crypto")).createHash("sha256").update("evidence\n").digest("hex") }],
      }],
    }, { cwd: root });
    return { stage: "completion", ok: done.ok, errors: done.errors ?? [], root, written: done.ok };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("a completion reporting unmet is accepted and written", async () => {
  const r = await completionWith("unmet");
  assert.equal(r.stage, "completion", `handoff failed: ${(r.errors ?? []).join("; ")}`);
  assert.equal(r.ok, true, `unmet must be accepted, got: ${r.errors.join("; ")}`);
});

test("a completion reporting blocked is accepted and written", async () => {
  const r = await completionWith("blocked");
  assert.equal(r.ok, true, `blocked must be accepted, got: ${(r.errors ?? []).join("; ")}`);
});

test("satisfied still works, so widening did not break the success path", async () => {
  const r = await completionWith("satisfied");
  assert.equal(r.ok, true, `satisfied must still be accepted, got: ${(r.errors ?? []).join("; ")}`);
});

test("an invented status is still refused, so the vocabulary is closed", async () => {
  const r = await completionWith("probably-fine");
  assert.equal(r.ok, false, "an unknown status must be refused");
  assert.ok(r.errors.some((e) => /status must be one of/.test(e)),
    `expected a vocabulary error, got: ${r.errors.join("; ")}`);
});
