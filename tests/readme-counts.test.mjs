// The README's verifiable-claims section must agree with the repository.
//
// It stated 439 events, 45 findings and 34 ADRs; the true values were 459, 50
// and 38. Every number had drifted, in the section whose purpose is to be
// checkable, in a README that cites F125 about numbers going stale silently.
//
// The date stamp did not help. It made the numbers defensible rather than
// accurate, and a reader cannot tell those apart without doing the count.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const { derive, check, CLAIMS } = await import(join(root, "scripts/readme-counts"));

test("README counts match the repository", () => {
  const problems = check(readFileSync(join(root, "README.md"), "utf8"), derive(root));
  assert.deepEqual(
    problems,
    [],
    problems
      .map((p) =>
        p.kind === "missing"
          ? `${p.key}: ${p.detail}`
          : `${p.key}: README says ${p.stated}, repository has ${p.actual}`,
      )
      .join("\n"),
  );
});

test("the check observes drift in each claim independently", () => {
  const readme = readFileSync(join(root, "README.md"), "utf8");
  const derived = derive(root);
  for (const { key, re } of CLAIMS) {
    // Mutate only this claim's number; the others must stay clean, so a single
    // over-broad matcher cannot masquerade as three working checks.
    const mutated = readme.replace(re, (m, n) => m.replace(n, String(Number(n) + 1)));
    assert.notEqual(mutated, readme, `${key}: mutation did not change the README`);
    const problems = check(mutated, derived);
    assert.equal(problems.length, 1, `${key}: expected exactly one drift, got ${problems.length}`);
    assert.equal(problems[0].key, key);
    assert.equal(problems[0].kind, "drift");
  }
});

test("the check fails loudly when a claim sentence is reworded away", () => {
  const readme = readFileSync(join(root, "README.md"), "utf8");
  const gutted = readme.replace(CLAIMS[0].re, "**many accepted events**");
  const problems = check(gutted, derive(root));
  assert.equal(problems.length, 1);
  assert.equal(problems[0].kind, "missing", "a removed claim must fail, not silently pass");
});
