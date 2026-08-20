import test from "node:test";
import assert from "node:assert/strict";
import { PrincipalSessionBinding } from "../packages/git-adapter/src/d2-session-binding.mjs";

function fakePool() {
  const calls = []; const client = { async query(sql, params) { calls.push([sql, params]); if (sql.startsWith("SELECT mint")) return { rows: [{ reference: "epr:credential:00000000-0000-7000-8000-000000000000" }] }; }, release() {} };
  return { calls, connect: async () => client, end: async () => {} };
}
test("D2 refuses unbound sessions before acquiring a connection", async () => { const p=fakePool(); const b=new PrincipalSessionBinding({pool:p}); await assert.rejects(() => b.mint({}, null), e => e.code === "SESSION_UNBOUND"); assert.equal(p.calls.length,0); });
test("D2 binds verified principal and ignores caller identity fields", async () => { const p=fakePool(); const b=new PrincipalSessionBinding({pool:p}); const out=await b.mint({className:"3.3",namespace:"credential",model:"B",keyLocator:"synthetic",metadata:{},principalId:"X"},{verified:true,principalId:"Y"}); assert.equal(out.principalId,"Y"); const bind=p.calls.find(x=>x[0].includes("set_config")); assert.deepEqual(bind[1],["Y"]); assert.ok(p.calls.some(x=>x[0]==="DISCARD ALL")); });
