import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

// Preserve copied module graphs by resolving against each copied source file.
// Detached variants resolve against their original source, with explicit
// substitutions only for dependencies intentionally mutated in the same case.
function rewriteVariantImports(text, source, overrides = {}) {
  return text.replace(/(["'])(\.{1,2}\/[^"'\r\n]+\.mjs)\1/g, (_match, quote, specifier) =>
    quote + pathToFileURL(overrides[specifier] ?? path.resolve(path.dirname(source), specifier)).href + quote);
}
function writeVariant(target, text, source = target, overrides = {}) {
  fs.writeFileSync(target, String(target).endsWith('.mjs') ? rewriteVariantImports(text, source, overrides) : text);
}
global.rewriteVariantImports = rewriteVariantImports;
global.writeVariant = writeVariant;
export {rewriteVariantImports, writeVariant};
