import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

export const THREAT_MODEL_REVISION = 8;
export const THREAT_MODEL_DIGEST = "629ae3f2654aba46e4c1158fc234c6b24831a369505ccf41878af3207b091089";
const TIER_A = Object.freeze(["A1","A2","A3","A4","A5","A6","A7","A8","A9"]);
const digest = bytes => createHash("sha256").update(bytes).digest("hex");

export async function readThreatModelBinding(path) {
  const bytes = await readFile(path);
  return { revision: THREAT_MODEL_REVISION, digest: digest(bytes) };
}

export async function assertW3DispatchEligible(registry, threatModelPath) {
  const current = await readThreatModelBinding(threatModelPath);
  if (current.digest !== THREAT_MODEL_DIGEST) throw new Error("DISPATCH_THREAT_MODEL_DIGEST_MISMATCH");
  if (!registry || registry.revision !== THREAT_MODEL_REVISION || registry.digest !== current.digest) throw new Error("DISPATCH_EVIDENCE_BINDING_MISMATCH");
  if (registry.waiver || registry.flag || registry.prose_assertion || registry.task_registered) throw new Error("DISPATCH_NON_EVIDENCE_REFUSED");
  const entries = new Map((registry.controls ?? []).map(entry => [entry.control, entry]));
  for (const control of TIER_A) {
    const entry = entries.get(control);
    if (!entry || entry.revision !== current.revision || entry.digest !== current.digest || entry.outcome !== "passed" || !entry.commit) throw new Error(`DISPATCH_TIER_A_INCOMPLETE:${control}`);
  }
  return Object.freeze({ eligible: true, revision: current.revision, digest: current.digest, controls: [...TIER_A] });
}

export { TIER_A };
