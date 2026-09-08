import { readFileSync, writeFileSync, cpSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
const relative = "packages/agent-c-supervisor/src/index.mjs";
let source = readFileSync(relative, "utf8");
source = source.replace('import { detectCredential }', 'import { detectCredential, MAX_CONTEXT_BYTES }')
  .replace('const MAX_CONTEXT_BYTES = 1_000_000;\n', '')
  .replace('contextFile, matchedPattern } = {})', 'contextFile, matchedPattern, bytes, limit } = {})')
  .replace('const context = [contextFile &&', 'const context = [bytes !== undefined && `bytes=${bytes}`, limit !== undefined && `limit=${limit}`, contextFile &&')
  .replace('this.code = code;', 'this.code = code;\n    if (bytes !== undefined) this.bytes = bytes;\n    if (limit !== undefined) this.limit = limit;')
  .replace('bytes: Buffer.byteLength(serialized)', 'bytes: finding.bytes, limit: finding.limit')
  .replace('{}, { maxBytes: MAX_CONTEXT_BYTES }', '{}, { maxBytes: MAX_CONTEXT_BYTES, rawStringBytes: true }');
writeFileSync("artifacts/agent-b/f156-scan/proposed-supervisor-index.mjs", source);
const root = mkdtempSync(path.join(tmpdir(), "f156-proposal-"));
for (const dir of ["packages/git-adapter/src", "packages/agent-c-supervisor/src"]) cpSync(dir, path.join(root, dir), { recursive: true });
writeFileSync(path.join(root, relative), source);
console.log(root);
