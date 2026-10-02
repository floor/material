#!/usr/bin/env bun
/**
 * Each component subpath's exports, pinned (FLO-381), and each
 * `mtrl/components/<name>/constants` subpath's (FLO-384).
 *
 * `mtrl/components/<name>` is public API like the root (FLO-351): every name
 * its index exports is a 1.x promise. This reads every component index with
 * the type checker, values and types, records each export as public or
 * deprecated (an `@deprecated` tag on its re-export), and pins the result in
 * scripts/fixtures/component-exports.json.
 *
 *   bun run component-exports:check    fails with the names added, removed or changed
 *   bun run component-exports:update   rewrites the fixture
 */
import ts from "typescript";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

export type ComponentExport = { name: string; kind: "value" | "type" | "class"; status: "public" | "deprecated"; note?: string };
export type ComponentExports = Record<string, ComponentExport[]>;

const ROOT = join(import.meta.dir, "..");
const FIXTURE = join(ROOT, "scripts/fixtures/component-exports.json");

/** The component folders `mtrl/components/<name>` resolves to */
export const componentNames = (): string[] =>
  readdirSync(join(ROOT, "src/components"))
    .filter((name) => existsSync(join(ROOT, `src/components/${name}/index.ts`)))
    .sort();

const kindOf = (symbol: ts.Symbol): ComponentExport["kind"] =>
  symbol.flags & ts.SymbolFlags.Class ? "class" : symbol.flags & ts.SymbolFlags.Value ? "value" : "type";

/** The @deprecated text on the index's export specifier, if any */
const deprecation = (symbol: ts.Symbol): string | undefined => {
  for (const declaration of symbol.declarations ?? []) {
    const tag = ts.getJSDocTags(declaration).find((t) => t.tagName.text === "deprecated");
    if (tag) return ts.getTextOfJSDocComment(tag.comment) ?? "";
  }
  return undefined;
};

/** The `mtrl/components/<name>/constants` subpaths, pinned beside the indexes (FLO-384) */
export const constantsNames = (): string[] =>
  componentNames().filter((name) => existsSync(join(ROOT, `src/components/${name}/constants.ts`))).map((name) => `${name}/constants`);

export function readComponentExports(): ComponentExports {
  const names = [...componentNames(), ...constantsNames()].sort();
  const files = names.map((name) => join(ROOT, `src/components/${name.endsWith("/constants") ? `${name}.ts` : `${name}/index.ts`}`));
  const program = ts.createProgram(files, {
    strict: true, skipLibCheck: true, noEmit: true,
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
  });
  const checker = program.getTypeChecker();
  const result: ComponentExports = {};
  names.forEach((name, index) => {
    const source = program.getSourceFile(files[index]!);
    const module = source && checker.getSymbolAtLocation(source);
    result[name] = (module ? checker.getExportsOfModule(module) : [])
      .map((symbol): ComponentExport => {
        const target = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
        const note = deprecation(symbol);
        return note === undefined
          ? { name: symbol.name, kind: kindOf(target), status: "public" }
          : { name: symbol.name, kind: kindOf(target), status: "deprecated", note };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  });
  return result;
}

/** What changed against the fixture, readably; empty when they match */
export function diffComponentExports(pinned: ComponentExports, now: ComponentExports): string[] {
  const changes: string[] = [];
  const describe = (e: ComponentExport) => `${e.name} (${e.kind}, ${e.status})`;
  for (const component of new Set([...Object.keys(pinned), ...Object.keys(now)])) {
    const before = new Map((pinned[component] ?? []).map((e) => [e.name, e]));
    const after = new Map((now[component] ?? []).map((e) => [e.name, e]));
    if (!pinned[component]) changes.push(`added subpath mtrl/components/${component}`);
    if (!now[component]) changes.push(`removed subpath mtrl/components/${component}`);
    for (const [name, e] of after) if (!before.has(name)) changes.push(`${component}: added   ${describe(e)}`);
    for (const [name, e] of before) if (!after.has(name)) changes.push(`${component}: removed ${describe(e)}`);
    for (const [name, e] of after) {
      const old = before.get(name);
      if (old && JSON.stringify(old) !== JSON.stringify(e)) changes.push(`${component}: changed ${describe(old)} → ${describe(e)}`);
    }
  }
  return changes;
}

export const readPinned = async (): Promise<ComponentExports> => Bun.file(FIXTURE).json();

if (import.meta.main) {
  const now = readComponentExports();
  if (process.argv.includes("--update")) {
    await Bun.write(FIXTURE, `${JSON.stringify(now, null, 2)}\n`);
    const all = Object.values(now).flat();
    console.log(`Wrote ${Object.keys(now).length} component subpaths, ${all.length} exports (${all.filter((e) => e.status === "deprecated").length} deprecated).`);
  } else {
    const changes = diffComponentExports(await readPinned(), now);
    if (changes.length) {
      console.error(`The component exports differ from scripts/fixtures/component-exports.json:\n  ${changes.join("\n  ")}\n` +
        "If the change is intended, run `bun run component-exports:update` and review the diff.");
      process.exit(1);
    }
    console.log(`Component exports match the fixture: ${Object.keys(now).length} subpaths.`);
  }
}
