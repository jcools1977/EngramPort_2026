import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import test from "node:test";

// The production bundle correctly keeps the Worker-native module external.
// This test exercises only the ordinary HTML route under Node; Durable Object
// and RPC behavior is separately executed in local workerd by session:test.
registerHooks({resolve(specifier,context,nextResolve){
  if(specifier==="cloudflare:workers")return {url:"data:text/javascript,export class DurableObject%7Bconstructor(ctx,env)%7Bthis.ctx=ctx%3Bthis.env=env%7D%7D%3Bexport class RpcTarget%7B%7D",shortCircuit:true};
  return nextResolve(specifier,context);
}});

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });
}

test("server-renders the EngramPort product site", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>EngramPort — The project remembers<\/title>/i);
  assert.match(html, /Shared state infrastructure for humans \+ AI/);
  assert.match(html, /Different agents\.<br\/>One continuous thread\./);
  assert.match(html, /POSTGRESQL/);
  assert.match(html, /npm install @engramport\/sdk/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("ships product metadata and removes the starter preview", async () => {
  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);
  assert.match(page, /The project remembers/);
  assert.match(layout, /EngramPort — The project remembers/);
  assert.match(layout, /images: \[\{ url: "\/og\.png"/);
  assert.match(packageJson, /"name": "engramport"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await assert.rejects(access(new URL("../app/_sites-preview", import.meta.url)));
});
