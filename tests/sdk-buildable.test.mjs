// The published package must build from the source in this repository.
//
// The SDK source was unbuildable for a day and the suite stayed green, because
// nothing in it built the SDK. A package is published from source; a source
// nothing builds is a source nobody has checked. The parse error was a
// malformed export block, which every other check in the repository was
// structurally incapable of noticing.
//
// This is deliberately a build, not a lint. A lint would have caught this
// particular error; only a build catches the class.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "packages/sdk/dist/index.mjs");

test("the SDK builds from source", () => {
  rmSync(dist, { force: true });
  execFileSync("npm", ["run", "build", "--workspace", "@engramport/sdk"], {
    cwd: root, stdio: "pipe", encoding: "utf8",
  });
  assert.ok(existsSync(dist), "the build must produce dist/index.mjs");
});

test("the built package exports what deployments are told to import", async () => {
  const built = await import(`${dist}?t=${Date.now()}`);
  // Each of these is imported by a downstream deployment or documented as the
  // reason to publish. Losing one silently is the failure this guards.
  for (const name of [
    "createClient", "appendEvent", "listInbox",
    "TURN_REFUSALS", "decideTurnBefore", "decideTurnAfter", "demonstrateTurnBounds",
  ]) {
    assert.ok(name in built, `built package must export ${name}`);
  }
});

test("the built turn decision still refuses everything it should", async () => {
  const built = await import(`${dist}?t=${Date.now()}`);
  const run = built.demonstrateTurnBounds();
  assert.equal(run.baseline, true, "a healthy observation must be allowed");
  assert.equal(run.ok, true, "every bound must fire in the built artifact");
  assert.ok(run.results.length >= 9, `expected at least 9 bounds, got ${run.results.length}`);
});
