import { expect, test } from "bun:test";
import { mkdir, mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { catalogueForSize, run } from "../../scripts/package-fixture";
import type { SizeRow } from "../../scripts/size-policy";

test("the size fixture normalizes only the catalogue's source commit", () => {
  const first = "1234567890abcdef".repeat(3).slice(0, 40);
  const second = "abcdef0123456789".repeat(3).slice(0, 40);
  const document = (sourceCommit: string) => JSON.stringify({ sourceCommit, inputsDigest: first }, null, 1) + "\n";
  expect(catalogueForSize(document(first))).toBe(document("0".repeat(40)));
  expect(catalogueForSize(document(second))).toBe(catalogueForSize(document(first)));
  expect(() => catalogueForSize(document("invalid"))).toThrow("Missing source commit");
});

test("Vite measures the same bytes with different fixture paths", async () => {
  const root = await realpath(await mkdtemp(join(tmpdir(), "mtrl-size-test-")));
  const directories = [
    join(root, "short"),
    join(root, "different", "nested", "very-long-fixture-name-123456789"),
  ];
  try {
    for (const directory of directories) {
      const material = join(directory, "node_modules/material");
      await mkdir(material, { recursive: true });
      await Bun.write(join(material, "package.json"), JSON.stringify({
        type: "module",
        exports: {
          ".": "./index.js",
          "./core/dom": "./dom.js",
          "./theme": "./theme.js",
          "./theme/2025": "./theme-2025.js",
          "./theme/image": "./theme-image.js",
        },
      }));
      await Bun.write(join(material, "index.js"), [
        'export const createButton = () => import("./progress.js");',
        'export const createTextField = () => "text field";',
      ].join("\n"));
      await Bun.write(join(material, "progress.js"), 'export const progress = "progress";');
      await Bun.write(join(material, "dom.js"), 'export const addClass = (node, name) => node.classList.add(name);');
      await Bun.write(join(material, "theme.js"), "export const createScheme = () => ({}), applyScheme = () => {};");
      await Bun.write(join(material, "theme-2025.js"), 'export const createScheme = () => "Attempting to extend color", applyScheme = () => {};');
      await Bun.write(join(material, "theme-image.js"), "export const sourceColorFromImage = () => 0;");
    }
    await run(["bun", "-e", `
      import assert from "node:assert/strict";
      import { measureConsumerSizes } from "./scripts/size-fixtures";
      const [short, long] = ${JSON.stringify(directories)};
      const first = await measureConsumerSizes(short);
      const second = await measureConsumerSizes(long);
      assert.equal(first.rows.length, 7);
      assert.deepEqual(first, second);
    `]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

const ciAnalysis = process.env.MTRL_SIZE_CI_ANALYSIS;

// On a local build of the tested merge tree, point this at the extracted
// package-sizes artifact from the PR run.
test.skipIf(!ciAnalysis)("every local size row matches CI on the same tree", async () => {
  async function rows(directory: string): Promise<SizeRow[]> {
    const files = ["package-size.json", "component-size.json"];
    const measurements = await Promise.all(files.map(name =>
      Bun.file(join(directory, name)).json() as Promise<{ rows: SizeRow[] }>,
    ));
    return measurements.flatMap(measurement => measurement.rows);
  }
  const local = await rows("analysis");
  const ci = await rows(ciAnalysis!);
  expect(ci.length).toBeGreaterThan(0);
  expect(local).toEqual(ci);
  console.log(`Local and CI measurements matched in all ${local.length} rows.`);
});
