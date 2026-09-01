import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import { registerHooks } from "node:module";
import test from "node:test";

const siteEventTypesOnly = process.env.SITE_EVENT_TYPES_ONLY === "1";
const eventTypesModule = process.env.SITE_EVENT_TYPES_MODULE ?? new URL("../packages/git-adapter/src/verify-log.mjs", import.meta.url).href;
const sitePageSource = process.env.SITE_PAGE_SOURCE ?? new URL("../app/page.tsx", import.meta.url);
const { assertAcceptedEventTypes } = await import(eventTypesModule);

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

test("server-renders the EngramPort product site", { skip: siteEventTypesOnly }, async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>EngramPort — The project remembers<\/title>/i);
  assert.match(html, /Shared state infrastructure for humans \+ AI/);
  assert.match(html, /Different agents\.<br\/>One continuous thread\./);
  assert.match(html, /CONFLICTS SURFACED, NEVER SILENT/);
  assert.match(html, /Port Watch delivers new work, and your position is derived from the log so a fresh clone resumes exactly where you left off\./);
  assert.match(html, /<b>EXAMPLE<\/b>/);
  assert.doesNotMatch(html, /CONFLICT-FREE BY DESIGN|<b>LIVE<\/b>|handoff\.created|handoff\.claimed|artifact\.registered|handoff\.completed/);
  assert.match(html, /POSTGRESQL/);
  assert.match(html, /github\.com\/jcools1977\/EngramPort_2026/);
  // Council step 5: the install CTA returns only once a real package exists.
  // The publishable-manifest control above is what makes this claim honest.
  assert.match(html, /npm install @engramport\/sdk/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("ships product metadata and removes the starter preview", { skip: siteEventTypesOnly }, async () => {
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

test("site install claims require a publishable package manifest", async () => {
  const rootManifestUrl = new URL("../package.json", import.meta.url);
  const packageDirectoryUrl = new URL("../packages/", import.meta.url);
  const manifestUrls = [rootManifestUrl];
  for (const entry of await readdir(packageDirectoryUrl, { withFileTypes: true })) {
    if (entry.isDirectory()) manifestUrls.push(new URL(`./${entry.name}/package.json`, packageDirectoryUrl));
  }
  const publishableNames = new Set();
  for (const url of manifestUrls) {
    try {
      const manifest = JSON.parse(await readFile(url, "utf8"));
      if (manifest.private !== true && typeof manifest.name === "string") publishableNames.add(manifest.name);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  const page = await readFile(sitePageSource, "utf8");
  const installClaims = [...page.matchAll(/\bnpm\s+install\s+(@?[a-z0-9][a-z0-9._/-]*)/gi)].map((match) => match[1]);
  for (const packageName of installClaims) {
    assert.ok(publishableNames.has(packageName), `site advertises unpublished package ${packageName}`);
  }
});

test("site console event types remain linked to the verifier vocabulary", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const eventBlock = page.match(/const events = \[([\s\S]*?)\n\];/)?.[1];
  assert.ok(eventBlock, "site event console declaration must remain statically auditable");
  const types = [...eventBlock.matchAll(/\btype:\s*"([^"]+)"/g)].map((match) => match[1]);
  assert.equal(types.length, 4, "site event console must expose all four example event types to the drift control");
  const fabricated = process.env.SITE_EVENT_TYPE_OVERRIDE;
  if (fabricated) types[0] = fabricated;
  let outcome = "accepted";
  try { assertAcceptedEventTypes(types, "site event console"); }
  catch { outcome = "refused"; }
  console.log(`SITE_EVENT_TYPES ${fabricated ?? types.join(",") }=${outcome}`);
  assert.equal(outcome, fabricated ? "refused" : "accepted");
});
