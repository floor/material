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
const { outputs, success, logs } = await Bun.build({
  entrypoints: ["scripts/fixtures/tooltip-badge-conformance.ts"],
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
    return { sizes, badge: typography(badge.element), reference: typography(document.querySelector(".label-small-reference")!) };
  });

  console.log(JSON.stringify(styles));
  assert.deepEqual(styles.sizes.slice(0, 2), [[40, 24, "40px", "24px"], [40, 24, "40px", "24px"]]);
  assert.deepEqual(styles.sizes[2]?.slice(2), ["0px", "0px"]);
  assert.deepEqual(styles.badge, styles.reference);
  assert.equal(styles.badge.letterSpacing, "0.5px");
} finally {
  await browser.close();
}
