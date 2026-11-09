#!/usr/bin/env bun
// scripts/check-declaration-exports.ts
/**
 * Build first (or pass `--dist <dir>`): the declaration consolidation folds
 * private modules into the exported barrels, so what a consumer can name has to
 * be proved on the packed package, through the package's own `exports`.
 *
 * Every `exports` entry that carries declarations gets a generated consumer:
 * one namespace import that proves the path resolves to the shipped
 * declarations, and one named import per name the entry exports. The specs
 * compile with `skipLibCheck` off, so a declaration the consolidation inlined
 * badly is reported rather than silently becoming `any`; diagnostics inside
 * third-party types are not this package's to fix and are left alone.
 *
 *   bun run declaration-exports:check
 *   bun run scripts/check-declaration-exports.ts --dist ./dist
 */
import ts from "typescript";
import { cp, mkdir, mkdtemp, readdir, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createPackageFixture } from "./package-fixture";

const ROOT = join(import.meta.dir, "..");
const manifest = await Bun.file(join(ROOT, "package.json")).json() as { name: string };

const options: ts.CompilerOptions = {
  strict: true, skipLibCheck: false, noEmit: true,
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  lib: ["lib.es2022.d.ts", "lib.dom.d.ts"],
};

const distArgument = process.argv.indexOf("--dist");
const dist = distArgument === -1 ? undefined : resolve(process.argv[distArgument + 1]!);
if (distArgument !== -1 && !process.argv[distArgument + 1]) {
  console.error("Usage: check-declaration-exports.ts [--dist <directory>]");
  process.exit(2);
}

interface Entry {
  /** The specifier a consumer writes. */
  specifier: string;
  /** The declaration file the entry's `types` target names, package-relative. */
  types: string;
}

/** The `types` target of an exports entry, when it has one. */
function typesTarget(value: unknown): string | undefined {
  if (typeof value === "string") return value.endsWith(".d.ts") ? value : undefined;
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const types = (value as { types?: unknown }).types;
    if (typeof types === "string") return types;
  }
  return undefined;
}

async function filesUnder(directory: string, relative = ""): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(join(directory, relative), { withFileTypes: true })) {
    const path = relative === "" ? entry.name : `${relative}/${entry.name}`;
    if (entry.isDirectory()) files.push(...await filesUnder(directory, path));
    else files.push(path);
  }
  return files;
}

/**
 * The concrete entries an exports map names. A wildcard key stands for every
 * file its `types` pattern matches, so every shipped declaration is read
 * through the specifier a consumer would write for it.
 */
async function entriesOf(exports: unknown, packageRoot: string): Promise<Entry[]> {
  if (!exports || typeof exports !== "object" || Array.isArray(exports)) throw new Error("the package manifest has no exports map");
  const files = await filesUnder(packageRoot);
  const entries: Entry[] = [];
  for (const [key, value] of Object.entries(exports as Record<string, unknown>)) {
    const types = typesTarget(value)?.replace(/^\.\//, "");
    if (!types) continue;
    const specifier = `${manifest.name}${key.slice(1)}`;
    const star = types.indexOf("*");
    if (star === -1) {
      entries.push({ specifier, types });
      continue;
    }
    if (types.indexOf("*", star + 1) !== -1) throw new Error(`${key} names more than one wildcard in its types target`);
    const prefix = types.slice(0, star);
    const suffix = types.slice(star + 1);
    for (const file of files) {
      if (!file.startsWith(prefix) || !file.endsWith(suffix)) continue;
      const wildcard = file.slice(prefix.length, file.length - suffix.length);
      entries.push({ specifier: specifier.replace("*", wildcard), types: file });
    }
  }
  return entries.sort((a, b) => a.specifier.localeCompare(b.specifier));
}

const fixture = dist ? undefined : await createPackageFixture();
// The temp root is resolved so a report reads package-relative: macOS hands out
// /var paths that the compiler reports as /private/var.
const directory = fixture?.directory ?? await realpath(await mkdtemp(join(tmpdir(), "mtrl-declaration-exports-")));
// With --dist the tree is copied, not linked: a package read from another
// directory would resolve its own peer imports from there and find nothing.
const packageRoot = fixture?.installed ?? join(directory, "node_modules", manifest.name);

const failures: string[] = [];
try {
  if (dist) {
    await mkdir(join(directory, "node_modules"), { recursive: true });
    await cp(dist, packageRoot, { recursive: true });
  }
  // What the package's own declarations import: the same links the docs and
  // imports checks make before their compile, so a peer import resolves and the
  // declaration around it is checked.
  await mkdir(join(directory, "node_modules/@types"), { recursive: true });
  for (const name of ["react", "react-dom", "@types/react", "@types/react-dom", "csstype", "vue", "svelte", "solid-js"]) {
    await symlink(resolve(ROOT, "node_modules", name), join(directory, "node_modules", name), "dir").catch(() => {});
  }

  const packed = await Bun.file(join(packageRoot, "package.json")).json() as { exports?: unknown };
  const entries = await entriesOf(packed.exports, packageRoot);
  if (entries.length < 100) throw new Error(`only ${entries.length} exports entries carry declarations; the manifest read is wrong`);

  // What each entry exports, read from its own declaration file. The compiler
  // follows the entry's re-exports, so a barrel's folded declarations count.
  const program = ts.createProgram(entries.map(entry => join(packageRoot, entry.types)), options);
  const checker = program.getTypeChecker();
  const consumers: { file: string; source: string }[] = [];
  for (const [index, entry] of entries.entries()) {
    const target = join(packageRoot, entry.types);
    const source = program.getSourceFile(target);
    if (!source) {
      failures.push(`${entry.specifier}: its types target ${entry.types} is not in the packed package`);
      continue;
    }
    const symbol = checker.getSymbolAtLocation(source);
    if (!symbol) {
      failures.push(`${entry.specifier}: ${entry.types} is not a module`);
      continue;
    }
    const names = checker.getExportsOfModule(symbol).map(exported => exported.getName()).sort();
    const bindings = names.map(name => (name === "default" ? "default as defaultValue" : name));
    const imports = bindings.length > 0 ? `import { ${bindings.join(", ")} } from "${entry.specifier}";\n` : "";
    consumers.push({
      file: `entry-${index}.ts`,
      source: `import * as namespace from "${entry.specifier}";\n${imports}export { namespace };\n`,
    });
  }

  const files = consumers.map(consumer => join(directory, consumer.file));
  for (const [index, consumer] of consumers.entries()) await writeFile(files[index]!, consumer.source);

  const compiled = ts.createProgram(files, options);
  const report = (diagnostic: ts.Diagnostic): string => {
    const where = diagnostic.file && diagnostic.start !== undefined
      ? (() => {
        const { line, character } = diagnostic.file!.getLineAndCharacterOfPosition(diagnostic.start!);
        const name = diagnostic.file!.fileName;
        const file = name.startsWith(`${packageRoot}/`) ? name.slice(packageRoot.length + 1) : name.split("/").pop();
        return `${file}:${line + 1}:${character + 1} `;
      })()
      : "";
    const text = ts.flattenDiagnosticMessageText(diagnostic.messageText, " ").split(`${packageRoot}/`).join("");
    return `${where}${text}`;
  };
  for (const diagnostic of ts.getPreEmitDiagnostics(compiled)) {
    // Third-party types are the reader's to resolve, not this package's.
    if (diagnostic.file?.fileName.includes("/node_modules/") && !diagnostic.file.fileName.includes(`/node_modules/${manifest.name}/`)) continue;
    failures.push(report(diagnostic));
  }
  console.log(`${manifest.name}: ${entries.length} exports entries resolve from the packed package, ${consumers.length} consumers compile.`);
} finally {
  await fixture?.cleanup();
  if (!fixture) await rm(directory, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error(`\n${failures.length} declaration ${failures.length === 1 ? "failure" : "failures"} in the packed package:\n`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
