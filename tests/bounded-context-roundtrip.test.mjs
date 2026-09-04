// An artifact bound by a writer must resolve for the reader.
//
// These two halves were written apart and disagreed. verify-log validated
// "#sha256=" on the way in; the resolver split on "#sha256:" on the way out.
// Every artifact bound into bounded_context was therefore refused with
// CONTEXT_REFERENCE_REFUSED, while events resolved normally, so the failure
// looked like a caller mistake rather than a defect.
//
// The suite stayed green because three tests constructed references with the
// resolver's delimiter instead of the one the writer emits. They tested the
// parser against itself. Nothing crossed from writer to reader, which is the
// only place the disagreement was visible.
//
// So this test does not construct a reference by hand. It takes the format the
// validator enforces and requires the resolver to accept it.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";

const { resolveBoundedContext } = await import("../packages/git-adapter/src/bounded-context.mjs");

// The exact pattern verify-log.mjs enforces on an artifact reference.
const VALIDATOR_PATTERN = /^([^#]+)#sha256=([0-9a-f]{64})$/;

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "bctx-"));
  mkdirSync(join(root, "artifacts/agent-a"), { recursive: true });
  const body = "bound evidence\n";
  writeFileSync(join(root, "artifacts/agent-a/evidence.md"), body);
  const digest = createHash("sha256").update(body, "utf8").digest("hex");
  return { root, body, relative: "artifacts/agent-a/evidence.md", digest };
}

test("a reference in the format the validator accepts resolves to its content", async () => {
  const { root, body, relative, digest } = fixture();
  try {
    const ref = `${relative}#sha256=${digest}`;
    assert.match(ref, VALIDATOR_PATTERN, "the reference must be one the validator would accept");

    const records = await resolveBoundedContext(root, [{ type: "artifact", ref }]);
    assert.equal(records.length, 1, "the bound artifact must be delivered, not skipped");
    assert.equal(records[0].content, body, "the reader must receive the bytes the writer bound");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the delimiter the resolver used to split on is now refused", async () => {
  const { root, relative, digest } = fixture();
  try {
    // The exact shape three tests used to construct. It is not what a writer
    // emits, so accepting it is what let the two halves drift apart.
    const legacy = `${relative}#sha256:${digest}`;
    assert.doesNotMatch(legacy, VALIDATOR_PATTERN, "no writer can emit this");
    await assert.rejects(
      () => resolveBoundedContext(root, [{ type: "artifact", ref: legacy }]),
      /CONTEXT_REFERENCE_REFUSED/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a bound digest that no longer describes the file refuses", async () => {
  const { root, relative } = fixture();
  try {
    const wrong = "0".repeat(64);
    await assert.rejects(
      () => resolveBoundedContext(root, [{ type: "artifact", ref: `${relative}#sha256=${wrong}` }]),
      (error) => /DIGEST|REFUSED|MISMATCH/i.test(String(error?.code ?? error?.message)),
      "a stale digest must refuse rather than deliver different bytes",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
