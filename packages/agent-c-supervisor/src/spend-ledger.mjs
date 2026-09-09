import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { discoverEventFiles, parseEvent, verifyLog } from "../../git-adapter/src/verify-log.mjs";
import { ticksSpentOn, utcDay } from "./spend-gate.mjs";

// The Git log vouches for bytes, not independently authenticated provider cost.
// Hash and parse the same buffer so a second review read cannot change the cost.
export async function spentTicksToday(spendRoots, day = utcDay(new Date())) {
  const rows = [];
  try {
    for (const base of new Set(spendRoots.map((root) => path.resolve(root)))) {
      const dir = path.join(base, "artifacts/agent-c/reviews");
      let names;
      try { names = await readdir(dir); }
      catch (error) {
        if (error.code === "ENOENT") continue; // F158_MISSING_ROOT
        throw error; // F158_UNREADABLE_ROOT
      }

      const events = [];
      for (const file of await discoverEventFiles(path.join(base, "events/agent-c"))) {
        events.push({ file, bytes: await readFile(file) });
      }
      // Acceptance includes canonical shape, ownership, causal links and hashes.
      if (!(await verifyLog(base)).ok) return null; // F158_ACCEPTED_LOG
      const references = new Set();
      for (const { file, bytes } of events) {
        if (!bytes.equals(await readFile(file))) return null;
        const event = parseEvent(bytes.toString("utf8"), path.relative(base, file));
        if (event.meta.from !== "agent-c") return null;
        for (const ref of event.meta.artifacts ?? []) references.add(ref);
      }
      for (const name of names.filter((entry) => entry.endsWith(".json"))) {
        const relative = `artifacts/agent-c/reviews/${name}`;
        const bytes = await readFile(path.join(dir, name));
        const digest = createHash("sha256").update(bytes).digest("hex");
        if (!references.has(`${relative}#sha256=${digest}`)) return null; // F158_VOUCHED_BYTES
        rows.push({ relative: path.join(base, relative), review: JSON.parse(bytes.toString("utf8")) });
      }
    }
    return ticksSpentOn(rows, day);
  } catch {
    return null;
  }
}
