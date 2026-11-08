// scripts/check-toolbar-collapse-browser.ts
/**
 * The toolbar's `scrollBehavior: "collapse"` in Chromium: a docked toolbar
 * shrinks from its 64px bar to the 48px target area, an icon+label item shows
 * its icon only (the label leaves the layout but stays the control's name,
 * and the button closes up to the target size) while a label-only item keeps
 * its label, items keep their 48x48 hit areas, an item taller than the floor
 * holds the container at its own height, reduced motion settles the height at
 * once, and a floating toolbar ignores the value.
 *
 * The element path is walked too: `<m-toolbar scroll-behavior="collapse">`
 * mirrors the state onto its host, dispatches `collapse` and `expand`, and a
 * slotted `<m-button>`'s own shadow root hides its label through the host
 * (::part and ::slotted cannot reach it).
 */
import assert from "node:assert/strict";
import type { Page } from "playwright";
import type createToolbar from "../src/components/toolbar";
import type createButton from "../src/components/button";
import type createIconButton from "../src/components/icon-button";

type CollapseWindow = Window & {
  mtrl: {
    createToolbar: typeof createToolbar;
    createButton: typeof createButton;
    createIconButton: typeof createIconButton;
  };
  collapseClicks?: number;
  collapseToolbars?: { destroy(): void }[];
};

/** The bar's height once the min-height transition has settled: five frames at one height. */
const settled = (page: Page, id: string): Promise<number> =>
  page.evaluate(async (id) => {
    const bar = document.querySelector(`#${id} .mtrl-toolbar__bar`) as HTMLElement;
    let last = -1;
    let stable = 0;
    for (let frame = 0; frame < 240 && stable < 5; frame++) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const height = bar.getBoundingClientRect().height;
      stable = height === last ? stable + 1 : 0;
      last = height;
    }
    return last;
  }, id);

export async function checkToolbarCollapse(page: Page, check: (name: string) => void): Promise<void> {
  const icon = '<svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z"/></svg>';
  await page.evaluate((icon) => {
    const w = window as unknown as CollapseWindow;

    // What the toolbars listen to; the toolbar itself stays out of the scroll
    // container, so it is measured where it sits.
    const stage = document.createElement("div");
    stage.id = "collapse-scroll";
    stage.style.cssText = "height:160px;overflow:auto";
    const tall = document.createElement("div");
    tall.style.height = "1200px";
    stage.append(tall);

    const host = document.createElement("div");
    host.id = "collapse-host";
    document.body.append(stage, host);

    const iconButton = (label: string): HTMLElement =>
      w.mtrl.createIconButton({ icon, ariaLabel: label }).element;

    const underline = w.mtrl.createButton({ icon, text: "Underline" }).element;
    underline.id = "collapse-underline";
    const plain = w.mtrl.createButton({ text: "Plain" }).element;
    plain.id = "collapse-plain";

    const main = w.mtrl.createToolbar({
      ariaLabel: "Collapsing",
      scrollBehavior: "collapse",
      scrollTarget: stage,
      items: [iconButton("Bold"), iconButton("Italic"), underline, plain],
    });
    main.element.id = "collapse-main";
    host.append(main.element);

    // A 56px item is taller than the collapsed floor: a min-height cannot cut it.
    const tallItem = document.createElement("div");
    tallItem.style.cssText = "width:56px;height:56px";
    const tallToolbar = w.mtrl.createToolbar({
      ariaLabel: "Tall item",
      scrollBehavior: "collapse",
      scrollTarget: stage,
      items: [tallItem],
    });
    tallToolbar.element.id = "collapse-tall";
    host.append(tallToolbar.element);

    // A floating toolbar has no collapse: the value has no effect on it.
    const floating = w.mtrl.createToolbar({
      ariaLabel: "Floating",
      variant: "floating",
      placement: "bottom",
      scrollBehavior: "collapse",
      scrollTarget: stage,
      items: [iconButton("Float")],
    });
    floating.element.id = "collapse-floating";
    host.append(floating.element);

    w.collapseToolbars = [main, tallToolbar, floating];
    w.collapseClicks = 0;
    (main.getItems()[0] as HTMLElement).addEventListener("click", () => {
      w.collapseClicks = (w.collapseClicks ?? 0) + 1;
    });
  }, icon);
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve(null))));

  const scrollTo = (y: number): Promise<void> =>
    page.evaluate((y) => {
      const stage = document.getElementById("collapse-scroll") as HTMLElement;
      stage.scrollTop = y;
      stage.dispatchEvent(new Event("scroll"));
    }, y);

  assert.equal(await settled(page, "collapse-main"), 64, "the expanded bar is 64px");
  assert.equal(await settled(page, "collapse-floating"), 64, "a floating bar is 64px");
  check("toolbar collapse: the docked bar starts at its 64px height");

  await scrollTo(120);
  assert.equal(await settled(page, "collapse-main"), 48, "the collapsed bar is 48px");
  check("toolbar collapse: scrolling forward shrinks the docked bar to 48px");

  // The icon+label item shows its icon alone; its label stays the name. The
  // label-only item keeps its label and never becomes an empty pill.
  const labels = await page.evaluate(() => {
    const read = (id: string): { width: number; height: number; position: string; content: string } => {
      const text = document.getElementById(id)!.querySelector(".mtrl-button__text") as HTMLElement;
      const box = text.getBoundingClientRect();
      return { width: box.width, height: box.height, position: getComputedStyle(text).position, content: text.textContent ?? "" };
    };
    const shape = (id: string) => {
      const button = document.getElementById(id) as HTMLElement;
      const box = button.getBoundingClientRect();
      const style = getComputedStyle(button);
      return {
        width: box.width,
        height: box.height,
        paddingInline: `${style.paddingLeft} ${style.paddingRight}`,
      };
    };
    return { underlined: read("collapse-underline"), plain: read("collapse-plain"), shapes: { underlined: shape("collapse-underline"), plain: shape("collapse-plain") } };
  });
  assert.deepEqual(labels.underlined, { width: 1, height: 1, position: "absolute", content: "Underline" });
  assert(labels.plain.width > 1 && labels.plain.position !== "absolute", "a label-only item keeps its label");
  assert.deepEqual(labels.shapes.underlined, { width: 48, height: 40, paddingInline: "12px 12px" });
  assert.equal(labels.shapes.plain.height, 40);
  assert.equal(labels.shapes.plain.paddingInline, "16px 16px");
  assert(labels.shapes.plain.width >= 58, `a label-only item keeps its inline size, not ${labels.shapes.plain.width}`);
  assert.equal(await page.locator("#collapse-main").getByRole("button", { name: "Underline" }).count(), 1);
  assert.equal(await page.locator("#collapse-main").getByRole("button", { name: "Plain" }).count(), 1);
  assert.equal(await page.locator("#collapse-main").getByRole("button", { name: "Bold" }).count(), 1);
  check("toolbar collapse: an icon+label item shows its icon at the target size, a label-only item keeps its label");

  // The s icon button is 40px; its 48x48 target reaches the bar's top edge.
  const hit = await page.evaluate(() => {
    const bar = document.querySelector("#collapse-main .mtrl-toolbar__bar") as HTMLElement;
    const button = document.querySelector("#collapse-main .mtrl-icon-button") as HTMLElement;
    const barBox = bar.getBoundingClientRect();
    const buttonBox = button.getBoundingClientRect();
    const above = document.elementFromPoint(buttonBox.left + buttonBox.width / 2, barBox.top + 1);
    return {
      barHeight: barBox.height,
      buttonHeight: buttonBox.height,
      gapAbove: buttonBox.top - barBox.top,
      hitIsButton: Boolean(above?.closest(".mtrl-icon-button")),
    };
  });
  assert.deepEqual(hit, { barHeight: 48, buttonHeight: 40, gapAbove: 4, hitIsButton: true });
  const centre = await page.evaluate(() => {
    const bar = document.querySelector("#collapse-main .mtrl-toolbar__bar") as HTMLElement;
    const button = document.querySelector("#collapse-main .mtrl-icon-button") as HTMLElement;
    const barBox = bar.getBoundingClientRect();
    const buttonBox = button.getBoundingClientRect();
    return { x: buttonBox.left + buttonBox.width / 2, y: barBox.top + 3 };
  });
  await page.mouse.click(centre.x, centre.y);
  assert.equal(await page.evaluate(() => (window as unknown as CollapseWindow).collapseClicks), 1);
  check("toolbar collapse: an s item keeps its 48x48 target inside the 48px bar");

  // A taller item keeps the bar at its own height; min-height is only a floor.
  assert.equal(await settled(page, "collapse-tall"), 56, "a 56px item holds the bar at 56px");
  check("toolbar collapse: a 56px item holds the collapsed bar at its own height");

  assert.equal(
    await page.evaluate(() => document.getElementById("collapse-floating")!.classList.contains("mtrl-toolbar--collapsed")),
    false,
    "a floating toolbar never takes the collapsed class"
  );
  assert.equal(await settled(page, "collapse-floating"), 64, "a floating bar keeps its height");
  check("toolbar collapse: a floating toolbar ignores the value");

  await page.emulateMedia({ reducedMotion: "reduce" });
  const durations = await page.evaluate(() => {
    const root = document.getElementById("collapse-main") as HTMLElement;
    const bar = root.querySelector(".mtrl-toolbar__bar") as HTMLElement;
    return { root: getComputedStyle(root).transitionDuration, bar: getComputedStyle(bar).transitionDuration };
  });
  for (const value of [durations.root, durations.bar]) {
    assert(value.split(",").every((part) => parseFloat(part) <= 0.001), `reduced motion keeps the duration at 0.01ms, not ${value}`);
  }
  await page.emulateMedia({ reducedMotion: null });
  check("toolbar collapse: reduced motion settles the height at once");

  // The element path: the state the factory keeps inside its shadow root is
  // mirrored onto the host, where a slotted button's own shadow sheet reads it.
  await page.evaluate((icon) => {
    window.scrollTo(0, 0);
    const spacer = document.createElement("div");
    spacer.id = "collapse-spacer";
    spacer.style.height = "2000px";
    const toolbar = document.createElement("m-toolbar") as HTMLElement & { component?: unknown };
    toolbar.id = "collapse-element";
    toolbar.setAttribute("scroll-behavior", "collapse");
    toolbar.setAttribute("aria-label", "Element collapsing");
    const pair = document.createElement("m-button");
    pair.id = "collapse-element-icon";
    pair.setAttribute("label", "Both");
    pair.setAttribute("icon", icon);
    const plain = document.createElement("m-button");
    plain.id = "collapse-element-text";
    plain.setAttribute("label", "Slotted");
    toolbar.append(pair, plain);
    document.body.append(spacer, toolbar);
    const seen: Array<{ name: string; target: string; detail: unknown; composed: boolean }> = [];
    (window as unknown as { collapseElementSeen?: unknown[] }).collapseElementSeen = seen;
    for (const name of ["collapse", "expand"]) {
      toolbar.addEventListener(name, (event) => {
        const custom = event as CustomEvent;
        seen.push({ name, target: (event.target as HTMLElement).id, detail: custom.detail, composed: custom.composed });
      });
    }
  }, icon);
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve(null))));

  const elementState = () => page.evaluate(() => {
    const toolbar = document.getElementById("collapse-element") as HTMLElement & { shadowRoot: ShadowRoot };
    const bar = toolbar.shadowRoot.querySelector(".mtrl-toolbar__bar") as HTMLElement;
    const texts = ["collapse-element-icon", "collapse-element-text"].map((id) => {
      const host = document.getElementById(id) as HTMLElement & { shadowRoot: ShadowRoot };
      const text = host?.shadowRoot?.querySelector(".mtrl-button__text") as HTMLElement | null;
      const box = text?.getBoundingClientRect();
      return {
        id,
        hidden: text ? getComputedStyle(text).position === "absolute" && (box?.width ?? 0) <= 1 : null,
        content: text?.textContent ?? null,
      };
    });
    return {
      hostClass: toolbar.classList.contains("mtrl-toolbar--collapsed"),
      innerClass: toolbar.shadowRoot.firstElementChild?.classList.contains("mtrl-toolbar--collapsed") ?? null,
      barHeight: bar.getBoundingClientRect().height,
      texts,
      seen: (window as unknown as { collapseElementSeen?: unknown[] }).collapseElementSeen ?? [],
    };
  });

  /** The element's shadow bar, once its min-height transition has settled: five frames at one height. */
  const elementSettled = (): Promise<number> =>
    page.evaluate(async () => {
      const toolbar = document.getElementById("collapse-element") as HTMLElement & { shadowRoot: ShadowRoot };
      const bar = toolbar.shadowRoot.querySelector(".mtrl-toolbar__bar") as HTMLElement;
      let last = -1;
      let stable = 0;
      for (let frame = 0; frame < 240 && stable < 5; frame++) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
        const height = bar.getBoundingClientRect().height;
        stable = Math.abs(height - last) < 0.01 ? stable + 1 : 0;
        last = height;
      }
      return last;
    });

  assert.equal((await elementState()).barHeight, 64, "the element's bar starts at 64px");
  await page.evaluate(() => window.scrollTo(0, 240));
  await page.waitForFunction(() => document.getElementById("collapse-element")?.classList.contains("mtrl-toolbar--collapsed"), null, { timeout: 5000 });
  // The class lands when the state flips; the height transition is still
  // running. Read the bar only once it has stopped moving.
  assert.equal(await elementSettled(), 48, "the element's bar settles at 48px");
  const collapsed = await elementState();
  assert.equal(collapsed.hostClass, true, "the collapsed class is mirrored onto the host");
  assert.equal(collapsed.innerClass, true, "the internal root keeps the collapsed class");
  assert.equal(collapsed.barHeight, 48, "the element's bar collapses to 48px");
  assert.deepEqual(collapsed.texts, [
    { id: "collapse-element-icon", hidden: true, content: "Both" },
    { id: "collapse-element-text", hidden: false, content: "Slotted" },
  ]);
  assert.equal(await page.locator("#collapse-element").getByRole("button", { name: "Both" }).count(), 1);
  assert.equal(await page.locator("#collapse-element").getByRole("button", { name: "Slotted" }).count(), 1);
  assert.deepEqual(collapsed.seen, [{ name: "collapse", target: "collapse-element", detail: null, composed: true }]);
  check("toolbar collapse: <m-toolbar> mirrors the state onto its host, dispatches collapse, and slotted labels follow");

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForFunction(() => !document.getElementById("collapse-element")?.classList.contains("mtrl-toolbar--collapsed"), null, { timeout: 5000 });
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve(null))));
  const expanded = await elementState();
  assert.equal(expanded.hostClass, false, "the host loses the collapsed class on expand");
  assert.deepEqual(expanded.seen, [
    { name: "collapse", target: "collapse-element", detail: null, composed: true },
    { name: "expand", target: "collapse-element", detail: null, composed: true },
  ]);
  check("toolbar collapse: <m-toolbar> dispatches expand and clears the host class at the top");

  await page.evaluate(() => {
    const w = window as unknown as CollapseWindow;
    w.collapseToolbars?.forEach((toolbar) => toolbar.destroy());
    document.getElementById("collapse-element")?.remove();
    document.getElementById("collapse-spacer")?.remove();
    document.getElementById("collapse-host")?.remove();
    document.getElementById("collapse-scroll")?.remove();
  });
}
