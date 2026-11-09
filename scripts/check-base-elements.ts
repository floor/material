#!/usr/bin/env bun
// Build first. --base=base runs the same absence contract against the existing
// full base: the red control fails on measured global ripple rules, not on a
// missing new entry. A single browser file can use main's CI dist unchanged.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { chromium, type Page } from "playwright";

const entry = process.argv.includes("--base=base") ? "base" : "base-elements";
const base = await readFile("dist/styles/base.css", "utf8");
const css = await readFile(`dist/styles/${entry}.css`, "utf8");
const explicit = await readFile("dist/styles/contrast.css", "utf8");
const bundle = await Bun.build({ entrypoints: ["scripts/fixtures/base-elements.ts"], target: "browser" });
assert(bundle.success, String(bundle.logs));
const js = await bundle.outputs[0].text();
const browser = await chromium.launch();
const report: Record<string, unknown> = { entry };
try {
  const page = await browser.newPage();
  page.setDefaultTimeout(5_000);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  // Parse the shipped sheets in Chromium. Removing precisely the ripple rules
  // from the old base must produce the entire new base, in the same order and
  // layer. This also protects contrast, reset and motion rules not sampled below.
  const census = await page.evaluate(({ base, css }) => {
    const parse = (text: string, dropRipple: boolean) => {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(text);
      let ripple = 0;
      const walk = (rules: CSSRuleList): string[] => Array.from(rules).flatMap(rule => {
        const isRipple = (rule instanceof CSSStyleRule && /\.mtrl-ripple|\[data-ripple/.test(rule.selectorText)) ||
          (rule instanceof CSSKeyframesRule && rule.name === "mtrl-ripple-expand");
        if (isRipple) {
          ripple++;
          if (dropRipple) return [];
        }
        if ("cssRules" in rule) {
          const children = walk((rule as CSSGroupingRule).cssRules);
          return children.length ? [`${rule.cssText.slice(0, rule.cssText.indexOf("{"))}{${children.join("")}}`] : [];
        }
        return [rule.cssText];
      });
      return { rules: walk(sheet.cssRules), ripple };
    };
    return { reference: parse(base, true), candidate: parse(css, false) };
  }, { base, css });
  assert(census.reference.ripple > 0, "the full-base positive control has no global ripple rules");
  report.census = { fullBase: census.reference.ripple, candidate: census.candidate.ripple };

  const content = async (target: Page, styles: string) => {
    await target.setContent(`<!doctype html><html><head><style>${styles}</style></head><body>
      <p id="reset">Reset</p><button id="native">Native</button>
      <div id="roles" style="color:var(--mtrl-sys-color-primary);background:var(--mtrl-sys-color-surface)"></div>
      <div data-theme="baseline" data-theme-mode="dark"><div id="nested" style="color:var(--mtrl-sys-color-primary)"></div></div>
      <div id="motion" style="animation:probe 1s infinite;transition:transform 1s"></div>
    </body></html>`);
  };
  const measure = (target: Page) => target.evaluate(() => {
    const get = (selector: string) => getComputedStyle(document.querySelector(selector)!);
    const body = get("body"), reset = get("#reset"), native = get("#native"), roles = get("#roles");
    const motion = get("#motion");
    return {
      body: [body.margin, body.backgroundColor, body.color, body.fontFamily],
      reset: [reset.margin, reset.boxSizing, native.fontFamily, native.boxSizing],
      roles: [roles.color, roles.backgroundColor, get("#nested").color],
      tokens: [body.getPropertyValue("--mtrl-ref-typeface-plain"), body.getPropertyValue("--mtrl-sys-shape-corner-medium")],
      motion: [motion.animationDuration, motion.animationIterationCount, motion.transitionProperty, get("html").scrollBehavior],
    };
  });
  const control = await browser.newPage();
  await content(control, base + explicit);
  await content(page, css + explicit);
  const snapshots = [];
  for (const colorScheme of ["light", "dark"] as const) {
    for (const contrast of ["no-preference", "more"] as const) {
      for (const reducedMotion of ["no-preference", "reduce"] as const) {
        for (const level of [null, "medium", "high"]) {
          for (const target of [control, page]) {
            await target.emulateMedia({ colorScheme, contrast, reducedMotion });
            await target.locator("html").evaluate((el, level) => {
              if (level) el.setAttribute("data-theme-contrast", level);
              else el.removeAttribute("data-theme-contrast");
            }, level);
            await target.evaluate(async () => {
              await Promise.all(document.getAnimations().filter(a => a.effect?.getComputedTiming().endTime !== Infinity)
                .map(a => a.finished.catch(() => {})));
            });
          }
          const expected = await measure(control), actual = await measure(page);
          assert.deepEqual(actual, expected, `${colorScheme}/${contrast}/${reducedMotion}/${level}: base behavior differs`);
          assert(actual.tokens.every(Boolean), "theme tokens missing");
          assert.deepEqual(actual.reset.slice(0, 2), ["0px", "border-box"], "page reset missing");
          snapshots.push({ colorScheme, contrast, reducedMotion, level, actual });
        }
      }
    }
  }
  report.themeCases = snapshots;
  await control.close();
  console.log(`${snapshots.length} theme/contrast/reset/motion combinations match the existing base`);

  // Both controls adopt the unchanged shadow ripple sheet. Sample a held
  // pointer, before release can fade it; test reduced motion too.
  await page.emulateMedia({ colorScheme: "light", contrast: "no-preference", reducedMotion: "no-preference" });
  await content(page, css);
  await page.addScriptTag({ content: js });
  await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
  const ripples = [];
  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    await page.emulateMedia({ reducedMotion });
    for (const tag of ["m-button", "m-icon-button"]) {
      const button = page.locator(`${tag} button`);
      const wave = page.locator(`${tag} .mtrl-ripple-wave.active:not(.fade-out)`);
      const box = (await button.boundingBox())!;
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await wave.waitFor({ state: "attached" });
      const style = await wave.evaluate(async el => {
        await Promise.all(el.getAnimations().map(a => a.finished.catch(() => {})));
        const wave = getComputedStyle(el), container = getComputedStyle(el.parentElement!);
        return { opacity: wave.opacity, position: wave.position, transform: wave.transform,
          container: [container.position, container.pointerEvents, container.overflow] };
      });
      assert.equal(Number(style.opacity), 0.1, `${tag}: held ripple is not painted`);
      assert.equal(style.position, "absolute");
      assert.deepEqual(style.container, ["absolute", "none", "hidden"]);
      if (reducedMotion === "reduce") assert.equal(style.transform, "matrix(1, 0, 0, 1, 0, 0)");
      ripples.push({ tag, reducedMotion, style });
      await page.mouse.up();
      await page.locator(`${tag} .mtrl-ripple-wave`).waitFor({ state: "detached" });
    }
  }
  await page.locator("m-button button").focus();
  const selected = () => page.locator("m-button").evaluate(el => (el as HTMLElement & { selected: boolean }).selected);
  const before = await selected();
  await page.keyboard.press("Space");
  assert.equal(await selected(), !before, "keyboard activation no longer toggles the element");
  report.ripples = ripples;
  assert.deepEqual(errors, []);
  console.log("4 held element ripple cases paint at 0.10 and clean up; keyboard activation passes");

  const gzip = (text: string) => gzipSync(text, { level: 9 }).length;
  report.stylesheets = { base: { raw: Buffer.byteLength(base), gzip: gzip(base) },
    candidate: { raw: Buffer.byteLength(css), gzip: gzip(css) }, saving: gzip(base) - gzip(css) };
  console.log(JSON.stringify(report.stylesheets));
  assert.equal(census.candidate.ripple, 0, `${entry} retains global light-DOM ripple rules`);
  assert.deepEqual(census.candidate.rules, census.reference.rules, "non-ripple rules or cascade order changed");
  assert(gzip(css) < gzip(base), "the element base saves no gzip bytes");
  console.log("base-elements: no global ripple rules; all remaining base rules preserved");
} finally {
  await Bun.write("analysis/browser/base-elements.json", JSON.stringify(report, null, 2) + "\n");
  await browser.close();
}
