import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const packageRoot = process.env.SDK_PACKAGE_ROOT ?? path.join(root, "packages/sdk");

function execute(command, args, cwd) {
  return execFileSync(command, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

async function pack(destination) {
  const output = execute("npm", [
    "pack", "--silent", "--json", "--cache", path.join(destination, ".npm-cache"), "--pack-destination", destination,
  ], packageRoot);
  const jsonStart = output.lastIndexOf("[\n  {");
  assert.notEqual(jsonStart, -1, "npm pack must end with its JSON manifest");
  const [result] = JSON.parse(output.slice(jsonStart));
  assert.ok(result?.filename, "npm pack must return a tarball filename");
  return { result, tarball: path.join(destination, result.filename) };
}

test("publishable SDK manifest exposes only the bundled artifact", async () => {
  const manifest = JSON.parse(await readFile(path.join(packageRoot, "package.json"), "utf8"));
  // Publication authorized by DeVere, ADR 0048. The gate moves from "never publish"
  // to "publish correctly": scoped packages must declare public access explicitly,
  // or a free org rejects the publish.
  assert.equal(manifest.private, undefined, "publication is authorized; private must be absent");
  assert.equal(manifest.publishConfig.access, "public", "a scoped package must declare public access");
  assert.equal(manifest.name, "@engramport/sdk", "the unscoped engramport package is not replaced (ADR 0048)");
  assert.equal(manifest.exports["."], "./dist/index.mjs");
  assert.deepEqual(manifest.files, ["dist", "README.md"]);
  assert.equal(manifest.license, "MIT");
  assert.equal(manifest.repository.directory, "packages/sdk");

  const directory = await mkdtemp(path.join(os.tmpdir(), "engramport-sdk-pack-list-"));
  try {
    const { result } = await pack(directory);
    const files = result.files.map(({ path: relative }) => relative).sort();
    assert.ok(files.includes("dist/index.mjs"));
    assert.ok(files.includes("README.md"));
    assert.ok(files.includes("package.json"));
    assert.equal(files.some((relative) => relative.startsWith("src/")), false, "source-relative imports must not ship");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("packed SDK installs outside repository, imports, and appends", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "engramport-sdk-clean-install-"));
  try {
    const packed = await pack(directory);
    const consumer = path.join(directory, "consumer");
    await writeFile(path.join(directory, "package.json"), "{}");
    execute("npm", [
      "install", "--ignore-scripts", "--no-audit", "--no-fund", "--cache", path.join(directory, ".npm-cache"),
      "--prefix", consumer, packed.tarball,
    ], directory);
    await writeFile(path.join(consumer, "package.json"), '{"type":"module"}\n');
    await writeFile(path.join(consumer, "exercise.mjs"), `
      import assert from "node:assert/strict";
      import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
      import os from "node:os";
      import path from "node:path";
      import { createClient } from "@engramport/sdk";
      const cwd = await mkdtemp(path.join(os.tmpdir(), "engramport-packed-operation-"));
      try {
        for (const relative of ["actors", "events/clean-builder", "artifacts/clean-builder", "threads"]) await mkdir(path.join(cwd, relative), { recursive: true });
        await writeFile(path.join(cwd, "engramport.yaml"), "protocol: engramport-git-v0\\nproject: packed-sdk\\nmode: strict_relay\\ndefault_thread_mode: strict_relay\\n");
        await writeFile(path.join(cwd, "actors/clean-builder.yaml"), "schema_version: 0\\nslug: clean-builder\\ndisplay_name: Clean Builder\\nkind: agent\\nprovider: synthetic\\ncapabilities: [testing]\\nevent_directory: events/clean-builder\\nartifact_prefix: artifacts/clean-builder\\n");
        const client = createClient({ actor: "clean-builder", cwd });
        const result = await client.append({ thread: "packed-sdk", type: "message", body: "clean package append\\n" }, { id: "01a05a00-0000-7000-8000-000000000001" });
        assert.equal(result.ok, true);
        assert.match(await readFile(path.join(cwd, result.relative), "utf8"), /^from: clean-builder$/m);
        console.log("SDK_CLEAN_INSTALL package=imported append=accepted repository=absent");
      } finally { await rm(cwd, { recursive: true, force: true }); }
    `);
    const output = execute("node", ["exercise.mjs"], consumer);
    assert.match(output, /SDK_CLEAN_INSTALL package=imported append=accepted repository=absent/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("packed SDK exercises every client method and verifies promised writes", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "engramport-sdk-surface-install-"));
  try {
    const packed = await pack(directory);
    const consumer = path.join(directory, "consumer");
    await writeFile(path.join(directory, "package.json"), "{}");
    execute("npm", [
      "install", "--ignore-scripts", "--no-audit", "--no-fund", "--cache", path.join(directory, ".npm-cache"),
      "--prefix", consumer, packed.tarball,
    ], directory);
    await writeFile(path.join(consumer, "package.json"), '{"type":"module"}\n');
    await writeFile(
      path.join(consumer, "exercise.mjs"),
      await readFile(path.join(root, "tests/fixtures/sdk-package-surface-exercise.mjs"), "utf8"),
    );
    const output = execute("node", ["exercise.mjs"], consumer);
    assert.match(output, /SDK_PUBLISHED_SURFACE append=written handoff=written reply=written complete=written inbox=observed watch=woke invalid_handoff=refused/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
