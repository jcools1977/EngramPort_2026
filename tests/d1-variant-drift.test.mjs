import assert from 'node:assert/strict';
import test from 'node:test';
import {runDrift, variantInventory} from './d1-variant-drift.mjs';
import {readFileSync, mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';

test('D1 every source variant applies, loads, and preserves or rewrites imports by tree shape', () => {
  const source = readFileSync(path.resolve(import.meta.dirname, '../scripts/run-d1-mutation-harness'), 'utf8');
  const inventory = variantInventory(source);
  // Discovery must include every builder, including modes after multiline blocks.
  assert.equal(inventory.length, [...source.matchAll(/^make_\w+_variant\(\)\{/gm)].length);
  for (const builder of inventory) {
    assert.match(builder.body, /d1_variant_node/);
    if (builder.directory) assert.doesNotMatch(builder.body, /\bwriteVariant\(/);
    else assert.doesNotMatch(builder.body, /fs\.writeFileSync/);
  }
  const result = runDrift({synthetic: true});
  console.log(`D1_VARIANT_DRIFT executed=${result.executed} loaded=${result.loaded} synthetic_rewritten=${result.syntheticRewritten} failures=${result.failures.length}`);
  assert.deepEqual(result.failures, []);
  assert.ok(result.syntheticRewritten + result.relativePreserved >= result.executed);
  assert.ok(result.relativePreserved > 5);
  assert.ok(result.syntheticRewritten > 0);
});

test('D1 drift control rejects a broken correspondent import and a missing Port Watch anchor', () => {
  const root = path.resolve(import.meta.dirname, '..');
  const directory = mkdtempSync(path.join(tmpdir(), 'd1-drift-negative-'));
  try {
    const source = readFileSync(path.join(root, 'scripts/run-d1-mutation-harness'), 'utf8');
    const start = source.indexOf('make_report_correspondent_variant(){');
    const end = source.indexOf('\nNODE\n}', start);
    const section = source.slice(start, end);
    const writer = 'writeVariant(target,text,source);';
    assert.equal(section.split(writer).length, 2);
    const broken = section.replace(writer, 'fs.writeFileSync(target,text.replace(\'"./verify-log.mjs"\',JSON.stringify(pathToFileURL(path.join(root,"packages/git-adapter/src/verify-log.mjs")).href)));');
    const anchor = '.filter(({ event }) => event.meta.type !== "withdrawal" && event.meta.type !== "correction" && event.meta.next === actor && !answered.has(event.meta.id))';
    assert.equal(source.split(anchor).length, 2);
    const harness = path.join(directory, 'broken.bash');
    writeFileSync(harness, source.replace(section, broken).replace(anchor, 'F175_INTENTIONALLY_MISSING_ANCHOR'));
    const result = runDrift({harness});
    assert.ok(result.failures.some(message => /make_report_correspondent_variant.*load failure/.test(message) && message.includes('report-criteria.mjs')));
    assert.ok(result.failures.some(message => /PORT_WATCH_SHARED_ELIGIBILITY.*anchor\/build failure/.test(message) && message.includes('F175_INTENTIONALLY_MISSING_ANCHOR')));
    assert.equal(result.failures.length, 5);
    console.log(`D1_DRIFT_NEGATIVE executed=${result.executed} failures=${result.failures.length} correspondent-load=detected port-watch-anchor=detected`);
  } finally { rmSync(directory, {recursive: true, force: true}); }
});


test('D1 drift control rejects import rewriting in every whole-tree builder', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'd1-tree-negative-'));
  try {
    const source = readFileSync(path.resolve(import.meta.dirname, '../scripts/run-d1-mutation-harness'), 'utf8');
    let broken = source;
    for (const builder of variantInventory(source).filter(builder => builder.directory)) {
      broken = broken.replace(builder.body, builder.body.replaceAll('fs.writeFileSync(', 'writeVariant('));
    }
    const harness = path.join(directory, 'broken.bash');
    writeFileSync(harness, broken);
    const result = runDrift({harness, synthetic: true});
    // Manifest-only and YAML mutations have no mutated module imports.
    const moduleBuilders = variantInventory(source).filter(builder => builder.directory && !['make_actor_registry_variant', 'make_sdk_package_variant'].includes(builder.name));
    for (const builder of moduleBuilders) assert.ok(result.failures.some(message => message.startsWith(`${builder.name}:`) && message.includes('whole-tree import rewritten')), builder.name);
    assert.ok(result.failures.every(message => /whole-tree import rewritten|relative synthetic import missing/.test(message)), result.failures.join('\n'));
    console.log(`D1_TREE_NEGATIVE executed=${result.executed} failures=${result.failures.length} whole-tree-rewrite=detected`);
  } finally { rmSync(directory, {recursive: true, force: true}); }
});
