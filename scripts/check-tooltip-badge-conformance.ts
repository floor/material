/** Browser checks for tooltip and badge conformance using the component sheets. */
import assert from "node:assert/strict";
import { chromium } from "playwright";
import * as sass from "sass";
import { baseStyles } from "./style-manifest";

const css = sass.compileString(
  [...baseStyles, "components/tooltip", "components/badge", "abstract/mixins"]
    .map(name => `@use "${name}";`).join("\n") +
    "\n.label-small-reference { @include mixins.typography('label-small'); }",
  { loadPaths: ["src/styles"], logger: sass.Logger.silent },
).css;
const entry = `
import createTooltip from "./src/components/tooltip";
import createBadge from "./src/components/badge";
Object.assign(window, { createTooltip, createBadge });
`;
const { outputs, success, logs } = await Bun.build({
  entrypoints: ["tooltip-badge-fixture.ts"],
  files: { "tooltip-badge-fixture.ts": entry },
  target: "browser",
  format: "iife",
});
assert(success, String(logs));
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ hasTouch: true, reducedMotion: "reduce" });
  await page.setContent('<button id="anchor">Anchor</button><button id="outside">Outside</button><div id="badge" style="font-family:monospace"><span class="label-small-reference">5</span></div>');
  await page.addStyleTag({ content: css + "\n.mtrl-tooltip { transition: none; }" });
  await page.addScriptTag({ content: await outputs[0]!.text() });
  type Fixture = Window & {
    createTooltip: typeof import("../src/components/tooltip").default;
    createBadge: typeof import("../src/components/badge").default;
    tip: ReturnType<Fixture["createTooltip"]>;
  };
  const styles = await page.evaluate(() => {
    const fixture = window as unknown as Fixture;
    const anchor = document.querySelector<HTMLElement>("#anchor")!;
    const sizes = (["plain", "default", "rich"] as const).map(variant => {
      const tip = fixture.createTooltip({ target: anchor, variant, text: "" });
      tip.show(true);
      const { width, height } = tip.element.getBoundingClientRect();
      const { minWidth, minHeight } = getComputedStyle(tip.element);
      tip.destroy();
      return [width, height, minWidth, minHeight];
    });
    const badge = fixture.createBadge({ label: 5 });
    document.querySelector("#badge")!.append(badge.element);
    const typography = (element: Element) => {
      const { fontFamily, fontSize, fontWeight, letterSpacing, lineHeight } = getComputedStyle(element);
      return { fontFamily, fontSize, fontWeight, letterSpacing, lineHeight };
    };
    fixture.tip = fixture.createTooltip({ target: anchor, text: "Help", showDelay: 0, hideDelay: 0 });
    return { sizes, badge: typography(badge.element), reference: typography(document.querySelector(".label-small-reference")!) };
  });

  const visible = () => page.evaluate(() => (window as unknown as Fixture).tip.isVisible());
  const anchor = (await page.locator("#anchor").boundingBox())!;
  const cdp = await page.context().newCDPSession(page);
  const hold = () => cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart", touchPoints: [{ x: anchor.x + anchor.width / 2, y: anchor.y + anchor.height / 2 }],
  });
  const release = () => cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.clock.install();
  await hold();
  await page.clock.runFor(100);
  await release();
  await page.clock.runFor(600);
  const quickTap = await visible();
  await hold();
  await page.clock.runFor(600);
  const duringHold = await visible();
  await release();
  const afterRelease = await visible();
  await page.clock.runFor(1500);
  const afterExpiry = await visible();
  await hold();
  await page.clock.runFor(600);
  await release();
  const beforeOutside = await visible();
  await page.locator("#outside").tap();
  const afterOutside = await visible();
  // Programmatic tooltips keep the existing lifetime, including outside taps.
  await page.evaluate(() => (window as unknown as Fixture).tip.show(true));
  await page.clock.runFor(1600);
  await page.locator("#outside").tap();
  const explicitAfterOutside = await visible();
  await page.keyboard.press("Escape");
  const afterEscape = await visible();
  await page.locator("#anchor").hover();
  await page.clock.runFor(1600);
  const hoverAfterTimeout = await visible();

  const touch = { quickTap, duringHold, afterRelease, afterExpiry, beforeOutside, afterOutside, explicitAfterOutside, afterEscape, hoverAfterTimeout };
  console.log(JSON.stringify({ ...styles, touch }));
  assert.deepEqual(styles.sizes.slice(0, 2), [[40, 24, "40px", "24px"], [40, 24, "40px", "24px"]]);
  assert.deepEqual(styles.sizes[2]?.slice(2), ["0px", "0px"]);
  assert.deepEqual(styles.badge, styles.reference);
  assert.equal(styles.badge.letterSpacing, "0.5px");
  assert.deepEqual(
    touch,
    { quickTap: false, duringHold: true, afterRelease: true, afterExpiry: false, beforeOutside: true, afterOutside: false, explicitAfterOutside: true, afterEscape: false, hoverAfterTimeout: true },
  );
} finally {
  await browser.close();
}
