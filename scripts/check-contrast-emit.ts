#!/usr/bin/env bun
// A blank-page browser check of the public Sass theme entry; no website or build needed.
import assert from "node:assert/strict";
import { gzipSync } from "node:zlib";
import { chromium } from "playwright";
import * as sass from "sass";

const stylesRoot = process.env.MATERIAL_SASS_ROOT ?? "src/styles";
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const measurements = new Map<string, { bytes: number; gzip: number; explicit: number; preference: number }>();
  for (const emit of ["all", "explicit", "preference", "none"] as const) {
    const css = sass.compileString(`@use "themes" with ($contrast-emit: ${emit});`, {
      loadPaths: [stylesRoot], style: "compressed", logger: sass.Logger.silent,
    }).css;
    await page.setContent(`<style>${css}</style><div data-theme="ocean"></div>`);
    const rules = await page.evaluate(() => {
      let explicit = 0;
      let preference = 0;
      const walk = (rules: CSSRuleList): void => {
        for (const rule of rules) {
          if (rule instanceof CSSStyleRule && /data-theme-contrast\s*=/.test(rule.selectorText)) explicit++;
          if (rule instanceof CSSMediaRule && rule.conditionText.includes("prefers-contrast")) preference++;
          if ("cssRules" in rule) walk((rule as CSSGroupingRule).cssRules);
        }
      };
      for (const sheet of document.styleSheets) walk(sheet.cssRules);
      return { explicit, preference };
    });
    const measured = { bytes: Buffer.byteLength(css), gzip: gzipSync(css, { level: 9 }).length, ...rules };
    measurements.set(emit, measured);
    console.log(`${emit}: ${JSON.stringify(measured)}`);
    assert.equal(rules.explicit > 0, emit === "all" || emit === "explicit", `${emit}: attribute selectors`);
    assert.equal(rules.preference > 0, emit === "all" || emit === "preference", `${emit}: preference media rules`);

    // Keep standard light/dark roles; only the selected activation families change them.
    for (const colorScheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme, contrast: "no-preference" });
      const primary = () => page.locator("[data-theme=ocean]").evaluate(el =>
        getComputedStyle(el).getPropertyValue("--mtrl-sys-color-primary").trim());
      await page.locator("[data-theme=ocean]").evaluate((el, mode) => el.setAttribute("data-theme-mode", mode), colorScheme);
      const standard = await primary();
      assert(standard, `${emit} ${colorScheme}: standard primary role`);
      await page.locator("[data-theme=ocean]").evaluate(el => el.setAttribute("data-theme-contrast", "high"));
      assert.equal((await primary()) !== standard, emit === "all" || emit === "explicit", `${emit} ${colorScheme}: explicit high`);
      await page.locator("[data-theme=ocean]").evaluate(el => el.removeAttribute("data-theme-contrast"));
      await page.emulateMedia({ colorScheme, contrast: "more" });
      assert.equal((await primary()) !== standard, emit === "all" || emit === "preference", `${emit} ${colorScheme}: system high`);
    }
  }
  console.log(`none saves ${measurements.get("all")!.gzip - measurements.get("none")!.gzip} gzip bytes (level 9)`);

  // One public configuration reaches both entries in a real blank document.
  // The two new flags store values; the existing prefix/contrast/direction
  // switches prove the shared module instances are the consumers' instances.
  const configured = sass.compileString(`
    @use "config" with ($typescale-tokens: true, $spring-tokens: true,
      $direction-arms: true, $contrast-emit: preference, $tag-prefix: "x");
    @use "main"; @use "elements";
    .probe { --type: #{config.$typescale-tokens}; --spring: #{config.$spring-tokens};
      --direction: #{config.$direction-arms}; --contrast: #{config.$contrast-emit}; }
  `, { loadPaths: [stylesRoot], style: "compressed", logger: sass.Logger.silent }).css;
  await page.setContent(`<style>${configured}</style><div class="probe"><x-button>Save</x-button><m-button>Save</m-button></div>`);
  const gateway = await page.locator(".probe").evaluate(el => {
    const style = getComputedStyle(el);
    return {
      type: style.getPropertyValue("--type").trim(), spring: style.getPropertyValue("--spring").trim(),
      direction: style.getPropertyValue("--direction").trim(), contrast: style.getPropertyValue("--contrast").trim(),
      custom: getComputedStyle(el.querySelector("x-button")!).display,
      original: getComputedStyle(el.querySelector("m-button")!).display,
    };
  });
  assert.deepEqual(gateway, { type: "true", spring: "true", direction: "true", contrast: "preference", custom: "inline-flex", original: "inline" });
  console.log(`configure-once main + elements: ${JSON.stringify(gateway)}`);
} finally {
  await browser.close();
}
