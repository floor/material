// test/core-exports.test.ts
//
// `material/core/<area>` is an explicit list in the export map, as the
// component subpaths are since. The `./core/*` pattern it replaces
// matched across slashes, so `material/core/compose/features` resolved, and the
// README's "Building your own components" imported `withLifecycle()` from it
// (as the 0.10.x README did). The contract is the seven areas and no path
// under them: the README imports from `material/core/compose`, which exports
// the same name. The list is pinned here: an area joining or leaving the
// public set fails until this file, package.json and scripts/root-exports.ts
// say the same thing.
import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { SUBPATHS } from "../scripts/root-exports";

const ROOT = join(import.meta.dir, "..");
const pkg = await Bun.file(join(ROOT, "package.json")).json();
const exported = Object.keys(pkg.exports as Record<string, unknown>);

/** The documented core areas: README, the root-exports migration table, md3.io */
const AREAS = ["canvas", "compose", "dom", "shapes", "state", "theme", "utils"];

describe("the core subpaths", () => {
  test("the export map lists material/core and its seven areas, one by one", () => {
    expect(exported.filter((key) => key === "./core" || key.startsWith("./core/")).sort())
      .toEqual(["./core", ...AREAS.map((area) => `./core/${area}`)].sort());
  });

  test("there is no wildcard under ./core", () => {
    expect(exported.filter((key) => key.startsWith("./core") && key.includes("*"))).toEqual([]);
  });

  test("each area points at its own index, with its declarations", () => {
    for (const area of AREAS) {
      expect(pkg.exports[`./core/${area}`]).toEqual({
        types: `./dist/core/${area}/index.d.ts`,
        import: `./dist/core/${area}/index.js`,
      });
      expect(existsSync(join(ROOT, `src/core/${area}/index.ts`))).toBe(true);
    }
  });

  test("the list is the one the root-exports migration table is built from", () => {
    expect([...SUBPATHS].sort()).toEqual([...AREAS].sort());
  });

  test("no path under an area is exported, and the README teaches none", () => {
    expect(exported.filter((key) => /^\.\/core\/[^/]+\//.test(key))).toEqual([]);
    const readme = readFileSync(join(ROOT, "README.md"), "utf8");
    expect(readme.match(/material\/core\/[a-z-]+\/[a-z-]+/g) ?? []).toEqual([]);
    expect(readme).toContain("Add `withLifecycle()` from `material/core/compose`");
  });

  test("what the README took from core/compose/features is an export of core/compose", async () => {
    const compose = await import("../src/core/compose");
    const features = await import("../src/core/compose/features");
    expect(compose.withLifecycle).toBe(features.withLifecycle);
  });

  test("every folder of src/core that has an index is listed: a new area is a decision, not an accident", () => {
    const withIndex = readdirSync(join(ROOT, "src/core"), { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && existsSync(join(ROOT, "src/core", entry.name, "index.ts")))
      .map((entry) => entry.name);
    expect(withIndex.sort()).toEqual([...AREAS].sort());
  });
});
