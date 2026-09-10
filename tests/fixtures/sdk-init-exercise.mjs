import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, readlink, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const [bin, selected = "all"] = process.argv.slice(2);
const expectedFiles = [".gitattributes", "actors/clean-builder.yaml", "artifacts/clean-builder/.gitkeep", "engramport.yaml", "events/clean-builder/.gitkeep"];
const defaults = ["init", "--actor", "clean-builder", "--kind", "agent"];

async function snapshot(cwd, prefix = "") {
  const files = {};
  for (const entry of (await readdir(path.join(cwd, prefix), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const relative = path.join(prefix, entry.name);
    if (entry.isDirectory()) Object.assign(files, await snapshot(cwd, relative));
    else files[relative] = createHash("sha256").update(entry.isSymbolicLink() ? await readlink(path.join(cwd, relative)) : await readFile(path.join(cwd, relative))).digest("hex");
  }
  return files;
}

function run(args, cwd) {
  const result = spawnSync(bin, args, { cwd, encoding: "utf8" });
  assert.ifError(result.error);
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

async function refusal(name, args, code, prepare = async () => {}) {
  if (selected !== "all" && selected !== name) return;
  const cwd = await mkdtemp(path.join(os.tmpdir(), "sdk-init-refusal-"));
  try {
    await prepare(cwd);
    const before = await snapshot(cwd);
    const beforeEntries = (await readdir(cwd, { recursive: true })).sort();
    const result = run(args, cwd);
    const after = await snapshot(cwd);
    console.log(JSON.stringify({ case: name, ...result, before, after }));
    assert.equal(result.status, 1, `${name}: refusal status`);
    assert.ok(result.stderr.includes(`${code}:`), `${name}: named refusal ${code}`);
    if (name === "existing-project") assert.match(result.stderr, /CONTRIBUTING\.md/);
    assert.deepEqual(after, before, `${name}: every file digest unchanged`);
    assert.deepEqual((await readdir(cwd, { recursive: true })).sort(), beforeEntries, `${name}: nothing created`);
  } finally { await rm(cwd, { recursive: true, force: true }); }
}

if (selected === "all" || selected === "success") {
  for (const [kind, mode] of [["agent", "free_form"], ["human", "strict_relay"]]) {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "sdk-init-success-"));
    try {
      const args = kind === "agent" ? defaults : ["init", "--actor", "clean-builder", "--kind", kind, "--mode", mode, "--project", "custom-project"];
      const initialized = run(args, cwd);
      assert.equal(initialized.status, 0, initialized.stderr);
      const files = await snapshot(cwd);
      assert.deepEqual(Object.keys(files).sort(), expectedFiles);
      assert.deepEqual((await readdir(cwd, { recursive: true })).sort(), [
        ...expectedFiles, "actors", "artifacts", "artifacts/clean-builder", "events", "events/clean-builder",
      ].sort(), "init creates only the five files and their parent directories");
      for (const file of expectedFiles.filter((file) => file.endsWith(".gitkeep"))) {
        assert.equal(await readFile(path.join(cwd, file), "utf8"), "");
      }
      assert.match(await readFile(path.join(cwd, "actors/clean-builder.yaml"), "utf8"), new RegExp(`^kind: ${kind}$`, "m"));
      const config = await readFile(path.join(cwd, "engramport.yaml"), "utf8");
      assert.match(config, new RegExp(`^default_thread_mode: ${mode}$`, "m"));
      assert.match(config, new RegExp(`^project: ${kind === "agent" ? "my-project" : "custom-project"}$`, "m"));
      const zero = run(["verify"], cwd);
      assert.equal(zero.status, 0, zero.stderr);
      assert.match(zero.stdout, /verified 0 events/);
      // Body input lives outside the scaffold, so init's file set stays exact.
      const body = path.join(path.dirname(cwd), `${path.basename(cwd)}-body.txt`);
      try {
        await writeFile(body, "First packed CLI event.\n");
        const appended = run(["append", "--actor", "clean-builder", "--thread", "kickoff", "--type", "message", "--body", body, "--next", "null"], cwd);
        assert.equal(appended.status, 0, appended.stderr);
        const one = run(["verify"], cwd);
        assert.equal(one.status, 0, one.stderr);
        assert.match(one.stdout, /verified 1 events/);
        console.log(JSON.stringify({ case: "success", kind, mode, files, zero: zero.stdout.trim(), append: appended.stdout.trim(), one: one.stdout.trim() }));
      } finally { await rm(body, { force: true }); }
    } finally { await rm(cwd, { recursive: true, force: true }); }
  }
}

await refusal("existing-project", defaults, "INIT_PROJECT_EXISTS", async (cwd) => {
  await writeFile(path.join(cwd, "engramport.yaml"), "existing project\n");
  await mkdir(path.join(cwd, "nested"));
  await writeFile(path.join(cwd, "nested/evidence.txt"), "preserve every file\n");
});
await refusal("invalid-slug", ["init", "--actor", "Bad-slug", "--kind", "agent"], "INIT_ACTOR_REFUSED");
await refusal("missing-actor", ["init", "--kind", "agent"], "INIT_ACTOR_REFUSED");
await refusal("missing-kind", ["init", "--actor", "clean-builder"], "INIT_KIND_REQUIRED");
await refusal("invalid-kind", ["init", "--actor", "clean-builder", "--kind", "robot"], "INIT_KIND_REFUSED");
await refusal("invalid-mode", [...defaults, "--mode", "coordinator_led"], "INIT_MODE_REFUSED");
await refusal("invalid-project", [...defaults, "--project", "bad\nmode: injected"], "INIT_PROJECT_REFUSED");
await refusal("existing-actor", defaults, "INIT_PATH_EXISTS", async (cwd) => {
  await mkdir(path.join(cwd, "actors"));
  await writeFile(path.join(cwd, "actors/clean-builder.yaml"), "different actor content\n");
});
await refusal("nonempty", defaults, "INIT_NOT_EMPTY", async (cwd) => {
  await writeFile(path.join(cwd, "unrelated.txt"), "leave alone\n");
});
await refusal("symlink-parent", defaults, "INIT_NOT_EMPTY", async (cwd) => {
  const outside = await mkdtemp(path.join(os.tmpdir(), "sdk-init-outside-"));
  // Empty target is removed immediately after making the dangling link.
  await symlink(outside, path.join(cwd, "actors"));
  await rm(outside, { recursive: true });
});
await refusal("unknown-flag", [...defaults, "--force", "true"], "ARGUMENT_REFUSED");

if (selected === "exclusive-write") {
  // The mutation harness injects a concurrent file immediately before the write.
  const cwd = await mkdtemp(path.join(os.tmpdir(), "sdk-init-exclusive-"));
  try {
    const result = run(defaults, cwd);
    const content = await readFile(path.join(cwd, "engramport.yaml"), "utf8");
    console.log(JSON.stringify({ case: selected, ...result, content }));
    assert.equal(result.status, 1, "exclusive-write: competing file must refuse");
    assert.match(result.stderr, /EEXIST/);
    assert.equal(content, "competing writer\n", "exclusive-write: never overwrite competing file");
  } finally { await rm(cwd, { recursive: true, force: true }); }
}
