import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));
const rulesFile = process.env.REPOSITORY_RULES_FILE ?? new URL("../AGENTS.md", import.meta.url);
const rulesLabel = rulesFile instanceof URL ? fileURLToPath(rulesFile) : rulesFile;
const actorRule = "Actor-owned surfaces are the `event_directory` and `artifact_prefix` declared in each `actors/*.yaml` record.";
const legacyActorRule = "Create files only in `events/<your-slug>/` and artifacts only in your assigned artifact prefix.";
const sharedRule = "Shared editable surfaces are every tracked path outside `events/` and `artifacts/`: source, tests, documentation, configuration, and migrations.";
const broadFileBan = "Never force-push or overwrite another actor's file.";

function field(record, name, source) {
  const value = record.match(new RegExp(`^${name}:\\s*(\\S+)\\s*$`, "m"))?.[1];
  assert.ok(value, `${source}: missing ${name}`);
  return value;
}

function inSurface(path, prefix) {
  return path === prefix || path.startsWith(`${prefix}/`);
}

test("tracked repository paths are accounted for by the written surface rules", async () => {
  const rules = await readFile(rulesFile, "utf8");
  const actors = [];
  for (const name of (await readdir(new URL("../actors/", import.meta.url))).filter((entry) => entry.endsWith(".yaml")).sort()) {
    const record = await readFile(new URL(`../actors/${name}`, import.meta.url), "utf8");
    actors.push({
      slug: field(record, "slug", name),
      eventDirectory: field(record, "event_directory", name),
      artifactPrefix: field(record, "artifact_prefix", name),
    });
  }
  assert.equal(new Set(actors.map(({ slug }) => slug)).size, actors.length, "actor slugs must be unique");
  assert.equal(new Set(actors.map(({ eventDirectory }) => eventDirectory)).size, actors.length, "actor event directories must be unique");
  assert.equal(new Set(actors.map(({ artifactPrefix }) => artifactPrefix)).size, actors.length, "actor artifact prefixes must be unique");

  const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: root }).toString("utf8").split("\0").filter(Boolean);
  const actorOwnershipDeclared = rules.includes(actorRule) || rules.includes(legacyActorRule);
  const broadBanDeclared = rules.includes(broadFileBan);
  const sharedEditingDeclared = rules.includes(sharedRule) && !broadBanDeclared;
  const classifications = tracked.map((path) => {
    if (path === "events" || path.startsWith("events/")) {
      const actor = actorOwnershipDeclared && actors.find(({ eventDirectory }) => inSurface(path, eventDirectory));
      return { path, surface: actor ? `event:${actor.slug}` : null };
    }
    if (path === "artifacts" || path.startsWith("artifacts/")) {
      const actor = actorOwnershipDeclared && actors.find(({ artifactPrefix }) => inSurface(path, artifactPrefix));
      return { path, surface: actor ? `artifact:${actor.slug}` : null };
    }
    return { path, surface: sharedEditingDeclared ? "shared" : null };
  });
  const unaccounted = classifications.filter(({ surface }) => surface === null).map(({ path }) => path);
  console.log(`REPOSITORY_SURFACE_POLICY tracked=${tracked.length} actor_rule=${actorOwnershipDeclared} shared_rule=${sharedEditingDeclared} broad_ban=${broadBanDeclared} unaccounted=${unaccounted.length}`);
  assert.deepEqual(unaccounted, [], `tracked paths not accounted for by ${rulesLabel}:\n${unaccounted.join("\n")}`);
});
