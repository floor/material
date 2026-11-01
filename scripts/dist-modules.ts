// scripts/dist-modules.ts
//
// Which dist JavaScript modules a consumer import can reach.
//
// The package's `exports` map is the only way in, and the nested manifest is
// the map that ships. A module ships when an `exports` target names it, or when
// a module that ships imports it. Anything else is a file no supported import
// can see. The rule is the same one the declaration prune follows
// (`scripts/prune-declarations.ts`), applied to runtime modules.
import { readdir, readFile, stat, unlink } from "node:fs/promises";
import { join, posix, resolve } from "node:path";
import { exportTargets, moduleSpecifiersOf } from "./prune-declarations";

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

/**
 * The file a relative specifier names. A specifier ending `.js` names that file;
 * any other may be directory-style, so its sibling module or index is tried.
 * A specifier that names a stylesheet or a JSON module resolves to that file.
 */
function resolveSpecifier(importer: string, specifier: string, files: ReadonlySet<string>): string | undefined {
  const base = posix.normalize(posix.join(posix.dirname(importer), specifier));
  const candidates = specifier.endsWith(".js") ? [base] : [base, `${base}.js`, `${base}/index.js`];
  return candidates.find((candidate) => files.has(candidate));
}

/** The JS modules an exports map reaches, and the ones it does not. */
export interface ModuleWalk {
  /** Package-relative paths an exports target reaches, sorted. */
  reachable: string[];
  /** Package-relative JS paths no exports target reaches, sorted. */
  unreachable: string[];
}

/** The source between a Svelte component's `<script>` tags, every block joined. */
function scriptOf(source: string): string {
  return [...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((match) => match[1])
    .join("\n");
}

/**
 * The dist runtime files an exports subpath names, through an exact key or a
 * `*` pattern, as Node's exports lookup resolves it. Declaration targets are
 * dropped: this walk follows runtime modules, and a `.d.ts` beside them names
 * no module to load. `undefined` when the manifest does not export the subpath.
 */
function exportedFiles(specifier: string, packageName: string, exports: unknown): string[] | undefined {
  if (!packageName) return undefined;
  if (specifier !== packageName && !specifier.startsWith(`${packageName}/`)) return undefined;
  if (!exports || typeof exports !== "object") return undefined;
  const map = exports as Record<string, unknown>;
  const subpath = specifier === packageName ? "." : `./${specifier.slice(packageName.length + 1)}`;
  const expand = (key: string, star: string): string[] =>
    exportTargets(map[key])
      .filter((target) => target.startsWith("./") && !target.endsWith(".d.ts"))
      .map((target) => target.slice(2).replaceAll("*", star));
  if (Object.prototype.hasOwnProperty.call(map, subpath)) return expand(subpath, "");
  const patterns = Object.keys(map).filter((key) => {
    if (!key.includes("*")) return false;
    const prefix = key.slice(0, key.indexOf("*"));
    const suffix = key.slice(key.indexOf("*") + 1);
    return subpath.length >= prefix.length + suffix.length && subpath.startsWith(prefix) && subpath.endsWith(suffix);
  });
  // Node picks one pattern: the longest base before `*`, then the longest key.
  patterns.sort((a, b) => b.indexOf("*") - a.indexOf("*") || b.length - a.length);
  const pattern = patterns[0];
  if (pattern === undefined) return undefined;
  const prefix = pattern.slice(0, pattern.indexOf("*"));
  const suffix = pattern.slice(pattern.indexOf("*") + 1);
  return expand(pattern, subpath.slice(prefix.length, subpath.length - suffix.length));
}

/**
 * Walk the dist JavaScript from the nested manifest's `exports`.
 *
 * Fails rather than guesses when an `exports` target names no shipped file or
 * when a module that ships imports a file the build does not ship: either is a
 * broken package, and pruning such a tree would hide it.
 *
 * A reached Svelte component is not a leaf: its script imports runtime modules,
 * relative ones and this package's own subpaths, and those must ship with it.
 * `packageName` is the name those self-imports start with.
 */
export async function walkDistModules(distDir: string, exports: unknown, packageName = ""): Promise<ModuleWalk> {
  const root = resolve(distDir);
  const files = new Set(await filesUnder(root));
  const roots = new Set<string>();

  for (const target of exportTargets(exports)) {
    if (!target.startsWith("./")) throw new Error(`exports target is not package-relative: ${target}`);
    const path = target.slice(2);
    if (path.includes("*")) {
      if (!path.endsWith(".js")) continue;
      const pattern = patternFor(path);
      const matches = [...files].filter((file) => pattern.test(file));
      if (matches.length === 0) throw new Error(`exports target matches no shipped file: ${target}`);
      for (const file of matches) roots.add(file);
    } else if (path.endsWith(".js")) {
      if (!files.has(path)) throw new Error(`exports target does not exist after the build: ${target}`);
      roots.add(path);
    }
  }
  if (roots.size === 0) throw new Error("no module is an exports target: nothing would ship");

  // Every module an exported one imports, through any depth of the graph. A
  // reached Svelte component is a node, not a leaf: its script imports runtime
  // modules, and those must ship with it.
  const reachable = new Set(roots);
  const components = new Set<string>();
  const queue = [...roots];
  while (queue.length > 0) {
    const file = queue.shift()!;
    const source = await readFile(join(root, file), "utf8");
    for (const specifier of moduleSpecifiersOf(file.endsWith(".svelte") ? scriptOf(source) : source)) {
      const selfImport = packageName !== "" && (specifier === packageName || specifier.startsWith(`${packageName}/`));
      if (!specifier.startsWith(".") && !selfImport) continue;
      const candidates = specifier.startsWith(".")
        ? [resolveSpecifier(file, specifier, files)]
        : exportedFiles(specifier, packageName, exports);
      const target = candidates?.find((candidate) => candidate !== undefined && files.has(candidate));
      if (!target) throw new Error(`${file} imports ${specifier}, which the build does not ship`);
      if (target.endsWith(".svelte")) {
        if (components.has(target)) continue;
        components.add(target);
        queue.push(target);
      } else if (target.endsWith(".js") && !reachable.has(target)) {
        reachable.add(target);
        queue.push(target);
      }
    }
  }

  return {
    reachable: [...reachable].sort(),
    unreachable: [...files].filter((file) => file.endsWith(".js") && !reachable.has(file)).sort(),
  };
}

export interface PruneModulesResult {
  /** Package-relative paths removed, sorted. */
  removed: string[];
  /** Their total size in bytes. */
  bytes: number;
}

/**
 * Remove the dist JS modules no `exports` target reaches, directly or through
 * the imports of another module that ships.
 */
export async function pruneUnreachableModules(distDir: string, exports: unknown, packageName = ""): Promise<PruneModulesResult> {
  const root = resolve(distDir);
  const { unreachable } = await walkDistModules(distDir, exports, packageName);
  let bytes = 0;
  for (const file of unreachable) {
    bytes += (await stat(join(root, file))).size;
    await unlink(join(root, file));
  }
  return { removed: unreachable, bytes };
}
