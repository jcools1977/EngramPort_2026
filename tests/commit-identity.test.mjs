// A signed commit must be signed by the principal it names as author.
//
// Nothing in git prevents authoring a commit as one principal and signing it
// with another's key. The repository would then carry a valid signature over a
// false attribution, which is worse than an unsigned commit: the signature
// invites trust that the author field has not earned.
//
// This does not, and cannot, establish who actually wrote a commit. That is the
// admission-boundary problem recorded in F108, F111, F117, F128 and F131: the
// log attributes, it does not authenticate. What it does establish is that a
// signature and an author field cannot disagree without the suite failing.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { join } from "node:path";

const SIGNERS = join(homedir(), ".ssh", "engramport_allowed_signers");

function git(cwd, args) {
  return execFileSync("git", ["-c", `gpg.ssh.allowedSignersFile=${SIGNERS}`, ...args], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

// Returns commits carrying a good signature whose signer disagrees with the
// author. Unsigned commits are out of scope: they make no claim to check.
function mismatches(cwd) {
  return git(cwd, ["log", "--format=%h|%G?|%ae|%GS"])
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [sha, status, author, signer] = line.split("|");
      return { sha, status, author, signer };
    })
    .filter((c) => c.status === "G" && c.author !== c.signer);
}

test("no signed commit in this repository names an author it was not signed by", () => {
  const bad = mismatches(process.cwd());
  assert.deepEqual(
    bad,
    [],
    `signature/author disagreement:\n${bad
      .map((c) => `  ${c.sha} author=${c.author} signer=${c.signer}`)
      .join("\n")}`,
  );
});

test("the check rejects a commit signed by a key belonging to a different principal", () => {
  const dir = mkdtempSync(join(tmpdir(), "commit-identity-"));
  try {
    const key = join(homedir(), ".ssh", "engramport_devere.pub");
    execFileSync("git", ["init", "-q", "-b", "main", dir]);
    writeFileSync(join(dir, "f.txt"), "fixture\n");
    execFileSync("git", ["add", "f.txt"], { cwd: dir });

    // Authored as agent-a, signed with DeVere's key. Both principals are in
    // allowed_signers, so the signature verifies; only the disagreement is wrong.
    execFileSync(
      "git",
      [
        "-c", "user.name=agent-a (Claude Architect)",
        "-c", "user.email=agent-a@engramport.local",
        "-c", "gpg.format=ssh",
        "-c", `user.signingkey=${key}`,
        "-c", "commit.gpgsign=true",
        "commit", "-q", "-m", "impersonation fixture",
      ],
      { cwd: dir },
    );

    const bad = mismatches(dir);
    assert.equal(bad.length, 1, "the harness must observe the planted mismatch");
    assert.equal(bad[0].author, "agent-a@engramport.local");
    assert.equal(bad[0].signer, "luke@covenantsystems.ai");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
