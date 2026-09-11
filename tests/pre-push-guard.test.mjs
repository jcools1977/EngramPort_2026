import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const hook = fileURLToPath(new URL("../scripts/git-hooks/pre-push", import.meta.url));

test("pre-push identity guard paired controls and discriminating mutation", () => {
  const dir = mkdtempSync(join(tmpdir(), "pre-push-guard-"));
  try {
    const repo = join(dir, "repo");
    const remote = join(dir, "remote.git");
    const home = join(dir, "home");
    mkdirSync(repo); mkdirSync(home);
    const env = { ...process.env, HOME: home, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null" };
    for (const name of Object.keys(env)) {
      if (name.startsWith("GIT_") && !["GIT_CONFIG_NOSYSTEM", "GIT_CONFIG_GLOBAL"].includes(name)) delete env[name];
    }
    const git = (args, input) => execFileSync("git", args, { cwd: repo, env, input, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
    const principals = { a: "a@example.invalid", b: "b@example.invalid" };
    for (const name of ["a", "b"]) execFileSync("ssh-keygen", ["-q", "-t", "ed25519", "-N", "", "-f", join(dir, name)]);
    const trust = Object.entries(principals).map(([name, principal]) => `${principal} ${readFileSync(join(dir, `${name}.pub`), "utf8")}`).join("");
    const signers = join(dir, "allowed_signers");
    writeFileSync(signers, trust);
    git(["init", "-q", "-b", "main"]);
    git(["init", "-q", "--bare", remote]);
    git(["config", "core.hooksPath", "/dev/null"]);
    git(["config", "user.name", "Synthetic A"]);
    git(["config", "user.email", principals.a]);
    git(["config", "gpg.format", "ssh"]);
    git(["config", "gpg.ssh.allowedSignersFile", signers]);
    git(["remote", "add", "origin", remote]);
    const tree = git(["mktree"], "");
    const commit = (name, signer, parent) => git([
      "-c", `user.signingkey=${join(dir, signer || "a")}`, "commit-tree", ...(signer ? ["-S"] : []), tree,
      ...(parent ? ["-p", parent] : []), "-m", name,
    ]);
    const clean = commit("clean", "a");
    const mismatch = commit("mismatch", "b", clean);
    const unsigned = commit("unsigned", null, clean);
    const zero = "0".repeat(40);
    const line = (local, old = clean) => `refs/heads/main ${local} refs/heads/main ${old}\n`;
    const run = (input, script = hook) => spawnSync("bash", [script, "origin", remote], { cwd: repo, env, input, encoding: "utf8" });
    const check = (name, input, status, script) => {
      const result = run(input, script);
      assert.equal(result.status, status, `${name}: ${result.stderr}`);
      console.log(`PRE_PUSH_GUARD ${name} exit=${result.status}${result.stderr ? ` ${result.stderr.trim()}` : ""}`);
      return result;
    };
    const refused = check("mismatch", line(mismatch), 1);
    for (const value of [mismatch, principals.a, principals.b]) assert.ok(refused.stderr.includes(value));
    check("clean", line(clean, zero), 0);
    assert.match(check("unsigned", line(unsigned), 1).stderr, /signer=<none> signature=N/);
    const multiple = check("multiple-updates", line(mismatch) + line(unsigned), 1);
    assert.ok(multiple.stderr.includes(mismatch) && multiple.stderr.includes(unsigned));
    mkdirSync(join(repo, "docs", "security"), { recursive: true });
    const record = join(repo, "docs", "security", "accepted-identity-mismatches.json");
    const entry = { sha: mismatch, author: principals.a, signer: principals.b, date: git(["show", "-s", "--format=%aI", mismatch]), finding: "F1" };
    writeFileSync(record, JSON.stringify([entry], null, 2));
    check("recorded-mismatch", line(mismatch), 0);
    writeFileSync(record, JSON.stringify([{ ...entry, sha: mismatch.slice(0, -1) }]));
    check("record-must-match-full-sha", line(mismatch), 1);
    writeFileSync(record, "[]\n");
    check("already-pushed-range", line(mismatch, mismatch), 0);
    git(["update-ref", "refs/heads/main", mismatch]);
    git(["push", "-q", "origin", "main"]);
    const newClean = commit("new branch clean", "a", mismatch);
    check("new-branch-excludes-remote-history", line(newClean, zero), 0);
    const newMismatch = commit("new branch mismatch", "b", newClean);
    check("new-branch-checks-unpushed", line(newMismatch, zero), 1);
    check("ref-deletion", line(zero, mismatch), 0);
    git(["config", "gpg.ssh.allowedSignersFile", join(dir, "missing")]);
    assert.match(check("missing-signers", line(clean, zero), 1).stderr, /no allowed-signers file/);
    mkdirSync(join(home, ".ssh"));
    writeFileSync(join(home, ".ssh", "engramport_allowed_signers"), trust);
    check("fallback-signers", line(newClean, mismatch), 0);
    git(["config", "gpg.ssh.allowedSignersFile", signers]);
    writeFileSync(signers, "");
    check("untrusted-signature", line(newClean, mismatch), 1);
    writeFileSync(signers, trust);
    const original = readFileSync(hook, "utf8");
    const comparison = ' || "$author" != "$signer"';
    assert.equal(original.split(comparison).length, 2);
    const mutant = join(dir, "mutant-pre-push");
    writeFileSync(mutant, original.replace(comparison, ""));
    check("mutation-comparison-removed", line(mismatch), 0, mutant);
    writeFileSync(mutant, original);
    check("mutation-restored", line(mismatch), 1, mutant);
    assert.equal(readFileSync(hook, "utf8"), original);
    console.log("PRE_PUSH_GUARD_SUMMARY paired refusals, clean and recorded allowances, remote ranges, missing trust, and comparison mutation passed");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
