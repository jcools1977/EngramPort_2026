// Signed history must agree with authorship or carry a validated F160 record.
// Unsigned commits remain outside this control's original scope.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { join } from "node:path";
import { identityControl } from "./identity-control.mjs";

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const SIGNERS = join(homedir(), ".ssh", "engramport_allowed_signers");

test("repository signed mismatches require exact accepted records", () => {
  const accepted = identityControl(process.cwd(), JSON.parse(source("docs/security/accepted-identity-mismatches.json")), SIGNERS, source("docs/constraints.md"));
  for (const entry of accepted) console.log(`ACCEPTED_IDENTITY_MISMATCH ${entry.sha} author=${entry.author} signer=${entry.signer} date=${entry.date} finding=${entry.finding}`);
});

test("record validates commits and each stated fact with paired refusals", () => {
  const dir = mkdtempSync(join(tmpdir(), "identity-record-"));
  try {
    const key = join(dir, "signer");
    execFileSync("ssh-keygen", ["-q", "-t", "ed25519", "-N", "", "-f", key]);
    const signers = join(dir, "allowed_signers");
    writeFileSync(signers, `signer@example.invalid ${readFileSync(`${key}.pub`, "utf8")}`);
    const git = (args, input) => execFileSync("git", args, { cwd: dir, input, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], env: {
      ...process.env, GIT_AUTHOR_NAME: "Synthetic Author", GIT_AUTHOR_EMAIL: "author@example.invalid",
      GIT_COMMITTER_NAME: "Synthetic Signer", GIT_COMMITTER_EMAIL: "signer@example.invalid",
    } });
    git(["init", "-q", "-b", "main"]);
    const tree = git(["mktree"], "").trim();
    const sha = git(["-c", "gpg.format=ssh", "-c", `user.signingkey=${key}`, "commit-tree", "-S", tree, "-m", "synthetic mismatch"]).trim();
    git(["update-ref", "refs/heads/main", sha]);
    const entry = { sha, author: "author@example.invalid", signer: "signer@example.invalid", date: git(["show", "-s", "--format=%aI", sha]).trim(), finding: "F160" };
    const check = (record, trust = signers, findings = "### F160\n") => identityControl(dir, record, trust, findings);
    assert.equal(check([entry]).length, 1);
    const refused = (name, record, pattern, trust, findings) => {
      assert.throws(() => check(record, trust, findings), pattern, name);
      console.log(`IDENTITY_REFUSAL ${name}`);
    };
    refused("unrecorded", [], /unrecorded signature\/author disagreement/);
    refused("nonexistent", [entry, { ...entry, sha: "f".repeat(40) }], /commit does not exist/);
    refused("author", [{ ...entry, author: "other@example.invalid" }], /author differs/);
    refused("signer", [{ ...entry, signer: "other@example.invalid" }], /signer differs/);
    refused("date", [{ ...entry, date: "2000-01-01T00:00:00Z" }], /date differs/);
    refused("finding", [{ ...entry, finding: "F999999" }], /finding absent/);
    refused("duplicate", [entry, entry], /duplicate identity record/);
    refused("array", {}, /must be an array/);
    refused("fields", [{ ...entry, extra: true }], /identity record fields/);
    refused("full-sha", [{ ...entry, sha: sha.slice(0, 7) }], /full commit sha/);
    refused("finding-format", [{ ...entry, finding: "anything" }], /identity record finding:/);
    const emptyTrust = join(dir, "empty_signers");
    writeFileSync(emptyTrust, "");
    refused("unverified", [entry], /signature not verified/, emptyTrust);
    const matching = git(["-c", "gpg.format=ssh", "-c", `user.signingkey=${key}`, "-c", "user.email=author@example.invalid", "commit-tree", "-S", tree, "-m", "second synthetic commit"]).trim();
    const authorTrust = join(dir, "author_signers");
    writeFileSync(authorTrust, `author@example.invalid ${readFileSync(`${key}.pub`, "utf8")}`);
    git(["update-ref", "refs/heads/main", matching]);
    refused("not-mismatch", [{ ...entry, sha: matching, signer: entry.author, date: git(["show", "-s", "--format=%aI", matching]).trim() }], /is not a mismatch/, authorTrust);
    // Keep the original mismatch object available but outside HEAD ancestry.
    refused("outside-history", [entry], /outside HEAD history/);
    git(["update-ref", "refs/heads/main", sha]);
    assert.equal(check([entry]).length, 1, "restored record must pass");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("agent-commit permits the actor key and refuses a foreign resolved key before commit", () => {
  const dir = mkdtempSync(join(tmpdir(), "identity-key-"));
  try {
    mkdirSync(join(dir, "scripts"));
    mkdirSync(join(dir, "actors"));
    writeFileSync(join(dir, "actors", "agent-b.yaml"), "display_name: Synthetic Builder\n");
    for (const name of ["own", "foreign"]) execFileSync("ssh-keygen", ["-q", "-t", "ed25519", "-N", "", "-f", join(dir, name)]);
    const signers = join(dir, "allowed_signers");
    writeFileSync(signers, `agent-b@engramport.local ${readFileSync(join(dir, "own.pub"), "utf8")}foreign@example.invalid ${readFileSync(join(dir, "foreign.pub"), "utf8")}`);
    const script = join(dir, "scripts", "agent-commit");
    const original = source("scripts/agent-commit");
    const scriptFor = (key) => original
      .replace('key="$HOME/.ssh/engramport_${actor//-/_}.pub"', `key="${join(dir, `${key}.pub`)}"`)
      .replace('signers="$HOME/.ssh/engramport_allowed_signers"', `signers="${signers}"`);
    const env = { ...process.env };
    for (const name of ["GIT_AUTHOR_NAME", "GIT_AUTHOR_EMAIL", "GIT_AUTHOR_DATE", "GIT_COMMITTER_NAME", "GIT_COMMITTER_EMAIL", "GIT_COMMITTER_DATE"]) delete env[name];
    const git = (args) => execFileSync("git", args, { cwd: dir, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    git(["init", "-q", "-b", "main"]);
    git(["config", "core.hooksPath", "/dev/null"]);
    writeFileSync(join(dir, "fixture"), "synthetic\n");
    git(["add", "fixture"]);
    const message = join(dir, "message");
    writeFileSync(message, "Synthetic key binding control\n");
    const run = () => spawnSync("bash", [script, "agent-b", "--allow-empty", "-F", message], { cwd: dir, env, encoding: "utf8" });
    writeFileSync(script, scriptFor("own"));
    const positive = run();
    assert.equal(positive.status, 0, positive.stderr);
    assert.equal(git(["-c", `gpg.ssh.allowedSignersFile=${signers}`, "show", "-s", "--format=%G?|%ae|%GS"]).trim(), "G|agent-b@engramport.local|agent-b@engramport.local");
    const before = git(["rev-parse", "HEAD"]);
    writeFileSync(script, scriptFor("foreign"));
    const negative = run();
    assert.equal(negative.status, 1, "foreign resolved key must refuse");
    assert.match(negative.stderr, /refusing to commit under a foreign or unverified signing key/);
    assert.equal(git(["rev-parse", "HEAD"]), before, "refusal must not create a commit");
    console.log(negative.stderr.trim());
    writeFileSync(script, scriptFor("own"));
    assert.equal(run().status, 0, "restored actor key must commit");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
