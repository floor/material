// Pre-upgrade styles (src/styles/elements): the rules scripts/build-styles.ts
// emits as elements/preupgrade.css and elements/preupgrade/<name>.css.
// The element CSS modules do not register them.
import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import * as sass from "sass";
import {
  cascadeLayerOrder,
  elementStyleModule,
  preupgradeStyles,
  preupgradeStylesheet,
} from "../../scripts/build-styles";
import { elements } from "../../src/elements";
import { preupgradeRollback, preupgradeSheet, retagPreupgrade } from "../../src/elements/styles";
import { assertRollbackBeats, repeatedAttributeBytes, ruleSelectors, selectorSpecificity, subjectShape } from "../../scripts/preupgrade-specificity";

const options: sass.StringOptions<"sync"> = {
  loadPaths: [resolve("src/styles")], style: "compressed", logger: sass.Logger.silent,
};
const names = Object.values(elements).map((element) => element.spec.name);
const rules = await preupgradeStyles(names, options);

/** A comma inside a functional pseudo (`:is(a, b)`) is not a selector separator. */
const splitSelectors = (prelude: string): string[] => {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < prelude.length; i++) {
    const char = prelude[i];
    if (char === "(") depth += 1;
    else if (char === ")") depth = Math.max(0, depth - 1);
    else if (char === "," && depth === 0) {
      parts.push(prelude.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(prelude.slice(start));
  return parts;
};

/** The selectors of compressed CSS without nested at-rules. */
const selectors = (css: string): string[] =>
  Array.from(css.matchAll(/([^{}]+)\{[^{}]*\}/g), (match) => splitSelectors(match[1])).flat();

// jsdom's engine (nwsapi) does not implement `:defined`. This applies the
// child selector the sheet emits: the parent compound, then `>`, then the
// subject. A built-in element is defined; a custom element is defined only
// after `customElements.define`.
const definedElement = (element: Element): boolean => {
  const name = element.localName;
  if (!name.includes("-")) return true;
  return element.ownerDocument.defaultView?.customElements.get(name) !== undefined;
};

const readIdent = (text: string, start: number): { value: string; index: number } => {
  let i = start;
  let value = "";
  const consume = (): string => {
    if (text[i] !== "\\") {
      const char = text[i] ?? "";
      i += 1;
      return char;
    }
    i += 1;
    const hex = /^[0-9a-fA-F]{1,6}/.exec(text.slice(i));
    if (!hex) {
      const char = text[i] ?? "";
      i += 1;
      return char;
    }
    i += hex[0].length;
    if (text[i] === " " || text[i] === "\t" || text[i] === "\n" || text[i] === "\r" || text[i] === "\f") i += 1;
    return String.fromCodePoint(Number.parseInt(hex[0], 16));
  };
  if (text[i] === "-") value += consume();
  if (i >= text.length) throw new Error(`bad ident in ${text}`);
  value += consume();
  while (i < text.length && (text[i] === "\\" || /[A-Za-z0-9_-]/.test(text[i] ?? "") || (text.codePointAt(i) ?? 0) > 127)) value += consume();
  return { value, index: i };
};

const matchesCompound = (element: Element, compound: string): boolean => {
  let i = 0;
  if (!compound) throw new Error("empty compound");
  while (i < compound.length) {
    const char = compound[i];
    if (char === "*") { i += 1; continue; }
    if (char === "#") {
      const ident = readIdent(compound, i + 1);
      if (element.id !== ident.value) return false;
      i = ident.index;
      continue;
    }
    if (char === "[") {
      const end = compound.indexOf("]", i);
      if (end < 0) throw new Error(`unclosed attribute in ${compound}`);
      const body = compound.slice(i + 1, end);
      if (body.includes("=") || body.includes(" ")) throw new Error(`unsupported attribute ${body}`);
      if (!element.hasAttribute(body)) return false;
      i = end + 1;
      continue;
    }
    if (char === ":") {
      const ident = readIdent(compound, i + 1);
      i = ident.index;
      if (compound[i] === "(") {
        let depth = 0;
        const argStart = i + 1;
        while (i < compound.length) {
          if (compound[i] === "(") depth += 1;
          else if (compound[i] === ")") {
            depth -= 1;
            if (depth === 0) break;
          }
          i += 1;
        }
        if (depth !== 0) throw new Error(`unclosed function in ${compound}`);
        const arg = compound.slice(argStart, i);
        i += 1;
        if (ident.value !== "not") throw new Error(`unsupported pseudo :${ident.value}()`);
        if (matchesCompound(element, arg)) return false;
        continue;
      }
      if (ident.value === "defined") {
        if (!definedElement(element)) return false;
        continue;
      }
      throw new Error(`unsupported pseudo :${ident.value}`);
    }
    if (/[A-Za-z]/.test(char ?? "")) {
      const ident = readIdent(compound, i);
      if (element.localName !== ident.value.toLowerCase()) return false;
      i = ident.index;
      continue;
    }
    throw new Error(`unparsed ${JSON.stringify(compound.slice(i))} in ${compound}`);
  }
  return true;
};

/** Whether `element` is the subject of a sheet selector whose only combinator is `>`. */
const matchesChildSelector = (element: Element, selector: string): boolean => {
  const index = selector.lastIndexOf(">");
  if (index < 0) throw new Error(`not a child selector: ${selector}`);
  const parent = element.parentElement;
  if (!parent) return false;
  return matchesCompound(parent, selector.slice(0, index).trim()) && matchesCompound(element, selector.slice(index + 1).trim());
};

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
    expect(selectorSpecificity("[data-mtrl-ssr]:not(:defined):not(#\\0) > :defined")).toEqual([1, 3, 0]);
    expect(selectorSpecificity("m-text-field:not(:defined)[type=multiline][supporting-text]:not([supporting-text=''])[variant=outlined]")).toEqual([0, 5, 1]);
    expect(subjectShape("m-navigation-rail:not(:defined)>*+*")).toBe("child");
    expect(subjectShape("m-card:not(:defined)>[slot=headline]")).toBe("child");
    expect(subjectShape("m-tabs:not(:defined):has(>[icon])")).toBe("host");
    expect(subjectShape("m-text-field:not(:defined)::before")).toBe("host::before");
    expect(subjectShape("[data-mtrl-ssr]:not(:defined):not(#\\0) > :defined")).toBe("child");
  });

  test("the rollback's child selector matches a div or span and not an undefined custom element", () => {
    const child = preupgradeRollback().slice(0, preupgradeRollback().indexOf("{")).split(",").find((selector) => selector.includes(">"));
    expect(child).toBeDefined();
    const dom = new JSDOM("<!doctype html><m-toolbar data-mtrl-ssr><div></div><span></span><m-fab-menu></m-fab-menu></m-toolbar>");
    const host = dom.window.document.querySelector("m-toolbar");
    expect(host).not.toBeNull();
    const match = (tag: string): boolean => matchesChildSelector(host?.querySelector(tag) as Element, child as string);
    expect(match("div")).toBe(true);
    expect(match("span")).toBe(true);
    expect(match("m-fab-menu")).toBe(false);
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
    const rollbackSelectors = rollback.slice(0, rollback.indexOf("{")).split(",");
    expect(rollbackSelectors.some((selector) => subjectShape(selector) === "child")).toBe(true);
    const shapes = [...new Set(ruleSelectors(joined).map(subjectShape))].sort();
    expect(shapes).toEqual(["child", "host", "host::after", "host::before"]);
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
    "material/elements/preupgrade/button.css",
    "material/elements/preupgrade.css",
    "material/elements/preupgrade",
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
    const installed = resolve(dir, "node_modules/material");
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
