// test/scripts/consolidate-declarations.test.ts
import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import ts from "typescript";
import { consolidateDeclarations } from "../../scripts/consolidate-declarations";

/** A dist tree under a temporary directory, keyed by dist-relative path. */
async function tree(files: Record<string, string>): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "mtrl-consolidate-"));
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

const compilerOptions: ts.CompilerOptions = {
  strict: true, noEmit: true, skipLibCheck: false, types: [],
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  lib: ["lib.es2022.d.ts", "lib.dom.d.ts"],
};

/** What a consumer of the tree reads, with the declarations checked as written. */
async function errorsIn(directory: string, ...consumers: string[]): Promise<{ file: string; code: number; text: string }[]> {
  const declarations = (await listing(directory)).filter(path => path.endsWith(".d.ts"));
  const program = ts.createProgram([...declarations, ...consumers].map(path => join(directory, path)), compilerOptions);
  return ts.getPreEmitDiagnostics(program).map((diagnostic) => ({
    file: diagnostic.file ? diagnostic.file.fileName.slice(directory.length + 1) : "",
    code: diagnostic.code,
    text: ts.flattenDiagnosticMessageText(diagnostic.messageText, " "),
  }));
}

const EXPORTS = {
  ".": { types: "./index.d.ts", import: "./index.js" },
  "./core": { types: "./core/index.d.ts", import: "./core/index.js" },
  "./core/constants": { types: "./core/constants.d.ts", import: "./core/constants.js" },
  "./components": { types: "./components/index.d.ts", import: "./components/index.js" },
};

const FILES: Record<string, string> = {
  "index.d.ts": 'export * from "./core/index.js";\nexport * from "./components/index.js";\n',
  // The barrel declares `Shared` itself, so the private module's `Shared` below
  // has to be renamed; it re-exports the rest of what the entry offers.
  "core/index.d.ts": [
    'export { Button } from "./button.js";',
    'export type { ButtonConfig } from "./button.js";',
    'export { default } from "./button.js";',
    'export { Pair } from "./other.js";',
    "export interface Shared { value: string }",
    "",
  ].join("\n"),
  "core/button.d.ts": [
    "export interface ButtonConfig { label: string }",
    "export interface Button { config: ButtonConfig }",
    "export default function createButton(config: ButtonConfig): Button;",
    "",
  ].join("\n"),
  "core/other.d.ts": [
    "interface Shared { count: number }",
    "export interface Pair { first: Shared; second: Shared }",
    "",
  ].join("\n"),
  // Nothing exports Hidden from the core entry, and the components entry needs
  // it: the declaring module keeps its own file rather than the barrel gaining
  // a name a consumer could import.
  "core/hidden.d.ts": "export interface Hidden { secret: string }\n",
  "components/index.d.ts": 'import type { Hidden } from "../core/hidden.js";\nexport interface Panel { hidden: Hidden }\n',
  // A second exports target inside the core directory imports a module of its
  // own barrel: the specifier has to move to the barrel the name lives in.
  "core/constants.d.ts": 'import type { ButtonConfig } from "./button.js";\nexport declare const constants: { config: ButtonConfig };\n',
};

const FOLDED = ["core/button.d.ts", "core/other.d.ts"];

describe("consolidateDeclarations", () => {
  test("folds each private declaration into the barrel that exports its directory", async () => {
    const directory = await tree(FILES);
    try {
      const sizes = await Promise.all(FOLDED.map(path => stat(join(directory, path)).then(entry => entry.size)));
      const result = await consolidateDeclarations(directory, EXPORTS);
      expect(result.removed).toEqual(FOLDED);
      expect(result.merged).toBe(FOLDED.length);
      expect(result.groups).toBe(1);
      expect(result.bytes).toBe(sizes.reduce((sum, size) => sum + size, 0));
      expect(result.kept).toEqual(["core/hidden.d.ts"]);

      const remaining = await listing(directory);
      for (const path of FOLDED) expect(remaining).not.toContain(path);
      expect(remaining).toContain("core/index.d.ts");
      expect(remaining).toContain("core/hidden.d.ts");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test("keeps a declaration that documents a shipped source file", async () => {
    const directory = await tree({
      "index.d.ts": 'export * from "./core/index.js";\n',
      "core/index.d.ts": 'export { default as Widget } from "./widget.svelte";\n',
      // The `.svelte` file ships and its declaration sits beside it, so the
      // pass leaves the pair alone even though no exports entry names it.
      "core/widget.svelte": "<script lang=\"ts\">let { count = 0 }: { count?: number } = $props();</script>\n",
      "core/widget.svelte.d.ts": "declare const Widget: (props: { count?: number }) => unknown;\nexport default Widget;\n",
      "core/helper.d.ts": "export interface Helper { value: string }\n",
    });
    try {
      const result = await consolidateDeclarations(directory, {
        ".": { types: "./index.d.ts" },
        "./core": { types: "./core/index.d.ts" },
      });
      expect(result.kept).toEqual(["core/widget.svelte.d.ts"]);
      expect(result.removed).toEqual(["core/helper.d.ts"]);
      const remaining = await listing(directory);
      expect(remaining).toContain("core/widget.svelte.d.ts");
      const barrel = await readFile(join(directory, "core/index.d.ts"), "utf8");
      expect(barrel).toContain('export { default as Widget } from "./widget.svelte";');
      expect(barrel).not.toContain("declare const Widget");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test("the merged barrel carries the folded declarations, with the collision renamed", async () => {
    const directory = await tree(FILES);
    try {
      await consolidateDeclarations(directory, EXPORTS);
      const text = await readFile(join(directory, "core/index.d.ts"), "utf8");
      // Both private modules now live in the barrel.
      expect(text).toContain("interface ButtonConfig { label: string }");
      expect(text).toContain("declare function createButton(config: ButtonConfig): Button;");
      expect(text).toContain("interface Pair { first: Shared_1; second: Shared_1 }");
      // The barrel's own declaration keeps its name and its export.
      expect(text).toContain("interface Shared { value: string }");
      expect(text).toMatch(/export type \{[^}]*Shared[^}]*\};/);
      // The default is re-exported under the name the entry had before.
      expect(text).toMatch(/export \{ createButton as default \};/);
      // A specifier that crossed the group now names the barrel.
      const constants = await readFile(join(directory, "core/constants.d.ts"), "utf8");
      expect(constants).toContain('from "./index.js"');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test("every name the entries exported is a name a consumer can still import", async () => {
    const directory = await tree(FILES);
    try {
      await consolidateDeclarations(directory, EXPORTS);
      await writeFile(join(directory, "consumer.ts"), [
        'import createButton, { type Button, type ButtonConfig, type Pair, type Shared } from "./core/index.js";',
        'import { constants } from "./core/constants.js";',
        'import type { Panel } from "./components/index.js";',
        'import type { Button as RootButton } from "./index.js";',
        "export const button: Button = createButton({ label: \"ok\" });",
        "export const pair: Pair = { first: { count: 1 }, second: { count: 2 } };",
        "export const shared: Shared = { value: \"v\" };",
        "export const panel: Panel = { hidden: { secret: \"s\" } };",
        "export const root: RootButton = button;",
        "export const buttonConfig: ButtonConfig = constants.config;",
        "",
      ].join("\n"));
      expect(await errorsIn(directory, "consumer.ts")).toEqual([]);

      // The kept module is still reachable from its own path, and naming it
      // through the barrel it did not join is the error it must stay.
      await writeFile(join(directory, "excluded.ts"), 'import type { Hidden } from "./core/index.js";\nexport type Gone = Hidden;\n');
      const errors = await errorsIn(directory, "excluded.ts");
      expect(errors.map(error => error.file)).toEqual(["excluded.ts"]);
      expect(errors[0]!.text).toContain("has no exported member 'Hidden'");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test("a folded declaration never shadows a library name its neighbours use", async () => {
    const directory = await tree({
      "index.d.ts": 'export * from "./core/index.js";\n',
      "core/index.d.ts": 'export { focusFirst } from "./focus.js";\nexport type { Focused } from "./focus.js";\n',
      // A private type named after a global: merged as written it would capture
      // the focus module's reference to the DOM `Event`.
      "core/event.d.ts": "export interface Event { kind: string }\n",
      "core/focus.d.ts": "export interface Focused { dispatch: (event: Event) => void }\nexport declare function focusFirst(target: Element): Focused;\n",
    });
    try {
      await consolidateDeclarations(directory, {
        ".": { types: "./index.d.ts" },
        "./core": { types: "./core/index.d.ts" },
      });
      const text = await readFile(join(directory, "core/index.d.ts"), "utf8");
      expect(text).toContain("interface Event_1 { kind: string }");
      expect(text).toContain("(event: Event) => void");
      // The consumer's callback takes the DOM event, so a shadowed reference
      // would be a type error rather than a silent change of meaning.
      await writeFile(join(directory, "consumer.ts"), [
        'import { focusFirst, type Focused } from "./core/index.js";',
        "export const focused: Focused = { dispatch: (event: Event) => void event.type };",
        "export const first = focusFirst(document.body);",
        "",
      ].join("\n"));
      expect(await errorsIn(directory, "consumer.ts")).toEqual([]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test("is idempotent: the merged tree has nothing left to fold", async () => {
    const directory = await tree(FILES);
    try {
      await consolidateDeclarations(directory, EXPORTS);
      const again = await consolidateDeclarations(directory, EXPORTS);
      expect(again.merged).toBe(0);
      expect(again.removed).toEqual([]);
      expect(again.kept).toEqual(["core/hidden.d.ts"]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test("fails when another barrel needs a namespace of a private module", async () => {
    const directory = await tree({
      "index.d.ts": 'export * from "./core/index.js";\nexport * from "./components/index.js";\n',
      "core/index.d.ts": "export interface Shared { value: string }\n",
      "core/internal.d.ts": "export interface Internal { value: string }\n",
      "components/index.d.ts": 'export * from "../core/internal.js";\n',
    });
    try {
      await expect(consolidateDeclarations(directory, {
        ".": { types: "./index.d.ts" },
        "./core": { types: "./core/index.d.ts" },
        "./components": { types: "./components/index.d.ts" },
      })).rejects.toThrow(/namespace reference to the private core\/internal\.d\.ts cannot be folded/);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
