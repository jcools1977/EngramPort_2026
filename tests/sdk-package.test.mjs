import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { INIT_PATHS } from "../packages/git-adapter/src/init.mjs";
import { assertHelp } from "./helpers/cli-help-contract.mjs";

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

test("F167 CLI help documents JSON filenames and shapes, and missing documentation is killed", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "engramport-help-"));
  try {
    const cli = new URL("../packages/git-adapter/src/cli.mjs", import.meta.url);
    const source = await readFile(cli, "utf8");
    const relocated = (text) => text.replace(/from "(\.\/[^"]+)"/g, (_, relative) => `from ${JSON.stringify(new URL(relative, cli).href)}`);
    const baseline = path.join(directory, "baseline.mjs");
    await writeFile(baseline, relocated(source));
    const invoke = (file, args) => execute(process.execPath, ["--input-type=module", "-e", `const { run } = await import(${JSON.stringify(file)}); process.exitCode = await run(${JSON.stringify(args)});`], directory);
    for (const command of [[], ["append"], ["init"], ["verify"], ["inbox"], ["thread"], ["thread", "declare"], ["welcome", "verify"], ["setup", "compile"], ["setup", "dry-run"]]) {
      assertHelp(invoke(baseline, [...command, "--help"]));
    }
    assert.deepEqual(await readdir(directory), ["baseline.mjs"], "help must not create a project");
    // Compare the exact same output control against the pre-fix CLI and mutants.
    const old = path.join(directory, "before.mjs");
    await writeFile(old, relocated(execute("git", ["show", "HEAD:packages/git-adapter/src/cli.mjs"], root)));
    const before = spawnSync(process.execPath, ["--input-type=module", "-e", `const { run } = await import(${JSON.stringify(old)}); process.exitCode = await run(["append", "--help"]);`], { cwd: directory, encoding: "utf8" });
    // Only require the historical refusal while HEAD still predates the fix.
    if (before.status !== 0) {
      assert.match(before.stderr, /ARGUMENT_REFUSED: unrecognized flag --help/);
      console.log(`F167_HELP_BEFORE exit=${before.status} ARGUMENT_REFUSED`);
    }
    for (const flag of ["bounded-context", "completion-criteria", "criteria-results"]) {
      const mutant = path.join(directory, `${flag}.mjs`);
      const changed = source.replaceAll(`--${flag} JSON_FILE`, "UNDOCUMENTED");
      assert.notEqual(changed, source);
      await writeFile(mutant, relocated(changed));
      const output = invoke(mutant, ["append", "--help"]);
      assert.throws(() => assertHelp(output), new RegExp(`missing JSON filename documentation: ${flag}`));
      console.log(`F167_HELP_MUTATION flag=${flag} cli_exit=0 control=failed killed=true`);
    }
    assertHelp(invoke(baseline, ["append", "--help"]));
    console.log("F167_HELP baseline=passed executed=3 killed=3 restored=passed");
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("F167 README walkthrough executes unchanged against a packed tarball", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "engramport-readme-"));
  try {
    const packed = await pack(directory);
    const consumer = path.join(directory, "empty");
    await mkdir(consumer);
    assert.deepEqual(await readdir(consumer), []);
    const readme = await readFile(path.join(root, "README.md"), "utf8");
    const walkthrough = readme.split("<!-- second-builder:start -->")[1]?.split("<!-- second-builder:end -->")[0];
    assert.ok(walkthrough, "README walkthrough markers are required");
    const blocks = [...walkthrough.matchAll(/```sh\n([\s\S]*?)\n```/g)].map((match) => match[1]);
    assert.equal(blocks.length, 3);
    const script = blocks.join("\n");
    const result = spawnSync("bash", ["-evx", "-o", "pipefail"], {
      cwd: consumer, input: script, encoding: "utf8", maxBuffer: 4 * 1024 * 1024,
      env: { ...process.env, ENGRAM_SDK: packed.tarball, npm_config_offline: "true", npm_config_cache: path.join(directory, "cache") },
    });
    const digest = execute("shasum", ["-a", "256", packed.tarball], directory).trim();
    if (process.env.F167_TRANSCRIPT) await writeFile(process.env.F167_TRANSCRIPT,
      `Packed with npm pack --silent --json --cache <temporary-cache> --pack-destination <temporary-directory> in packages/sdk.\nshasum -a 256: ${digest}\nEmpty starting directory: ${consumer}\nENGRAM_SDK=${packed.tarball}\nnpm_config_offline=true\nnpm_config_cache=${path.join(directory, "cache")}\nCommand: bash -evx -o pipefail (stdin is the three README sh blocks, unchanged)\nExit: ${result.status}\n\nSTDERR (verbatim commands and shell trace):\n${result.stderr}\nSTDOUT:\n${result.stdout}`);
    assert.equal(result.status, 0, `${result.stderr}\n${result.stdout}`);
    assert.match(result.stdout, /verified 2 events across 1 thread\(s\) and 2 actors/);
    assert.match(result.stdout, /No open events addressed to builder/);
    const bin = path.join(consumer, "tools/node_modules/.bin/engram");
    assertHelp(execute(bin, ["--help"], consumer));
    assertHelp(execute(bin, ["append", "--help"], consumer));
    console.log("F167_WALKTHROUGH blocks=3 unchanged=true offline=true events=2 threads=1 actors=2 packed_help=passed");
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("publishable SDK manifest exposes only the bundled artifact", async () => {
  const manifest = JSON.parse(await readFile(path.join(packageRoot, "package.json"), "utf8"));
  // Publication authorized by DeVere, ADR 0048. The gate moves from "never publish"
  // to "publish correctly": scoped packages must declare public access explicitly,
  // or a free org rejects the publish.
  assert.equal(manifest.private, undefined, "publication is authorized; private must be absent");
  assert.equal(manifest.publishConfig.access, "public", "a scoped package must declare public access");
  assert.equal(manifest.name, "@engramport/sdk", "the unscoped engramport package is not replaced (ADR 0048)");
  assert.equal(manifest.exports["."], "./dist/index.mjs");
  assert.deepEqual(manifest.bin, { engram: "dist/cli.mjs" });
  assert.deepEqual(manifest.files, ["dist", "README.md"]);
  assert.equal(manifest.license, "MIT");
  assert.equal(manifest.repository.directory, "packages/sdk");

  const directory = await mkdtemp(path.join(os.tmpdir(), "engramport-sdk-pack-list-"));
  try {
    const { result } = await pack(directory);
    const files = result.files.map(({ path: relative }) => relative).sort();
    assert.ok(files.includes("dist/index.mjs"));
    assert.ok(files.includes("dist/cli.mjs"));
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
    assert.deepEqual(INIT_PATHS, ["engramport.yaml", "actors/<slug>.yaml", "events/<slug>/.gitkeep", "artifacts/<slug>/.gitkeep"]);
    await writeFile(path.join(consumer, "init-exercise.mjs"), await readFile(path.join(root, "tests/fixtures/sdk-init-exercise.mjs"), "utf8"));
    const initOutput = execute("node", ["init-exercise.mjs", path.join(consumer, "node_modules/.bin/engram")], consumer);
    console.log(initOutput.trim());
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
