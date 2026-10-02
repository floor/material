#!/usr/bin/env bun
/**
 * The package root's exports, pinned (FLO-351).
 *
 * Every root export is public API. This reads them from src/index.ts with the
 * type checker, values and types, and records for each whether it is public or
 * deprecated, and for a deprecated one the subpath that exports the same symbol.
 * The record is scripts/fixtures/root-exports.json; the migration table users
 * read is generated beside it as root-exports.md while names are deprecated,
 * and frozen and verified once 1.0.0 has removed them.
 *
 *   bun run root-exports:check    fails with the names added, removed or changed
 *   bun run root-exports:update   rewrites the fixture and the table
 */
import ts from "typescript";
import { join } from "node:path";

export type RootExport = {
  name: string;
  /** class: a value and a type, so `new`, `instanceof` and type positions all need it */
  kind: "value" | "type" | "class";
  /** deprecated: moving to a subpath (FLO-351); renamed: the root exports it under a new name (FLO-383) */
  status: "public" | "deprecated" | "renamed";
  /** Where to import a deprecated name from instead */
  path?: string;
  /** The name a renamed export has now, from the same root */
  to?: string;
};

const ROOT = join(import.meta.dir, "..");
const FIXTURE = join(ROOT, "scripts/fixtures/root-exports.json");
const TABLE = join(ROOT, "scripts/fixtures/root-exports.md");
/** The core subpaths, `mtrl/core/<name>`, in the order a name's path is chosen */
const SUBPATHS = ["dom", "compose", "theme", "state", "utils", "canvas", "shapes"];

const kindOf = (symbol: ts.Symbol): RootExport["kind"] =>
  symbol.flags & ts.SymbolFlags.Class ? "class" : symbol.flags & ts.SymbolFlags.Value ? "value" : "type";

/** The @deprecated text on the root's export specifier, if any */
const deprecation = (symbol: ts.Symbol): string | undefined => {
  for (const declaration of symbol.declarations ?? []) {
    const tag = ts.getJSDocTags(declaration).find((t) => t.tagName.text === "deprecated");
    if (tag) return ts.getTextOfJSDocComment(tag.comment) ?? "";
  }
  return undefined;
};

/** The root, `mtrl/core` and each core subpath, read with the type checker */
function loadModules() {
  const entries = [join(ROOT, "src/index.ts"), join(ROOT, "src/core/index.ts"), ...SUBPATHS.map((s) => join(ROOT, `src/core/${s}/index.ts`))];
  const program = ts.createProgram(entries, {
    strict: true, skipLibCheck: true, noEmit: true,
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
  });
  const checker = program.getTypeChecker();
  const resolve = (symbol: ts.Symbol) => (symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol);
  const exportsOf = (file: string) => {
    const source = program.getSourceFile(file);
    if (!source) throw new Error(`${file} is not in the program`);
    return checker.getExportsOfModule(checker.getSymbolAtLocation(source)!);
  };
  /** `mtrl/core` or `mtrl/core/<subpath>` to its source entry */
  const fileOf = (path: string) => join(ROOT, path === "mtrl/core" ? "src/core/index.ts" : `src/core/${path.slice("mtrl/core/".length)}/index.ts`);
  return { entries, resolve, exportsOf, fileOf };
}

export function readRootExports(): RootExport[] {
  const { entries, resolve, exportsOf } = loadModules();
  // The same symbol under the same exported name, not merely the same name: two
  // subpaths may export different functions under one name.
  const reach = new Map<ts.Symbol, Map<string, string>>();
  for (const subpath of SUBPATHS) {
    for (const symbol of exportsOf(join(ROOT, `src/core/${subpath}/index.ts`))) {
      const names = reach.get(resolve(symbol)) ?? new Map<string, string>();
      if (!names.has(symbol.name)) names.set(symbol.name, `mtrl/core/${subpath}`);
      reach.set(resolve(symbol), names);
    }
  }
  const core = new Map(exportsOf(join(ROOT, "src/core/index.ts")).map((symbol) => [symbol.name, resolve(symbol)]));

  const rootExports = exportsOf(entries[0]!);
  const rootByName = new Map(rootExports.map((symbol) => [symbol.name, resolve(symbol)]));
  return rootExports
    .map((symbol): RootExport => {
      const target = resolve(symbol);
      const note = deprecation(symbol);
      if (note === undefined) return { name: symbol.name, kind: kindOf(target), status: "public" };
      // A rename: "Use <NewName>", where the root exports the same symbol as NewName
      const to = /^Use (\w+)\b/.exec(note)?.[1];
      if (to && to !== symbol.name && rootByName.get(to) === target) {
        return { name: symbol.name, kind: kindOf(target), status: "renamed", to };
      }
      const path = reach.get(target)?.get(symbol.name) ?? (core.get(symbol.name) === target ? "mtrl/core" : undefined);
      if (!path) throw new Error(`${symbol.name} is deprecated on the root but no subpath exports it`);
      if (!note.includes(`'${path}'`)) throw new Error(`${symbol.name}: the deprecation should name '${path}', it says: ${note}`);
      return { name: symbol.name, kind: kindOf(target), status: "deprecated", path };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** What changed against the fixture, readably; empty when they match */
export function diffRootExports(pinned: RootExport[], now: RootExport[]): string[] {
  const before = new Map(pinned.map((e) => [e.name, e]));
  const after = new Map(now.map((e) => [e.name, e]));
  const describe = (e: RootExport) => `${e.name} (${e.kind}, ${e.status}${e.path ? ` → ${e.path}` : ""}${e.to ? ` → ${e.to}` : ""})`;
  return [
    ...now.filter((e) => !before.has(e.name)).map((e) => `added   ${describe(e)}`),
    ...pinned.filter((e) => !after.has(e.name)).map((e) => `removed ${describe(e)}`),
    ...now.filter((e) => before.has(e.name) && JSON.stringify(before.get(e.name)) !== JSON.stringify(e))
      .map((e) => `changed ${describe(before.get(e.name)!)} → ${describe(e)}`),
  ];
}

export async function readPinned(): Promise<RootExport[]> {
  return Bun.file(FIXTURE).json();
}

/** The names a migration table lists, each with the path it gives */
export function readMigrationTable(text: string): { name: string; path: string }[] {
  const rows: { name: string; path: string }[] = [];
  let path = "";
  for (const line of text.split("\n")) {
    const heading = line.match(/^## `([^`]+)`$/);
    if (heading) path = heading[1]!;
    const row = line.match(/^\| `([^`]+)` \|/);
    if (row && path) rows.push({ name: row[1]!, path });
  }
  return rows;
}

/**
 * Once the names have left the root (1.0.0), the table is frozen as 0.10.4
 * published it: each name it lists must be gone from the root and exported,
 * under the same name, by the path it gives. What is wrong, or empty.
 */
export function verifyMigrationTable(rows: { name: string; path: string }[], now: RootExport[]): string[] {
  const { exportsOf, fileOf } = loadModules();
  const root = new Set(now.map((e) => e.name));
  const byPath = new Map<string, Set<string>>();
  const named = (path: string) => byPath.get(path) ?? byPath.set(path, new Set(exportsOf(fileOf(path)).map((s) => s.name))).get(path)!;
  return rows.flatMap(({ name, path }) => [
    ...(root.has(name) ? [`${name} is still on the root`] : []),
    ...(named(path).has(name) ? [] : [`${name} is not exported by ${path}`]),
  ]);
}

/** The migration table: each name leaving the root, and where to import it from */
export function migrationTable(entries: RootExport[]): string {
  const moved = entries.filter((e) => e.status === "deprecated");
  const groups = new Map<string, RootExport[]>();
  for (const e of moved) groups.set(e.path!, [...(groups.get(e.path!) ?? []), e]);
  const lines = [
    "<!-- Generated by `bun run root-exports:update` from src/index.ts. Do not edit. -->",
    "",
    "# Root exports leaving `mtrl` in 1.0.0",
    "",
    `In 0.10.4 these ${moved.length} names are deprecated on the package root, and in 1.0.0 they`,
    "leave it. Each is the same export at the path given: change the import, nothing else.",
    "The component factories, `configureHTML`, the theme helpers and the global defaults stay.",
    "",
    "**The subpaths are ESM-only, and so is 1.0.0.** CommonJS (`require('mtrl')`) reaches only the",
    "root: on 0.10.x keep the root import there, and move to ESM `import` with these paths for 1.0.0.",
    "",
    "```ts",
    "// Before",
    "import { pipe, createBase, withEvents } from 'mtrl';",
    "// After",
    "import { pipe, createBase, withEvents } from 'mtrl/core/compose';",
    "```",
    "",
  ];
  // The composition core first: the group most users import
  const order = (path: string) => (path === "mtrl/core/compose" ? "" : path);
  for (const [path, names] of [...groups].sort(([a], [b]) => order(a).localeCompare(order(b)))) {
    lines.push(`## \`${path}\``, "", "| Name | Kind |", "| --- | --- |");
    for (const e of names) lines.push(`| \`${e.name}\` | ${e.kind} |`);
    lines.push("");
  }
  return lines.join("\n");
}

if (import.meta.main) {
  const now = readRootExports();
  // While names are deprecated the table is generated from them; once they are gone it is frozen and verified
  const leaving = now.some((e) => e.status === "deprecated");
  if (process.argv.includes("--update")) {
    await Bun.write(FIXTURE, `${JSON.stringify(now, null, 2)}\n`);
    if (leaving) await Bun.write(TABLE, migrationTable(now));
    const moved = now.filter((e) => e.status === "deprecated").length;
    const renamed = now.filter((e) => e.status === "renamed").length;
    console.log(`Wrote ${now.length} root exports (${now.length - moved - renamed} public, ${moved} deprecated, ${renamed} renamed)${leaving ? " and the migration table" : ""}.`);
  } else {
    const changes = diffRootExports(await readPinned(), now);
    const text = await Bun.file(TABLE).text();
    if (leaving && text !== migrationTable(now)) changes.push("the migration table is stale");
    if (!leaving) changes.push(...verifyMigrationTable(readMigrationTable(text), now));
    if (changes.length) {
      console.error(`The root exports differ from scripts/fixtures/root-exports.json:\n  ${changes.join("\n  ")}\n` +
        "If the change is intended, run `bun run root-exports:update` and review the diff.");
      process.exit(1);
    }
    console.log(`Root exports match the fixture: ${now.length} names.`);
  }
}
