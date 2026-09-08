import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
const scripts = JSON.parse(readFileSync("package.json", "utf8")).scripts;
const gates = scripts.test.split(" && ").map(command => command.startsWith("npm run ") ? command.slice(8) : command);
const results = [];
for (const gate of [...gates, "db:test", "kms:test", "lint"]) {
  const command = gate.startsWith("node ") ? gate : `npm run ${gate}`;
  const label = gate.startsWith("node ") ? "rendered-html" : gate.replaceAll(":", "-");
  const result = spawnSync(command, { shell: true, encoding: "utf8", timeout: 240_000, maxBuffer: 20_000_000 });
  writeFileSync(`artifacts/agent-b/f156-scan/gate-${label}.log`, `${result.stdout ?? ""}${result.stderr ?? ""}`);
  const entry = { command, exit: result.status, signal: result.signal, error: result.error?.message ?? null };
  results.push(entry);
  writeFileSync("artifacts/agent-b/f156-scan/gates.json", JSON.stringify(results, null, 2) + "\n");
  console.log(JSON.stringify(entry));
}
