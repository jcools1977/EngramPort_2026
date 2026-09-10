import { lstat, mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { SLUG } from "./verify-log.mjs";

// This is the complete file creation set. No repository files are copied.
export const INIT_PATHS = Object.freeze([
  "engramport.yaml", "actors/<slug>.yaml",
  "events/<slug>/.gitkeep", "artifacts/<slug>/.gitkeep", ".gitattributes",
]);

function refuse(code, message) {
  throw Object.assign(new Error(`${code}: ${message}`), { code });
}

async function exists(file) {
  try { await lstat(file); return true; }
  catch (error) { if (error.code === "ENOENT") return false; throw error; }
}

export async function initProject({ actor, kind, project = "my-project", mode = "free_form" }, cwd) {
  if (await exists(path.join(cwd, "engramport.yaml"))) refuse("INIT_PROJECT_EXISTS", "joining an existing project requires the pull request process in CONTRIBUTING.md");
  if (typeof actor !== "string" || !SLUG.test(actor)) refuse("INIT_ACTOR_REFUSED", "--actor must match the verifier's SLUG pattern");
  if (kind === undefined) refuse("INIT_KIND_REQUIRED", "--kind human|agent is required");
  if (!["human", "agent"].includes(kind)) refuse("INIT_KIND_REFUSED", "--kind must be human or agent");
  if (!["free_form", "strict_relay"].includes(mode)) refuse("INIT_MODE_REFUSED", "--mode must be free_form or strict_relay");
  if (typeof project !== "string" || !SLUG.test(project)) refuse("INIT_PROJECT_REFUSED", "--project must match the verifier's SLUG pattern");
  const files = INIT_PATHS.map((file) => file.replace("<slug>", actor));
  for (const file of files) {
    if (await exists(path.join(cwd, file))) refuse("INIT_PATH_EXISTS", `${file} already exists`);
  }
  if ((await readdir(cwd)).length) refuse("INIT_NOT_EMPTY", "init requires an empty directory");

  const contents = [
    `protocol: engramport-git-v0\nproject: ${project}\nmode: ${mode}\ndefault_thread_mode: ${mode}\nevent_root: events\nactor_root: actors\nartifact_root: artifacts\nhash_profile: engramport-git-body-v0\nschema_version: 0\n`,
    `schema_version: 0\nslug: ${actor}\ndisplay_name: ${actor}\nkind: ${kind}\nprovider: unspecified\ncapabilities: []\nevent_directory: events/${actor}\nartifact_prefix: artifacts/${actor}\n`,
    "", "", "* -text\n",
  ];
  // Exclusive directory creation also refuses a concurrently inserted directory
  // or symlink. A filesystem error may leave a partial scaffold; never delete or
  // overwrite a path when another writer could now own it.
  for (const directory of ["actors", "events", `events/${actor}`, "artifacts", `artifacts/${actor}`]) {
    await mkdir(path.join(cwd, directory));
  }
  for (const [index, file] of files.entries()) {
    await writeFile(path.join(cwd, file), contents[index], { flag: "wx" });
  }
  return files;
}
