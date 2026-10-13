/** The toolbar's round items keep their round radius in every state, Chromium. */
import assert from "node:assert/strict";
import type { Page } from "playwright";
import type createToolbar from "../src/components/toolbar";
import type createIconButton from "../src/components/icon-button";

type ShapeWindow = Window & {
  mtrl: {
    createToolbar: typeof createToolbar;
    createIconButton: typeof createIconButton;
    defineToolbar: (options?: { prefix?: string }) => string;
    defineIconButton: (options?: { prefix?: string }) => string;
  };
};

/** One icon button's inner element: the host's shadow root's, or the factory's own. */
const radiusOf = (page: Page, id: string): Promise<string> =>
  page.evaluate((id) => {
    const node = document.getElementById(id) as HTMLElement;
    const inner = node.shadowRoot?.querySelector(".mtrl-icon-button") ?? node;
    return getComputedStyle(inner).borderTopLeftRadius;
  }, id);

/** The inner element's box, to prove a width variant made it non-square. */
const boxOf = (page: Page, id: string): Promise<{ w: number; h: number }> =>
  page.evaluate((id) => {
    const node = document.getElementById(id) as HTMLElement;
    const inner = (node.shadowRoot?.querySelector(".mtrl-icon-button") ?? node) as HTMLElement;
    const box = inner.getBoundingClientRect();
    return { w: box.width, h: box.height };
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
 * A round icon button inside a toolbar keeps its round radius in every
 * state, at its own size, including one changed after insertion and under
 * the narrow and wide width variants; the bar's direct items only — the
 * overflow menu's content, a square item and a standalone toggle keep the
 * standalone morphs; and the same holds under a custom tag prefix, which
 * the sheet cannot spell and matches by the host's marker attribute.
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
  const restingOf = Object.fromEntries(sizes.map(([size, resting]) => [size, resting])) as Record<string, string>;

  // The element: <m-icon-button> hosts slotted into <m-toolbar>, one selected
  // and one fresh-to-press per size, a square one, one to resize after
  // insertion, the narrow and wide width variants, and one inside the
  // overflow menu's content. Below it the factory's own toolbar, selected and
  // pressable items per size plus the width variants, and a custom-prefix
  // <x-toolbar> with the same shape of cases — the path the tag selectors of
  // the first fix could not reach.
  await page.evaluate(([icon, sizes]) => {
    const w = window as unknown as ShapeWindow;
    const host = (tag: string, id: string, attrs: Record<string, string>): HTMLElement => {
      const button = document.createElement(tag);
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
      toolbar.append(host("m-icon-button", `sel-${size}`, { ...attrs, selected: "" }));
      toolbar.append(host("m-icon-button", `press-${size}`, attrs));
    }
    // The width variants: the box stops being square, and the resting radius
    // is half the height, which the size alone decides.
    toolbar.append(host("m-icon-button", "sel-m-narrow", { size: "m", width: "narrow", selected: "" }));
    toolbar.append(host("m-icon-button", "press-l-narrow", { size: "l", width: "narrow" }));
    toolbar.append(host("m-icon-button", "sel-m-wide", { size: "m", width: "wide", selected: "" }));
    toolbar.append(host("m-icon-button", "sel-xl-wide", { size: "xl", width: "wide", selected: "" }));
    toolbar.append(host("m-icon-button", "square", { shape: "square", selected: "" }));
    toolbar.append(host("m-icon-button", "resized", { size: "m", selected: "" }));
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
    wrapper.append(host("m-icon-button", "in-overflow", { selected: "" }));
    toolbar.append(wrapper);
    stage.append(toolbar);
    stage.append(host("m-icon-button", "standalone-selected", { selected: "" }));
    stage.append(host("m-icon-button", "standalone", {}));
    document.body.append(stage);

    const item = (id: string, config: Record<string, unknown>): ReturnType<ShapeWindow["mtrl"]["createIconButton"]> => {
      const button = w.mtrl.createIconButton({ ariaLabel: id, icon, toggle: true, ...config });
      button.element.id = id;
      return button;
    };
    const factory = w.mtrl.createToolbar({
      ariaLabel: "Factory shapes",
      items: [
        ...sizes.flatMap(([size]) => [
          item(`factory-${size}`, { selected: true, ...(size === "s" ? {} : { size }) }),
          item(`factory-press-${size}`, size === "s" ? {} : { size }),
        ]),
        item("factory-m-narrow", { size: "m", width: "narrow", selected: true }),
        item("factory-l-wide", { size: "l", width: "wide", selected: true }),
        item("factory-xl-wide", { size: "xl", width: "wide", selected: true }),
      ],
    });
    factory.element.id = "shape-factory";
    stage.append(factory.element);

    // A custom prefix: the tags are the page's choice; the sheet's slotted
    // selectors match the marker attribute the host carries instead.
    w.mtrl.defineToolbar({ prefix: "x" });
    w.mtrl.defineIconButton({ prefix: "x" });
    const xToolbar = document.createElement("x-toolbar");
    xToolbar.id = "shape-x";
    xToolbar.setAttribute("aria-label", "Custom prefix shapes");
    xToolbar.append(host("x-icon-button", "x-sel-xs", { size: "xs", selected: "" }));
    xToolbar.append(host("x-icon-button", "x-press-xs", { size: "xs" }));
    xToolbar.append(host("x-icon-button", "x-sel-m", { size: "m", selected: "" }));
    xToolbar.append(host("x-icon-button", "x-press-m", { size: "m" }));
    const xWrapper = document.createElement("div");
    xWrapper.setAttribute("slot", "overflow");
    xWrapper.append(host("x-icon-button", "x-in-overflow", { selected: "" }));
    xToolbar.append(xWrapper);
    stage.append(xToolbar);
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

  // The width variants on both channels: the box is no square, and the
  // radius is still the size's round radius, half its height.
  {
    const narrow = await boxOf(page, "sel-m-narrow");
    const wide = await boxOf(page, "sel-xl-wide");
    assert.ok(narrow.w < narrow.h, `a narrow item's box is not narrow (${narrow.w}×${narrow.h})`);
    assert.ok(wide.w > wide.h, `a wide item's box is not wide (${wide.w}×${wide.h})`);
    assert.equal(await radiusOf(page, "sel-m-narrow"), restingOf.m, "a narrow selected slotted host keeps its round radius");
    assert.equal(await pressedRadiusOf(page, "press-l-narrow"), restingOf.l, "a narrow pressed slotted host keeps its round radius");
    assert.equal(await radiusOf(page, "sel-m-wide"), restingOf.m, "a wide selected slotted host at m keeps its round radius");
    assert.equal(await radiusOf(page, "sel-xl-wide"), restingOf.xl, "a wide selected slotted host at xl keeps its round radius");
    assert.equal(await radiusOf(page, "factory-m-narrow"), restingOf.m, "a narrow selected factory item keeps its round radius");
    assert.equal(await radiusOf(page, "factory-l-wide"), restingOf.l, "a wide selected factory item at l keeps its round radius");
    assert.equal(await radiusOf(page, "factory-xl-wide"), restingOf.xl, "a wide selected factory item at xl keeps its round radius");
  }
  check("toolbar shape: narrow and wide items keep their size's round radius on both channels");

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

  // The factory: same-tree items, selected and pressed at every size.
  for (const [size, resting] of sizes) {
    assert.equal(await radiusOf(page, `factory-${size}`), resting, `a selected factory ${size} item keeps its round radius`);
    assert.equal(await pressedRadiusOf(page, `factory-press-${size}`), resting, `a pressed factory ${size} item keeps its round radius`);
  }
  check("toolbar shape: a factory item keeps its round radius selected and pressed at every size");

  // A custom tag prefix: the marker, not the tag, carries the pin.
  assert.equal(await radiusOf(page, "x-sel-xs"), "16px", "a selected custom-prefix xs host keeps its round radius");
  assert.equal(await radiusOf(page, "x-sel-m"), "28px", "a selected custom-prefix m host keeps its round radius");
  assert.equal(await pressedRadiusOf(page, "x-press-xs"), "16px", "a pressed custom-prefix xs host keeps its round radius");
  assert.equal(await pressedRadiusOf(page, "x-press-m"), "28px", "a pressed custom-prefix m host keeps its round radius");
  assert.equal(
    await page.evaluate(() => {
      const toolbar = document.getElementById("shape-x") as HTMLElement;
      const button = toolbar.shadowRoot?.querySelector(".mtrl-toolbar__bar > .mtrl-icon-button") as HTMLElement | null;
      return button ? getComputedStyle(button).borderTopLeftRadius : "missing";
    }),
    "20px",
    "the custom-prefix element's overflow button rests round",
  );
  check("toolbar shape: a custom prefix works like the default one");

  // Deeper than the bar's direct items: the standalone morphs, unchanged.
  assert.equal(await radiusOf(page, "in-overflow"), "12px", "an icon button in the overflow slot's content keeps the standalone morph");
  assert.equal(await radiusOf(page, "x-in-overflow"), "12px", "custom-prefix overflow content keeps the standalone morph");
  assert.equal(await radiusOf(page, "square"), "20px", "a square item in a toolbar keeps its selected morph to round");
  assert.equal(await radiusOf(page, "standalone-selected"), "12px", "a standalone selected toggle keeps the square morph");
  assert.equal(await radiusOf(page, "standalone"), "20px", "a standalone toggle rests round");
  assert.equal(await pressedRadiusOf(page, "standalone"), "8px", "a standalone toggle keeps the pressed morph");
  check("toolbar shape: the overflow menu's content, square items and standalone toggles are unchanged");

  await page.evaluate(() => document.getElementById("shape-stage")?.remove());
}
