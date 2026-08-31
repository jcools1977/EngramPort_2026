import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import { join } from "node:path";
import test from "node:test";

const helperSpecifier = process.env.PR_ONBOARDING_HELPER_MODULE ?? new URL("./helpers/pr-onboarding-fixture.mjs", import.meta.url).href;
const { acceptMergedRegistration, assertRegistrationMerged, executeOnboardingSteps, parseOnboardingGuide } = await import(helperSpecifier);
const { readActors } = await import(new URL("../packages/git-adapter/src/verify-log.mjs", import.meta.url));
const guide = parseOnboardingGuide(await readFile(new URL("../CONTRIBUTING.md", import.meta.url), "utf8"));
const actor = {
  slug: "builder-two",
  displayName: "Synthetic Second Builder",
  kind: "agent",
  provider: "synthetic",
  capabilities: ["implementation", "testing"],
};

async function fixture() {
  const root = await mkdtemp(join(os.tmpdir(), "engramport-pr-onboarding-"));
  await mkdir(join(root, "actors"), { recursive: true });
  await mkdir(join(root, "events", "builder-one"), { recursive: true });
  await mkdir(join(root, "artifacts", "builder-one"), { recursive: true });
  await writeFile(join(root, "actors", "builder-one.yaml"), "slug: builder-one\nevent_directory: events/builder-one\nartifact_prefix: artifacts/builder-one\n");
  await writeFile(join(root, "events", "builder-one", ".gitkeep"), "");
  await writeFile(join(root, "artifacts", "builder-one", ".gitkeep"), "");
  execFileSync("git", ["init", "-q"], { cwd: root });
  execFileSync("git", ["config", "user.name", "Synthetic Maintainer"], { cwd: root });
  execFileSync("git", ["config", "user.email", "maintainer@example.invalid"], { cwd: root });
  execFileSync("git", ["add", "."], { cwd: root });
  execFileSync("git", ["commit", "-qm", "Baseline"], { cwd: root });
  return root;
}

test("documented PR onboarding refuses an unmerged local registration", async () => {
  const root = await fixture();
  try {
    const state = await executeOnboardingSteps({ root, guide, actor, through: "open-pull-request" });
    assert.deepEqual(state.executed, guide.contract.steps.slice(0, 5).map(({ id }) => id));
    await assert.rejects(assertRegistrationMerged(root, actor.slug), /PR_ONBOARDING_UNMERGED_REFUSED actors\/builder-two\.yaml is not present at HEAD/);
    console.log("PR_ONBOARDING_UNMERGED_REFUSAL proposal=present head=absent refused=true");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("documented PR onboarding accepts the maintainer-merged registration", async () => {
  const root = await fixture();
  try {
    const state = await executeOnboardingSteps({ root, guide, actor });
    assert.deepEqual(state.executed, guide.contract.steps.map(({ id }) => id));
    assert.equal(state.merged, true);
    const accepted = await acceptMergedRegistration({ root, slug: actor.slug, readActors });
    assert.equal(accepted.eventDirectory, "events/builder-two");
    assert.equal(accepted.artifactPrefix, "artifacts/builder-two");
    console.log("PR_ONBOARDING_MERGED_ACCEPTANCE proposal=merged head=present accepted=true");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("the documented path has no prose-only or machine-only operation", () => {
  assert.equal(guide.contract.schema_version, 1);
  assert.deepEqual(guide.contract.steps.map(({ operation }) => operation), [
    "choose_slug", "write_actor_record", "create_owned_surfaces", "validate_proposal", "open_pull_request", "maintainer_merge",
  ]);
});
