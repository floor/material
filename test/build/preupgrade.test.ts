// Pre-upgrade styles (src/styles/elements): the rules scripts/build-styles.ts
// emits as elements/preupgrade.css and elements/preupgrade/<name>.css.
// The element CSS modules do not register them.
import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import * as sass from "sass";
import {
  cascadeLayerOrder,
  elementStyleModule,
  preupgradeStyles,
  preupgradeStylesheet,
} from "../../scripts/build-styles";
import { elements } from "../../src/elements";
import { preupgradeRollback, preupgradeSheet, retagPreupgrade } from "../../src/elements/styles";
import { assertRollbackBeats, repeatedAttributeBytes, selectorSpecificity } from "../../scripts/preupgrade-specificity";

const options: sass.StringOptions<"sync"> = {
  loadPaths: [resolve("src/styles")], style: "compressed", logger: sass.Logger.silent,
};
const names = Object.values(elements).map((element) => element.spec.name);
const rules = await preupgradeStyles(names, options);

/** The selectors of compressed CSS without nested at-rules. */
const selectors = (css: string): string[] =>
  Array.from(css.matchAll(/([^{}]+)\{[^{}]*\}/g), (match) => match[1].split(",")).flat();

describe("pre-upgrade styles", () => {
  test("every element has rules", () => {
    expect([...rules.keys()].sort()).toEqual([...names].sort());
    for (const [name, css] of rules) expect(css, name).toContain(`m-${name}:not(:defined)`);
  });

  test("every rule is scoped to an undefined element, so none reaches an upgraded one", () => {
    const tags = new Set(names.map((name) => `m-${name}`));
    for (const [name, css] of rules) {
      for (const selector of selectors(css)) {
        const tag = /^(m-[a-z-]+):not\(:defined\)/.exec(selector)?.[1];
        expect(tag && tags.has(tag) ? tag : selector, name).toBe(`m-${name}`);
      }
    }
  });

  test("retagging for another prefix gives what the SCSS builds with that prefix", () => {
    for (const name of names) {
      const css = sass.compileString(`@use "elements/config" with ($tag-prefix: "x-y"); @use "elements/${name}";`, options).css;
      expect(retagPreupgrade(rules.get(name) as string, "x-y"), name).toBe(css);
    }
  });

  test("the SCSS index is every element's rules, with the prefix configurable", () => {
    const css = sass.compileString(`@use "elements" with ($tag-prefix: "x");`, options).css;
    for (const name of names) expect(css, name).toContain(retagPreupgrade(rules.get(name) as string, "x"));
    expect(css).not.toMatch(/(^|[\s,>+~(}])m-[a-z]/);
  });

  test("the sheet is one cascade layer, per prefix, and the rollback is once after the rules", () => {
    const rollback = preupgradeRollback();
    expect(preupgradeSheet("m-a:not(:defined){display:block}", ["m", "x"])).toBe(
      `@layer mtrl.preupgrade{m-a:not(:defined){display:block}x-a:not(:defined){display:block}${rollback}}`
    );
    expect(retagPreupgrade(rollback, "x-y")).toBe(rollback);
    expect(selectorSpecificity("[data-mtrl-ssr]:not(:defined):not(#\\0)")).toEqual([1, 2, 0]);
    expect(selectorSpecificity("m-textfield:not(:defined)[type=multiline][supporting-text]:not([supporting-text=''])[variant=outlined]")).toEqual([0, 5, 1]);
  });

  test("no element CSS module registers pre-upgrade rules", () => {
    const failures = names.filter((name) => elementStyleModule(name, "a{}", ["ripple"]).includes("registerPreupgrade"));
    expect(failures).toEqual([]);
  });

  test("each spec name has a layered file, and together they are the whole sheet", () => {
    const banner = "/*! t */";
    const files = new Map(names.map((name) => [name, preupgradeStylesheet(rules.get(name) as string, banner)]));
    expect([...files.keys()].sort()).toEqual([...names].sort());
    const inner = (sheet: string): string => {
      const start = sheet.indexOf("@layer mtrl.preupgrade{");
      expect(start).toBeGreaterThan(-1);
      expect(sheet.endsWith("}\n")).toBe(true);
      return sheet.slice(start + "@layer mtrl.preupgrade{".length, -2);
    };
    const rollback = preupgradeRollback();
    for (const [name, sheet] of files) {
      expect(sheet.startsWith(`${banner}\n@layer mtrl.preupgrade{`), name).toBe(true);
      expect(inner(sheet), name).toBe(`${rules.get(name)}${rollback}`);
      assertRollbackBeats(rules.get(name) as string);
    }
    const joined = [...rules.values()].join("");
    const whole = preupgradeStylesheet(joined, banner);
    expect(inner(whole)).toBe(`${joined}${rollback}`);
    const max = assertRollbackBeats(joined);
    expect(rollback.length).toBeLessThan(repeatedAttributeBytes(max.specificity[1]));
    expect(joined).not.toMatch(/(?:^|[{;}])\s*--[A-Za-z0-9-]+\s*:/);
  });

  test("the layer order names pre-upgrade first, and a per-element file does not redeclare it", () => {
    const order = cascadeLayerOrder();
    expect(order.startsWith("@layer mtrl.preupgrade,mtrl.base,")).toBe(true);
    const button = preupgradeStylesheet(rules.get("button") as string, "/*! t */");
    expect(button).not.toContain("@layer mtrl.preupgrade,mtrl.base");
    expect(button).toContain("@layer mtrl.preupgrade{");
  });
});

describe("pre-upgrade export keys", () => {
  const specifiers = [
    "mtrl/elements/preupgrade/button.css",
    "mtrl/elements/preupgrade.css",
    "mtrl/elements/preupgrade",
  ];
  const targets = [
    "dist/elements/preupgrade/button.css",
    "dist/elements/preupgrade.css",
    "dist/elements/preupgrade.js",
  ];

  // A copy of this package's exports, with the three target files present, so
  // the test does not read the repo's dist (the CI tests job does not build).
  // Vite's resolution of the same keys is elements-css:check, after the build.
  const consumer = (): { dir: string, expected: string[] } => {
    const dir = mkdtempSync(resolve(tmpdir(), "mtrl-preupgrade-"));
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { name: string, exports: unknown };
    const installed = resolve(dir, "node_modules/mtrl");
    mkdirSync(installed, { recursive: true });
    writeFileSync(resolve(installed, "package.json"), JSON.stringify({ name: pkg.name, exports: pkg.exports }));
    for (const target of targets) {
      const file = resolve(installed, target);
      mkdirSync(resolve(file, ".."), { recursive: true });
      writeFileSync(file, "");
    }
    writeFileSync(resolve(dir, "package.json"), JSON.stringify({ name: "app", private: true }));
    writeFileSync(resolve(dir, "app.js"), "");
    return { dir, expected: targets.map(target => resolve(installed, target)) };
  };

  test("Node resolves the wildcard without taking the exact preupgrade keys", () => {
    const { dir, expected } = consumer();
    const probe = resolve(dir, "resolve.mjs");
    writeFileSync(probe, `import { fileURLToPath } from "node:url";
const specifiers = ${JSON.stringify(specifiers)};
const out = {};
for (const specifier of specifiers) out[specifier] = fileURLToPath(import.meta.resolve(specifier));
console.log(JSON.stringify(out));
`);
    const ran = Bun.spawnSync(["node", probe], { cwd: dir });
    expect(ran.exitCode, `${ran.stderr ?? ""}`).toBe(0);
    const out = JSON.parse(String(ran.stdout ?? "")) as Record<string, string>;
    specifiers.forEach((specifier, index) => expect(realpathSync(out[specifier]!), specifier).toBe(realpathSync(expected[index]!)));
  });
});
