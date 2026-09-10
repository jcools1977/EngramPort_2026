import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, existsSync, cpSync, symlinkSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export function variantInventory(source) {
  return [...source.matchAll(/^(make_\w+_variant)\(\)\{\n([\s\S]*?)^NODE\n\}/gm)].map(([,name,body]) => {
    const modes = new Set([...body.matchAll(/\bmode\s*===\s*"([^"]+)"/g)].map(match => match[1]));
    for (const match of body.matchAll(/(?:const known=|if\()(\[[^\n]*?\])(?:;|\.includes\(mode\))/g)) {
      for (const mode of JSON.parse(match[1])) modes.add(mode);
    }
    return {name, body, modes: modes.size ? [...modes] : [''], directory: /(?:mkdir -p "\$target(?:\/|"))/.test(body)};
  });
}

export function runDrift({root = path.resolve(import.meta.dirname, '..'), harness = path.join(root, 'scripts/run-d1-mutation-harness'), synthetic = false} = {}) {
  const source = readFileSync(harness, 'utf8');
  const inventory = variantInventory(source);
  const directory = mkdtempSync(path.join(tmpdir(), 'd1-variant-drift-'));
  // Build the published SDK variant prerequisite only in this disposable tree.
  const snapshot = path.join(directory, 'source');
  mkdirSync(snapshot);
  for (const surface of ['packages', 'worker', 'tests', 'actors', 'schemas', 'app']) cpSync(path.join(root, surface), path.join(snapshot, surface), {recursive: true});
  symlinkSync(path.join(root, 'node_modules'), path.join(snapshot, 'node_modules'), 'dir');
  const build = spawnSync(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), 'build', '--config', 'vite.config.mjs'], {cwd: path.join(snapshot, 'packages/sdk'), encoding: 'utf8', timeout: 30000});
  const failures = [], observations = [];
  if (build.status !== 0) failures.push(`SDK prerequisite build failed: ${build.stderr || build.error}`);
  let executed = 0, loaded = 0, syntheticRewritten = 0;
  if (synthetic) {
    function inject(folder) {
      const entries = readdirSync(folder, {withFileTypes: true});
      const modules = entries.filter(entry => entry.isFile() && entry.name.endsWith('.mjs'));
      if (modules.length) writeFileSync(path.join(folder, '__f175_synthetic.mjs'), 'export const probe = true;\n');
      for (const entry of entries) {
        if (entry.isDirectory()) inject(path.join(folder, entry.name));
        else if (entry.isFile() && entry.name.endsWith('.mjs')) {
          const file = path.join(folder, entry.name);
          writeFileSync(file, readFileSync(file, 'utf8') + '\nimport "./__f175_synthetic.mjs";\n');
        }
      }
    }
    for (const surface of ['packages', 'worker', 'tests']) inject(path.join(snapshot, surface));
  }
  try {
    for (const builder of inventory) for (const mode of builder.modes) {
      const name = `${builder.name}:${mode || 'default'}${builder.name === 'make_port_watch_variant' && mode === 'shared' ? ' PORT_WATCH_SHARED_ELIGIBILITY' : ''}`;
      const location = path.join(directory, String(executed++));
      mkdirSync(location);
      const target = path.join(location, builder.directory ? 'tree' : 'variant.mjs');
      const writes = path.join(location, 'writes.txt');
      const env = {...process.env, D1_DRIFT_WRITES: writes, NODE_OPTIONS: `--import=${path.join(import.meta.dirname, 'helpers/d1-drift-record.mjs')}`};
      delete env.NODE_TEST_CONTEXT;
      const result = spawnSync('bash', ['-c', 'source "$1"; root_dir="$2"; "$3" "$4" "$5" "$6"', 'drift', harness, snapshot, builder.name, target,
        builder.name === 'make_event_extension_case_variant' ? path.join(location, 'cli.mjs') : mode, path.join(location, 'core.mjs')],
      {cwd: path.resolve(import.meta.dirname, '..'), env, encoding: 'utf8', timeout: 30000});
      if (result.status !== 0) {
        failures.push(`${name} anchor/build failure: ${result.stderr.trim() || result.error}`);
        continue;
      }
      const files = existsSync(writes) ? [...new Set(readFileSync(writes, 'utf8').trim().split('\n'))] : [];
      if (!files.length) { failures.push(`${name} no writes observed`); continue; }
      // Manifest-only package mutations still load the package's selected source.
      if (builder.name === 'make_sdk_package_variant') files.push(path.join(target, 'packages/sdk/src/index.mjs'));
      for (const file of files.filter(file => file.endsWith('.mjs'))) {
        // The site variant changes TSX, not an ECMAScript module.
        if (builder.name === 'make_site_install_claim_variant') continue;
        if (synthetic && builder.name !== 'make_sdk_package_variant') {
          const text = readFileSync(file, 'utf8');
          if (!text.includes('__f175_synthetic.mjs') || /["']\.\/__f175_synthetic\.mjs["']/.test(text)) failures.push(`${name} synthetic import not rewritten: ${file}`);
          else syntheticRewritten++;
        }
        const load = spawnSync(process.execPath, ['--no-warnings', '--experimental-loader', path.join(import.meta.dirname, 'helpers/d1-drift-loader.mjs'), '--input-type=module', '-e', 'await import(process.argv[1])', pathToFileURL(file).href],
          {cwd: root, encoding: 'utf8', timeout: 15000});
        loaded++;
        if (load.status !== 0) failures.push(`${name} load failure: ${load.stderr.trim() || load.error}`);
      }
      observations.push(`${name} applied=t`);
    }
  } finally { rmSync(directory, {recursive: true, force: true}); }
  return {executed, loaded, syntheticRewritten, failures, observations};
}
if (process.argv[1] === import.meta.filename) {
  const result = runDrift({harness: process.argv[2]});
  for (const failure of result.failures) console.error(failure);
  console.log(`D1_VARIANT_DRIFT executed=${result.executed} loaded=${result.loaded} synthetic_rewritten=${result.syntheticRewritten} failures=${result.failures.length}`);
  process.exitCode = result.failures.length ? 1 : 0;
}
