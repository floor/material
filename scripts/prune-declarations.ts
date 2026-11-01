import ts from "typescript";
import { readdir, readFile, stat, unlink } from "node:fs/promises";
import { join, posix, resolve } from "node:path";

/**
 * Ship only the declaration files an import can reach.
 *
 * The compiler emits a declaration for every module in `src`, including modules
 * no consumer can import: the package's `exports` map is the only way in, and
 * the declarations those entries name import a subset of the emitted graph. A
 * declaration ships when an `exports` target names it, or when a declaration
 * that ships imports it. Anything else is a file no supported import can see.
 *
 * The rule is checked against the tree the build just produced, so it cannot
 * drift from what the compiler emitted, and it fails rather than guesses when
 * an `exports` target names no file or when a declaration that ships imports a
 * file the build does not ship: either is a broken package, and pruning such a
 * tree would hide it. Sources and runtime modules are untouched; only
 * declarations are removed.
 */

/** Every string an exports map names, through every condition and fallback. */
export function exportTargets(exports: unknown): string[] {
  const targets: string[] = [];
  const visit = (value: unknown): void => {
    if (typeof value === "string") targets.push(value);
    else if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === "object") Object.values(value).forEach(visit);
  };
  visit(exports);
  return targets;
}

/** Every file under a directory, as package-relative POSIX paths. */
async function filesUnder(directory: string): Promise<string[]> {
  const files: string[] = [];
  const walk = async (relative: string): Promise<void> => {
    for (const entry of await readdir(join(directory, relative), { withFileTypes: true })) {
      const path = relative === "" ? entry.name : `${relative}/${entry.name}`;
      if (entry.isDirectory()) await walk(path);
      else files.push(path);
    }
  };
  await walk("");
  return files;
}

/** An exports wildcard target as a regular expression: `*` matches across slashes. */
function patternFor(path: string): RegExp {
  return new RegExp(`^${path.split("*").map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*")}$`);
}

/** Every module specifier a module names: imports, exports, import types and dynamic imports. */
export function moduleSpecifiersOf(source: string): string[] {
  const file = ts.createSourceFile("declaration.d.ts", source, ts.ScriptTarget.Latest, true);
  const specifiers: string[] = [];
  const visit = (node: ts.Node): void => {
    let specifier: ts.Node | undefined;
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) specifier = node.moduleSpecifier;
    if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) specifier = node.argument.literal;
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) specifier = node.arguments[0];
    if (specifier && ts.isStringLiteralLike(specifier)) specifiers.push(specifier.text);
    ts.forEachChild(node, visit);
  };
  visit(file);
  return specifiers;
}

/** The relative module specifiers a declaration names: imports, exports and import types. */
export function specifiersOf(source: string): string[] {
  return moduleSpecifiersOf(source).filter((specifier) => specifier.startsWith("."));
}

/**
 * The file a relative specifier names. The declaration emit rewrites an import
 * of a TypeScript module to `.js` and a Svelte component keeps `.svelte`; both
 * name a declaration beside them. Any other file (a stylesheet, a JSON module)
 * is named as it ships.
 */
function resolveSpecifier(importer: string, specifier: string, files: ReadonlySet<string>): string | undefined {
  const base = posix.normalize(posix.join(posix.dirname(importer), specifier));
  const candidates = specifier.endsWith(".js") ? [`${base.slice(0, -3)}.d.ts`]
    : specifier.endsWith(".svelte") ? [`${base}.d.ts`]
      : [base, `${base}.d.ts`, `${base}/index.d.ts`];
  return candidates.find((candidate) => files.has(candidate));
}

export interface PruneResult {
  /** Package-relative paths removed, sorted. */
  removed: string[];
  /** Their total size in bytes. */
  bytes: number;
}

/**
 * Remove the declaration files of `outdir` that no `exports` target reaches,
 * directly or through the imports of another declaration that ships.
 */
export async function pruneDeclarations(outdir: string, exports: unknown): Promise<PruneResult> {
  const root = resolve(outdir);
  const files = new Set(await filesUnder(root));
  const targets = exportTargets(exports);

  const roots = new Set<string>();
  for (const target of targets) {
    if (!target.startsWith("./")) throw new Error(`exports target is not package-relative: ${target}`);
    const path = target.slice(2);
    if (path.includes("*")) {
      const pattern = patternFor(path);
      const matches = [...files].filter((file) => pattern.test(file));
      if (matches.length === 0) throw new Error(`exports target matches no shipped file: ${target}`);
      for (const file of matches) if (file.endsWith(".d.ts")) roots.add(file);
    } else if (!files.has(path)) {
      throw new Error(`exports target does not exist after the build: ${target}`);
    } else if (path.endsWith(".d.ts")) {
      roots.add(path);
    }
  }
  if (roots.size === 0) throw new Error("no declaration is an exports target: nothing would ship types");

  // Every declaration an exported one imports, through any depth of the graph.
  const reachable = new Set(roots);
  const queue = [...roots];
  while (queue.length > 0) {
    const file = queue.shift()!;
    for (const specifier of specifiersOf(await readFile(join(root, file), "utf8"))) {
      const target = resolveSpecifier(file, specifier, files);
      if (!target) throw new Error(`${file} imports ${specifier}, which the build does not ship`);
      if (!target.endsWith(".d.ts") || reachable.has(target)) continue;
      reachable.add(target);
      queue.push(target);
    }
  }

  const removed: string[] = [];
  let bytes = 0;
  // An exports target is a root of the walk above, so it is always reachable:
  // the filter below can never remove one.
  const prunable = [...files].filter((file) => file.endsWith(".d.ts") && !reachable.has(file)).sort();
  for (const file of prunable) {
    bytes += (await stat(join(root, file))).size;
    await unlink(join(root, file));
    removed.push(file);
  }
  return { removed, bytes };
}
