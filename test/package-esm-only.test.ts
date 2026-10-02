// test/package-esm-only.test.ts
//
// FLO-358: 3.0.0 is ESM-only. The subpaths always were (import conditions
// only); the root's CommonJS bundle was the one way in for require(), and with
// the internals gone from the root (FLO-351) it would have been a partial API.
// So the manifest offers no require anywhere, and the build makes no CJS.
import { expect, test } from "bun:test";

const pkg = await Bun.file(new URL("../package.json", import.meta.url)).json();

/** Every condition key in the exports map, at any depth */
const conditions = (value: unknown): string[] =>
  value && typeof value === "object"
    ? Object.entries(value).flatMap(([key, item]) => [key, ...conditions(item)])
    : [];

test("no export offers a require condition", () => {
  expect(conditions(pkg.exports).filter((key) => key === "require")).toEqual([]);
});

test("main and module are the ESM entry, and nothing points at a CommonJS file", () => {
  expect(pkg.type).toBe("module");
  expect(pkg.main).toBe("./dist/index.js");
  expect(pkg.module).toBe("./dist/index.js");
  expect(JSON.stringify(pkg.exports)).not.toMatch(/\.cjs"/);
});

test("the build makes no CommonJS bundle", async () => {
  const build = await Bun.file(new URL("../scripts/build.ts", import.meta.url)).text();
  expect(build).not.toMatch(/format:\s*["']cjs["']|\.cjs\b/);
});
