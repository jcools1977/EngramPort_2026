import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import test from "node:test";
import {
  assembleDeterministicEvidence, authorizationContextDigest, canonicalJson, evidenceDigest,
  runReportIfChanged
} from "../packages/git-adapter/src/report-boundary.mjs";

const execFileAsync = promisify(execFile);
const tenant = "20000000-0000-4000-8000-000000000001";
const project = "20000000-0000-4000-8000-000000000002";
const principal = "20000000-0000-4000-8000-000000000003";
const event1 = "20000000-0000-4000-8000-000000000011";
const event2 = "20000000-0000-4000-8000-000000000012";
const restrictedId = "20000000-0000-4000-8000-000000000099";

function authorization() {
  return {
    principal_id: principal, tenant_id: tenant, project_id: project, audience: "team", view_mode: "live_feed",
    role: "contributor", scopes: ["events:read"], sensitivity_ceiling: "internal", allowed_visibilities: ["project"],
    history_start_seq: 0, policy_revision: "report-auth-v1", publication_approval: null
  };
}

function request() { return { authorization: authorization(), model_identity: "synthetic/model-v1", reporter_revision: "reporter-r2" }; }

function record(event_id, project_seq, overrides = {}) {
  const auth = authorization();
  const value = {
    event_id, tenant_id: tenant, project_id: project, project_seq, kind: "progress.published",
    sensitivity: "internal", visibility: "project", payload: { summary: `Event ${project_seq}` },
    content_sha256: "", authorization_context_sha256: authorizationContextDigest(auth), ...overrides
  };
  value.content_sha256 = evidenceDigest(value);
  return value;
}

function authorizedSource(repository) {
  return {
    async retrieveAuthorized(query) {
      return repository.filter((item) => item.tenant_id === query.tenant_id && item.project_id === query.project_id && item.sensitivity !== "restricted");
    }
  };
}

function recordingGenerator() {
  const invocations = [];
  return { invocations, generate: async (input) => { invocations.push(input.input_identity_sha256); return { generated: true }; } };
}

function naiveAssembly(repository) {
  const ordered = [...repository].sort((a, b) => a.project_seq - b.project_seq || a.event_id.localeCompare(b.event_id));
  return { evidence: ordered.map((item) => item.event_id), as_of_seq: ordered.reduce((max, item) => Math.max(max, item.project_seq), 0) };
}

test("identical authorized state is byte-identical with stable ordering and as_of_seq", async () => {
  const repository = [record(event2, 20), record(event1, 10)];
  const first = await assembleDeterministicEvidence(request(), authorizedSource(repository));
  const second = await assembleDeterministicEvidence(request(), authorizedSource([...repository].reverse()));
  assert.equal(canonicalJson(first), canonicalJson(second));
  assert.deepEqual(first.source_event_ids, [event1, event2]);
  assert.equal(first.as_of_seq, 20);
});

test("identical authorized state is byte-identical across processes", async () => {
  const moduleUrl = new URL("../packages/git-adapter/src/report-boundary.mjs", import.meta.url).href;
  const fixture = JSON.stringify([record(event2, 20), record(event1, 10)]);
  const script = `import {assembleDeterministicEvidence,canonicalJson} from ${JSON.stringify(moduleUrl)};const records=JSON.parse(process.argv[1]);const request=${JSON.stringify(request())};const source={retrieveAuthorized:async()=>records};process.stdout.write(canonicalJson(await assembleDeterministicEvidence(request,source)));`;
  const [left, right] = await Promise.all([
    execFileAsync(process.execPath, ["--input-type=module", "--eval", script, fixture]),
    execFileAsync(process.execPath, ["--input-type=module", "--eval", script, fixture])
  ]);
  assert.equal(left.stdout, right.stdout);
});

test("a newly authorized event changes evidence and as_of_seq and wakes once", async () => {
  const baseline = await assembleDeterministicEvidence(request(), authorizedSource([record(event1, 10)]));
  const generator = recordingGenerator();
  const result = await runReportIfChanged({ request: request(), source: authorizedSource([record(event1, 10), record(event2, 20)]), previous_as_of_seq: baseline.as_of_seq, generator: generator.generate });
  assert.equal(result.action, "wake");
  assert.deepEqual(result.input.source_event_ids, [event1, event2]);
  assert.equal(result.input.as_of_seq, 20);
  assert.equal(generator.invocations.length, 1);
});

test("unchanged authorized state invokes the generator exactly zero times across 100 repetitions", async () => {
  const repository = [record(event1, 10)];
  const generator = recordingGenerator();
  for (let index = 0; index < 100; index++) {
    const result = await runReportIfChanged({ request: request(), source: authorizedSource(repository), previous_as_of_seq: 10, generator: generator.generate });
    assert.deepEqual({ action: result.action, reason: result.reason }, { action: "skip", reason: "unchanged" });
  }
  assert.equal(generator.invocations.length, 0);
});

test("unauthorized-only higher sequence changes neither evidence nor as_of_seq and invokes zero times", async () => {
  const allowed = record(event1, 10);
  const restricted = record(restrictedId, 999, { sensitivity: "restricted", payload: { summary: "Restricted" } });
  const before = await assembleDeterministicEvidence(request(), authorizedSource([allowed]));
  const after = await assembleDeterministicEvidence(request(), authorizedSource([allowed, restricted]));
  const generator = recordingGenerator();
  const result = await runReportIfChanged({ request: request(), source: authorizedSource([allowed, restricted]), previous_as_of_seq: before.as_of_seq, generator: generator.generate });
  assert.equal(canonicalJson(after), canonicalJson(before));
  assert.equal(after.as_of_seq, 10);
  assert.equal(result.reason, "unchanged");
  assert.equal(generator.invocations.length, 0);
});

test("a source leak aborts with the R1 authorization error", async () => {
  const leaked = record(restrictedId, 999, { sensitivity: "restricted" });
  await assert.rejects(assembleDeterministicEvidence(request(), { retrieveAuthorized: async () => [record(event1, 10), leaked] }), /EVIDENCE_UNAUTHORIZED/);
});

test("report.generated cannot enter the R2 evidence set", async () => {
  const generated = record(event2, 20, { kind: "report.generated" });
  await assert.rejects(assembleDeterministicEvidence(request(), { retrieveAuthorized: async () => [generated] }), /GENERATED_EVIDENCE_FORBIDDEN/);
});

test("discriminating controls fail against naive all-visible max-sequence assembly", () => {
  const allowed = record(event1, 10);
  const restricted = record(restrictedId, 999, { sensitivity: "restricted" });
  const before = naiveAssembly([allowed]);
  const after = naiveAssembly([allowed, restricted]);
  assert.notDeepEqual(after.evidence, before.evidence, "naive control must expose the unauthorized evidence change");
  assert.notEqual(after.as_of_seq, before.as_of_seq, "naive control must advance as_of_seq on restricted activity");
  assert.equal(after.as_of_seq > before.as_of_seq, true, "naive control would wake and invoke a generator");
});
