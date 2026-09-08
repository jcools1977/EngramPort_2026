import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { appendFile, copyFile, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import test from "node:test";

const root = new URL("../", import.meta.url);
const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
const entry = (id, canonical_path = "canonical.js", bytes = "version one\n") => ({
  id, canonical_path, vendored_sha256: sha256(bytes),
  location: `downstream-${id}:lib/shared.js`, vendored_on: "2026-09-08",
});

async function fixture(t) {
  const base = new URL("artifacts/agent-b/", root);
  await mkdir(base, { recursive: true });
  const path = await mkdtemp(fileURLToPath(new URL("blast-radius-fixture-", base)));
  t.after(() => rm(path, { recursive: true, force: true }));
  for (const dir of ["scripts", "registry"]) await mkdir(`${path}/${dir}`);
  for (const file of ["package.json", "scripts/blast-radius.js"]) {
    await copyFile(new URL(file, root), `${path}/${file}`);
  }
  await writeFile(`${path}/canonical.js`, "version one\n");
  const registryPath = `${path}/registry/downstream-copies.json`;
  const register = copies => writeFile(registryPath, JSON.stringify({
    schema_version: 1, coverage: "registered-copies-only", copies,
  }, null, 2) + "\n");
  const run = () => {
    const result = spawnSync("npm", ["run", "blast-radius"], {
      cwd: path, encoding: "utf8", env: { ...process.env, npm_config_update_notifier: "false" },
    });
    assert.ifError(result.error);
    assert.equal(result.signal, null);
    const output = result.stdout + result.stderr;
    t.diagnostic(`npm run blast-radius; exit=${result.status}\n${output.trim()}`);
    assert.match(output, /registered copies only; unregistered copies are unknown/);
    return { code: result.status, output };
  };
  return { path, registryPath, register, run };
}

test("exactly separates planted current, stale, and broken registrations without skipping later entries", async t => {
  const f = await fixture(t);
  await f.register([
    entry("fresh"), entry("behind-a", "canonical.js", "old A"),
    entry("absent", "missing.js"), entry("behind-b", "canonical.js", "old B"),
    entry("fresh-last"),
  ]);
  const before = await readFile(f.registryPath, "utf8");
  const result = f.run();
  assert.equal(result.code, 1);
  const rows = result.output.split("\n").filter(line => /^(CURRENT|STALE|BROKEN) /.test(line));
  assert.deepEqual(rows.map(line => line.split(" ")[0]), ["CURRENT", "STALE", "BROKEN", "STALE", "CURRENT"]);
  for (const [index, id] of ["fresh", "behind-a", "absent", "behind-b", "fresh-last"].entries()) {
    assert.ok(rows[index].includes(`"${id}"`));
    assert.ok(rows[index].includes(`downstream-${id}:lib/shared.js`));
  }
  assert.match(rows[2], /canonical="missing.js".*canonical file absent/);
  assert.match(result.output, /current=2; stale=2; broken=1/);
  assert.equal(await readFile(f.registryPath, "utf8"), before);
});

test("all current passes; canonical mutation makes every dependent copy stale without registry changes", async t => {
  const f = await fixture(t);
  await writeFile(`${f.path}/unrelated.js`, "version one\n");
  await f.register([entry("alpha"), entry("beta"), entry("other", "unrelated.js")]);
  const before = await readFile(f.registryPath, "utf8");
  const clean = f.run();
  assert.equal(clean.code, 0);
  assert.match(clean.output, /current=3; stale=0; broken=0/);
  await appendFile(`${f.path}/canonical.js`, "upstream change\n");
  const changed = f.run();
  assert.equal(changed.code, 1);
  const stale = changed.output.split("\n").filter(line => line.startsWith("STALE "));
  assert.equal(stale.length, 2);
  for (const [index, id] of ["alpha", "beta"].entries()) {
    assert.ok(stale[index].includes(`"${id}" canonical="canonical.js" location="downstream-${id}:lib/shared.js"`));
  }
  assert.match(changed.output, /CURRENT .*"other"/);
  assert.equal(await readFile(f.registryPath, "utf8"), before);
  assert.equal(f.run().code, 1, "a second check must not rebaseline the registry");
  assert.equal(await readFile(f.registryPath, "utf8"), before);
});

test("an isolated absent canonical file is a broken registration and exits nonzero", async t => {
  const f = await fixture(t);
  await f.register([entry("missing", "absent.js")]);
  const result = f.run();
  assert.equal(result.code, 1);
  assert.match(result.output, /BROKEN registration .*"missing".*canonical file absent/);
  assert.match(result.output, /current=0; stale=0; broken=1/);
});

test("an unregistered file is ignored and empty coverage is explicit", async t => {
  const f = await fixture(t);
  await writeFile(`${f.path}/unregistered-copy.js`, "obsolete bytes\n");
  await f.register([entry("registered")]);
  assert.equal(f.run().code, 0);
  await f.register([]);
  const result = f.run();
  assert.equal(result.code, 0);
  assert.match(result.output, /No copies registered; this is not evidence of downstream currency/);
  assert.doesNotMatch(result.output, /unregistered-copy\.js/);
});

test("malformed entries fail without concealing valid entries", async t => {
  const f = await fixture(t);
  await f.register([
    null, { ...entry("bad-digest"), vendored_sha256: "no" },
    { ...entry("bad-date"), vendored_on: "2026-02-30" },
    { ...entry("no-location"), location: " " },
    entry("duplicate"), entry("duplicate"), entry("last"),
  ]);
  const result = f.run();
  assert.equal(result.code, 1);
  assert.match(result.output, /current=2; stale=0; broken=5/);
  assert.match(result.output, /CURRENT .*"last"/);
});

test("canonical paths cannot escape the repository directly or through a symlink", async t => {
  const f = await fixture(t);
  await symlink(fileURLToPath(new URL("package.json", root)), `${f.path}/escape.js`);
  await f.register([
    entry("traversal", "../outside.js"), entry("absolute", "/outside.js"), entry("symlink", "escape.js"),
  ]);
  const result = f.run();
  assert.equal(result.code, 1);
  assert.match(result.output, /current=0; stale=0; broken=3/);
  assert.match(result.output, /resolves outside this repository/);
});

test("missing and malformed registry fail closed while retaining the coverage statement", async t => {
  const f = await fixture(t);
  assert.equal(f.run().code, 1);
  await writeFile(f.registryPath, "{");
  assert.equal(f.run().code, 1);
  await writeFile(f.registryPath, JSON.stringify({ schema_version: 1, copies: [] }));
  const result = f.run();
  assert.equal(result.code, 1);
  assert.match(result.output, /Invalid registry schema or coverage declaration/);
});
