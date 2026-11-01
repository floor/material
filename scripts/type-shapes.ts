#!/usr/bin/env bun
/**
 * The shape of each public type: the values its union accepts, and the bases
 * its interface extends.
 *
 * The export pins record names and kinds. What the types themselves promise is
 * not visible to them: a union member can leave a config type as a silent API
 * removal, and an `extends` clause can go while the interface repeats its
 * base's members, which structural typing makes indistinguishable. A
 * type-level fixture cannot hold the relation either, for the same reason.
 *
 * This reads the declarations on every public subpath the manifest lists with
 * the type checker and pins them in scripts/fixtures/type-shapes.json.
 * Only the written surface is read: a union alias is pinned as the union it
 * resolves to (a `(typeof CONST)[number]` too), an interface by its heritage
 * clauses and by the unions its properties write (keyed `Interface.property`).
 * A type re-exported from two subpaths is one entry: the shape belongs to the
 * declaration, not to the subpath that shows it.
 *
 *   bun run type-shapes:check    fails with the members and bases added, removed or changed
 *   bun run type-shapes:update   rewrites the fixture
 */
import ts from "typescript";
import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

export type TypeShape =
  | { kind: "union"; members: string[] }
  | { kind: "extends"; bases: string[] };
export type TypeShapes = Record<string, TypeShape>;

const ROOT = join(import.meta.dir, "..");
const FIXTURE = join(ROOT, "scripts/fixtures/type-shapes.json");

/**
 * The entry files of every public subpath the manifest lists, plus the root.
 * The asset-only and generated subpaths (styles, themes, elements/css, the
 * adapters) have no source entry: their surface is their own check's.
 */
const entryFiles = (): string[] => {
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as { exports: Record<string, unknown> };
  const files = [join(ROOT, "src/index.ts")];
  for (const key of Object.keys(pkg.exports)) {
    const base = join(ROOT, "src", key.slice(2));
    if (existsSync(`${base}.ts`)) files.push(`${base}.ts`);
    else if (existsSync(join(base, "index.ts"))) files.push(join(base, "index.ts"));
  }
  return files.filter((file) => existsSync(file));
};

/**
 * The members of a union, untruncated — the default formatting cuts a long
 * union to "… N more …", which would pin the shape of nothing — and sorted:
 * the checker orders a union by its internal type ids, which move with
 * unrelated program construction, and the pin must not.
 */
const membersOf = (checker: ts.TypeChecker, type: ts.UnionType): string[] =>
  [...new Set(type.types.map((member) => checker.typeToString(member, undefined, ts.TypeFormatFlags.NoTruncation)))].sort();

/** The shapes a declaration writes, keyed by the name the pin uses. */
const shapesOf = (checker: ts.TypeChecker, symbol: ts.Symbol): [string, TypeShape][] => {
  const shapes: [string, TypeShape][] = [];
  const bases: string[] = [];
  for (const declaration of symbol.declarations ?? []) {
    if (ts.isTypeAliasDeclaration(declaration)) {
      const type = checker.getTypeAtLocation(declaration.type);
      if (type.isUnion()) shapes.push([symbol.name, { kind: "union", members: membersOf(checker, type) }]);
    } else if (ts.isInterfaceDeclaration(declaration)) {
      for (const clause of declaration.heritageClauses ?? []) {
        if (clause.token !== ts.SyntaxKind.ExtendsKeyword) continue;
        bases.push(...clause.types.map((type) => type.getText().replace(/\s+/g, " ")));
      }
      for (const member of declaration.members) {
        if (!ts.isPropertySignature(member) || !member.type || !ts.isUnionTypeNode(member.type)) continue;
        // Written, not resolved: the checker widens `BadgeVariant | string` to
        // `string`, which would pin the collapse and not the members.
        const members = member.type.types.map((type) => type.getText().replace(/\s+/g, " "));
        shapes.push([`${symbol.name}.${member.name.getText()}`, { kind: "union", members: [...new Set(members)].sort() }]);
      }
    }
  }
  if (bases.length) shapes.push([symbol.name, { kind: "extends", bases }]);
  return shapes;
};

export function readTypeShapes(): TypeShapes {
  const files = entryFiles();
  const program = ts.createProgram(files, {
    strict: true, skipLibCheck: true, noEmit: true,
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
  });
  const checker = program.getTypeChecker();
  const found = new Map<string, { shape: TypeShape; file: string }>();
  for (const file of files) {
    const source = program.getSourceFile(file);
    const module = source && checker.getSymbolAtLocation(source);
    if (!module) continue;
    for (const symbol of checker.getExportsOfModule(module)) {
      const target = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
      const declaration = target.declarations?.[0];
      const at = declaration ? relative(ROOT, declaration.getSourceFile().fileName) : file;
      for (const [name, shape] of shapesOf(checker, target)) {
        const existing = found.get(name);
        // The name is the key: one type, one shape, however many subpaths show
        // it. Two different declarations under one name would be pinned as one.
        if (existing && existing.file !== at) {
          throw new Error(`Two public declarations are pinned as ${name}: ${existing.file} and ${at}. Pin by subpath and name before this can be checked.`);
        }
        if (!existing) found.set(name, { shape, file: at });
      }
    }
  }
  return Object.fromEntries([...found.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([name, { shape }]) => [name, shape]));
}

/** What changed against the fixture, readably; empty when they match. */
export function diffTypeShapes(pinned: TypeShapes, now: TypeShapes): string[] {
  const changes: string[] = [];
  const shown = (shape: TypeShape) =>
    shape.kind === "union" ? `union (${shape.members.join(" | ")})` : `extends (${shape.bases.join(", ")})`;
  for (const name of [...new Set([...Object.keys(pinned), ...Object.keys(now)])].sort()) {
    const before = pinned[name];
    const after = now[name];
    if (!before) {
      changes.push(`${name}: added, ${shown(after!)}`);
      continue;
    }
    if (!after) {
      changes.push(`${name}: removed, was ${shown(before)}`);
      continue;
    }
    if (before.kind !== after.kind) {
      changes.push(`${name}: ${shown(before)} is now ${shown(after)}`);
      continue;
    }
    if (before.kind === "union" && after.kind === "union") {
      for (const member of before.members) if (!after.members.includes(member)) changes.push(`${name}: union member ${member} was removed`);
      for (const member of after.members) if (!before.members.includes(member)) changes.push(`${name}: union member ${member} was added`);
    } else if (before.kind === "extends" && after.kind === "extends") {
      for (const base of before.bases) if (!after.bases.includes(base)) changes.push(`${name}: no longer extends ${base}`);
      for (const base of after.bases) if (!before.bases.includes(base)) changes.push(`${name}: now extends ${base}`);
    }
  }
  return changes;
}

export const readPinned = async (): Promise<TypeShapes> => Bun.file(FIXTURE).json();

if (import.meta.main) {
  const now = readTypeShapes();
  if (process.argv.includes("--update")) {
    await Bun.write(FIXTURE, `${JSON.stringify(now, null, 2)}\n`);
    const shapes = Object.values(now);
    console.log(`Wrote ${shapes.length} public type shapes (${shapes.filter((s) => s.kind === "union").length} unions, ` +
      `${shapes.filter((s) => s.kind === "extends").length} with extends).`);
  } else {
    const changes = diffTypeShapes(await readPinned(), now);
    if (changes.length) {
      console.error(`The public type shapes differ from scripts/fixtures/type-shapes.json:\n  ${changes.join("\n  ")}\n` +
        "If the change is intended, run `bun run type-shapes:update` and review the diff. A removal is announced: " +
        "deprecate it in a release first, remove it in a later one.");
      process.exit(1);
    }
    console.log(`Public type shapes match the fixture: ${Object.keys(now).length} declarations.`);
  }
}
