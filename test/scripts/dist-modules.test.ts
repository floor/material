// test/scripts/dist-modules.test.ts
import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pruneUnreachableModules, walkDistModules } from "../../scripts/dist-modules";

/** A package tree under a temporary directory, keyed by package-relative path. */
async function tree(files: Record<string, string>): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "mtrl-modules-"));
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
  "index.d.ts": "export {};\n",
  "components/a/index.js": 'export * from "./a.js";\n',
  "components/a/index.d.ts": "export {};\n",
  // Both specifier forms a consumer bundle may contain: extensionless and directory-style.
  "components/a/a.js": 'export * from "./deep";\nexport * from "./nested";\n',
  "components/a/a.d.ts": "export {};\n",
  "components/a/deep.js": "export const deep = 1;\n",
  "components/a/nested/index.js": "export const nested = 1;\n",
  // A type-only module: a declaration imports it, runtime code never does.
  "components/a/types.js": "export {};\n",
  "components/a/types.d.ts": "export interface T { id: string }\n",
  // An exact exports target, and an internal module no target can name.
  "components/a/constants.js": "export const C = 1;\n",
  "components/a/constants.d.ts": "export declare const C: number;\n",
  "components/a/config.js": "export const config = {};\n",
  "elements/css/index.js": 'import "./index.css";\n',
  "elements/css/index.css": ".mtrl{}\n",
  "elements/css/index.d.ts": "export {};\n",
  "elements/css/button.js": 'import "./button.css";\n',
  "elements/css/button.css": ".mtrl-button{}\n",
  "elements/css/button.d.ts": "export {};\n",
  "elements/css/hosts/button.css": ".mtrl-button-host{}\n",
  "elements/css/hosts/button.css.d.ts": "export {};\n",
  "styles/button.js": 'import "./button.css";\n',
  "styles/button.css": ".mtrl-button{}\n",
  "styles/button.d.ts": "export {};\n",
  "svelte/index.js": 'export { default } from "./Button.svelte";\n',
  "svelte/Button.svelte": "<button></button>\n",
  "svelte/index.d.ts": "export {};\n",
  "core/orphan.js": "export {};\n",
};

const REACHABLE = [
  "components/a/a.js",
  "components/a/constants.js",
  "components/a/deep.js",
  "components/a/index.js",
  "components/a/nested/index.js",
  "elements/css/button.js",
  "elements/css/index.js",
  "index.js",
  "styles/button.js",
  "svelte/index.js",
];

const UNREACHABLE = ["components/a/config.js", "components/a/types.js", "core/orphan.js"];

describe("walkDistModules", () => {
  test("reaches every exports target and every module they import, and names the rest", async () => {
    const directory = await tree(FILES);
    try {
      const walk = await walkDistModules(directory, EXPORTS);
      expect(walk.reachable).toEqual(REACHABLE);
      expect(walk.unreachable).toEqual(UNREACHABLE);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test("walks the imports inside a reached Svelte component's script", async () => {
    // A helper imported only by an exported component's script is reachable:
    // a `.svelte` node is not a leaf.
    const directory = await tree({
      "index.js": 'export { default as View } from "./View.svelte";\n',
      "View.svelte": '<script>import { value } from "./helper.js";</script>\n<p>{value}</p>\n',
      "helper.js": "export const value = 1;\n",
    });
    try {
      const walk = await walkDistModules(directory, { ".": { import: "./index.js" } });
      expect(walk.reachable).toEqual(["helper.js", "index.js"]);
      expect(walk.unreachable).toEqual([]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test("resolves a component's self-import through the nested manifest", async () => {
    // The generated components import their stylesheet by package subpath. The
    // manifest's `types` target sits first in the condition, so the walk must
    // follow the runtime one.
    const directory = await tree({
      "index.js": 'export { default as Button } from "./Button.svelte";\n',
      "Button.svelte": '<script>\n  import "mtrl/elements/css/button";\n  import { style } from "./style.js";\n</script>\n<button></button>\n',
      "style.js": "export const style = 1;\n",
      "elements/css/button.js": 'import "./button.css";\n',
      "elements/css/button.css": ".mtrl-button{}\n",
      "elements/css/button.d.ts": "export {};\n",
    });
    try {
      const walk = await walkDistModules(directory, {
        ".": { import: "./index.js" },
        "./elements/css/*": { types: "./elements/css/*.d.ts", import: "./elements/css/*.js" },
      }, "mtrl");
      expect(walk.reachable).toEqual(["elements/css/button.js", "index.js", "style.js"]);
      expect(walk.unreachable).toEqual([]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test("fails when a Svelte component imports a file the build does not ship", async () => {
    const directory = await tree({
      "index.js": 'export { default as View } from "./View.svelte";\n',
      "View.svelte": '<script>import { gone } from "./gone.js";</script>\n',
    });
    try {
      await expect(walkDistModules(directory, { ".": { import: "./index.js" } }))
        .rejects.toThrow(/View\.svelte imports \.\/gone\.js, which the build does not ship/);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test("fails when a Svelte component imports a package subpath the manifest does not export", async () => {
    const directory = await tree({
      "index.js": 'export { default as View } from "./View.svelte";\n',
      "View.svelte": '<script>import "mtrl/private/helper";</script>\n',
    });
    try {
      await expect(walkDistModules(directory, { ".": { import: "./index.js" } }, "mtrl"))
        .rejects.toThrow(/View\.svelte imports mtrl\/private\/helper, which the build does not ship/);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test("fails when an exports target names no module", async () => {
    const directory = await tree({ "index.js": "export {};\n" });
    try {
      await expect(walkDistModules(directory, {
        ".": { import: "./index.js" },
        "./gone": { import: "./gone.js" },
      })).rejects.toThrow(/does not exist after the build: \.\/gone\.js/);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test("fails when a wildcard target matches no module", async () => {
    const directory = await tree({ "index.js": "export {};\n" });
    try {
      await expect(walkDistModules(directory, {
        ".": { import: "./index.js" },
        "./gone/*": { import: "./gone/*.js" },
      })).rejects.toThrow(/matches no shipped file: \.\/gone\/\*\.js/);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test("fails when a module that ships imports a file the build does not ship", async () => {
    const directory = await tree({ "index.js": 'export * from "./gone.js";\n' });
    try {
      await expect(walkDistModules(directory, { ".": { import: "./index.js" } }))
        .rejects.toThrow(/index\.js imports \.\/gone\.js, which the build does not ship/);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test("fails when no module is an exports target", async () => {
    const directory = await tree({ "index.js": "export {};\n" });
    try {
      await expect(walkDistModules(directory, { ".": { types: "./index.d.ts" } }))
        .rejects.toThrow(/no module is an exports target/);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});

describe("pruneUnreachableModules", () => {
  test("removes the modules no exports target reaches, and nothing else", async () => {
    const directory = await tree(FILES);
    try {
      const result = await pruneUnreachableModules(directory, EXPORTS);
      expect(result.removed).toEqual(UNREACHABLE);
      expect(result.bytes).toBe(UNREACHABLE.reduce((sum, path) => sum + new TextEncoder().encode(FILES[path]).length, 0));
      const remaining = await listing(directory);
      expect(remaining.filter((path) => path.endsWith(".js"))).toEqual(REACHABLE);
      // Only modules move: stylesheets, declarations and components stay.
      for (const path of ["components/a/types.d.ts", "elements/css/button.css", "svelte/Button.svelte"]) {
        expect(remaining).toContain(path);
      }
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test("is idempotent: a second run removes nothing", async () => {
    const directory = await tree(FILES);
    try {
      await pruneUnreachableModules(directory, EXPORTS);
      const again = await pruneUnreachableModules(directory, EXPORTS);
      expect(again.removed).toEqual([]);
      expect(again.bytes).toBe(0);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test("fails when a module that ships imports a file the build does not ship", async () => {
    const directory = await tree({ "index.js": 'export * from "./gone.js";\n' });
    try {
      await expect(pruneUnreachableModules(directory, { ".": { import: "./index.js" } }))
        .rejects.toThrow(/index\.js imports \.\/gone\.js, which the build does not ship/);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
