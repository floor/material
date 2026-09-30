/**
 * The button's one state layer (FLO-311): a ::before in currentColor whose opacity alone
 * changes with the state. For every colour style, toggle state, state and theme mode,
 * Chromium must paint the layer in the button's computed `color` at the M3 opacity
 * (m3.material.io state layers: hover 0.08, focus 0.10, pressed 0.10).
 *
 * The buttons carry no ripple, so a press shows the static pressed layer; with a ripple
 * the press is the wave, which checkRippleIsThePress covers.
 */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Page } from "playwright";
import type createButton from "../src/components/button";

type ButtonWindow = Window & { core: { createButton: typeof createButton } };

const variants = ["elevated", "filled", "tonal", "outlined", "text"] as const;
// Text buttons have no toggle style (ButtonConfig.toggle).
const kinds = ["plain", "unselected", "selected"] as const;
const states = { rest: 0, hover: 0.08, "focus-visible": 0.1, pressed: 0.1 } as const;
const modes = ["light", "dark"] as const;

export type ButtonCaseName = `${(typeof modes)[number]}-${(typeof variants)[number]}-${(typeof kinds)[number]}-${keyof typeof states}`;

/** Asserts every case and returns a screenshot of each, keyed by case name. */
export async function checkButtonStateLayers(page: Page, artifacts?: string): Promise<Map<ButtonCaseName, Buffer>> {
  await page.setViewportSize({ width: 900, height: 400 });
  const shots = new Map<ButtonCaseName, Buffer>();
  const cases: string[] = [];
  for (const mode of modes) {
    await page.evaluate(({ mode, variants, kinds }) => {
      const { core } = window as unknown as ButtonWindow;
      const root = document.documentElement;
      root.setAttribute("data-theme", "baseline");
      root.setAttribute("data-theme-mode", mode);
      document.body.replaceChildren();
      document.body.style.cssText = "display:flex; flex-wrap:wrap; align-content:flex-start; gap:24px; padding:24px; margin:0";
      document.body.style.backgroundColor = "var(--mtrl-sys-color-surface)";
      for (const variant of variants) {
        for (const kind of kinds) {
          if (variant === "text" && kind !== "plain") continue;
          const toggle = kind !== "plain";
          const button = core.createButton({
            text: `${variant} ${kind}`, variant, ripple: false,
            ...(toggle ? { toggle: true, selected: kind === "selected", toggleOnClick: false } : {}),
          });
          button.element.id = `layer-${variant}-${kind}`;
          document.body.append(button.element);
        }
      }
    }, { mode, variants, kinds });
    // The theme switch starts colour transitions; let them finish first.
    await page.waitForFunction(() => document.getAnimations().length === 0);

    for (const variant of variants) {
      for (const kind of kinds) {
        if (variant === "text" && kind !== "plain") continue;
        const id = `#layer-${variant}-${kind}`;
        const button = page.locator(id);
        const box = (await button.boundingBox())!;
        const settled = () => page.waitForFunction(id => document.querySelector(id)!.getAnimations({ subtree: true }).length === 0, id);
        for (const [state, opacity] of Object.entries(states) as [keyof typeof states, number][]) {
          await page.mouse.move(0, 0);
          await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
          if (state === "hover" || state === "pressed") await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          if (state === "pressed") await page.mouse.down();
          if (state === "focus-visible") {
            // A key press first, so Chromium treats the programmatic focus as keyboard focus.
            await page.keyboard.press("Shift");
            await button.focus();
          }
          await settled();
          const painted = await button.evaluate((element, state) => ({
            color: getComputedStyle(element).color,
            layer: getComputedStyle(element, "::before").backgroundColor,
            opacity: Number(getComputedStyle(element, "::before").opacity),
            matches: state === "rest" ? true : element.matches(state === "hover" ? ":hover" : state === "pressed" ? ":active" : ":focus-visible"),
          }), state);
          const name: ButtonCaseName = `${mode}-${variant}-${kind}-${state}`;
          assert.ok(painted.matches, `${name}: the button is not in the ${state} state`);
          assert.equal(painted.layer, painted.color, `${name}: the state layer is ${painted.layer}, the content colour ${painted.color}`);
          assert.equal(painted.opacity, opacity, `${name}: the state layer opacity is ${painted.opacity}, not ${opacity}`);
          shots.set(name, await page.screenshot({ clip: { x: box.x - 8, y: box.y - 8, width: box.width + 16, height: box.height + 16 } }));
          if (state === "pressed") await page.mouse.up();
          cases.push(name);
        }
      }
    }
  }
  await page.mouse.move(0, 0);
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    document.body.replaceChildren();
    document.body.removeAttribute("style");
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-theme-mode");
  });
  // 2 modes x (4 styles x 3 kinds + text) x 4 states
  assert.equal(cases.length, 2 * 13 * 4);
  if (artifacts) {
    const directory = join(artifacts, "button-states");
    await mkdir(directory, { recursive: true });
    for (const [name, shot] of shots) await writeFile(join(directory, `${name}.png`), shot);
  }
  return shots;
}
