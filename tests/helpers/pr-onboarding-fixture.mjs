import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

function fenced(text, language) {
  const match = text.match(new RegExp("```" + language + "\\n([\\s\\S]*?)\\n```"));
  assert.ok(match, `${language} block is required`);
  return match[1];
}

export function parseOnboardingGuide(text) {
  const contract = JSON.parse(fenced(text, "onboarding-contract"));
  const proseStepIds = [...text.matchAll(/^\d+\. .*?`\[contract:([^\]]+)\]`/gm)].map((match) => match[1]);
  const contractStepIds = contract.steps.map(({ id }) => id);
  assert.deepEqual(proseStepIds, contractStepIds, "every onboarding operation must have exactly one ordered prose step");
  assert.equal(new Set(contractStepIds).size, contractStepIds.length, "onboarding step identifiers must be unique");
  return { contract, template: fenced(text, "actor-template") };
}

function command(root, executable, args) {
  return execFileSync(executable, args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function actorRecord(template, actor) {
  const values = {
    slug: actor.slug,
    display_name: actor.displayName,
    kind: actor.kind,
    provider: actor.provider,
    capabilities: actor.capabilities.join(", "),
  };
  return template.replace(/\{\{([a-z_]+)\}\}/g, (_, key) => {
    assert.ok(Object.hasOwn(values, key), `unknown actor template placeholder ${key}`);
    return values[key];
  });
}

export async function executeOnboardingSteps({ root, guide, actor, through = "maintainer-merge" }) {
  const state = { slug: null, record: null, proposalOpened: false, merged: false, executed: [] };
  for (const step of guide.contract.steps) {
    state.executed.push(step.id);
    if (step.operation === "choose_slug") {
      assert.match(actor.slug, new RegExp(guide.contract.slug_pattern));
      state.slug = actor.slug;
    } else if (step.operation === "write_actor_record") {
      state.record = actorRecord(guide.template, actor);
      await mkdir(join(root, "actors"), { recursive: true });
      await writeFile(join(root, "actors", `${actor.slug}.yaml`), state.record);
    } else if (step.operation === "create_owned_surfaces") {
      for (const surface of ["events", "artifacts"]) {
        await mkdir(join(root, surface, actor.slug), { recursive: true });
        await writeFile(join(root, surface, actor.slug, ".gitkeep"), "");
      }
    } else if (step.operation === "validate_proposal") {
      assert.equal(await readFile(join(root, "actors", `${actor.slug}.yaml`), "utf8"), state.record);
      assert.match(state.record, new RegExp(`^slug: ${actor.slug}$`, "m"));
      assert.match(state.record, new RegExp(`^event_directory: events/${actor.slug}$`, "m"));
      assert.match(state.record, new RegExp(`^artifact_prefix: artifacts/${actor.slug}$`, "m"));
    } else if (step.operation === "open_pull_request") {
      state.proposalOpened = true;
    } else if (step.operation === "maintainer_merge") {
      assert.equal(state.proposalOpened, true, "merge requires an opened proposal");
      command(root, "git", ["add", `actors/${actor.slug}.yaml`, `events/${actor.slug}/.gitkeep`, `artifacts/${actor.slug}/.gitkeep`]);
      command(root, "git", ["commit", "-qm", `Register ${actor.slug}`]);
      state.merged = true;
    } else {
      assert.fail(`unknown onboarding operation ${step.operation}`);
    }
    if (step.id === through) return state;
  }
  assert.fail(`onboarding contract has no step ${through}`);
}

export async function assertRegistrationMerged(root, slug) { /* PR_ONBOARDING_MERGE_REQUIRED */
  const relativeRecord = `actors/${slug}.yaml`;
  let committed;
  try {
    committed = command(root, "git", ["show", `HEAD:${relativeRecord}`]);
  } catch {
    throw new Error(`PR_ONBOARDING_UNMERGED_REFUSED ${relativeRecord} is not present at HEAD`);
  }
  const worktree = await readFile(join(root, relativeRecord), "utf8");
  assert.equal(worktree, committed, `PR_ONBOARDING_UNMERGED_REFUSED ${relativeRecord} differs from HEAD`);
  const tracked = command(root, "git", ["ls-tree", "-r", "--name-only", "HEAD"]).split("\n");
  for (const surface of [`events/${slug}/.gitkeep`, `artifacts/${slug}/.gitkeep`]) {
    assert.ok(tracked.includes(surface), `PR_ONBOARDING_UNMERGED_REFUSED ${surface} is not present at HEAD`);
  }
  return committed;
}

export async function acceptMergedRegistration({ root, slug, readActors }) { /* PR_ONBOARDING_MERGED_ACCEPTANCE */
  await assertRegistrationMerged(root, slug);
  const actors = await readActors(root, join(root, "actors"));
  const actor = actors.get(slug);
  assert.ok(actor, `merged actor ${slug} was not accepted`);
  return actor;
}
