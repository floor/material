// test/build/barrel-determinism.test.ts
import { expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { consolidateDeclarations } from "../../scripts/consolidate-declarations";

/**
 * A declaration fold's output must not depend on the order the filesystem
 * hands back: two CI runners built byte-identical sources and shipped
 * byte-different barrels, because the private modules' declarations are
 * appended to their barrel in directory-walk order (2026-11-18, the
 * catalogue identity gate). The pass normalizes that order internally;
 * these tests prove it.
 */

/** A dist-like tree the fold really works on: exported barrels whose
 * directories hold private modules whose declarations are appended to them. */
const TREE: Record<string, string> = {
  "components/divider/index.d.ts": [
    'export { createDivider } from "./divider";',
    'export type { DividerConfig, DividerComponent } from "./types";',
    "",
  ].join("\n"),
  "components/divider/divider.d.ts": [
    'import type { DividerConfig, DividerComponent } from "./types";',
    "/** Creates a new Divider component with the specified configuration. */",
    "declare const createDivider: (config?: DividerConfig) => DividerComponent;",
    "export { createDivider };",
    "",
  ].join("\n"),
  "components/divider/types.d.ts": [
    "/** Configuration for the Divider component. */",
    "export interface DividerConfig {",
    "  /** Draws the divider vertically. */",
    "  vertical?: boolean;",
    "  inset?: boolean;",
    "}",
    "export interface DividerComponent {",
    "  readonly element: HTMLElement;",
    "  destroy(): void;",
    "}",
    "",
  ].join("\n"),
  "components/card/index.d.ts": [
    'export { createCard } from "./card";',
    'export type { CardConfig, CardComponent } from "./types";',
    "",
  ].join("\n"),
  "components/card/card.d.ts": [
    'import type { CardConfig, CardComponent } from "./types";',
    "declare const createCard: (config?: CardConfig) => CardComponent;",
    "export { createCard };",
    "",
  ].join("\n"),
  "components/card/types.d.ts": [
    "export interface CardConfig { outlined?: boolean; }",
    "export interface CardComponent { readonly element: HTMLElement; destroy(): void; }",
    "",
  ].join("\n"),
  "core/dom/index.d.ts": [
    'export { addClass } from "./classes";',
    "",
  ].join("\n"),
  "core/dom/classes.d.ts": [
    "/** Adds a class name as given. */",
    "export declare const addClass: (element: HTMLElement, name: string) => HTMLElement;",
    "",
  ].join("\n"),
};

const EXPORTS = {
  "./components/divider": { types: "./components/divider/index.d.ts" },
  "./components/card": { types: "./components/card/index.d.ts" },
  "./core/dom": { types: "./core/dom/index.d.ts" },
};

async function plant(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "mtrl-fold-"));
  for (const [path, text] of Object.entries(TREE)) {
    await mkdir(join(directory, path, ".."), { recursive: true });
    await writeFile(join(directory, path), text);
  }
  return directory;
}

/** Every .d.ts under a folded tree, path to bytes. */
async function declarations(root: string): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const walk = async (relative: string): Promise<void> => {
    for (const entry of await readdir(join(root, relative), { withFileTypes: true })) {
      const path = relative === "" ? entry.name : `${relative}/${entry.name}`;
      if (entry.isDirectory()) await walk(path);
      else if (path.endsWith(".d.ts")) out[path] = await readFile(join(root, path), "utf8");
    }
  };
  await walk("");
  return out;
}

test("the fold is invariant to the enumeration order it is handed", async () => {
  const plain = await plant();
  const reversed = await plant();
  const plainResult = await consolidateDeclarations(plain, EXPORTS);
  const reversedResult = await consolidateDeclarations(reversed, EXPORTS, files => [...files].reverse());
  // The fold must have actually folded, or the comparison proves nothing.
  expect(plainResult.merged).toBeGreaterThan(0);
  expect(reversedResult.merged).toBe(plainResult.merged);
  expect(await declarations(reversed)).toEqual(await declarations(plain));
});

test("two runs of the same tree ship byte-identical declarations", async () => {
  const first = await plant();
  const second = await plant();
  await consolidateDeclarations(first, EXPORTS);
  await consolidateDeclarations(second, EXPORTS);
  expect(await declarations(second)).toEqual(await declarations(first));
});
