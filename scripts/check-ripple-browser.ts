/** The ripple is the press (FLO-260): sample the painted press layers in Chromium. */
import assert from "node:assert/strict";
import type { Page } from "playwright";
import type createButton from "../src/components/button";
import type { createFilterChip, createInputChip } from "../src/components/chips";

type RippleWindow = Window & {
  core: { createButton: typeof createButton; createFilterChip: typeof createFilterChip; createInputChip: typeof createInputChip };
};
type Layers = { layer: number; waves: number[] };

/**
 * A press paints one 0.10 indication, the ripple, as in Compose: the static :active layer
 * gives way to the wave on an element with a ripple, and stays on one without (a chip's
 * remove button). The hover layer under a pointer is not the press, and stays, as in
 * Compose (its StateLayer draws hover, the ripple draws the press) and material-web.
 */
export async function checkRippleIsThePress(page: Page): Promise<void> {
  await page.evaluate(() => {
    const { core } = window as unknown as RippleWindow;
    const host = document.createElement("div");
    host.id = "press-host";
    host.style.cssText = "display:flex; gap:24px; padding:24px";
    const button = core.createButton({ text: "Press", variant: "text" });
    button.element.id = "press-button";
    const chip = core.createFilterChip({ label: "Press" });
    chip.element.id = "press-chip";
    const input = core.createInputChip({ label: "Ada" });
    input.element.id = "press-input";
    host.append(button.element, chip.element, input.element);
    document.body.append(host);
  });
  // The layers of `root` (its pseudo-element `pseudo`) and the waves inside it, while
  // the real mouse holds `target` down.
  const pressed = async (target: string, root: string, pseudo: "::before" | "::after"): Promise<Layers> => {
    const box = (await page.locator(target).boundingBox())!;
    // Layers fade between states; sample once every transition has settled.
    const settled = () => page.waitForFunction(root => document.querySelector(root)!.getAnimations({ subtree: true }).length === 0, root);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await settled();
    await page.mouse.down();
    await settled();
    const layers = await page.evaluate(([root, pseudo]) => {
      const element = document.querySelector(root)!;
      return {
        layer: Number(getComputedStyle(element, pseudo).opacity),
        waves: [...element.querySelectorAll(".mtrl-ripple-wave:not(.fade-out)")].map(wave => Number(getComputedStyle(wave).opacity)),
      };
    }, [root, pseudo] as const);
    await page.mouse.up();
    return layers;
  };
  const hover = 0.08, press = 0.1;
  assert.deepEqual(await pressed("#press-button", "#press-button", "::before"), { layer: hover, waves: [press] },
    "a pressed button paints the wave at 0.10 over its hover layer, and no static pressed layer");
  assert.deepEqual(await pressed("#press-chip .mtrl-chip__action", "#press-chip", "::after"), { layer: hover, waves: [press] },
    "a pressed chip paints the wave at 0.10 over its hover layer, and no static pressed layer");
  assert.deepEqual(await pressed("#press-input .mtrl-chip__remove", "#press-input", "::after"), { layer: press, waves: [] },
    "a pressed remove button, which has no ripple, keeps the static 0.10 pressed layer");
  await page.evaluate(() => document.getElementById("press-host")!.remove());
  await page.mouse.move(0, 0);
}
