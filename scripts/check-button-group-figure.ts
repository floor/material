/**
 * The M3 button-group overview figure: an XL group, narrow tonal icon
 * buttons on the ends, a filled wide label in the centre.
 *
 * m3.material.io/components/button-groups/specs and
 * m3.material.io/components/icon-buttons/specs, read 2026-11-26.
 * Icon button widths: narrow, default, wide. XL narrow is 104dp against a
 * 136dp height, so the ends are tall pills. The group squares only the
 * default width. A press still widens the pressed item and narrows its
 * neighbours from those measured widths (button groups, specs: a press
 * modifies the width of that button and the adjacent buttons).
 *
 * Neither the button nor the icon button has a colour-role option, so the
 * ends are the tonal style and the centre is filled. Those are the existing
 * variants, not a new colour API.
 */
import assert from "node:assert/strict";
import type { Page } from "playwright";

const ICON = '<svg viewBox="0 0 24 24"></svg>';

type Box = { bg: string; w: number; h: number; radius: number };

export async function checkButtonGroupFigure(page: Page, check: (name: string) => void): Promise<void> {
  check("button group: the XL figure mixes variant and width");

  await page.evaluate((icon) => {
    const host = document.getElementById("host") as HTMLElement;
    host.innerHTML = "";
    const w = window as unknown as {
      mtrl: { createButtonGroup: (c: object) => { element: HTMLElement } };
    };
    const group = w.mtrl.createButtonGroup({
      size: "xl",
      variant: "tonal",
      buttons: [
        { icon, ariaLabel: "Accessibility", variant: "tonal", width: "narrow" },
        { text: "Get started", variant: "filled" },
        { icon, ariaLabel: "Language", variant: "tonal", width: "narrow" },
      ],
    });
    group.element.id = "figure";
    host.append(group.element);
  }, ICON);

  const boxes = (): Promise<Box[]> => page.evaluate(() => {
    const group = document.getElementById("figure")!;
    return [...group.children].map((node) => {
      const el = node as HTMLElement;
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return {
        bg: style.backgroundColor,
        w: rect.width,
        h: rect.height,
        radius: parseFloat(style.borderTopLeftRadius),
      };
    });
  });

  const resting = await boxes();
  assert.equal(resting.length, 3);
  // The ends share a background and the centre does not. Each end is
  // narrower than it is tall. On main those ends already measure 104×136,
  // so the width is not what separates the two: the centre is filled.
  assert.equal(resting[0].bg, resting[2].bg);
  assert.notEqual(resting[1].bg, resting[0].bg);
  assert.ok(resting[0].w < resting[0].h, `left ${resting[0].w}x${resting[0].h}`);
  assert.ok(resting[2].w < resting[2].h, `right ${resting[2].w}x${resting[2].h}`);
  assert.ok(resting[1].w > resting[1].h, `centre ${resting[1].w}x${resting[1].h}`);
  // A pill: the corner is at least half the shorter side, so the ends are
  // not square-cornered blocks. A circle would have failed the width check.
  assert.ok(resting[0].radius >= resting[0].w / 2 - 1);
  assert.ok(resting[2].radius >= resting[2].w / 2 - 1);

  const centre = page.locator("#figure > :nth-child(2)");
  const at = await centre.boundingBox();
  assert.ok(at);
  await page.mouse.move(at.x + at.width / 2, at.y + at.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(480);
  const pressed = await boxes();
  assert.ok(pressed[1].w > resting[1].w + 1, `centre grew ${resting[1].w} -> ${pressed[1].w}`);
  assert.ok(pressed[0].w < resting[0].w - 1, `left narrowed ${resting[0].w} -> ${pressed[0].w}`);
  assert.ok(pressed[2].w < resting[2].w - 1, `right narrowed ${resting[2].w} -> ${pressed[2].w}`);
  await page.mouse.up();
  await page.waitForTimeout(520);
  const released = await boxes();
  assert.ok(Math.abs(released[0].w - resting[0].w) < 1);
  assert.ok(Math.abs(released[1].w - resting[1].w) < 1);
  assert.ok(Math.abs(released[2].w - resting[2].w) < 1);
}
