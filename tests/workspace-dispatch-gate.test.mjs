import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { assertW3DispatchEligible, THREAT_MODEL_DIGEST, THREAT_MODEL_REVISION, TIER_A } from "../packages/git-adapter/src/workspace-dispatch-gate.mjs";

const path = new URL("../docs/security/setup-credential-threat-model.md", import.meta.url);
const commit = "synthetic-control-commit";
const registry = () => ({ revision: THREAT_MODEL_REVISION, digest: THREAT_MODEL_DIGEST, controls: TIER_A.map(control => ({ control, revision: THREAT_MODEL_REVISION, digest: THREAT_MODEL_DIGEST, outcome: "passed", commit })) });
test("exact current threat-model revision and digest permit only a complete Tier A registry", async () => { const result = await assertW3DispatchEligible(registry(), path); assert.equal(result.eligible, true); assert.deepEqual(result.controls, TIER_A); });
for (const [name, mutate, code] of [
  ["missing", value => value.controls.pop(), /DISPATCH_TIER_A_INCOMPLETE:A9/],
  ["stale", value => { value.controls[0].revision = 7; }, /DISPATCH_TIER_A_INCOMPLETE:A1/],
  ["wrong digest", value => { value.digest = "00".repeat(32); }, /DISPATCH_EVIDENCE_BINDING_MISMATCH/],
  ["waiver", value => { value.waiver = true; }, /DISPATCH_NON_EVIDENCE_REFUSED/]
]) test(`dispatch gate refuses ${name} evidence`, async () => { const value = registry(); mutate(value); await assert.rejects(assertW3DispatchEligible(value, path), code); });
test("document binding is the canonical file digest", async () => { const text = await readFile(path, "utf8"); assert.ok(text.includes("Status: revision 8")); });
