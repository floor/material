// test/scripts/prune-declarations.test.ts
import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pruneDeclarations } from "../../scripts/prune-declarations";

/** A package tree under a temporary directory, keyed by package-relative path. */
async function tree(files: Record<string, string>): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "mtrl-prune-"));
  for (const [path, text] of Object.entries(files)) {
    await mkdir(join(directory, path, ".."), { recursive: true });
    await writeFile(join(directory, path), text);
  }
  return directory;
}

/** Every file under a directory, package-relative and sorted. */
async function listing(directory: string): Promise<string[]> {
  return [...new Bun.Glob("**/*").scanSync({ cwd: directory })].sort();
}

// The manifest as the build publishes it: paths are package-relative, `*`
// matches across slashes, and every condition is walked.
const EXPORTS = {
  ".": { types: "./index.d.ts", import: "./index.js" },
  "./components/a": { types: "./components/a/index.d.ts", import: "./components/a/index.js" },
  "./components/a/constants": { types: "./components/a/constants.d.ts", import: "./components/a/constants.js" },
  "./elements/css": { types: "./elements/css/index.d.ts", import: "./elements/css/index.js" },
  "./elements/css/*.css": "./elements/css/*.css",
  "./elements/css/*": { types: "./elements/css/*.d.ts", import: "./elements/css/*.js" },
  "./styles/*": { types: "./styles/*.d.ts", import: "./styles/*.js" },
  "./svelte": { types: "./svelte/index.d.ts", import: "./svelte/index.js" },
};

const FILES: Record<string, string> = {
  "index.js": 'export * from "./components/a/index.js";\n',
  // Reaches a.d.ts through an import, types.d.ts through an import type.
  "index.d.ts": 'export type { A } from "./components/a/index.js";\nexport type T = import("./components/a/types.js").T;\n',
  "components/a/index.js": 'export * from "./a.js";\n',
  "components/a/index.d.ts": 'export type { A } from "./a.js";\n',
  "components/a/a.js": "export const A = 1;\n",
  "components/a/a.d.ts": "export interface A { t: unknown }\n",
  "components/a/types.js": "export {};\n",
  "components/a/types.d.ts": "export interface T { id: string }\n",
  "components/a/constants.js": "export const C = 1;\n",
  "components/a/constants.d.ts": "export declare const C: number;\n",
  // Config and internals: runtime modules, but no declaration imports them.
  "components/a/config.js": "export const config = {};\n",
  "components/a/config.d.ts": "export declare const config: Record<string, unknown>;\n",
  "components/a/internal.d.ts": "export {};\n",
  "elements/css/index.js": 'import "./index.css";\n',
  "elements/css/index.css": ".mtrl{}\n",
  "elements/css/index.d.ts": 'import "./index.css";\nexport {};\n',
  "elements/css/button.js": 'import "./button.css";\n',
  "elements/css/button.css": ".mtrl-button{}\n",
  "elements/css/button.d.ts": "export {};\n",
  // The wildcard's `*` crosses the slash, so the host sheet's declaration is a target too.
  "elements/css/hosts/button.css": ".mtrl-button-host{}\n",
  "elements/css/hosts/button.css.d.ts": "export {};\n",
  "styles/button.js": 'import "./button.css";\n',
  "styles/button.css": ".mtrl-button{}\n",
  "styles/button.d.ts": 'import type { S } from "../core/shared.js";\nexport declare const button: S;\n',
  "core/shared.js": "export {};\n",
  "core/shared.d.ts": "export interface S {}\n",
  "core/orphan.d.ts": "export {};\n",
  "svelte/index.js": 'export { default as Button } from "./Button.svelte";\n',
  "svelte/index.d.ts": 'export { default as Button } from "./Button.svelte";\n',
  "svelte/Button.svelte": "<button></button>\n",
  "svelte/Button.svelte.d.ts": 'import type { Component } from "svelte";\ndeclare const Button: Component;\nexport default Button;\n',
  "svelte/Unused.svelte": "<i></i>\n",
  "svelte/Unused.svelte.d.ts": "export {};\n",
};

const PRUNED = ["components/a/config.d.ts", "components/a/internal.d.ts", "core/orphan.d.ts", "svelte/Unused.svelte.d.ts"];

const KEPT = [
  "components/a/a.d.ts",
  "components/a/constants.d.ts",
  "components/a/index.d.ts",
  "components/a/types.d.ts",
  "core/shared.d.ts",
  "elements/css/button.d.ts",
  "elements/css/hosts/button.css.d.ts",
  "elements/css/index.d.ts",
  "index.d.ts",
  "styles/button.d.ts",
  "svelte/Button.svelte.d.ts",
  "svelte/index.d.ts",
];

describe("pruneDeclarations", () => {
  test("keeps every exports target and every declaration they reach, and nothing else", async () => {
    const directory = await tree(FILES);
    try {
      const result = await pruneDeclarations(directory, EXPORTS);
      expect(result.removed).toEqual(PRUNED);
      expect(result.bytes).toBe(PRUNED.reduce((sum, path) => sum + new TextEncoder().encode(FILES[path]).length, 0));
      const remaining = await listing(directory);
      expect(remaining.filter((path) => path.endsWith(".d.ts"))).toEqual(KEPT);
      // Only declarations move: runtime modules, stylesheets and components stay.
      for (const path of ["components/a/config.js", "elements/css/button.css", "elements/css/hosts/button.css", "svelte/Unused.svelte"]) {
        expect(remaining).toContain(path);
      }
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test("is idempotent: a second run removes nothing", async () => {
    const directory = await tree(FILES);
    try {
      await pruneDeclarations(directory, EXPORTS);
      const again = await pruneDeclarations(directory, EXPORTS);
      expect(again.removed).toEqual([]);
      expect(again.bytes).toBe(0);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test("fails when an exports target names no file", async () => {
    const directory = await tree(FILES);
    try {
      await expect(pruneDeclarations(directory, {
        ".": { types: "./index.d.ts" },
        "./gone": { types: "./gone.d.ts" },
      })).rejects.toThrow(/does not exist after the build: \.\/gone\.d\.ts/);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test("fails when a wildcard target matches no file", async () => {
    const directory = await tree(FILES);
    try {
      await expect(pruneDeclarations(directory, {
        ".": { types: "./index.d.ts" },
        "./gone/*": { types: "./gone/*.d.ts" },
      })).rejects.toThrow(/matches no shipped file: \.\/gone\/\*\.d\.ts/);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test("fails when a declaration that ships imports a file the build does not ship", async () => {
    const directory = await tree({ "index.d.ts": 'export type { A } from "./gone.js";\n' });
    try {
      await expect(pruneDeclarations(directory, { ".": { types: "./index.d.ts" } }))
        .rejects.toThrow(/imports \.\/gone\.js, which the build does not ship/);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test("fails when no declaration is an exports target", async () => {
    const directory = await tree({ "index.js": "export {};\n" });
    try {
      await expect(pruneDeclarations(directory, { ".": { import: "./index.js" } }))
        .rejects.toThrow(/no declaration is an exports target/);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
