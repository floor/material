// scripts/syntax-floor.ts
//
// The syntax floor of the published package. README.md's Browser support
// section states it: the JavaScript targets ES2022. A file that needs a later
// edition would still run in every current browser, but a consumer's bundler or
// runtime whose parser stops at the floor refuses the package — so the floor is
// checked, never assumed.
//
// The parser is acorn, with the edition spelled out. `ecmaVersion: 2022`
// rejects everything later — a regex `v` flag, `using` declarations, decorators
// — exactly as a parser at the floor would. `sourceType: "module"`: dist ships
// ES modules, and a CommonJS file still parses as one (the edition is what is
// under test, not the module system).
import { parse } from "acorn";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

/** The edition README.md names as the package's floor. */
export const SYNTAX_FLOOR = 2022;

export interface SyntaxFailure {
  /** Path relative to the directory that was scanned. */
  file: string;
  line: number;
  column: number;
  message: string;
}

const MODULE = /\.(?:js|mjs|cjs)$/;

/** Every module file under `dir`, as paths relative to it. */
export async function walkScriptModules(dir: string, prefix = ""): Promise<string[]> {
  const found: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      found.push(...(await walkScriptModules(join(dir, entry.name), path)));
    } else if (MODULE.test(entry.name)) found.push(path);
  }
  return found;
}

/**
 * Parses every module file under `dir` at the floor. One failure per file a
 * parser at the floor rejects, with the first position it rejects.
 */
export async function checkSyntaxFloor(dir: string): Promise<{ files: string[]; failures: SyntaxFailure[] }> {
  const files = (await walkScriptModules(dir)).sort();
  const failures: SyntaxFailure[] = [];
  for (const file of files) {
    const text = await Bun.file(join(dir, file)).text();
    try {
      parse(text, { ecmaVersion: SYNTAX_FLOOR, sourceType: "module" });
    } catch (error) {
      const rejected = error as { message: string; loc?: { line: number; column: number } };
      failures.push({
        file,
        line: rejected.loc?.line ?? 0,
        column: rejected.loc?.column ?? 0,
        // acorn appends " (line:column)"; the position is printed separately.
        message: rejected.message.replace(/ \(\d+:\d+\)$/, ""),
      });
    }
  }
  return { files, failures };
}
