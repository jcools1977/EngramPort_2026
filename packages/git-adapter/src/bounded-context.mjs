import { createHash } from "node:crypto";
import { readFile, readdir, realpath } from "node:fs/promises";
import path from "node:path";
import { hashBody, parseEvent, parseRecord } from "./verify-log.mjs";

// Must stay identical to the pattern verify-log validates with.
const ARTIFACT_REF = /^([^#]+)#sha256=([0-9a-f]{64})$/;

export class BoundedContextError extends Error {
  constructor(code, reference) {
    super(`${code}: refused${reference ? `: ${reference}` : ""}`);
    this.name = "BoundedContextError";
    this.code = code;
    if (reference) this.reference = reference;
  }
}

function refuse(code, reference) { throw new BoundedContextError(code, reference); }
function slash(value) { return value.replaceAll(path.sep, "/"); }
function sha256(value) { return createHash("sha256").update(value).digest("hex"); }

export async function readRepositoryContext(root, relative, expectedSha256 = null) {
  if (typeof relative !== "string" || !relative || path.isAbsolute(relative) || relative.includes("\0")) refuse("CONTEXT_PATH_REFUSED", relative);
  if (slash(relative).split("/").some((segment) => segment.startsWith("."))) refuse("CONTEXT_PATH_REFUSED", relative);
  const rootReal = await realpath(root);
  const absolute = path.resolve(rootReal, relative);
  const fileReal = await realpath(absolute).catch(() => refuse("CONTEXT_PATH_REFUSED", relative));
  if (!fileReal.startsWith(`${rootReal}${path.sep}`) || fileReal.includes(`${path.sep}.git${path.sep}`)) refuse("CONTEXT_PATH_REFUSED", relative);
  const content = await readFile(fileReal);
  if (expectedSha256 && sha256(content) !== expectedSha256) refuse("CONTEXT_DIGEST_MISMATCH", relative);
  return { relative: slash(path.relative(rootReal, fileReal)), content: content.toString("utf8") };
}

async function actorEventFiles(root) {
  const records = [];
  for (const actorFile of (await readdir(path.join(root, "actors"))).filter((name) => name.endsWith(".yaml"))) {
    records.push(parseRecord(await readFile(path.join(root, "actors", actorFile), "utf8"), actorFile));
  }
  const files = [];
  for (const actor of records) {
    for (const name of await readdir(path.join(root, actor.event_directory))) {
      if (name.endsWith(".md")) files.push(slash(path.join(actor.event_directory, name)));
    }
  }
  return files;
}

export async function resolveBoundedContext(root, references = []) {
  const records = [];
  let eventsById;
  for (const reference of references) {
    if (reference?.type === "event") {
      if (!eventsById) {
        eventsById = new Map();
        for (const relative of await actorEventFiles(root)) {
          const source = await readFile(path.join(root, relative), "utf8");
          const event = parseEvent(source, relative);
          eventsById.set(event.meta.id, { event, relative });
        }
      }
      const resolved = eventsById.get(reference.event_id);
      if (!resolved) refuse("CONTEXT_EVENT_NOT_FOUND", reference.event_id);
      if (hashBody(resolved.event.body) !== resolved.event.meta.content_sha256) refuse("CONTEXT_DIGEST_MISMATCH", reference.event_id);
      records.push({ relative: resolved.relative, content: resolved.event.body });
      continue;
    }
    if (reference?.type === "artifact" && typeof reference.ref === "string") {
      // The same shape verify-log enforces on the way in. These were written
      // apart and disagreed: the validator required "#sha256=" and this split
      // on "#sha256:", so every artifact bound into bounded_context was refused
      // with CONTEXT_REFERENCE_REFUSED while events resolved fine. The suite
      // stayed green because three tests encoded this parser's delimiter rather
      // than the format the writer produces. Sharing the pattern is the fix;
      // duplicating it was the defect.
      const match = reference.ref.match(ARTIFACT_REF);
      if (!match) refuse("CONTEXT_REFERENCE_REFUSED", reference.ref);
      records.push(await readRepositoryContext(root, match[1], match[2]));
      continue;
    }
    refuse("CONTEXT_REFERENCE_REFUSED", JSON.stringify(reference));
  }
  return records;
}

export async function resolveArtifactReferences(root, references = []) {
  return resolveBoundedContext(root, references.map((ref) => ({ type: "artifact", ref })));
}
