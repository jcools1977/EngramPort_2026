// The credential scan must cover everything the policy admits.
//
// The supervisor permits a prompt up to MAX_CONTEXT_BYTES (1,000,000) and then
// scanned it with detectCredential's 64KB default, which fails closed above its
// ceiling. The effective limit was 6.4% of the stated one, and the refusal was
// reported as CREDENTIAL_CONTEXT_REFUSED, so an oversize corpus was
// indistinguishable from a leaked secret.
//
// The danger in "fixing" this is raising a limit and quietly scanning less. So
// the load-bearing test here is not that a large clean prompt passes. It is
// that a credential planted deep inside a large prompt is still caught.

import { test } from "node:test";
import assert from "node:assert/strict";
import { detectCredential } from "../packages/git-adapter/src/credential-boundary.mjs";

const POLICY_LIMIT = 1_000_000;
const filler = "harmless review context. ".repeat(12_000); // ~300KB, far past 64KB

test("a clean prompt larger than the scanner default is scanned, not refused", () => {
  assert.ok(Buffer.byteLength(filler) > 64 * 1024, "fixture must exceed the old default");
  const withDefault = detectCredential(filler);
  assert.equal(withDefault.hit, true, "the old default must still refuse it");
  assert.equal(withDefault.code, "RECORD_TOO_LARGE", "and refuse it for size, not for a credential");

  const atPolicy = detectCredential(filler, { maxBytes: POLICY_LIMIT });
  assert.equal(atPolicy.hit, false, "at the policy limit the same prompt must scan clean");
});

test("a credential planted deep inside a large prompt is still caught", () => {
  // The failure mode of the fix: raise the ceiling, stop looking. Plant a
  // secret past the old 64KB boundary and require it to be found.
  const planted = `${filler}\nconst apiKey = "sk-ant-api03-${"a".repeat(64)}";\n${filler}`;
  assert.ok(Buffer.byteLength(planted) > 500_000, "planted fixture must be genuinely large");

  const found = detectCredential(planted, { maxBytes: POLICY_LIMIT });
  assert.equal(found.hit, true, "a credential past the old ceiling must still be detected");
  assert.notEqual(found.code, "RECORD_TOO_LARGE", "and detected as a credential, not as size");
});

test("beyond the policy limit it still fails closed", () => {
  const enormous = "x".repeat(POLICY_LIMIT + 1);
  const r = detectCredential(enormous, { maxBytes: POLICY_LIMIT });
  assert.equal(r.hit, true);
  assert.equal(r.code, "RECORD_TOO_LARGE", "unscannable input must refuse rather than pass");
});
