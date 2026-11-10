import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { gzipSync, brotliCompressSync, constants } from 'node:zlib';

export const digest = bytes => createHash('sha256').update(bytes).digest('hex');
export function assetRecord(file, bytes, imports = [], dynamicImports = []) {
  const content = Buffer.from(bytes);
  const text = /\.(?:css|m?js|html)$/.test(file);
  return { file, kind: file.endsWith('.css') ? 'css' : /\.m?js$/.test(file) ? 'js' : file.endsWith('.html') ? 'html' : 'binary',
    raw: content.length, gzip: text ? gzipSync(content, { level: 9 }).length : null,
    brotli: text ? brotliCompressSync(content, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length : null,
    sha256: digest(content), imports: [...new Set(imports)], dynamicImports: [...new Set(dynamicImports)] };
}
// Vite removes CSS-only JS placeholders after Rolldown fills dynamicImports.
// Resolve only proven CSS-only placeholders captured before that removal.
export function resolveCssChunks(records, aliases) {
  const emitted = new Set(records.map(row => row.file)); const collapsed = new Set();
  const expand = (file, trail = new Set()) => {
    if (emitted.has(file)) return [file];
    const alias = aliases.get(file);
    assert.ok(alias?.modules.length && alias.modules.every(id => /\.css(?:$|\?)/.test(id)), `unaccounted emitted reference ${file}`);
    assert.ok(!trail.has(file), `cyclic removed CSS chunk ${file}`);
    collapsed.add(file); const next = new Set([...trail, file]);
    return [...alias.imports, ...alias.dynamicImports].flatMap(name => expand(name, next));
  };
  return { records: records.map(row => ({ ...row, imports: [...new Set(row.imports.flatMap(name => expand(name)))],
    dynamicImports: [...new Set(row.dynamicImports.flatMap(name => expand(name)))] })),
    collapsedCssChunks: [...collapsed].sort().map(file => ({ file, ...aliases.get(file) })) };
}
export function staticClosure(records, roots) {
  const lookup = new Map(records.map(record => [record.file, record]));
  assert.equal(lookup.size, records.length, 'duplicate emitted asset name');
  const seen = new Set();
  const visit = file => { if (seen.has(file)) return; assert.ok(lookup.has(file), `unaccounted static asset ${file}`); seen.add(file); lookup.get(file).imports.forEach(visit); };
  roots.forEach(visit); return [...seen].sort();
}
export function declaredClosure(records, roots) {
  return staticClosure(records.map(row => ({ ...row, imports: [...row.imports, ...row.dynamicImports] })), roots);
}
export function startupClosure(records, roots) {
  const kinds = new Map(records.map(row => [row.file, row.kind]));
  return staticClosure(records.map(row => ({ ...row, imports: row.imports.filter(file => kinds.get(file) !== 'binary') })), roots);
}
export function totals(records, names) {
  const selected = new Set(names);
  const rows = records.filter(row => selected.has(row.file));
  assert.equal(rows.length, selected.size, 'requested asset absent from ledger');
  const sum = key => rows.reduce((n, row) => n + (row[key] ?? row.raw), 0);
  return { files: rows.length, raw: sum('raw'), gzipTextPlusRawBinary: sum('gzip'), brotliTextPlusRawBinary: sum('brotli') };
}
export function phaseSets(staticNames, startup, interaction, emitted) {
  const all = new Set(emitted);
  for (const file of [...staticNames, ...startup, ...interaction]) assert.ok(all.has(file), `unaccounted request ${file}`);
  const initial = new Set([...staticNames, ...startup]);
  return { staticClosure: [...new Set(staticNames)].sort(), observedStartup: [...new Set(startup)].sort(),
    initial: [...initial].sort(), interactionOnly: [...new Set(interaction)].filter(file => !initial.has(file)).sort(),
    observedComplete: [...new Set([...initial, ...interaction])].sort(), allEmitted: [...all].sort() };
}
export function coverage(roles, missing, outcomes) {
  assert.ok(missing.every(role => roles.includes(role)), 'unknown unsupported role');
  for (const role of roles) {
    if (missing.includes(role)) { assert.equal(outcomes[role], undefined, `unsupported ${role} was substituted`); continue; }
    assert.equal(outcomes[role]?.status, 'pass', `${role} did not pass its declared rendered check`);
  }
  return { requested: roles.length, rendered: roles.length - missing.length, missing,
    complete: missing.length === 0, comparableFullApp: missing.length === 0 };
}
