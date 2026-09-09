import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { chmod, cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { appendEvent } from "../packages/git-adapter/src/event-core.mjs";
import { decide, utcDay, USD_TICKS_PER_DOLLAR as T } from "../packages/agent-c-supervisor/src/spend-gate.mjs";

const root = path.resolve(import.meta.dirname, "..");
const moduleUrl = process.env.F158_LEDGER_MODULE ?? pathToFileURL(path.join(root, "packages/agent-c-supervisor/src/spend-ledger.mjs")).href;
const { spentTicksToday } = await import(moduleUrl);
const historical = process.env.F158_PRE_FIX === "1";
const day = utcDay(new Date());
const relative = "artifacts/agent-c/reviews/review.json";
const content = (ticks) => JSON.stringify({ review_completed_at: `${day}T12:00:00Z`, provider_cost: { cost_in_usd_ticks: ticks } });
const decision = async (roots) => decide({ disabled: false, spentTicks: await spentTicksToday(roots), capTicks: 10 * T, reserveTicks: T });

async function fixture(t, ticks = T) {
  const base = await mkdtemp(path.join(os.tmpdir(), "f158-ledger-"));
  t.after(() => rm(base, { recursive: true, force: true }));
  await cp(path.join(root, "actors"), path.join(base, "actors"), { recursive: true });
  await cp(path.join(root, "engramport.yaml"), path.join(base, "engramport.yaml"));
  for (const actor of ["agent-a", "agent-b", "agent-c"]) {
    await mkdir(path.join(base, "events", actor), { recursive: true });
    await mkdir(path.join(base, "artifacts", actor), { recursive: true });
  }
  await mkdir(path.join(base, "artifacts/agent-c/reviews"));
  const bytes = content(ticks);
  await writeFile(path.join(base, relative), bytes);
  const digest = createHash("sha256").update(bytes).digest("hex");
  await appendEvent({ actor: "agent-c", thread: "spend-fixture", type: "message", next: null, body: "Synthetic offline spend fixture.\n", artifacts: [`${relative}#sha256=${digest}`] }, { cwd: base });
  return base;
}
function observe(name, result) { console.log(`OBSERVED ${historical ? "pre-fix" : "production"} ${name} ${JSON.stringify(result)}`); }
function check(name, body) {
  if (!process.env.F158_CASE || process.env.F158_CASE === name) test(name, body);
}

check("unreadable-root", async (t) => {
  const readable = await fixture(t);
  const unreadable = await fixture(t, 10 * T);
  const dir = path.join(unreadable, "artifacts/agent-c/reviews");
  assert.equal((await decision([readable, unreadable])).code, "DAILY_CAP_REACHED");
  await chmod(dir, 0o000);
  try {
    await assert.rejects(readdir(dir), { code: "EACCES" });
    const result = await decision([readable, unreadable]);
    observe("permission=EACCES readableTicks=10000000000", result);
    if (historical) { assert.equal(result.allowed, true); assert.equal(result.spentTicks, T); }
    else assert.equal(result.code, "SPEND_UNREADABLE");
  } finally { await chmod(dir, 0o755); }
  assert.equal((await decision([readable, unreadable])).code, "DAILY_CAP_REACHED");
});

check("missing-root", async (t) => {
  const readable = await fixture(t);
  const fresh = await mkdtemp(path.join(os.tmpdir(), "f158-fresh-"));
  t.after(() => rm(fresh, { recursive: true, force: true }));
  const mixed = await decision([readable, fresh]);
  observe("missing-root-mixed", mixed);
  assert.equal(mixed.allowed, true);
  assert.equal(mixed.spentTicks, T);
  const alone = await decision([fresh]);
  observe("missing-root-alone", alone);
  if (historical) assert.equal(alone.code, "SPEND_UNREADABLE");
  else { assert.equal(alone.allowed, true); assert.equal(alone.spentTicks, 0); }
});

check("altered-bytes", async (t) => {
  const base = await fixture(t, 10 * T);
  assert.equal((await decision([base])).code, "DAILY_CAP_REACHED");
  await writeFile(path.join(base, relative), content(0));
  const result = await decision([base]);
  observe("altered-cost-to-zero", result);
  if (historical) { assert.equal(result.allowed, true); assert.equal(result.spentTicks, 0); }
  else assert.equal(result.code, "SPEND_UNREADABLE");
  await writeFile(path.join(base, relative), content(10 * T));
  assert.equal((await decision([base])).code, "DAILY_CAP_REACHED");
});

check("unreferenced-file", async (t) => {
  const base = await fixture(t);
  assert.equal((await decision([base])).spentTicks, T);
  const file = path.join(base, "artifacts/agent-c/reviews/planted.json");
  await writeFile(file, content(0));
  const result = await decision([base]);
  observe("unreferenced-zero-cost", result);
  if (historical) assert.equal(result.allowed, true);
  else assert.equal(result.code, "SPEND_UNREADABLE");
  await rm(file);
  assert.equal((await decision([base])).spentTicks, T);
});

check("invalid-event", async (t) => {
  const base = await fixture(t);
  const dir = path.join(base, "events/agent-c");
  const file = path.join(dir, (await readdir(dir))[0]);
  const original = await readFile(file, "utf8");
  await writeFile(file, original + "Unhashed event text.\n");
  const result = await decision([base]);
  observe("invalid-event", result);
  if (historical) assert.equal(result.allowed, true);
  else assert.equal(result.code, "SPEND_UNREADABLE");
  await writeFile(file, original);
  assert.equal((await decision([base])).spentTicks, T);
});

check("valid-sum", async (t) => {
  const first = await fixture(t, T);
  const second = await fixture(t, 2 * T);
  const result = await decision([first, second]);
  observe("unaltered-two-roots", result);
  assert.equal(result.allowed, true);
  assert.equal(result.spentTicks, 3 * T);
});

check("file-read-failure", async (t) => {
  const base = await fixture(t);
  const file = path.join(base, relative);
  await chmod(file, 0o000);
  try {
    await assert.rejects(readFile(file), { code: "EACCES" });
    const result = await decision([base]);
    observe("file-permission=EACCES", result);
    assert.equal(result.code, "SPEND_UNREADABLE");
  } finally { await chmod(file, 0o644); }
  assert.equal((await decision([base])).spentTicks, T);
});

// A deterministic filesystem interleaving, confined to the temporary fixture.
// The verifier reads the review first. The ledger reads it second.
check("post-verification-edit", async (t) => {
  const { default: fs } = await import("node:fs/promises");
  const { syncBuiltinESMExports } = await import("node:module");
  const base = await fixture(t, 10 * T);
  const file = path.join(base, relative);
  const originalRead = fs.readFile;
  let reads = 0;
  fs.readFile = async (target, ...args) => {
    if (String(target) === file && ++reads === 2) await writeFile(file, content(0));
    return originalRead(target, ...args);
  };
  syncBuiltinESMExports();
  try {
    const result = await decision([base]);
    observe("edit-after-verification", result);
    if (historical) assert.equal(result.code, "DAILY_CAP_REACHED");
    else { assert.ok(reads >= 2); assert.equal(result.code, "SPEND_UNREADABLE"); }
  } finally { fs.readFile = originalRead; syncBuiltinESMExports(); }
});

check("same-buffer-cost", async (t) => {
  const { default: fs } = await import("node:fs/promises");
  const { syncBuiltinESMExports } = await import("node:module");
  const base = await fixture(t, 10 * T);
  const file = path.join(base, relative);
  const originalRead = fs.readFile;
  let reads = 0;
  fs.readFile = async (target, ...args) => {
    if (String(target) === file && ++reads === 3) await writeFile(file, content(0));
    return originalRead(target, ...args);
  };
  syncBuiltinESMExports();
  try {
    const result = await decision([base]);
    observe("cost-buffer-interleaving", result);
    assert.equal(result.code, "DAILY_CAP_REACHED");
  } finally { fs.readFile = originalRead; syncBuiltinESMExports(); }
});
