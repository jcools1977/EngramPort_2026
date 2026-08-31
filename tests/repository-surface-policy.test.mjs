import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));
const rulesFile = process.env.REPOSITORY_RULES_FILE ?? new URL("../AGENTS.md", import.meta.url);
const rulesLabel = rulesFile instanceof URL ? fileURLToPath(rulesFile) : rulesFile;
const actorRoot = process.env.REPOSITORY_ACTOR_ROOT ?? join(root, "actors");
const verifierSpecifier = process.env.GIT_ADAPTER_VERIFY_MODULE ?? pathToFileURL(join(root, "packages/git-adapter/src/verify-log.mjs")).href;
const { normalizeActorSurfaceIdentity, readActors } = await import(verifierSpecifier);
const actorRule = "Actor-owned surfaces are the `event_directory` and `artifact_prefix` declared in each `actors/*.yaml` record.";
const driftRule = "The actor registry `actors/*.yaml` is drift-checked against the checked-out commit, not protected across commits.";
const sharedDirectories = [
  ".github", ".openai", "app", "build", "db", "deploy", "docs", "drizzle", "examples",
  "migrations", "packages", "public", "schemas", "scripts", "tests", "threads", "worker",
];
const sharedRootFiles = [
  ".gitguard-allow", ".gitignore", "AGENTS.md", "CLAUDE.md", "ENGRAMPORT_ENGINEERING_SPEC.md",
  "LICENSE",
  "ONE PROJECT WHOLE FLEET.png", "PROTOCOL.md", "README.md",
  "SECURITY.md", "agent-c.env.example",
  "drizzle.config.ts", "engramport.yaml", "eslint.config.mjs", "next-env.d.ts", "next.config.ts",
  "oidc.env.example", "package-lock.json", "package.json", "postcss.config.mjs", "tsconfig.json",
  "vite.config.ts",
];
const sharedDirectoriesRule = "Shared editable directories are: `.github/`, `.openai/`, `app/`, `build/`, `db/`, `deploy/`, `docs/`, `drizzle/`, `examples/`, `migrations/`, `packages/`, `public/`, `schemas/`, `scripts/`, `tests/`, `threads/`, and `worker/`.";
const sharedRootFilesRule = "Shared editable root files are: `.gitguard-allow`, `.gitignore`, `AGENTS.md`, `CLAUDE.md`, `ENGRAMPORT_ENGINEERING_SPEC.md`, `LICENSE`, `ONE PROJECT WHOLE FLEET.png`, `PROTOCOL.md`, `README.md`, `SECURITY.md`, `agent-c.env.example`, `drizzle.config.ts`, `engramport.yaml`, `eslint.config.mjs`, `next-env.d.ts`, `next.config.ts`, `oidc.env.example`, `package-lock.json`, `package.json`, `postcss.config.mjs`, `tsconfig.json`, and `vite.config.ts`.";

function inSurface(path, prefix) {
  return path === prefix || path.startsWith(`${prefix}/`);
}

async function loadDriftCheckedActors(repositoryRoot = root, actorDirectory = actorRoot) {
  const expectedPaths = execFileSync("git", ["ls-tree", "-rz", "--name-only", "HEAD", "--", "actors"], { cwd: repositoryRoot })
    .toString("utf8").split("\0").filter((path) => path.endsWith(".yaml"));
  const expectedNames = expectedPaths.map((path) => path.slice("actors/".length)).sort();
  const actualNames = (await readdir(actorDirectory)).filter((entry) => entry.endsWith(".yaml")).sort();
  assert.deepEqual(actualNames, expectedNames, "actor registry dirty-tree drift detected: actor-record additions and removals differ from HEAD");

  for (const name of actualNames) {
    const record = await readFile(join(actorDirectory, name), "utf8");
    const committed = execFileSync("git", ["show", `HEAD:actors/${name}`], { cwd: repositoryRoot }).toString("utf8");
    assert.equal(record, committed, `actor registry dirty-tree drift detected: actors/${name} differs from HEAD`);
  }
  return [...(await readActors(repositoryRoot, actorDirectory, { strictSlugs: false })).values()];
}

test("actor registry dirty-tree drift is detected and actor-owned prefixes are normalized and disjoint", async () => {
  const actors = await loadDriftCheckedActors();
  console.log(`ACTOR_REGISTRY_DRIFT_CHECK actors=${actors.length} scope=dirty-tree normalized=true disjoint=true`);
});

test("registry drift check passes when a clean checkout committed materially wrong registry bytes", async () => {
  const directory = await mkdtemp(join(os.tmpdir(), "engramport-clean-wrong-registry-"));
  try {
    await mkdir(join(directory, "actors"));
    await mkdir(join(directory, "events", "agent-b"), { recursive: true });
    await mkdir(join(directory, "artifacts", "agent-b"), { recursive: true });
    const record = "slug: agent-b\nprovider: attacker-controlled\ncapabilities: [implementation, registry-admin]\nevent_directory: events/agent-b\nartifact_prefix: artifacts/agent-b\n";
    await writeFile(join(directory, "actors", "agent-b.yaml"), record);
    execFileSync("git", ["init", "-q"], { cwd: directory });
    execFileSync("git", ["config", "user.name", "Synthetic Test"], { cwd: directory });
    execFileSync("git", ["config", "user.email", "synthetic@example.invalid"], { cwd: directory });
    execFileSync("git", ["add", "actors/agent-b.yaml"], { cwd: directory });
    execFileSync("git", ["commit", "-qm", "commit wrong registry"], { cwd: directory });
    assert.equal((await loadDriftCheckedActors(directory, join(directory, "actors"))).length, 1);
    assert.match(await readFile(join(directory, "actors", "agent-b.yaml"), "utf8"), /provider: attacker-controlled/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("actor prefix comparison resolves symlinks and case-folds Unicode-normalized identities", async () => {
  const directory = await mkdtemp(join(os.tmpdir(), "engramport-actor-prefix-"));
  try {
    await mkdir(join(directory, "actors"));
    await mkdir(join(directory, "events", "agent-a"), { recursive: true });
    await mkdir(join(directory, "artifacts", "agent-a"), { recursive: true });
    await symlink(join(directory, "events", "agent-a"), join(directory, "events", "agent-alias"));
    await symlink(join(directory, "artifacts", "agent-a"), join(directory, "artifacts", "agent-alias"));
    for (const slug of ["agent-a", "agent-alias"]) {
      await writeFile(join(directory, "actors", `${slug}.yaml`), `slug: ${slug}\nevent_directory: events/${slug}\nartifact_prefix: artifacts/${slug}\n`);
    }
    await assert.rejects(readActors(directory, join(directory, "actors"), { strictSlugs: false }), /must be disjoint after realpath, case-folding, and Unicode normalization/);
    assert.equal(normalizeActorSurfaceIdentity("EVENTS/Cafe\u0301"), normalizeActorSurfaceIdentity("events/CAFÉ"));
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("tracked repository paths are covered only by explicit written surfaces", async () => {
  const rules = await readFile(rulesFile, "utf8");
  const actors = await loadDriftCheckedActors();
  const actorOwnershipDeclared = rules.includes(actorRule);
  const actorDriftDeclared = rules.includes(driftRule);
  const sharedEditingDeclared = rules.includes(sharedDirectoriesRule) && rules.includes(sharedRootFilesRule);
  const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: root }).toString("utf8").split("\0").filter(Boolean);
  const classifications = tracked.map((path) => {
    if (path.startsWith("events/")) {
      const actor = actorOwnershipDeclared && actors.find(({ eventDirectory }) => inSurface(path, eventDirectory));
      return { path, surface: actor ? `event:${actor.slug}` : null };
    }
    if (path.startsWith("artifacts/")) {
      const actor = actorOwnershipDeclared && actors.find(({ artifactPrefix }) => inSurface(path, artifactPrefix));
      return { path, surface: actor ? `artifact:${actor.slug}` : null };
    }
    if (path.startsWith("actors/") && path.endsWith(".yaml")) return { path, surface: actorDriftDeclared ? "drift:actor-registry-yaml" : null };
    if (sharedRootFiles.includes(path)) return { path, surface: sharedEditingDeclared ? "shared:file" : null };
    const topLevel = path.split("/", 1)[0];
    if (path.includes("/") && sharedDirectories.includes(topLevel)) return { path, surface: sharedEditingDeclared ? `shared:${topLevel}` : null };
    return { path, surface: null };
  });
  const unaccounted = classifications.filter(({ surface }) => surface === null).map(({ path }) => path);
  console.log(`REPOSITORY_SURFACE_POLICY tracked=${tracked.length} actor_rule=${actorOwnershipDeclared} drift_rule=${actorDriftDeclared} shared_rule=${sharedEditingDeclared} unaccounted=${unaccounted.length}`);
  assert.deepEqual(unaccounted, [], `tracked paths not accounted for by ${rulesLabel}:\n${unaccounted.join("\n")}`);
});
