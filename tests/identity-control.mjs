// The record accepts specific historical disagreements, not unverifiable claims.
// Its date is the commit's author date (%aI). Signer trust remains external.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

export function identityControl(cwd, record, signers, constraints) {
  const git = (args) => execFileSync("git", ["-c", `gpg.ssh.allowedSignersFile=${signers}`, ...args], {
    cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
  });
  const parse = (line) => {
    const [sha, status, author, signer, date] = line.split("|");
    return { sha, status, author, signer, date };
  };
  assert.ok(Array.isArray(record), "identity record must be an array");
  const accepted = new Map();
  for (const entry of record) {
    assert.ok(entry && typeof entry === "object", "invalid identity record entry");
    assert.deepEqual(Object.keys(entry).sort(), ["author", "date", "finding", "sha", "signer"], "identity record fields");
    assert.match(entry.sha, /^[0-9a-f]{40}$/, "identity record needs a full commit sha");
    assert.ok(!accepted.has(entry.sha), `duplicate identity record ${entry.sha}`);
    let commit;
    try {
      commit = parse(git(["show", "-s", "--format=%H|%G?|%ae|%GS|%aI", `${entry.sha}^{commit}`]).trim());
    } catch {
      assert.fail(`identity record commit does not exist: ${entry.sha}`);
    }
    assert.equal(commit.sha, entry.sha, `identity record sha ${entry.sha}`);
    assert.equal(commit.status, "G", `identity record signature not verified: ${entry.sha}`);
    assert.equal(entry.author, commit.author, `identity record author differs: ${entry.sha}`);
    assert.equal(entry.signer, commit.signer, `identity record signer differs: ${entry.sha}`);
    assert.equal(entry.date, commit.date, `identity record date differs: ${entry.sha}`);
    assert.notEqual(commit.author, commit.signer, `identity record is not a mismatch: ${entry.sha}`);
    assert.match(entry.finding, /^F[1-9][0-9]*$/, `identity record finding: ${entry.sha}`);
    assert.ok(constraints.split("\n").some((line) => new RegExp(`^#{2,3} ${entry.finding}(?:[. :]|$)`).test(line)), `identity record finding absent: ${entry.sha}`);
    accepted.set(entry.sha, entry);
  }
  const history = git(["log", "--format=%H|%G?|%ae|%GS|%aI"]).trim().split("\n").filter(Boolean).map(parse);
  for (const entry of accepted.values()) {
    assert.ok(history.some((commit) => commit.sha === entry.sha), `identity record outside HEAD history: ${entry.sha}`);
  }
  const bad = history.filter((commit) => commit.status === "G" && commit.author !== commit.signer && !accepted.has(commit.sha));
  assert.deepEqual(bad, [], `unrecorded signature/author disagreement:\n${bad.map((c) => `${c.sha} author=${c.author} signer=${c.signer}`).join("\n")}`);
  return [...accepted.values()];
}
