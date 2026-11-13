#!/usr/bin/env bun
/**
 * Rows for the opt-in spring tokens (feat/spring-tokens-opt-in).
 *
 * Computed transition-duration, off and on, including an ancestor override.
 * Web Animations longhands Chromium emits for a transition that actually
 * runs: switch width, four border corner longhands (not the border-radius
 * shorthand), an unthemed checkbox that paints nothing, and a themed
 * checkbox whose colour endpoints differ. The menu probe is a middle item
 * whose four corners start equal and finish distinct.
 * The rail midpoint and the FAB icon delay are Sass numbers when the flag
 * is off, and the calc() forms when it is on. The browser reads the used time.
 * Reduced motion keeps the existing component and global rules. A long
 * override does not restore spatial motion, and nothing sets the spring
 * custom properties to 0ms.
 *
 * Run from the worktree root: bun scripts/check-spring-tokens.ts
 */
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { access, readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium, type Page } from "playwright";
import * as sass from "sass";
import { hostStyleText } from "../src/elements/define";
import { elements } from "../src/elements/index";
import { registerStyles } from "../src/elements/styles";
import { renderElement } from "../src/ssr/index";
import { createPackageFixture } from "./package-fixture";
import { componentStyles, resolveStyleDependencies } from "./style-manifest";

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

const RADIUS = [
  "border-top-left-radius",
  "border-top-right-radius",
  "border-bottom-right-radius",
  "border-bottom-left-radius",
] as const;

// Spatial properties the existing reduced-motion rules take off a transition.
const SPATIAL = [
  "width",
  "height",
  "inline-size",
  "block-size",
  "border-radius",
  "inset",
  "inset-block-start",
  "inset-inline-start",
  "transform",
  "top",
  "left",
  "right",
];

const SHEETS = [
  "components/button",
  "components/checkbox",
  "components/fab-menu",
  "components/menu",
  "components/navigation-rail",
  "components/switch",
].map(sheet => `@use "${sheet}";`).join("\n");

const OFF_SOURCE = `${SHEETS}\n@use "abstract/mixins" as mixins;\n@include mixins.global-reduced-motion;\n`;
const ON_SOURCE = `@use "config" with ($spring-tokens: true);\n@use "motion" as motion;\n${SHEETS}\n@use "abstract/mixins" as mixins;\n.tokens { @include motion.spring-tokens; }\n@include mixins.global-reduced-motion;\n`;

const RAIL_MIDPOINT = "calc(var(--mtrl-sys-motion-spring-default-spatial-duration, 450ms) / 2)";
const FAB_DELAY = "calc(var(--mtrl-sys-motion-spring-fast-spatial-duration, 425ms) * (48 / 425))";

const compile = (source: string): string => sass.compileString(source, OPTIONS).css;
const flat = (css: string): string => css.replace(/\s+/g, " ");
const compileError = (source: string): string => {
  try {
    compile(source);
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  return "";
};

function declarations(css: string): Map<string, string> {
  const found = new Map<string, string>();
  for (const match of css.matchAll(/(--mtrl-sys-motion-spring-[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    found.set(match[1], match[2].trim());
  }
  return found;
}

function mediaBlocks(css: string, query: string): string[] {
  const blocks: string[] = [];
  let from = 0;
  while (from < css.length) {
    const start = css.indexOf(query, from);
    if (start < 0) break;
    const open = css.indexOf("{", start);
    let depth = 0;
    let end = open;
    for (; end < css.length; end += 1) {
      if (css[end] === "{") depth += 1;
      else if (css[end] === "}") {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    blocks.push(css.slice(open, end + 1));
    from = end + 1;
  }
  return blocks;
}

function assertSheets(): { off: string; on: string } {
  const omitted = compile(OFF_SOURCE);
  const explicitFalse = compile(`@use "config" with ($spring-tokens: false);\n${OFF_SOURCE}`);
  assert.equal(explicitFalse, omitted, "$spring-tokens: false changed the literal CSS");
  assert.equal(declarations(omitted).size, 0, "off emitted a spring property");
  assert.doesNotMatch(omitted, /var\(--mtrl-sys-motion-spring-/);
  assert.match(flat(omitted), /visibility 0s linear 48ms/);
  assert.match(flat(omitted), /0s linear 225ms/);
  assert.doesNotMatch(omitted, /48 \/ 425/);
  assert.doesNotMatch(omitted, new RegExp(escapeRegExp(RAIL_MIDPOINT)));

  const on = compile(ON_SOURCE);
  const emitted = declarations(on);
  assert.equal(emitted.size, 13, `expected 13 spring properties, got ${[...emitted.keys()].join(" ")}`);
  for (const [name, value] of emitted) {
    assert.doesNotMatch(value, /var\(/, `${name} reads itself`);
    assert.notEqual(value, "0ms", `${name} was reset`);
    assert.notEqual(value, "0s", name);
  }
  for (const [role, duration] of Object.entries(DURATIONS)) {
    assert.equal(emitted.get(`--mtrl-sys-motion-spring-${role}-duration`), duration, role);
  }
  assert.match(emitted.get("--mtrl-sys-motion-spring-fast-spatial-easing") ?? "", /1\.094/);
  assert.doesNotMatch(emitted.get("--mtrl-sys-motion-spring-fast-spatial-clamped-easing") ?? "", /1\.094/);
  assert.match(flat(on), new RegExp(escapeRegExp(RAIL_MIDPOINT)));
  assert.match(flat(on), new RegExp(`visibility 0s linear ${escapeRegExp(FAB_DELAY)}`));
  assert.match(on, /var\(--mtrl-fab-menu-exit, 0ms\)/);
  assert.doesNotMatch(on, /visibility 0s linear 48ms/);

  for (const [label, css] of [["off", omitted], ["on", on]] as const) {
    const blocks = mediaBlocks(css, "prefers-reduced-motion");
    assert.ok(blocks.length > 0, `${label} dropped prefers-reduced-motion`);
    const reduced = blocks.join("\n");
    assert.match(reduced, /transition:\s*none/, `${label} rail no longer suppresses motion`);
    assert.doesNotMatch(
      reduced,
      /--mtrl-sys-motion-spring-[a-z0-9-]+\s*:/,
      `${label} reduced motion resets a spring custom property`,
    );
  }

  // Loading the definitions module alone emits nothing; including the mixin
  // without the flag fails on the first load.
  assert.equal(compile(`@use "motion";`).trim(), "", "loading motion emitted CSS");
  const bare = compileError(`@use "motion" as motion;\n:root { @include motion.spring-tokens; }`);
  assert.match(bare, /spring-token/);
  const late = compileError(`@use "components/switch";\n@use "config" with ($spring-tokens: true);`);
  assert.match(late, /already loaded|configured/i);
  const bad = compileError(`@use "config" with ($spring-tokens: "yes");`);
  assert.match(bad, /must be a boolean \(true or false\)/);

  // The gateway loads the tag prefix and the flag together. Element
  // pre-upgrade CSS is byte-identical when both are set on the first `with`.
  const elementsOff = compile(`@use "elements" with ($tag-prefix: "x");`);
  const elementsOn = compile(`@use "config" with ($spring-tokens: true, $tag-prefix: "x");\n@use "elements";`);
  assert.equal(elementsOn, elementsOff, "spring tokens changed pre-upgrade CSS");
  assert.match(elementsOff, /x-button:not\(:defined\)/);
  assert.doesNotMatch(elementsOff, /--mtrl-sys-motion-spring/);
  for (const entry of ["base/tokens", "base/reset", "main"]) {
    assert.doesNotMatch(compile(`@use "${entry}";`), /--mtrl-sys-motion-spring/, `${entry} gained a spring property`);
  }
  return { off: omitted, on };
}

type Row = { property: string; duration: string; delay: string };
type Anim = { property: string; duration: number; easing: string };

function ms(value: string): number {
  const n = Number.parseFloat(value);
  return value.trim().endsWith("ms") ? n : n * 1000;
}

function near(value: string, expected: number, label: string): void {
  assert.ok(Math.abs(ms(value) - expected) < 1, `${label}: ${value} is not ${expected}ms`);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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
      duration: durations[index] ?? durations[durations.length - 1] ?? "",
      delay: delays[index] ?? delays[delays.length - 1] ?? "",
    }));
  }, selector);
}

function row(rows: Row[], name: string, label: string): Row {
  const found = rows.find(item => item.property === name);
  if (found === undefined) throw new Error(`${label} has no ${name} in ${JSON.stringify(rows)}`);
  return found;
}

const PAGE = (css: string): string => `<!doctype html><html><head><style id="components">${css}</style>
<style>
  #scope {
    --mtrl-sys-motion-spring-fast-spatial-duration: 850ms;
    --mtrl-sys-motion-spring-fast-spatial-easing: ease-in;
    --mtrl-sys-motion-spring-fast-effects-duration: 120ms;
    --mtrl-sys-motion-spring-fast-effects-easing: linear;
    --mtrl-sys-motion-spring-default-spatial-duration: 200ms;
    --mtrl-sys-motion-spring-default-effects-duration: 90ms;
    --mtrl-sys-motion-spring-fast-spatial-clamped-easing: step-end;
  }
  #themed {
    --mtrl-sys-color-primary: #123456;
    --mtrl-sys-color-on-surface-variant: #654321;
  }
</style></head><body>
  <div class="tokens"></div>
  <div id="scope">
    <div id="switch" class="mtrl-switch"><div class="mtrl-switch__thumb"></div></div>
    <div id="themed">
      <label class="mtrl-checkbox"><input id="themed-checkbox" class="mtrl-checkbox__input" type="checkbox"><span id="themed-icon" class="mtrl-checkbox__icon"></span></label>
      <label class="mtrl-checkbox"><input id="reduced-checkbox" class="mtrl-checkbox__input" type="checkbox"><span id="reduced-icon" class="mtrl-checkbox__icon"></span></label>
    </div>
    <button id="quiet-button" class="mtrl-button" type="button">Go</button>
    <div class="mtrl-menu mtrl-menu--vertical">
      <div class="mtrl-menu__item">First</div>
      <div id="menu-item" class="mtrl-menu__item">Middle</div>
      <div class="mtrl-menu__item">Last</div>
    </div>
    <div id="rail" class="mtrl-navigation-rail">
      <div id="rail-label" class="mtrl-navigation-rail__label">Label</div>
      <div id="rail-icon" class="mtrl-navigation-rail__icon"></div>
    </div>
    <div class="mtrl-fab mtrl-fab-menu__fab"><span id="fab-icon" class="mtrl-fab__icon"></span></div>
  </div>
  <label class="mtrl-checkbox"><input id="checkbox" class="mtrl-checkbox__input" type="checkbox"><span id="plain-icon" class="mtrl-checkbox__icon"></span></label>
  <button id="plain-button" class="mtrl-button" type="button">Plain</button>
</body></html>`;

function springEasing(easing: string, mode: "off" | "on"): void {
  if (mode === "on") {
    assert.match(easing, /ease-in|cubic-bezier\(0\.42,\s*0,\s*1,\s*1\)/, easing);
    return;
  }
  assert.match(easing, /linear\(/, easing);
}

function effectsEasing(easing: string, mode: "off" | "on"): void {
  if (mode === "on") {
    assert.ok(easing === "linear" || easing === "cubic-bezier(0, 0, 1, 1)", easing);
    return;
  }
  assert.match(easing, /linear\(/, easing);
}

async function corners(page: Page, selector: string, radius: string, mode: "off" | "on", expected: number, middle: boolean): Promise<void> {
  const targets = radius.split(" ");
  const result = await page.evaluate(async probe => {
    const el = document.querySelector(probe.selector);
    if (!(el instanceof HTMLElement)) return { before: [], anims: [], after: [], first: false, last: false };
    await new Promise<void>(resolve => { requestAnimationFrame(() => requestAnimationFrame(() => resolve())); });
    const read = () => probe.names.map(name => getComputedStyle(el).getPropertyValue(name).trim());
    const before = read();
    const first = el.matches(":first-child");
    const last = el.matches(":last-child");
    void el.offsetWidth;
    el.style.borderRadius = probe.radius;
    const snapshot = () => el.getAnimations().map(animation => {
      const timing = animation.effect?.getComputedTiming();
      return {
        property: "transitionProperty" in animation ? String(animation.transitionProperty) : "",
        duration: typeof timing?.duration === "number" ? timing.duration : -1,
        easing: String(timing?.easing ?? ""),
      };
    });
    let anims = snapshot();
    const started = performance.now();
    while (performance.now() - started < 1000) {
      if (anims.some(item => item.duration > 0)) break;
      await new Promise<void>(resolve => { requestAnimationFrame(() => resolve()); });
      anims = snapshot();
    }
    await Promise.all(el.getAnimations().map(animation => animation.finished));
    return { before, anims, after: read(), first, last };
  }, { selector, radius, names: [...RADIUS] });

  if (middle) {
    assert.equal(result.first, false, `${mode} ${selector} is the first item, whose outer corners are already round`);
    assert.equal(result.last, false, `${mode} ${selector} is the last item, whose outer corners are already round`);
  }
  assert.equal(result.before.length, 4, `${mode} ${selector} did not report four corners`);
  assert.ok(result.before.every(value => value === result.before[0] && value.length > 0), `${mode} ${selector} corners did not start equal: ${JSON.stringify(result.before)}`);
  assert.equal(result.anims.some(item => item.property === "border-radius"), false, `${mode} ${selector} listed the border-radius shorthand: ${JSON.stringify(result.anims)}`);
  for (const [index, property] of RADIUS.entries()) {
    assert.notEqual(result.before[index], targets[index], `${mode} ${selector} ${property} was already ${targets[index]}`);
    const found = result.anims.filter(item => item.property === property);
    assert.equal(found.length, 1, `${mode} ${selector} ${property}: ${JSON.stringify(result.anims)}`);
    const match = found[0];
    assert.ok(match, `${mode} ${selector} ${property} is missing`);
    assert.ok(Math.abs(match.duration - expected) < 1, `${mode} ${selector} ${property} ran ${match.duration}ms`);
    springEasing(match.easing, mode);
    assert.equal(result.after[index], targets[index], `${mode} ${selector} ${property} finished at ${result.after[index]}`);
  }
  assert.equal(new Set(result.after).size, 4, `${mode} ${selector} corners finished equal`);
}

async function themedColor(page: Page, mode: "off" | "on", expected: number): Promise<void> {
  const result = await page.evaluate(async () => {
    const input = document.querySelector("#themed-checkbox");
    const icon = document.querySelector("#themed-icon");
    if (!(input instanceof HTMLInputElement) || !(icon instanceof HTMLElement)) return null;
    await new Promise<void>(resolve => { requestAnimationFrame(() => requestAnimationFrame(() => resolve())); });
    const before = getComputedStyle(icon).backgroundColor;
    void icon.offsetWidth;
    input.checked = true;
    const snapshot = () => icon.getAnimations().map(animation => {
      const timing = animation.effect?.getComputedTiming();
      return {
        property: "transitionProperty" in animation ? String(animation.transitionProperty) : "",
        duration: typeof timing?.duration === "number" ? timing.duration : -1,
        easing: String(timing?.easing ?? ""),
        current: typeof animation.currentTime === "number" ? animation.currentTime : -1,
      };
    });
    let anims = snapshot();
    const started = performance.now();
    while (performance.now() - started < 1000) {
      if (anims.some(item => item.property === "background-color" && item.current > 0)) break;
      await new Promise<void>(resolve => { requestAnimationFrame(() => resolve()); });
      anims = snapshot();
    }
    await Promise.all(icon.getAnimations().map(animation => animation.finished));
    return { before, after: getComputedStyle(icon).backgroundColor, anims };
  });
  if (result === null) throw new Error(`${mode} themed checkbox is missing`);
  assert.notEqual(result.before, result.after, `${mode} themed checkbox colour did not change`);
  assert.equal(result.after, "rgb(18, 52, 86)", `${mode} themed checkbox finished at ${result.after}`);
  // Chromium reports border-color as its four side longhands, like the radius;
  // the shorthand is never in the animation list.
  const SIDES = ["border-bottom-color", "border-left-color", "border-right-color", "border-top-color"];
  for (const property of ["background-color", ...SIDES]) {
    const found = result.anims.find(item => item.property === property);
    if (found === undefined) throw new Error(`${mode} themed checkbox did not animate ${property}: ${JSON.stringify(result.anims)}`);
    assert.ok(Math.abs(found.duration - expected) < 1, `${mode} ${property} ran ${found.duration}ms`);
    effectsEasing(found.easing, mode);
  }
}

async function unthemedColor(page: Page, mode: "off" | "on"): Promise<void> {
  const anims = await page.evaluate(async () => {
    const input = document.querySelector("#checkbox");
    const icon = document.querySelector("#plain-icon");
    if (!(input instanceof HTMLInputElement) || !(icon instanceof HTMLElement)) return [];
    await new Promise<void>(resolve => { requestAnimationFrame(() => requestAnimationFrame(() => resolve())); });
    void icon.offsetWidth;
    input.checked = true;
    await new Promise<void>(resolve => { requestAnimationFrame(() => requestAnimationFrame(() => resolve())); });
    await new Promise<void>(resolve => { requestAnimationFrame(() => resolve()); });
    return icon.getAnimations().map(animation => (
      "transitionProperty" in animation ? String(animation.transitionProperty) : ""
    ));
  });
  assert.equal(anims.includes("background-color"), false, `${mode} unthemed checkbox animated background-color: ${JSON.stringify(anims)}`);
}

async function switchWidth(page: Page, mode: "off" | "on", expected: number): Promise<void> {
  const anims: Anim[] = await page.evaluate(async () => {
    const host = document.querySelector("#switch");
    const thumb = document.querySelector("#switch .mtrl-switch__thumb");
    if (!(host instanceof HTMLElement) || !(thumb instanceof HTMLElement)) return [];
    await new Promise<void>(resolve => { requestAnimationFrame(() => requestAnimationFrame(() => resolve())); });
    void thumb.offsetWidth;
    host.classList.add("mtrl-switch--checked");
    await new Promise<void>(resolve => { requestAnimationFrame(() => requestAnimationFrame(() => resolve())); });
    const started = performance.now();
    while (performance.now() - started < 1000) {
      const live = thumb.getAnimations();
      if (live.some(animation => animation.playState === "running" && typeof animation.currentTime === "number" && animation.currentTime > 0)) break;
      await new Promise<void>(resolve => { requestAnimationFrame(() => resolve()); });
    }
    return thumb.getAnimations().map(animation => {
      const timing = animation.effect?.getComputedTiming();
      return {
        property: "transitionProperty" in animation ? String(animation.transitionProperty) : "",
        duration: typeof timing?.duration === "number" ? timing.duration : -1,
        easing: String(timing?.easing ?? ""),
      };
    });
  });
  const width = anims.find(item => item.property === "width");
  if (width === undefined) throw new Error(`${mode} switch did not animate width: ${JSON.stringify(anims)}`);
  assert.ok(Math.abs(width.duration - expected) < 1, `${mode} switch width ran ${width.duration}ms`);
  springEasing(width.easing, mode);
}

function assertSpatialGone(rows: Row[], label: string): void {
  const present = new Set(rows.map(item => item.property));
  for (const name of SPATIAL) {
    assert.equal(present.has(name), false, `${label} still transitions ${name}: ${JSON.stringify(rows)}`);
  }
}

async function assertReduced(page: Page, mode: "off" | "on"): Promise<void> {
  await page.locator("#scope").evaluate(el => {
    el.style.setProperty("--mtrl-sys-motion-spring-fast-spatial-duration", "850ms");
    el.style.setProperty("--mtrl-sys-motion-spring-default-spatial-duration", "900ms");
    el.style.setProperty("--mtrl-sys-motion-spring-fast-effects-duration", "900ms");
    el.style.setProperty("--mtrl-sys-motion-spring-fast-effects-easing", "linear");
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(async () => {
    await new Promise<void>(resolve => { requestAnimationFrame(() => requestAnimationFrame(() => resolve())); });
  });

  const token = await page.locator(".tokens").evaluate(el => getComputedStyle(el).getPropertyValue("--mtrl-sys-motion-spring-fast-spatial-duration").trim());
  const override = await page.locator("#scope").evaluate(el => getComputedStyle(el).getPropertyValue("--mtrl-sys-motion-spring-default-spatial-duration").trim());
  if (mode === "on") {
    assert.equal(token, "425ms", `reduced motion reset the emitted duration to ${token}`);
    assert.notEqual(token, "0ms");
    assert.notEqual(token, "0s");
  } else {
    assert.equal(token, "", "off emitted a spring duration under reduced motion");
  }
  assert.equal(override, "900ms", "the long override was cleared");

  const rail = await readRows(page, "#rail");
  const label = await readRows(page, "#rail-label");
  const icon = await readRows(page, "#rail-icon");
  const thumb = await readRows(page, "#switch .mtrl-switch__thumb");
  for (const [name, rows] of [
    ["rail", rail],
    ["rail label", label],
    ["rail icon", icon],
    ["switch", thumb],
  ] as const) {
    assertSpatialGone(rows, `${mode} reduced ${name}`);
    for (const item of rows) near(item.duration, 0, `${mode} reduced ${name} ${item.property}`);
  }
  // The global rule drops shape and position. It does not zero a duration the
  // component sheet still declares, and it does not zero the spring tokens.
  for (const [name, selector] of [
    ["button", "#quiet-button"],
    ["menu", "#menu-item"],
  ] as const) {
    assertSpatialGone(await readRows(page, selector), `${mode} reduced ${name}`);
  }

  const fab = await readRows(page, ".mtrl-fab.mtrl-fab-menu__fab");
  assertSpatialGone(fab, `${mode} reduced fab`);
  assert.ok(fab.some(item => item.property === "background-color"), `${mode} reduced fab dropped its colour transition`);
  for (const item of fab) {
    if (item.property === "background-color" || item.property === "color") {
      near(item.duration, mode === "on" ? 900 : 175, `${mode} reduced fab ${item.property}`);
    }
  }
  const fabIcon = await readRows(page, "#fab-icon");
  near(row(fabIcon, "visibility", `${mode} reduced fab icon`).delay, mode === "on" ? 96 : 48, `${mode} reduced fab delay`);

  const started = await page.evaluate(async () => {
    const railEl = document.querySelector("#rail");
    const thumbEl = document.querySelector("#switch .mtrl-switch__thumb");
    if (!(railEl instanceof HTMLElement) || !(thumbEl instanceof HTMLElement)) return { rail: ["missing"], width: ["missing"] };
    void railEl.offsetWidth;
    railEl.classList.add("mtrl-navigation-rail--expanded");
    thumbEl.style.width = "40px";
    await new Promise<void>(resolve => { requestAnimationFrame(() => requestAnimationFrame(() => resolve())); });
    return {
      rail: railEl.getAnimations().map(animation => (
        "transitionProperty" in animation ? String(animation.transitionProperty) : ""
      )),
      width: thumbEl.getAnimations().map(animation => (
        "transitionProperty" in animation ? String(animation.transitionProperty) : ""
      )),
    };
  });
  assert.equal(started.rail.includes("inline-size"), false, `${mode} reduced rail animated inline-size: ${JSON.stringify(started.rail)}`);
  assert.equal(started.width.includes("width"), false, `${mode} reduced switch animated width: ${JSON.stringify(started.width)}`);

  // The checkbox's own reduced-motion rule takes every icon transition off,
  // paint included; that suppression is the component's existing policy.
  const suppressed = await page.evaluate(async () => {
    const input = document.querySelector("#reduced-checkbox");
    const icon = document.querySelector("#reduced-icon");
    if (!(input instanceof HTMLInputElement) || !(icon instanceof HTMLElement)) return ["missing"];
    void icon.offsetWidth;
    input.checked = true;
    await new Promise<void>(resolve => { requestAnimationFrame(() => requestAnimationFrame(() => resolve())); });
    return icon.getAnimations().map(animation => (
      "transitionProperty" in animation ? String(animation.transitionProperty) : ""
    ));
  });
  assert.equal(suppressed.includes("background-color"), false, `${mode} reduced checkbox kept a colour transition: ${JSON.stringify(suppressed)}`);

  // The FAB is the consumer whose own reduced-motion rule keeps its effects
  // springs, so a colour change still runs, at the overridden duration.
  const fabColour = await page.evaluate(async () => {
    const fab = document.querySelector(".mtrl-fab.mtrl-fab-menu__fab");
    if (!(fab instanceof HTMLElement)) return [];
    await new Promise<void>(resolve => { requestAnimationFrame(() => requestAnimationFrame(() => resolve())); });
    void fab.offsetWidth;
    fab.style.backgroundColor = "rgb(10, 20, 30)";
    await new Promise<void>(resolve => { requestAnimationFrame(() => requestAnimationFrame(() => resolve())); });
    await Promise.all(fab.getAnimations().map(animation => animation.finished));
    fab.style.backgroundColor = "rgb(200, 30, 40)";
    const startedAt = performance.now();
    while (performance.now() - startedAt < 1000) {
      const background = fab.getAnimations().find(animation => (
        "transitionProperty" in animation && animation.transitionProperty === "background-color"
      ));
      if (background && typeof background.currentTime === "number" && background.currentTime > 0) {
        const timing = background.effect?.getComputedTiming();
        return [typeof timing?.duration === "number" ? timing.duration : -1];
      }
      await new Promise<void>(resolve => { requestAnimationFrame(() => resolve()); });
    }
    return [];
  });
  const colorDuration = mode === "on" ? 900 : 175;
  assert.equal(fabColour.length, 1, `${mode} reduced FAB dropped its colour transition: ${JSON.stringify(fabColour)}`);
  assert.ok(Math.abs((fabColour[0] as number) - colorDuration) < 1, `${mode} reduced FAB colour ran ${fabColour[0]}ms`);
}

async function assertPage(page: Page, mode: "off" | "on"): Promise<void> {
  const spatial = mode === "on" ? 850 : 425;
  const effects = mode === "on" ? 120 : 175;
  const railDuration = mode === "on" ? 200 : 450;
  const buttonColor = mode === "on" ? 90 : 250;
  const quietButton = await readRows(page, "#quiet-button");
  const plainButton = await readRows(page, "#plain-button");
  const thumb = await readRows(page, "#switch .mtrl-switch__thumb");
  const plainIcon = await readRows(page, "#plain-icon");
  const themedIcon = await readRows(page, "#themed-icon");
  const menu = await readRows(page, "#menu-item");
  const label = await readRows(page, "#rail-label");
  const railIcon = await readRows(page, "#rail-icon");
  const fabIcon = await readRows(page, "#fab-icon");

  near(row(quietButton, "border-radius", `${mode} quiet button`).duration, spatial, `${mode} quiet button radius`);
  near(row(quietButton, "background-color", `${mode} quiet button`).duration, buttonColor, `${mode} quiet button color`);
  near(row(plainButton, "border-radius", `${mode} plain button`).duration, 425, `${mode} plain button`);
  near(row(thumb, "width", `${mode} switch`).duration, spatial, `${mode} switch width`);
  near(row(thumb, "background-color", `${mode} switch`).duration, effects, `${mode} switch color`);
  near(row(plainIcon, "background-color", `${mode} checkbox`).duration, 175, `${mode} unthemed checkbox`);
  near(row(themedIcon, "background-color", `${mode} themed checkbox`).duration, effects, `${mode} themed checkbox`);
  near(row(menu, "border-radius", `${mode} menu`).duration, spatial, `${mode} menu radius`);
  near(row(menu, "background-color", `${mode} menu`).duration, 100, `${mode} menu color`);
  assert.ok(label.length > 0, `${mode} rail label has no transition`);
  for (const item of label) {
    near(item.duration, 0, `${mode} rail ${item.property} duration`);
    near(item.delay, railDuration / 2, `${mode} rail ${item.property} delay`);
  }
  near(row(railIcon, "inset-block-start", `${mode} rail icon`).duration, railDuration, `${mode} rail icon`);
  near(row(railIcon, "inset-block-start", `${mode} rail icon`).delay, 0, `${mode} rail icon delay`);
  near(row(fabIcon, "visibility", `${mode} fab icon`).delay, mode === "on" ? 96 : 48, `${mode} fab delay`);
  near(row(fabIcon, "visibility", `${mode} fab icon`).duration, 0, `${mode} fab duration`);

  await switchWidth(page, mode, spatial);
  await unthemedColor(page, mode);
  await themedColor(page, mode, effects);
  // Middle item. A first or last item already has 12px outer corners, so a
  // probe aimed at that radius would not start a transition on those corners.
  await corners(page, "#menu-item", "18px 22px 26px 30px", mode, spatial, true);
  await corners(page, "#quiet-button", "8px 14px 28px 36px", mode, spatial, false);

  await page.locator("#scope").evaluate(el => {
    el.style.setProperty("--mtrl-sys-motion-spring-fast-spatial-duration", "100ms");
  });
  const changed = await readRows(page, "#quiet-button");
  const sibling = await readRows(page, "#plain-button");
  near(row(changed, "border-radius", "changed button").duration, mode === "on" ? 100 : 425, "dynamic quiet button");
  near(row(sibling, "border-radius", "sibling button").duration, 425, "dynamic sibling");

  await assertReduced(page, mode);
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
  } finally {
    await browser.close();
  }
}

// ---------------------------------------------------------------------------
// Inventory: the flag is read only through the accessor, the runtime never
// learns about the tokens, and the JS deadlines stay literal.
// ---------------------------------------------------------------------------

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

async function assertInventory(): Promise<void> {
  assert.equal(CONSUMERS.length, 20);
  for (const file of CONSUMERS) {
    const text = await readFile(file, "utf8");
    assert.doesNotMatch(text, /spring-slow-spatial/, `${file} is not a slow-spatial consumer`);
    assert.doesNotMatch(text, /math\.\w+\(\s*v\.motion\(/, `${file} does arithmetic on a motion value`);
  }
  const rawMap = new Set([
    "src/styles/abstract/_variables.scss",
    "src/styles/motion.scss",
  ]);
  for (const file of await walk("src/styles", ".scss")) {
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
  const deadlines: [string, RegExp][] = [
    ["src/components/navigation-rail/navigation-rail.ts", /SWITCH_DURATION = 450/],
    ["src/components/slider/features/controller.ts", /const SETTLE_MS = 450/],
    ["src/components/snackbar/constants.ts", /ANIMATION_DURATION: 425/],
    ["src/components/fab-menu/constants.ts", /FAB_MENU_ITEM_EXIT = 425/],
  ];
  for (const [file, pattern] of deadlines) assert.match(await readFile(file, "utf8"), pattern, `${file} moved its literal deadline`);
  const gateway = await readFile("src/styles/_config.scss", "utf8");
  assert.match(gateway, /@forward 'abstract\/emit' show \$typescale-tokens, \$spring-tokens, \$direction-arms;/);
  assert.match(await readFile("src/styles/abstract/_variables.scss", "utf8"), /emit\.\$spring-tokens/);
  assert.match(await readFile("src/styles/motion.scss", "utf8"), /emit\.\$spring-tokens/);
  await assert.rejects(access("src/styles/config.scss"), "config.scss collides with the gateway partial");
  await assert.rejects(access("src/styles/abstract/_settings.scss"), "the flag lives on abstract/emit");
  console.log("inventory: 20 consumers through the accessor; runtime and the four JS deadlines unchanged");
}

// ---------------------------------------------------------------------------
// Real registered elements: inheritance, descendant override and the literal
// fallback inside a shadow root, through adopted sheets and the <style> path.
// ---------------------------------------------------------------------------

const springCompile = (sheet: string): string =>
  compile(`@use "config" with ($spring-tokens: true);\n@use "${sheet}";`);

const STYLE_NAMES = resolveStyleDependencies(["button"]);
const REGISTRY: Record<string, string> = {
  ripple: springCompile("utilities/ripple"),
  ...Object.fromEntries(STYLE_NAMES.map(name => [name, springCompile(componentStyles[name]!.source)])),
};

async function elementBundle(): Promise<string> {
  const virtual = resolve("check-spring-elements.ts");
  const built = await Bun.build({
    entrypoints: ["check-spring-elements.ts"],
    target: "browser",
    format: "iife",
    plugins: [{
      name: "virtual-entry",
      setup(build) {
        build.onResolve({ filter: /^check-spring-elements\.ts$/ }, () => ({ path: virtual }));
        build.onLoad({ filter: /check-spring-elements\.ts$/ }, () => ({
          contents: `import { defineAll, registerStyles } from ${JSON.stringify(resolve("src/elements/index.ts"))};\n` +
            `registerStyles(${JSON.stringify(REGISTRY)});\ndefineAll();`,
          loader: "ts",
        }));
      },
    }],
  });
  assert(built.success, String(built.logs));
  return built.outputs[0]!.text();
}

const REAL_PAGE = `<!doctype html><html><head></head><body>
<div id="outer" style="--mtrl-sys-motion-spring-fast-spatial-duration: 900ms">
  <m-button id="inherit">Inherit</m-button>
  <div id="inner" style="--mtrl-sys-motion-spring-fast-spatial-duration: 300ms">
    <m-button id="override">Override</m-button>
  </div>
</div>
<m-button id="fallback">Fallback</m-button>
</body></html>`;

type ShadowRead = { duration: string; adopted: number; styles: number };

function readShadowButton(page: Page, id: string): Promise<ShadowRead | null> {
  return page.evaluate(hostId => {
    const host = document.getElementById(hostId);
    const root = host?.shadowRoot;
    if (!root) return null;
    const inner = root.querySelector("button");
    if (!(inner instanceof HTMLElement)) return null;
    const style = getComputedStyle(inner);
    const props = style.transitionProperty.split(",").map(item => item.trim());
    const durations = style.transitionDuration.split(",").map(item => item.trim());
    return {
      duration: durations[props.indexOf("border-radius")] ?? "",
      adopted: root.adoptedStyleSheets?.length ?? 0,
      styles: root.querySelectorAll("style").length,
    };
  }, id) as Promise<ShadowRead | null>;
}

async function assertElements(): Promise<void> {
  const bundle = await elementBundle();
  const browser = await chromium.launch({ headless: true });
  try {
    for (const fallback of [false, true]) {
      const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
      await page.setContent(REAL_PAGE);
      // No constructable stylesheets: applyStyles takes its <style> path.
      if (fallback) await page.addScriptTag({ content: 'Reflect.deleteProperty(CSSStyleSheet.prototype, "replaceSync");' });
      await page.addScriptTag({ content: bundle });
      await page.waitForFunction(() => Boolean(document.getElementById("inherit")?.shadowRoot));
      const mode = fallback ? "style fallback" : "adopted sheets";
      for (const [id, expected] of [["inherit", 900], ["override", 300], ["fallback", 425]] as const) {
        const read = await readShadowButton(page, id);
        assert(read, `${mode} ${id} did not upgrade`);
        near(read.duration, expected, `${mode} ${id}`);
        if (fallback) {
          assert.equal(read.adopted, 0, `${mode} ${id} adopted a sheet`);
          assert.ok(read.styles > 0, `${mode} ${id} has no <style> sheet`);
        } else {
          assert.ok(read.adopted > 0, `${mode} ${id} adopted no sheet`);
          assert.equal(read.styles, 0, `${mode} ${id} also inserted a <style>`);
        }
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }
  console.log("elements: ancestor 900ms, descendant 300ms and the 425ms fallback reach a registered shadow root");
}

// ---------------------------------------------------------------------------
// Linked SSR keeps whole sheets, so the opt-in transition survives the
// upgrade. Inline SSR still prunes selectors absent from the host; the
// slider's runtime settling selector is held as that documented limitation.
// ---------------------------------------------------------------------------

async function assertLinkedSsr(): Promise<void> {
  registerStyles(REGISTRY);
  const spec = elements.button.spec;
  const files: Record<string, string> = { "hosts/button.css": hostStyleText(spec) };
  for (const name of STYLE_NAMES) files[`${name}.css`] = REGISTRY[name]!;
  const linked = renderElement(
    "m-button",
    { id: "ssr-button", style: "--mtrl-sys-motion-spring-fast-spatial-duration: 700ms" },
    "Go",
    { styles: "link", cssBase: "/css" },
  );
  assert.match(linked, /<link rel="stylesheet" href="\/css\/hosts\/button\.css">/);
  assert.match(linked, /<link rel="stylesheet" href="\/css\/button\.css">/);
  registerStyles(Object.fromEntries(resolveStyleDependencies(["slider"]).map(name =>
    [name, springCompile(componentStyles[name]!.source)])));
  const inline = renderElement("m-slider", { value: "50" }, "");
  assert.doesNotMatch(inline, /--settling/, "inline SSR stopped pruning the settling selector; re-evaluate the held contract");

  const bundle = await elementBundle();
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch(request) {
      const path = new URL(request.url).pathname;
      if (path === "/elements.js") return new Response(bundle, { headers: { "Content-Type": "text/javascript" } });
      if (path.startsWith("/css/")) {
        const text = files[path.slice("/css/".length)];
        return new Response(text ?? "", { status: text === undefined ? 404 : 200, headers: { "Content-Type": "text/css" } });
      }
      return new Response(
        `<!doctype html><html><head></head><body>${linked}<script src="/elements.js"></script></body></html>`,
        { headers: { "Content-Type": "text/html" } },
      );
    },
  });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(server.url.href);
    await page.waitForFunction(() => Boolean(document.getElementById("ssr-button")?.shadowRoot));
    const read = await readShadowButton(page, "ssr-button");
    assert(read, "linked SSR did not upgrade");
    near(read.duration, 700, "linked SSR");
    assert.equal(read.styles, 0, "linked SSR inserted a <style>");
  } finally {
    await browser.close();
    server.stop(true);
  }
  console.log("linked SSR: the opt-in sheet is served as a link and the upgrade reads 700ms");
}

// ---------------------------------------------------------------------------
// The packed tarball ships the definition module and never a colliding
// config module. Runs where the build artifact exists (CI downloads dist).
// ---------------------------------------------------------------------------

async function assertPacked(): Promise<void> {
  const fixture = await createPackageFixture();
  try {
    const files = (fixture.pack.files as { path: string }[]).map(file => file.path);
    for (const path of ["src/styles/_config.scss", "src/styles/motion.scss"]) {
      assert.ok(files.includes(path), `${path} is not in the packed package`);
    }
    assert.equal(files.includes("src/styles/config.scss"), false, "config.scss collides with _config.scss");
    assert.equal(files.includes("src/styles/abstract/_settings.scss"), false);
    const loadPaths = [join(fixture.directory, "node_modules")];
    const packedCompile = (source: string): string => sass.compileString(source, { ...OPTIONS, loadPaths }).css;
    const packedOff = packedCompile(`@use "material/src/styles/components/switch";`);
    assert.equal(packedOff, compile(`@use "components/switch";`));
    assert.doesNotMatch(packedOff, /--mtrl-sys-motion-spring/);
    const on = `@use "config" with ($spring-tokens: true);\n@use "motion" as motion;\n@use "components/navigation-rail";\n@use "components/fab-menu";\n:root { @include motion.spring-tokens; }`;
    const packedOn = packedCompile(on.replaceAll('"config"', '"material/src/styles/config"')
      .replace('"motion"', '"material/src/styles/motion"')
      .replace('"components/navigation-rail"', '"material/src/styles/components/navigation-rail"')
      .replace('"components/fab-menu"', '"material/src/styles/components/fab-menu"'));
    assert.equal(packedOn, compile(on));
    assert.equal(declarations(packedOn).size, 13);
    assert.match(flat(packedOn), new RegExp(escapeRegExp(RAIL_MIDPOINT)));
    assert.match(flat(packedOn), new RegExp(escapeRegExp(FAB_DELAY)));
  } finally {
    await fixture.cleanup();
  }
  console.log("packed package: motion and the gateway ship, the opt-in compiles like the checkout");
}

const sheets = assertSheets();
await assertInventory();
await assertBrowser(sheets.off, sheets.on);
await assertElements();
await assertLinkedSsr();
if (existsSync("dist")) {
  await assertPacked();
} else if (process.env.CI) {
  throw new Error("dist is missing: the packed rows need the build artifact");
} else {
  console.log("packed rows skipped locally: no dist in this worktree (CI runs them)");
}
console.log("spring rows: computed durations, chromium longhands, rail/FAB derived values, real elements, linked SSR, reduced motion unchanged");
