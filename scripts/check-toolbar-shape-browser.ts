/** The toolbar's round items keep their round radius in every state, Chromium. */
import assert from "node:assert/strict";
import type { Page } from "playwright";
import type createToolbar from "../src/components/toolbar";
import type createIconButton from "../src/components/icon-button";

type ShapeWindow = Window & {
  mtrl: { createToolbar: typeof createToolbar; createIconButton: typeof createIconButton };
};

/** One icon button's inner element: the host's shadow root's, or the factory's own. */
const radiusOf = (page: Page, id: string): Promise<string> =>
  page.evaluate((id) => {
    const node = document.getElementById(id) as HTMLElement;
    const inner = node.shadowRoot?.querySelector(".mtrl-icon-button") ?? node;
    return getComputedStyle(inner).borderTopLeftRadius;
  }, id);

/** Waits for the button's spring: a morphing radius reads mid-flight otherwise. */
const settle = (page: Page, id: string): Promise<unknown> =>
  page.evaluate((id) => {
    const node = document.getElementById(id) as HTMLElement;
    const inner = (node.shadowRoot?.querySelector(".mtrl-icon-button") ?? node) as HTMLElement;
    return Promise.all(inner.getAnimations().map((a) => a.finished.catch(() => undefined)));
  }, id);

/** The computed radius while the primary button is held down: the pressed morph. */
const pressedRadiusOf = async (page: Page, id: string): Promise<string> => {
  const centre = await page.evaluate((id) => {
    const node = document.getElementById(id) as HTMLElement;
    const inner = (node.shadowRoot?.querySelector(".mtrl-icon-button") ?? node) as HTMLElement;
    const box = inner.getBoundingClientRect();
    return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
  }, id);
  await page.mouse.move(centre.x, centre.y);
  await page.mouse.down();
  await settle(page, id);
  const radius = await radiusOf(page, id);
  await page.mouse.up();
  await page.mouse.move(0, 0);
  return radius;
};

/**
 * A round icon button inside a toolbar keeps its round radius selected and
 * pressed, at its own size, including one changed after insertion; the bar's
 * direct items only — the overflow menu's content, a square item and a
 * standalone toggle keep the standalone morphs.
 */
export async function checkToolbarItemShape(page: Page, check: (name: string) => void): Promise<void> {
  const icon = '<svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z"/></svg>';
  // size, resting round radius, standalone selected (square) radius, standalone pressed radius
  const sizes = [
    ["xs", "16px", "12px", "8px"],
    ["s", "20px", "12px", "8px"],
    ["m", "28px", "16px", "12px"],
    ["l", "48px", "28px", "16px"],
    ["xl", "68px", "28px", "16px"],
  ] as const;

  // The element: <m-icon-button> hosts slotted into <m-toolbar>, one per size
  // (a selected one and a fresh one to press), a square one, one to resize
  // after insertion, and one inside the overflow menu's content. Below it the
  // factory's own toolbar, same sizes plus one unselected item to press.
  await page.evaluate(([icon, sizes]) => {
    const w = window as unknown as ShapeWindow;
    const host = (id: string, attrs: Record<string, string>): HTMLElement => {
      const button = document.createElement("m-icon-button");
      button.id = id;
      button.setAttribute("toggle", "");
      button.setAttribute("aria-label", id);
      button.setAttribute("icon", icon);
      for (const [name, value] of Object.entries(attrs)) button.setAttribute(name, value);
      return button;
    };
    const stage = document.createElement("div");
    stage.id = "shape-stage";
    const toolbar = document.createElement("m-toolbar");
    toolbar.id = "shape-toolbar";
    toolbar.setAttribute("aria-label", "Shapes");
    for (const [size] of sizes) {
      const attrs: Record<string, string> = {};
      if (size !== "s") attrs.size = size;
      toolbar.append(host(`sel-${size}`, { ...attrs, selected: "" }));
      toolbar.append(host(`press-${size}`, attrs));
    }
    toolbar.append(host("square", { shape: "square", selected: "" }));
    toolbar.append(host("resized", { size: "m", selected: "" }));
    // The overflow slot's content: a menu (its items are declared, so an icon
    // button in them never renders), and a wrapper whose icon button stands
    // for any content deeper than the bar's direct items — the path the old
    // toolbar-wide pin leaked along.
    const menu = document.createElement("m-menu");
    menu.setAttribute("slot", "overflow");
    const menuItem = document.createElement("m-menu-item");
    menuItem.setAttribute("value", "a");
    menuItem.textContent = "Align";
    menu.append(menuItem);
    toolbar.append(menu);
    const wrapper = document.createElement("div");
    wrapper.setAttribute("slot", "overflow");
    wrapper.append(host("in-overflow", { selected: "" }));
    toolbar.append(wrapper);
    stage.append(toolbar);
    stage.append(host("standalone-selected", { selected: "" }));
    stage.append(host("standalone", {}));
    document.body.append(stage);

    const factory = w.mtrl.createToolbar({
      ariaLabel: "Factory shapes",
      items: [
        ...sizes.map(([size]) =>
          w.mtrl.createIconButton({ ariaLabel: `factory ${size}`, icon, toggle: true, selected: true, size })),
        w.mtrl.createIconButton({ ariaLabel: "factory press", icon, toggle: true }),
      ],
    });
    factory.element.id = "shape-factory";
    factory.element.querySelectorAll(".mtrl-icon-button").forEach((item, index) => {
      item.id = index < sizes.length ? `factory-${sizes[index][0]}` : "factory-press";
    });
    stage.append(factory.element);
  }, [icon, sizes] as const);
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve(null))));

  // Selected: each host keeps its own resting round radius.
  for (const [size, resting] of sizes) {
    assert.equal(await radiusOf(page, `sel-${size}`), resting, `a selected slotted ${size} host keeps its round radius`);
  }
  check("toolbar shape: a selected slotted <m-icon-button> keeps its own round radius at every size");

  // Pressed: the same radius while the pointer is down.
  for (const [size, resting] of sizes) {
    assert.equal(await pressedRadiusOf(page, `press-${size}`), resting, `a pressed slotted ${size} host keeps its round radius`);
  }
  check("toolbar shape: a pressed slotted <m-icon-button> keeps its own round radius at every size");

  // A size changed after insertion re-resolves the pin (the morph springs to
  // the new radius, so let the button's animation finish before reading it).
  assert.equal(await radiusOf(page, "resized"), "28px", "the resized host starts at its size");
  await page.evaluate((id) => (document.getElementById(id) as HTMLElement).setAttribute("size", "xl"), "resized");
  await settle(page, "resized");
  assert.equal(await radiusOf(page, "resized"), "68px", "a slotted host resized after insertion follows its new size");
  check("toolbar shape: a slotted host re-reads its size after insertion");

  // The element's own overflow button is a bar item in the same tree.
  assert.equal(
    await page.evaluate(() => {
      const toolbar = document.getElementById("shape-toolbar") as HTMLElement;
      const button = toolbar.shadowRoot?.querySelector(".mtrl-toolbar__bar > .mtrl-icon-button") as HTMLElement | null;
      return button ? getComputedStyle(button).borderTopLeftRadius : "missing";
    }),
    "20px",
    "the element's overflow button rests round",
  );
  check("toolbar shape: the <m-toolbar> element's own overflow button is a pinned bar item");

  // The factory: same-tree items, selected and pressed.
  for (const [size, resting] of sizes) {
    assert.equal(await radiusOf(page, `factory-${size}`), resting, `a selected factory ${size} item keeps its round radius`);
  }
  assert.equal(await pressedRadiusOf(page, "factory-press"), "20px", "a pressed factory item keeps its round radius");
  check("toolbar shape: a factory item keeps its round radius selected and pressed at every size");

  // Deeper than the bar's direct items: the standalone morphs, unchanged.
  assert.equal(await radiusOf(page, "in-overflow"), "12px", "an icon button in the overflow slot's content keeps the standalone morph");
  assert.equal(await radiusOf(page, "square"), "20px", "a square item in a toolbar keeps its selected morph to round");
  assert.equal(await radiusOf(page, "standalone-selected"), "12px", "a standalone selected toggle keeps the square morph");
  assert.equal(await radiusOf(page, "standalone"), "20px", "a standalone toggle rests round");
  assert.equal(await pressedRadiusOf(page, "standalone"), "8px", "a standalone toggle keeps the pressed morph");
  check("toolbar shape: the overflow menu's content, square items and standalone toggles are unchanged");

  await page.evaluate(() => document.getElementById("shape-stage")?.remove());
}
