import assert from "node:assert/strict";
import test from "node:test";
import {fileURLToPath} from "node:url";
import {VaultTransitBoundary} from "../packages/git-adapter/src/custody-service.mjs";
import {runCanaryFixture} from "./helpers/w1-7-canary-fixture.mjs";

test("live Vault transit differential",async()=>{
  if(!process.env.KMS_TOKEN) throw new Error("KMS_UNAVAILABLE");
  const b=new VaultTransitBoundary({token:process.env.KMS_TOKEN,allowedKeys:["synth-a"]});
  assert.match(await b.sign("synth-a","x"),/^vault:v\d+:/);
  await assert.rejects(()=>b.sign("prod-real","x"),e=>e.code.startsWith("KMS_"));
  await runCanaryFixture({moduleRoot:fileURLToPath(new URL("..",import.meta.url)),boundary:b});
});
