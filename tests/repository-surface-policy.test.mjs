import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));
const rulesFile = process.env.REPOSITORY_RULES_FILE ?? new URL("../AGENTS.md", import.meta.url);
const rulesLabel = rulesFile instanceof URL ? fileURLToPath(rulesFile) : rulesFile;
const actorRoot = process.env.REPOSITORY_ACTOR_ROOT ?? join(root, "actors");
const actorRule = "Actor-owned surfaces are the `event_directory` and `artifact_prefix` declared in each `actors/*.yaml` record.";
const protectedRule = "The actor registry `actors/*.yaml` is a protected surface, not an ordinary relay-editable surface.";
const sharedDirectories = [
  ".github", ".openai", "app", "build", "db", "deploy", "docs", "drizzle", "examples",
  "migrations", "packages", "public", "schemas", "scripts", "tests", "threads", "worker",
];
const sharedRootFiles = [
  ".gitguard-allow", ".gitignore", "AGENTS.md", "CLAUDE.md", "ENGRAMPORT_ENGINEERING_SPEC.md",
  "ONE PROJECT WHOLE FLEET.png", "PROTOCOL.md", "README.md", "agent-c.env.example",
  "drizzle.config.ts", "engramport.yaml", "eslint.config.mjs", "next-env.d.ts", "next.config.ts",
  "oidc.env.example", "package-lock.json", "package.json", "postcss.config.mjs", "tsconfig.json",
  "vite.config.ts",
];
const sharedDirectoriesRule = "Shared editable directories are: `.github/`, `.openai/`, `app/`, `build/`, `db/`, `deploy/`, `docs/`, `drizzle/`, `examples/`, `migrations/`, `packages/`, `public/`, `schemas/`, `scripts/`, `tests/`, `threads/`, and `worker/`.";
const sharedRootFilesRule = "Shared editable root files are: `.gitguard-allow`, `.gitignore`, `AGENTS.md`, `CLAUDE.md`, `ENGRAMPORT_ENGINEERING_SPEC.md`, `ONE PROJECT WHOLE FLEET.png`, `PROTOCOL.md`, `README.md`, `agent-c.env.example`, `drizzle.config.ts`, `engramport.yaml`, `eslint.config.mjs`, `next-env.d.ts`, `next.config.ts`, `oidc.env.example`, `package-lock.json`, `package.json`, `postcss.config.mjs`, `tsconfig.json`, and `vite.config.ts`.";

function field(record, name, source) {
  const value = record.match(new RegExp(`^${name}:\\s*(\\S+)\\s*$`, "m"))?.[1];
  assert.ok(value, `${source}: missing ${name}`);
  return value;
}

function inSurface(path, prefix) {
  return path === prefix || path.startsWith(`${prefix}/`);
}

function assertDisjoint(prefixes, label) {
  for (let index = 0; index < prefixes.length; index += 1) {
    for (let other = index + 1; other < prefixes.length; other += 1) {
      assert.ok(
        !inSurface(prefixes[index], prefixes[other]) && !inSurface(prefixes[other], prefixes[index]),
        `${label} must be disjoint: ${prefixes[index]} overlaps ${prefixes[other]}`,
      );
    }
  }
}

async function loadProtectedActors() {
  const expectedPaths = execFileSync("git", ["ls-tree", "-rz", "--name-only", "HEAD", "--", "actors"], { cwd: root })
    .toString("utf8").split("\0").filter((path) => path.endsWith(".yaml"));
  const expectedNames = expectedPaths.map((path) => path.slice("actors/".length)).sort();
  const actualNames = (await readdir(actorRoot)).filter((entry) => entry.endsWith(".yaml")).sort();
  assert.deepEqual(actualNames, expectedNames, "actor registry is protected: actor-record additions and removals are forbidden");

  const actors = [];
  for (const name of actualNames) {
    const record = await readFile(join(actorRoot, name), "utf8");
    const committed = execFileSync("git", ["show", `HEAD:actors/${name}`], { cwd: root }).toString("utf8");
    assert.equal(record, committed, `actor registry is protected: actors/${name} differs from HEAD`);
    const slug = field(record, "slug", name);
    const eventDirectory = field(record, "event_directory", name);
    const artifactPrefix = field(record, "artifact_prefix", name);
    assert.equal(eventDirectory, `events/${slug}`, `${name}: event_directory must match the append path for ${slug}`);
    assert.equal(artifactPrefix, `artifacts/${slug}`, `${name}: artifact_prefix must remain actor-specific`);
    actors.push({ slug, eventDirectory, artifactPrefix });
  }
  assert.equal(new Set(actors.map(({ slug }) => slug)).size, actors.length, "actor slugs must be unique");
  assertDisjoint(actors.map(({ eventDirectory }) => eventDirectory), "actor event directories");
  assertDisjoint(actors.map(({ artifactPrefix }) => artifactPrefix), "actor artifact prefixes");
  return actors;
}

test("actor registry is protected and actor-owned prefixes are disjoint", async () => {
  const actors = await loadProtectedActors();
  console.log(`ACTOR_REGISTRY_PROTECTION actors=${actors.length} protected=true disjoint=true`);
});

test("tracked repository paths are covered only by explicit written surfaces", async () => {
  const rules = await readFile(rulesFile, "utf8");
  const actors = await loadProtectedActors();
  const actorOwnershipDeclared = rules.includes(actorRule);
  const actorProtectionDeclared = rules.includes(protectedRule);
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
    if (path.startsWith("actors/")) return { path, surface: actorProtectionDeclared ? "protected:actor-registry" : null };
    if (sharedRootFiles.includes(path)) return { path, surface: sharedEditingDeclared ? "shared:file" : null };
    const topLevel = path.split("/", 1)[0];
    if (path.includes("/") && sharedDirectories.includes(topLevel)) return { path, surface: sharedEditingDeclared ? `shared:${topLevel}` : null };
    return { path, surface: null };
  });
  const unaccounted = classifications.filter(({ surface }) => surface === null).map(({ path }) => path);
  console.log(`REPOSITORY_SURFACE_POLICY tracked=${tracked.length} actor_rule=${actorOwnershipDeclared} protected_rule=${actorProtectionDeclared} shared_rule=${sharedEditingDeclared} unaccounted=${unaccounted.length}`);
  assert.deepEqual(unaccounted, [], `tracked paths not accounted for by ${rulesLabel}:\n${unaccounted.join("\n")}`);
});
