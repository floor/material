import assert from "node:assert/strict";
import type { TooltipComponent, TooltipConfig } from "../src/components/tooltip/types";
import { createConformanceHarness, fixtureEngine } from "./conformance/measure";

type Fixture = { mtrl: { createTooltip(config: TooltipConfig): TooltipComponent } };

const engine = fixtureEngine();
const harness = await createConformanceHarness({ component: "tooltip", engine });
const { page } = harness;
const failures: string[] = [];
try {
  page.setDefaultTimeout(6500);
  for (const layer of ["inline", "top"] as const) {
    if (layer === "top") {
      await page.reload();
      await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true);
    }
    await page.evaluate(layer => {
      const { createTooltip } = (window as unknown as Fixture).mtrl;
      const host = document.querySelector("#mount")!;
      for (const [variant, left] of [["plain", "360px"], ["rich", "600px"]] as const) {
        const target = document.createElement("button");
        target.id = `${variant}-anchor`;
        target.style.cssText = `position:fixed;top:260px;left:${left}`;
        target.textContent = variant;
        host.append(target);
        const tooltip = createTooltip({
          target, variant, text: `${variant} help`, position: "top", layer: layer === "top" ? "top" : undefined,
        });
        tooltip.element.dataset.fixture = variant;
      }
    }, layer);
    const plainTip = '[data-fixture="plain"]';
    const richTip = '[data-fixture="rich"]';
    const settled = (selector: string) => page.waitForFunction(
      selector => getComputedStyle(document.querySelector(selector)!).opacity === "1",
      selector,
    );
    await page.keyboard.press(engine === "webkit" ? "Alt+Tab" : "Tab");
    await settled(plainTip);
    await page.evaluate(() => {
      const plain = document.querySelector('[data-fixture="plain"]')!;
      const rich = document.querySelector<HTMLElement>('[data-fixture="rich"]')!;
      const observer = new MutationObserver(() => {
        if (!rich.classList.contains("mtrl-tooltip--visible")) return;
        rich.dataset.outgoingOpacity = getComputedStyle(plain).opacity;
        observer.disconnect();
      });
      observer.observe(rich, { attributes: true, attributeFilter: ["class"] });
    });
    await page.locator("#rich-anchor").hover();
    await settled(richTip);
    const outgoingOpacity = await page.locator(richTip).getAttribute("data-outgoing-opacity");
    const visible = await page.locator('.mtrl-tooltip--visible[aria-hidden="false"]').count();
    assert.equal(await page.evaluate(() => document.activeElement?.id), "plain-anchor");
    console.log(`${engine} ${layer} visible ${visible}, outgoing opacity ${outgoingOpacity}`);
    if (visible !== 1) failures.push(`${layer} ${visible} visible tooltips, expected 1`);
    if (outgoingOpacity !== "0") failures.push(`${layer} outgoing opacity ${outgoingOpacity}, expected 0`);
    await page.keyboard.press("Escape");
    assert.equal(await page.locator(".mtrl-tooltip--visible").count(), 0);
    assert.equal(await page.evaluate(() => document.activeElement?.id), "plain-anchor");
  }
} finally {
  await harness.close();
}
assert.equal(failures.length, 0, failures.join("\n"));
console.log(`Tooltip conformance passed in ${engine}.`);
