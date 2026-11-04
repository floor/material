#!/usr/bin/env bun
// scripts/check-base-lite.ts
//
// The opt-in theme-only base, on a blank page in Chromium: it resolves the
// theme's roles, paints the body, follows the OS light/dark preference, keeps
// the selectable baseline copy and the global reduced-motion switch, and
// carries none of the reset, ripple or contrast rules. The measure: a page
// pays fewer gzip bytes for this sheet than for the full base.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { chromium } from "playwright";

const LITE = "dist/styles/base-lite.css";
assert(existsSync(LITE), `${LITE} is missing: the build emits no base-lite stylesheet`);
const css = readFileSync(LITE, "utf8");
const base = readFileSync("dist/styles/base.css", "utf8");
const gzip = (text: string) => gzipSync(text, { level: 9 }).length;
const saving = gzip(base) - gzip(css);
console.log(`base ${Buffer.byteLength(base)} B raw / ${gzip(base)} gzip; ` +
  `base-lite ${Buffer.byteLength(css)} B raw / ${gzip(css)} gzip; saves ${saving} gzip`);
assert(saving > 0, "base-lite is not lighter than base");

// Same banner and cascade order as every material/styles asset, and the rules
// in the base layer rather than a layer of their own.
assert.equal(css.split("\n")[1], base.split("\n")[1], "base-lite declares a different cascade order");
assert(css.split("\n")[1]!.startsWith("@layer "), "base-lite has no layer-order prelude");
assert(css.includes("@layer mtrl.base{"), "base-lite does not emit into mtrl.base");
assert(!css.includes("@layer mtrl.base-lite{"), "base-lite opened a layer of its own");

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "no-preference" });
  await page.setContent(`<!doctype html>
<html><head><style>${css}</style></head>
<body>
  <div id="light"></div>
  <div id="dark" class="dark-theme"><div id="dark-value"></div></div>
  <div id="selectable" data-theme="baseline" data-theme-mode="light"><div id="selectable-value"></div></div>
  <div id="motion" style="animation: base-lite-check 1s linear infinite; transition: transform 1s"></div>
</body></html>`);

  // A probe resolves a role through the cascade; the body must paint with it.
  const role = (id: string, name: string) => page.locator(`#${id}`).evaluate((el, name) => {
    (el as HTMLElement).style.backgroundColor = `var(${name})`;
    return getComputedStyle(el).backgroundColor;
  }, name);
  const bodyStyle = () => page.evaluate(() => {
    const style = getComputedStyle(document.body);
    return { background: style.backgroundColor, color: style.color };
  });

  const surface = "--mtrl-sys-color-surface";
  const onSurface = "--mtrl-sys-color-on-surface";
  const lightSurface = await role("light", surface);
  const lightOnSurface = await role("light", onSurface);
  assert.equal((await bodyStyle()).background, lightSurface, "body does not paint the surface role (light)");
  assert.equal((await bodyStyle()).color, lightOnSurface, "body text does not use the on-surface role (light)");

  await page.emulateMedia({ colorScheme: "dark" });
  const darkSurface = await role("light", surface);
  const darkOnSurface = await role("light", onSurface);
  assert.notEqual(darkSurface, lightSurface, "the OS dark preference does not change the roles");
  assert.equal((await bodyStyle()).background, darkSurface, "body does not paint the surface role (dark)");
  assert.equal((await bodyStyle()).color, darkOnSurface, "body text does not use the on-surface role (dark)");

  // Both dark scopes stay selectable: .dark-theme and [data-theme=baseline].
  await page.emulateMedia({ colorScheme: "light" });
  assert.equal(await role("dark-value", surface), darkSurface, ".dark-theme does not select the dark roles");
  assert.equal(await role("selectable-value", surface), lightSurface, "[data-theme=baseline] light mode lost its roles");
  await page.locator("#selectable").evaluate(el => el.setAttribute("data-theme-mode", "dark"));
  assert.equal(await role("selectable-value", surface), darkSurface, "[data-theme=baseline] dark mode lost its roles");

  // The global switch: movement stops, fades stay, and it is media-gated.
  const motion = () => page.locator("#motion").evaluate(el => {
    const style = getComputedStyle(el);
    return {
      duration: style.animationDuration,
      iterations: style.animationIterationCount,
      transition: style.transitionProperty,
    };
  });
  const unrestricted = await motion();
  assert.equal(unrestricted.duration, "1s", "the reduced-motion switch is always on");
  assert.equal(unrestricted.transition, "transform", "the reduced-motion switch is always on");
  await page.emulateMedia({ reducedMotion: "reduce" });
  const reduced = await motion();
  assert(parseFloat(reduced.duration) <= 0.0001, `prefers-reduced-motion does not stop animations (${reduced.duration})`);
  assert.equal(reduced.iterations, "1", "prefers-reduced-motion does not stop repeated animations");
  assert(reduced.transition.split(",").map(part => part.trim()).includes("opacity"),
    "prefers-reduced-motion does not keep the fading properties");
  assert(!reduced.transition.includes("transform"), "prefers-reduced-motion still transitions movement");

  // The dropped groups are really absent from the shipped sheet.
  const census = await page.evaluate(() => {
    let contrast = 0;
    let ripple = 0;
    let dataRipple = 0;
    let boxSizing = 0;
    let smooth = 0;
    const walk = (rules: CSSRuleList): void => {
      for (const rule of rules) {
        if (rule instanceof CSSMediaRule && rule.conditionText.includes("prefers-contrast")) contrast++;
        if (rule instanceof CSSStyleRule) {
          if (rule.selectorText.includes(".mtrl-ripple")) ripple++;
          if (rule.selectorText.includes("[data-ripple]")) dataRipple++;
          if (rule.style.cssText.includes("box-sizing")) boxSizing++;
          if (rule.style.cssText.includes("scroll-behavior: smooth")) smooth++;
        }
        if ("cssRules" in rule) walk((rule as CSSGroupingRule).cssRules);
      }
    };
    for (const sheet of document.styleSheets) walk(sheet.cssRules);
    return { contrast, ripple, dataRipple, boxSizing, smooth };
  });
  assert.deepEqual(census, { contrast: 0, ripple: 0, dataRipple: 0, boxSizing: 0, smooth: 0 },
    `base-lite carries a group it promises to drop: ${JSON.stringify(census)}`);
  console.log("base-lite: roles, body theme, dark scopes, the reduced-motion switch; no reset, ripple or contrast rules");
} finally {
  await browser.close();
}
