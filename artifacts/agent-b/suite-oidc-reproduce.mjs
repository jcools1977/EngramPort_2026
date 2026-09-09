// Reduced reproduction: no EngramPort OIDC or worker code is imported.
// This intentionally exercises the observed failure and is not in npm test.
import test from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Miniflare, NoOpLog } from "miniflare";

test("Miniflare startup after async directory creation", async () => {
  const persist = await mkdtemp(path.join(os.tmpdir(), "oidc-reduced-"));
  const mf = new Miniflare({
    modules: true,
    script: 'export default {fetch(){return new Response("ok")}}',
    compatibilityDate: "2026-05-22",
    log: new NoOpLog(),
  });
  try { await mf.dispatchFetch("http://localhost"); }
  finally { await mf.dispose(); await rm(persist, { recursive: true, force: true }); }
});
