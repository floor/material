// test/scripts/declaration-identity.test.ts
import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { compareDeclarationIdentity } from "../../scripts/check-declaration-identity";

const exports = { ".": { types: "./index.d.ts", import: "./index.js" } };

async function compare(before: Record<string, string>, after: Record<string, string>) {
  const root = await mkdtemp(join(tmpdir(), "material-declaration-identity-"));
  try {
    for (const [side, files] of Object.entries({ before, after })) {
      for (const [name, text] of Object.entries({ "package.json": JSON.stringify({ exports }), ...files })) {
        const path = join(root, side, name);
        await mkdir(join(path, ".."), { recursive: true });
        await writeFile(path, text);
      }
    }
    return compareDeclarationIdentity(join(root, "before"), join(root, "after"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("compareDeclarationIdentity", () => {
  test("proves moved import types, private collision renames and public value aliases", async () => {
    const result = await compare({
      "index.d.ts": 'export { withEvents as withEnhancedEvents } from "./private.js";\n',
      "private.d.ts": 'interface Input { readonly value?: string }\ndeclare const withEvents: <T extends Input>(value: T) => import("./private.js").Result<T>;\nexport interface Result<T> { value: T }\nexport { withEvents };\n',
    }, {
      "index.d.ts": 'interface Input_1 { readonly value?: string }\ninterface Result<T> { value: T }\ndeclare const withEnhancedEvents: <T extends Input_1>(value: T) => Result<T>;\nexport { withEnhancedEvents };\n',
    });
    expect(result.entries).toBe(1);
    expect(result.exports).toBe(1);
    expect(result.pairs).toBeGreaterThan(3);
  });

  test("permits reordered disjoint interface augmentations", async () => {
    const first = 'export interface Config {}\nexport interface Config { button?: string }\nexport interface Config { card?: number }\n';
    const next = 'export interface Config {}\nexport interface Config { card?: number }\nexport interface Config { button?: string }\n';
    expect((await compare({ "index.d.ts": first }, { "index.d.ts": next })).exports).toBe(1);
  });

  test("checks private declarations behind unchanged public signature text", async () => {
    const index = 'interface Hidden { value: string }\nexport declare const api: (value: Hidden) => Hidden;\n';
    await expect(compare({ "index.d.ts": index }, { "index.d.ts": index.replace("value: string", "value: number") })).rejects.toThrow("StringKeyword -> NumberKeyword");
  });

  test("rejects collapsing distinct same-shaped private symbols", async () => {
    const index = 'interface First { value: string }\ninterface Second { value: string }\nexport declare const api: { first: First; second: Second };\n';
    await expect(compare({ "index.d.ts": index }, { "index.d.ts": index.replace("second: Second", "second: First") })).rejects.toThrow("symbol identity is not one-to-one");
  });

  test("rejects swapping same-named base and 2025 declarations", async () => {
    const common = {
      "base.d.ts": 'export interface Scheme { spec: "2021" }\n',
      "spec2025.d.ts": 'export interface Scheme { spec: "2025" }\n',
    };
    const index = 'export declare const base: import("./base.js").Scheme;\nexport declare const next: import("./spec2025.js").Scheme;\n';
    await expect(compare({ ...common, "index.d.ts": index }, { ...common, "index.d.ts": index.replace('import("./spec2025.js")', 'import("./base.js")') })).rejects.toThrow("symbol identity is not one-to-one");
  });

  test("retains type-only versus value exports", async () => {
    const index = 'declare class API { value: string }\nexport type { API };\n';
    await expect(compare({ "index.d.ts": index }, { "index.d.ts": index.replace("export type", "export") })).rejects.toThrow("value export set changed");
  });

  for (const [label, before, after] of [
    ["optional member", "value?: string", "value: string"],
    ["readonly member", "readonly value: string", "value: string"],
    ["property name", "value: string", "renamed: string"],
    ["generic constraint", "value: Array<string>", "value: Array<number>"],
  ]) {
    test(`retains ${label}`, async () => {
      await expect(compare({ "index.d.ts": `export interface API { ${before} }\n` }, { "index.d.ts": `export interface API { ${after} }\n` })).rejects.toThrow();
    });
  }

  test("preserves overload order", async () => {
    const index = 'export declare function api(value: string): 1;\nexport declare function api(value: number): 2;\n';
    await expect(compare({ "index.d.ts": index }, { "index.d.ts": index.trim().split("\n").reverse().join("\n") })).rejects.toThrow();
  });

  test("fails closed on reordered merged overloads", async () => {
    const index = 'export interface API { (value: string): 1 }\nexport interface API { (value: number): 2 }\n';
    await expect(compare({ "index.d.ts": index }, { "index.d.ts": index.trim().split("\n").reverse().join("\n") })).rejects.toThrow("cannot reorder merged overloads");
  });

  for (const [label, before, after] of [
    ["documentation", "/** Original documentation. */", "/** Different documentation. */"],
    ["deprecation", "/** @deprecated Use the new API. */", "/** @deprecated Use something else. */"],
  ]) {
    test(`retains ${label}`, async () => {
      await expect(compare({ "index.d.ts": `${before}\nexport interface API { value: string }\n` }, { "index.d.ts": `${after}\nexport interface API { value: string }\n` })).rejects.toThrow("documentation or JSDoc tags changed");
    });
  }

  test("fails closed on unresolved references", async () => {
    await expect(compare({ "index.d.ts": 'export interface API { value: Missing }\n' }, { "index.d.ts": 'export interface API { value: Missing }\n' })).rejects.toThrow("Unresolved");
  });

  test("checks package augmentations of external DOM symbols", async () => {
    const index = 'export declare const api: HTMLElement;\ndeclare global { interface HTMLElement { customValue: string } }\n';
    await expect(compare({ "index.d.ts": index }, { "index.d.ts": index.replace("customValue: string", "customValue: number") })).rejects.toThrow("StringKeyword -> NumberKeyword");
  });
});
