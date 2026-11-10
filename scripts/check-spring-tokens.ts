#!/usr/bin/env bun
/**
 * Opt-in spring custom properties.
 *
 * Off, omitted, and `$spring-tokens: false` keep the literal durations and
 * easings. An author property then has no effect: that page is the red
 * control. On, the same components read `var(--mtrl-sys-motion-spring-…)`,
 * fall back to those literals when the property is missing, and follow an
 * ancestor override. The rail's midpoint and the FAB icon delay are derived
 * from the duration. JS physics (FAB stagger, the rail's SWITCH_DURATION,
 * the snackbar's ANIMATION_DURATION) is outside this CSS contract.
 *
 * https://m3.material.io/styles/motion/overview/how-it-works (2026-11-09)
 * separates spatial motion from effects. The numbers are the library's.
 */
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium, type Page } from "playwright";
import * as sass from "sass";
import { createPackageFixture } from "./package-fixture";

const LOAD = ["src/styles"];
const OPTIONS = { loadPaths: LOAD, style: "expanded" as const, logger: sass.Logger.silent };

const DURATIONS = {
  "fast-spatial": "425ms",
  "default-spatial": "450ms",
  "slow-spatial": "625ms",
  "fast-effects": "175ms",
  "default-effects": "250ms",
  "slow-effects": "350ms",
} as const;

const EASING_MARK: Record<string, string> = {
  "default-spatial": "0.055",
  "slow-spatial": "0.056",
  "default-effects": "0.066",
  "fast-effects": "0.075",
  "slow-effects": "0.065",
};

const CONSUMERS = [
  "src/styles/components/_bottom-sheet.scss",
  "src/styles/components/_button-group.scss",
  "src/styles/components/_button.scss",
  "src/styles/components/_checkbox.scss",
  "src/styles/components/_chips.scss",
  "src/styles/components/_drawer.scss",
  "src/styles/components/_fab-menu.scss",
  "src/styles/components/_list.scss",
  "src/styles/components/_menu.scss",
  "src/styles/components/_navigation-bar.scss",
  "src/styles/components/_navigation-rail.scss",
  "src/styles/components/_radios.scss",
  "src/styles/components/_side-sheet.scss",
  "src/styles/components/_slider.scss",
  "src/styles/components/_snackbar.scss",
  "src/styles/components/_split-button.scss",
  "src/styles/components/_switch.scss",
  "src/styles/components/_tabs.scss",
  "src/styles/components/_timepicker.scss",
  "src/styles/components/_toolbar.scss",
];

const SPRING_KEY = /spring-(?:fast|default|slow)-(?:spatial|effects)|spring-fast-spatial-clamped/;
// `group-button-transition` passes the role into `v.motion` in its body.
const THROUGH_ACCESSOR = /v\.motion\(|m\.spring(?:-duration)?\(|v\.spring-duration-div\(|v\.spring-delay-scale\(|group-button-transition\(/;

const compile = (source: string, loadPaths = LOAD): string =>
  sass.compileString(source, { ...OPTIONS, loadPaths }).css;

const compileError = (source: string, loadPaths = LOAD): string => {
  try {
    compile(source, loadPaths);
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  return "";
};

const flat = (css: string): string => css.replace(/\s+/g, " ");

const count = (css: string, needle: string): number => css.split(needle).length - 1;

function declarations(css: string): Map<string, string> {
  const found = new Map<string, string>();
  for (const match of css.matchAll(/(--mtrl-sys-motion-spring-[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    found.set(match[1], match[2].trim());
  }
  return found;
}

function varFallbacks(css: string): Map<string, string> {
  const found = new Map<string, string>();
  const token = "var(--mtrl-sys-motion-spring-";
  let from = 0;
  while (from < css.length) {
    const start = css.indexOf(token, from);
    if (start < 0) break;
    const open = css.indexOf("(", start);
    let depth = 0;
    let end = open;
    for (; end < css.length; end += 1) {
      if (css[end] === "(") depth += 1;
      else if (css[end] === ")") {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    const inside = css.slice(open + 1, end);
    const comma = inside.indexOf(",");
    const name = inside.slice(0, comma).trim();
    const fallback = inside.slice(comma + 1).trim();
    const previous = found.get(name);
    if (previous !== undefined) assert.equal(previous, fallback, name);
    else found.set(name, fallback);
    from = end + 1;
  }
  return found;
}

const property = (role: string, part: "duration" | "easing"): string =>
  `--mtrl-sys-motion-spring-${role}-${part}`;

async function walk(dir: string, suffix: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path, suffix));
    else if (entry.name.endsWith(suffix)) files.push(path);
  }
  return files;
}

function assertLiterals(css: string, label: string): void {
  assert.equal(varFallbacks(css).size, 0, `${label} wrapped a spring in var()`);
  assert.doesNotMatch(css, /--mtrl-sys-motion-spring-[a-z0-9-]+\s*:/, `${label} emitted a spring property`);
  assert.match(flat(css), /visibility 0s linear 48ms/);
  assert.match(flat(css), /linear 225ms/);
  assert.doesNotMatch(css, /48 \/ 425/);
  assert.doesNotMatch(css, /calc\(var\(--mtrl-sys-motion-spring/);
}

function assertTokenCss(css: string): void {
  const fallbacks = varFallbacks(css);
  for (const [role, duration] of Object.entries(DURATIONS)) {
    assert.equal(fallbacks.get(property(role, "duration")), duration, role);
  }
  assert.match(fallbacks.get(property("fast-spatial", "easing")) ?? "", /1\.094/);
  const clamped = fallbacks.get("--mtrl-sys-motion-spring-fast-spatial-clamped-easing") ?? "";
  assert.match(clamped, /linear\(/);
  assert.doesNotMatch(clamped, /1\.094/);
  assert.notEqual(clamped, fallbacks.get(property("fast-spatial", "easing")));
  for (const [role, mark] of Object.entries(EASING_MARK)) {
    assert.match(fallbacks.get(property(role, "easing")) ?? "", new RegExp(mark), role);
  }
  assert.match(flat(css), /calc\(var\(--mtrl-sys-motion-spring-default-spatial-duration, 450ms\) \/ 2\)/);
  assert.match(
    flat(css),
    /visibility 0s linear calc\(var\(--mtrl-sys-motion-spring-fast-spatial-duration, 425ms\) \* \(48 \/ 425\)\)/,
  );
  assert.match(css, /100ms/);
  assert.match(css, /cubic-bezier\(0\.2/);
  assert.doesNotMatch(css, /var\(--mtrl-sys-motion-duration-/);
  assert.doesNotMatch(css, /var\(--mtrl-sys-motion-easing-/);
}

const SHEETS = [
  "components/switch",
  "components/checkbox",
  "components/button",
  "components/menu",
  "components/navigation-rail",
  "components/fab-menu",
  "components/chips",
].map(sheet => `@use "${sheet}";`).join("\n");

const OFF_SOURCE = `${SHEETS}\n@use "abstract/mixins" as mixins;\n@include mixins.global-reduced-motion;\n`;
const ON_SOURCE = `@use "config" with ($spring-tokens: true);\n@use "motion" as motion;\n${SHEETS}\n@use "abstract/mixins" as mixins;\n.tokens { @include motion.spring-tokens; }\n@include mixins.global-reduced-motion;\n`;

function assertSass(): { off: string; on: string } {
  const omitted = compile(OFF_SOURCE);
  const explicitFalse = compile(`@use "config" with ($spring-tokens: false);\n${OFF_SOURCE}`);
  assert.equal(explicitFalse, omitted, "$spring-tokens: false changed the literal CSS");
  assertLiterals(omitted, "off");

  const on = compile(ON_SOURCE);
  assertTokenCss(on);
  const emitted = declarations(on);
  assert.equal(emitted.size, 13, `expected 13 spring properties, got ${[...emitted.keys()].join(" ")}`);
  for (const [name, value] of emitted) {
    assert.doesNotMatch(value, /var\(/, `${name} reads itself`);
    assert.notEqual(value, "", name);
  }
  for (const [role, duration] of Object.entries(DURATIONS)) {
    assert.equal(emitted.get(property(role, "duration")), duration, role);
    assert.match(emitted.get(property(role, "easing")) ?? "", /linear\(/, role);
  }
  assert.match(emitted.get("--mtrl-sys-motion-spring-fast-spatial-easing") ?? "", /1\.094/);
  assert.doesNotMatch(emitted.get("--mtrl-sys-motion-spring-fast-spatial-clamped-easing") ?? "", /1\.094/);
  assert.equal(count(on, "--mtrl-sys-motion-spring-fast-spatial-duration:"), 1);

  const mixinOnly = compile(`@use "config" with ($spring-tokens: true);\n@use "motion" as motion;\n:root { @include motion.spring-tokens; }\n`);
  assert.doesNotMatch(mixinOnly, /\.mtrl-/);
  assert.equal(declarations(mixinOnly).size, 13);
  assert.equal(compile(`@use "motion";`).trim(), "", "loading motion emitted CSS");

  const repeated = compile(`@use "config" with ($spring-tokens: true);\n@use "motion" as motion;\n.a { @include motion.spring-tokens; }\n.b { @include motion.spring-tokens; }\n`);
  assert.equal(count(repeated, "--mtrl-sys-motion-spring-slow-spatial-duration:"), 2);
  const once = compile(`@use "config" with ($spring-tokens: true);\n@use "components/button";`);
  const twice = compile(`@use "config" with ($spring-tokens: true);\n@use "components/button" as a;\n@use "components/button" as b;`);
  assert.equal(twice, once, "loading a component twice duplicated its CSS");

  const slow = compile(`@use "config" with ($spring-tokens: true);\n@use "abstract/variables" as v;\n.slow { transition: transform v.motion("spring-slow-spatial-duration") v.motion("spring-slow-spatial-easing"); }\n`);
  assert.match(slow, /var\(--mtrl-sys-motion-spring-slow-spatial-duration, 625ms\)/);
  assert.match(slow, /0\.056/);
  assert.match(on, /var\(--mtrl-sys-motion-spring-slow-effects-duration, 350ms\)/);

  const bare = compileError(`@use "motion" as motion;\n:root { @include motion.spring-tokens; }`);
  assert.match(bare, /spring-token/);
  const late = compileError(`@use "components/switch";\n@use "config" with ($spring-tokens: true);`);
  assert.match(late, /already loaded|configured/i);
  const onMotion = compileError(`@use "motion" with ($spring-tokens: true);`);
  assert.notEqual(onMotion, "");
  const bad = compileError(`@use "config" with ($spring-tokens: "yes");\n@use "components/button";`);
  assert.match(bad, /true or false/);

  const elementsOff = compile(`@use "elements" with ($tag-prefix: "x");`);
  const elementsOn = compile(`@use "config" with ($spring-tokens: true);\n@use "elements" with ($tag-prefix: "x");`);
  assert.equal(elementsOn, elementsOff, "spring tokens changed pre-upgrade CSS");
  assert.match(elementsOff, /x-switch:not\(:defined\)/);
  assert.doesNotMatch(elementsOff, /--mtrl-sys-motion-spring/);
  assert.doesNotMatch(elementsOff, /--x-sys-motion/);

  for (const entry of ["base/tokens", "base/reset", "main"]) {
    const css = compile(`@use "${entry}";`);
    assert.doesNotMatch(css, /--mtrl-sys-motion-spring/, `${entry} gained a spring property`);
  }
  return { off: omitted, on };
}

async function assertInventory(): Promise<void> {
  assert.equal(CONSUMERS.length, 20);
  const styles = await walk("src/styles", ".scss");
  for (const file of CONSUMERS) {
    const text = await readFile(file, "utf8");
    assert.doesNotMatch(text, /spring-slow-spatial/, `${file} is not the slow-spatial consumer`);
    assert.doesNotMatch(text, /math\.\w+\(\s*v\.motion\(/, `${file} does arithmetic on a motion value`);
  }
  const rawMap = new Set([
    "src/styles/abstract/_variables.scss",
    "src/styles/motion.scss",
  ]);
  for (const file of styles) {
    if (rawMap.has(file)) continue;
    const text = await readFile(file, "utf8");
    for (const line of text.split("\n")) {
      const code = line.replace(/\/\/.*$/, "");
      if (!SPRING_KEY.test(code)) continue;
      assert.match(code, THROUGH_ACCESSOR, `${file} reads a spring outside the accessor: ${line.trim()}`);
    }
  }
  const runtime: string[] = [];
  for (const file of await walk("src", ".ts")) {
    const text = await readFile(file, "utf8");
    if (text.includes("--mtrl-sys-motion-spring") || text.includes("$spring-tokens")) runtime.push(file);
  }
  assert.deepEqual(runtime, [], "runtime source grew a spring token");
  const rail = await readFile("src/components/navigation-rail/navigation-rail.ts", "utf8");
  const fab = await readFile("src/components/fab-menu/constants.ts", "utf8");
  const snackbar = await readFile("src/components/snackbar/constants.ts", "utf8");
  assert.match(rail, /SWITCH_DURATION = 450/);
  assert.match(fab, /FAB_MENU_ITEM_EXIT = 425/);
  assert.match(snackbar, /ANIMATION_DURATION: 425/);
  console.log("JS deadlines stay literal (rail 450, FAB exit 425, snackbar 425) and do not follow the CSS tokens.");
}

type Row = { property: string; duration: string; delay: string };

function ms(value: string): number {
  const n = Number.parseFloat(value);
  return value.trim().endsWith("ms") ? n : n * 1000;
}

function near(value: string, expected: number, label: string): void {
  assert.ok(Math.abs(ms(value) - expected) < 0.5, `${label}: ${value} is not ${expected}ms`);
}

function row(rows: Row[], name: string, label: string): Row {
  const found = rows.find(item => item.property === name);
  assert(found, `${label} has no ${name} in ${JSON.stringify(rows)}`);
  return found;
}

const PAGE = (css: string): string => `<!doctype html><html><head><style id="components">${css}</style>
<style>
  #quiet {
    --mtrl-sys-motion-spring-fast-spatial-duration: 850ms;
    --mtrl-sys-motion-spring-fast-spatial-easing: ease-in;
    --mtrl-sys-motion-spring-fast-effects-duration: 120ms;
    --mtrl-sys-motion-spring-fast-effects-easing: linear;
    --mtrl-sys-motion-spring-default-spatial-duration: 200ms;
    --mtrl-sys-motion-spring-default-effects-duration: 90ms;
    --mtrl-sys-motion-spring-fast-spatial-clamped-easing: step-end;
  }
</style></head><body>
  <div class="tokens"></div>
  <div id="quiet">
    <div id="switch" class="mtrl-switch"><div class="mtrl-switch__thumb"></div></div>
    <label class="mtrl-checkbox"><input id="checkbox" class="mtrl-checkbox__input" type="checkbox"><span class="mtrl-checkbox__icon"></span></label>
    <button id="quiet-button" class="mtrl-button" type="button">Go</button>
    <div class="mtrl-menu mtrl-menu--vertical"><div id="menu-item" class="mtrl-menu__item">Item</div></div>
    <div class="mtrl-navigation-rail"><div id="rail-label" class="mtrl-navigation-rail__label">Label</div><div id="rail-icon" class="mtrl-navigation-rail__icon"></div></div>
    <div class="mtrl-fab mtrl-fab-menu__fab"><span id="fab-icon" class="mtrl-fab__icon"></span></div>
    <div id="host"></div>
  </div>
  <button id="plain-button" class="mtrl-button" type="button">Plain</button>
</body></html>`;

async function readRows(page: Page, selector: string): Promise<Row[]> {
  return page.evaluate(source => {
    const el = document.querySelector(source);
    if (!el) return [];
    const style = getComputedStyle(el);
    const props = style.transitionProperty.split(",").map(item => item.trim());
    const durations = style.transitionDuration.split(",").map(item => item.trim());
    const delays = style.transitionDelay.split(",").map(item => item.trim());
    return props.map((propertyName, index) => ({
      property: propertyName,
      duration: durations[index] ?? "",
      delay: delays[index] ?? "",
    }));
  }, selector);
}

async function animate(page: Page, selector: string, propertyName: string, next: string): Promise<{ property: string; duration: number; easing: string }[]> {
  return page.evaluate(async probe => {
    const el = document.querySelector<HTMLElement>(probe.selector);
    if (!el) return [];
    await new Promise<void>(resolve => { requestAnimationFrame(() => requestAnimationFrame(() => resolve())); });
    if (probe.propertyName === "class") el.classList.add(probe.next);
    else if (probe.propertyName === "checked" && el instanceof HTMLInputElement) el.checked = true;
    else el.style.setProperty(probe.propertyName, probe.next);
    const target = probe.propertyName === "class"
      ? document.querySelector("#switch .mtrl-switch__thumb")
      : probe.propertyName === "checked"
        ? document.querySelector(".mtrl-checkbox__icon")
        : el;
    return [...(target?.getAnimations() ?? [])].map(animation => {
      const timing = animation.effect?.getComputedTiming();
      const transition = "transitionProperty" in animation ? String(animation.transitionProperty) : "";
      return {
        property: transition,
        duration: typeof timing?.duration === "number" ? timing.duration : -1,
        easing: String(timing?.easing ?? ""),
      };
    });
  }, { selector, propertyName, next });
}

function durationOf(anims: { property: string; duration: number; easing: string }[], name: string, expected: number, label: string): void {
  const found = anims.find(item => item.property === name);
  assert(found, `${label} did not animate ${name}: ${JSON.stringify(anims)}`);
  assert.ok(Math.abs(found.duration - expected) < 0.5, `${label} ${name} ran for ${found.duration}ms`);
}

async function assertPage(page: Page, mode: "off" | "on"): Promise<void> {
  const quietButton = await readRows(page, "#quiet-button");
  const plainButton = await readRows(page, "#plain-button");
  const thumb = await readRows(page, "#switch .mtrl-switch__thumb");
  const icon = await readRows(page, ".mtrl-checkbox__icon");
  const menu = await readRows(page, "#menu-item");
  const label = await readRows(page, "#rail-label");
  const railIcon = await readRows(page, "#rail-icon");
  const fabIcon = await readRows(page, "#fab-icon");
  const spatial = mode === "on" ? 850 : 425;
  const effects = mode === "on" ? 120 : 175;
  const rail = mode === "on" ? 200 : 450;
  const half = rail / 2;
  const fabDelay = mode === "on" ? 96 : 48;
  near(row(quietButton, "border-radius", "quiet button").duration, spatial, `${mode} quiet button radius`);
  near(row(quietButton, "background-color", "quiet button").duration, mode === "on" ? 90 : 250, `${mode} quiet button color`);
  near(row(plainButton, "border-radius", "plain button").duration, 425, `${mode} plain button`);
  near(row(thumb, "width", "switch").duration, spatial, `${mode} switch width`);
  near(row(thumb, "background-color", "switch").duration, effects, `${mode} switch color`);
  near(row(icon, "background-color", "checkbox").duration, effects, `${mode} checkbox`);
  near(row(menu, "border-radius", "menu").duration, spatial, `${mode} menu radius`);
  near(row(menu, "background-color", "menu").duration, 100, `${mode} menu color stays the literal short2`);
  for (const item of label) near(item.delay, half, `${mode} rail ${item.property} delay`);
  near(row(railIcon, "inset-block-start", "rail icon").duration, rail, `${mode} rail icon`);
  near(row(railIcon, "inset-block-start", "rail icon").delay, 0, `${mode} rail icon delay`);
  near(row(fabIcon, "visibility", "fab icon").delay, fabDelay, `${mode} fab delay`);

  const fabEasing = await page.locator(".mtrl-fab.mtrl-fab-menu__fab").evaluate(el => getComputedStyle(el).transitionTimingFunction);
  const fabParts = fabEasing.split(/,(?![^(]*\))/).map(part => part.trim());
  assert.equal(fabParts.length, 6, fabEasing);
  if (mode === "on") {
    assert.equal(fabParts[0], fabParts[1]);
    assert.equal(fabParts[0], fabParts[2]);
    assert.equal(fabParts[0], fabParts[5]);
    assert.equal(fabParts[3], fabParts[4]);
    assert.notEqual(fabParts[0], fabParts[3], fabEasing);
    assert.match(fabParts[0], /ease-in|cubic-bezier\(0\.42/);
    assert.match(fabParts[3], /step-end|steps\(1/);
    const names = [
      ...Object.keys(DURATIONS).flatMap(role => [property(role, "duration"), property(role, "easing")]),
      "--mtrl-sys-motion-spring-fast-spatial-clamped-easing",
    ];
    const tokens = await page.locator(".tokens").evaluate((el, tokenNames) => {
      const style = getComputedStyle(el);
      return Object.fromEntries(tokenNames.map(name => [name, style.getPropertyValue(name).trim()]));
    }, names);
    for (const name of names) {
      const value = tokens[name] ?? "";
      assert.notEqual(value, "", `${name} was not emitted`);
      assert.doesNotMatch(value, /var\(/, name);
    }
    assert.equal(tokens["--mtrl-sys-motion-spring-fast-spatial-duration"], "425ms");
    assert.match(tokens["--mtrl-sys-motion-spring-fast-spatial-easing"] ?? "", /1\.094/);
    assert.doesNotMatch(tokens["--mtrl-sys-motion-spring-fast-spatial-clamped-easing"] ?? "", /1\.094/);
  } else {
    assert.match(fabParts[0], /linear\(/);
    assert.match(fabParts[3], /linear\(/);
    assert.notEqual(fabParts[0], fabParts[3], "clamped easing matched the overshooting curve");
    const empty = await page.locator(".tokens").evaluate(el => getComputedStyle(el).getPropertyValue("--mtrl-sys-motion-spring-fast-spatial-duration").trim());
    assert.equal(empty, "");
  }

  const switchAnims = await animate(page, "#switch", "class", "mtrl-switch--checked");
  durationOf(switchAnims, "width", spatial, `${mode} switch`);
  const checkAnims = await animate(page, "#checkbox", "checked", "true");
  durationOf(checkAnims, "background-color", effects, `${mode} checkbox`);
  const buttonAnims = await animate(page, "#quiet-button", "border-radius", "4px");
  durationOf(buttonAnims, "border-radius", spatial, `${mode} button`);
  const buttonEasing = buttonAnims.find(item => item.property === "border-radius")?.easing ?? "";
  if (mode === "on") assert.match(buttonEasing, /ease-in|cubic-bezier\(0\.42,\s*0,\s*1,\s*1\)/);
  else assert.match(buttonEasing, /linear/);
  const menuAnims = await animate(page, "#menu-item", "border-radius", "12px");
  durationOf(menuAnims, "border-radius", spatial, `${mode} menu`);

  if (mode === "on") {
    await page.locator("#quiet").evaluate(el => el.style.setProperty("--mtrl-sys-motion-spring-fast-spatial-duration", "100ms"));
    const changed = await readRows(page, "#quiet-button");
    const sibling = await readRows(page, "#plain-button");
    near(row(changed, "border-radius", "changed button").duration, 100, "dynamic quiet button");
    near(row(sibling, "border-radius", "sibling button").duration, 425, "dynamic sibling");
    const shadow = await page.evaluate(cssText => {
      const host = document.querySelector("#host");
      if (!host) return { shadow: "", sibling: "" };
      const root = host.attachShadow({ mode: "open" });
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(cssText);
      root.adoptedStyleSheets = [sheet];
      root.innerHTML = `<button class="mtrl-button" type="button">In</button>`;
      const inner = root.querySelector("button");
      const outer = document.querySelector("#plain-button");
      const duration = (el: Element | null) => {
        if (!el) return "";
        const style = getComputedStyle(el);
        const props = style.transitionProperty.split(",").map(item => item.trim());
        const durations = style.transitionDuration.split(",").map(item => item.trim());
        return durations[props.indexOf("border-radius")] ?? "";
      };
      return { shadow: duration(inner), sibling: duration(outer) };
    }, await page.locator("#components").textContent() ?? "");
    near(shadow.shadow, 100, "shadow button");
    near(shadow.sibling, 425, "light sibling of the shadow host");
  }
}

async function assertReduced(page: Page): Promise<void> {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const thumb = await readRows(page, "#switch .mtrl-switch__thumb");
  const label = await readRows(page, "#rail-label");
  const properties = new Set([...thumb, ...label].map(item => item.property));
  for (const name of ["width", "inline-size", "transform", "inset", "inset-block-start", "inset-inline-start"]) {
    assert.equal(properties.has(name), false, `reduced motion still transitions ${name}`);
  }
  const anims = await animate(page, "#switch", "class", "mtrl-switch--checked");
  assert.equal(anims.some(item => item.property === "width"), false, `reduced motion animated width: ${JSON.stringify(anims)}`);
}

async function assertBrowser(off: string, on: string): Promise<void> {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const [mode, css] of [["off", off], ["on", on]] as const) {
      const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.setContent(PAGE(css));
      await assertPage(page, mode);
      assert.deepEqual(errors, []);
      await page.close();
    }
    const reduced = await browser.newPage({ viewport: { width: 800, height: 600 } });
    await reduced.emulateMedia({ reducedMotion: "reduce" });
    await reduced.setContent(PAGE(on));
    await assertReduced(reduced);
    await reduced.close();
  } finally {
    await browser.close();
  }
}

async function assertPacked(): Promise<void> {
  const fixture = await createPackageFixture();
  try {
    const files = (fixture.pack.files as { path: string }[]).map(file => file.path);
    for (const path of ["src/styles/config.scss", "src/styles/motion.scss", "src/styles/abstract/_settings.scss"]) {
      assert.ok(files.includes(path), `${path} is not in the packed package`);
    }
    assert.equal(files.includes("src/styles/abstract/_config.scss"), false);
    const loadPaths = [join(fixture.directory, "node_modules")];
    const packedOff = compile(`@use "material/src/styles/components/switch";`, loadPaths);
    assert.equal(packedOff, compile(`@use "components/switch";`));
    assert.doesNotMatch(packedOff, /--mtrl-sys-motion-spring/);
    const packedOn = compile(`@use "material/src/styles/config" with ($spring-tokens: true);\n@use "material/src/styles/motion" as motion;\n@use "material/src/styles/components/navigation-rail";\n@use "material/src/styles/components/fab-menu";\n:root { @include motion.spring-tokens; }\n`, loadPaths);
    assert.match(packedOn, /var\(--mtrl-sys-motion-spring-fast-spatial-duration, 425ms\)/);
    assert.match(flat(packedOn), /calc\(var\(--mtrl-sys-motion-spring-default-spatial-duration, 450ms\) \/ 2\)/);
    assert.match(flat(packedOn), /\* \(48 \/ 425\)/);
    assert.equal(declarations(packedOn).size, 13);
    assert.equal(packedOn, compile(`@use "config" with ($spring-tokens: true);\n@use "motion" as motion;\n@use "components/navigation-rail";\n@use "components/fab-menu";\n:root { @include motion.spring-tokens; }\n`));
    const late = compileError(`@use "material/src/styles/components/switch";\n@use "material/src/styles/config" with ($spring-tokens: true);`, loadPaths);
    assert.match(late, /already loaded|configured/i);
  } finally {
    await fixture.cleanup();
  }
}

const sheets = assertSass();
await assertInventory();
await assertBrowser(sheets.off, sheets.on);
await assertPacked();
console.log("Passed spring tokens: literals ignore overrides; opt-in consumes thirteen properties, including the rail half-duration and the FAB delay scale.");
