// scripts/dist-modules.ts
//
// Which dist JavaScript modules a consumer import can reach.
//
// The package's `exports` map is the only way in, and the nested manifest is
// the map that ships. A module ships when an `exports` target names it, or when
// a module that ships imports it. Anything else is a file no supported import
// can see. The rule is the same one the declaration prune follows
// (`scripts/prune-declarations.ts`), applied to runtime modules.
import { readdir, readFile } from "node:fs/promises";
import { join, posix, resolve } from "node:path";
import { exportTargets, specifiersOf } from "./prune-declarations";

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

/**
 * Walk the dist JavaScript from the nested manifest's `exports`.
 *
 * Fails rather than guesses when an `exports` target names no shipped file or
 * when a module that ships imports a file the build does not ship: either is a
 * broken package, and pruning such a tree would hide it.
 */
export async function walkDistModules(distDir: string, exports: unknown): Promise<ModuleWalk> {
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

  // Every module an exported one imports, through any depth of the graph.
  const reachable = new Set(roots);
  const queue = [...roots];
  while (queue.length > 0) {
    const file = queue.shift()!;
    for (const specifier of specifiersOf(await readFile(join(root, file), "utf8"))) {
      const target = resolveSpecifier(file, specifier, files);
      if (!target) throw new Error(`${file} imports ${specifier}, which the build does not ship`);
      if (!target.endsWith(".js") || reachable.has(target)) continue;
      reachable.add(target);
      queue.push(target);
    }
  }

  return {
    reachable: [...reachable].sort(),
    unreachable: [...files].filter((file) => file.endsWith(".js") && !reachable.has(file)).sort(),
  };
}
