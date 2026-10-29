// scripts/check-menu-browser.ts
/** Synchronous content keeps menu opening, positioning and focus intact. */
import assert from "node:assert/strict";
import type { Page } from "playwright";
import type createMenu from "../src/components/menu";

/**
 * Chromium prints a plain colour as rgb() and a color-mix result as
 * color(srgb r g b / a); one parser for both, in channels the assertions read.
 */
function parseColour(text: string): [number, number, number, number] {
  const rgb = /^rgba?\(\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)$/.exec(text);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3]), rgb[4] === undefined ? 1 : Number(rgb[4])];
  const srgb = /^color\(srgb ([\d.e+-]+) ([\d.e+-]+) ([\d.e+-]+)(?: \/ ([\d.]+))?\)$/.exec(text);
  assert.ok(srgb, `unrecognised colour ${text}`);
  return [Number(srgb[1]) * 255, Number(srgb[2]) * 255, Number(srgb[3]) * 255, srgb[4] === undefined ? 1 : Number(srgb[4])];
}

type MenuWindow = Window & { createMenu: typeof createMenu; menu: ReturnType<typeof createMenu> };

export async function checkMenu(page: Page): Promise<void> {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const initial = await page.evaluate(() => {
    document.body.replaceChildren();
    const state = window as unknown as MenuWindow;
    const opener = document.createElement("button");
    opener.id = "menu-opener";
    opener.textContent = "Edit";
    document.body.append(opener);
    opener.focus();
    state.menu = state.createMenu({ opener, items: [
      { id: "disabled", text: "Unavailable", disabled: true },
      { id: "copy", text: "Copy" },
      { id: "paste", text: "Paste" },
    ] });
    const items = Array.from(state.menu.element.querySelectorAll<HTMLElement>('[role="menuitem"]'));
    const detached = !state.menu.element.isConnected;
    state.menu.open(new KeyboardEvent("keydown", { key: "ArrowDown" }));
    return {
      detached,
      items: items.map(item => [item.textContent, item.tabIndex]),
      opening: [state.menu.element.style.opacity, state.menu.element.getAttribute("aria-hidden"), document.activeElement === opener],
      duration: getComputedStyle(state.menu.element).transitionDuration,
    };
  });
  assert.deepEqual(initial.items, [["Unavailable", -1], ["Copy", 0], ["Paste", -1]], "items and tab stops exist before opening");
  assert.equal(initial.detached, true, "construction does not attach the menu");
  assert.deepEqual(initial.opening, ["0", "true", true], "opening retains its hidden first frame and deferred focus");
  assert.notEqual(initial.duration, "0s", "opening still has a CSS transition");
  await page.waitForFunction(() => document.activeElement?.getAttribute("data-id") === "disabled");
  await page.keyboard.press("ArrowDown");
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("data-id")), "copy", "disabled items remain reachable for reading, followed by enabled items");
  await page.keyboard.press("ArrowDown");
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("data-id")), "paste", "keyboard navigation after opening");
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => document.activeElement?.id === "menu-opener");
  await page.evaluate(() => (window as unknown as MenuWindow).menu.destroy());

  // A caller can attach an initially visible menu and its opener after creation.
  // The old initialization timer protected this measurement boundary.
  const before = await page.evaluate(() => {
    document.body.replaceChildren();
    const state = window as unknown as MenuWindow;
    const opener = document.createElement("button");
    opener.style.cssText = "position:absolute;left:140px;top:80px;width:100px;height:40px";
    let reads = 0;
    const rect = opener.getBoundingClientRect.bind(opener);
    opener.getBoundingClientRect = () => { reads++; return rect(); };
    state.menu = state.createMenu({ opener, visible: true, items: [{ id: "one", text: "One" }] });
    const initialReads = reads;
    document.body.append(opener, state.menu.element);
    return initialReads;
  });
  assert.equal(before, 0, "initially visible positioning waits for attachment");
  await page.waitForFunction(() => (window as unknown as MenuWindow).menu.element.style.top !== "");
  const placed = await page.evaluate(() => {
    const menu = (window as unknown as MenuWindow).menu.element;
    return [parseFloat(menu.style.left), parseFloat(menu.style.top), menu.classList.contains("mtrl-menu--visible")];
  });
  assert.deepEqual(placed, [140, 120, true], "initially visible menu measures the attached opener");
  await page.evaluate(() => { (window as unknown as MenuWindow).menu.destroy(); document.body.replaceChildren(); });
  console.log("Passed packed menu: synchronous items and tab stops; deferred opening, keyboard focus, navigation, Escape restoration and initially visible positioning.");
}

/**
 * Disabled colours on every menu variant. Disabled dims the whole item, not
 * only its label: the icon, supporting text and shortcut share the label's
 * colour at 0.38, and a selected item that is also disabled dims its selection
 * colours the same way rather than staying opaque, with no hover layer for an
 * item that cannot be chosen (m3.material.io/components/menus/specs, disabled
 * state: md.comp.menu.list-item.*.disabled.*, md.comp.menus.standard.menu-item
 * .disabled.* and .selected.disabled.*, md.comp.menus.vibrant.menu-item.disabled.*.
 * The vibrant selected disabled state dims content only: its spec carries no
 * container colour, so the container keeps the enabled selection's).
 */
export async function checkMenuDisabledColors(page: Page): Promise<void> {
  const icon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/></svg>';
  const layouts = [
    { name: "baseline", vertical: false, vibrant: false, roles: {
      enabledLabel: "on-surface", enabledSupport: "on-surface-variant", disabled: "on-surface",
      selectedContainer: "secondary-container", selectedContent: "on-secondary-container",
    } },
    { name: "vertical-standard", vertical: true, vibrant: false, roles: {
      enabledLabel: "on-surface", enabledSupport: "on-surface-variant", disabled: "on-surface",
      selectedContainer: "tertiary-container", selectedContent: "on-tertiary-container",
    } },
    { name: "vertical-vibrant", vertical: true, vibrant: true, roles: {
      enabledLabel: "on-tertiary-container", enabledSupport: "on-tertiary-container", disabled: "on-tertiary-container",
      selectedContainer: "tertiary", selectedContent: "on-tertiary",
    } },
  ] as const;
  const against = (label: string, painted: string, reference: string, opacity: number) => {
    const [pr, pg, pb, pa] = parseColour(painted), referenceChannels = parseColour(reference);
    assert.ok(Math.abs(pr - referenceChannels[0]) <= 1 && Math.abs(pg - referenceChannels[1]) <= 1 && Math.abs(pb - referenceChannels[2]) <= 1,
      `${label}: ${painted}, not ${reference}${opacity < 1 ? " at 0.38" : ""}`);
    assert.ok(Math.abs(pa - opacity) <= 0.01, `${label}: opacity ${pa}, not ${opacity} (${painted})`);
  };
  await page.setViewportSize({ width: 800, height: 600 });
  try {
    for (const layout of layouts) {
      await page.evaluate(({ layout, icon }) => {
        const state = window as unknown as MenuWindow;
        document.body.replaceChildren();
        const opener = document.createElement("button");
        opener.id = "menu-opener";
        opener.textContent = layout.name;
        opener.style.cssText = "position:absolute;left:40px;top:40px;width:120px;height:40px";
        document.body.append(opener);
        const content = (text: string) => ({
          text, icon, shortcut: "Ctrl+C",
          ...(layout.vertical ? { supportingText: "Currently unavailable" } : {}),
        });
        state.menu = state.createMenu({
          opener, visible: true,
          ...(layout.vertical ? { variant: "vertical" as const } : {}),
          ...(layout.vibrant ? { color: "vibrant" as const } : {}),
          items: [
            { id: "disabled", disabled: true, ...content("Unavailable") },
            { id: "selected-disabled", disabled: true, ...content("Pinned") },
            { id: "enabled", ...content("Copy") },
          ],
        });
        state.menu.setSelected("selected-disabled");
        document.body.append(state.menu.element);
      }, { layout, icon });
      await page.waitForFunction(() => (window as unknown as MenuWindow).menu.element.style.top !== "");
      await page.waitForFunction(() => document.getAnimations().length === 0);
      const painted = await page.evaluate((roles) => {
        const menu = (window as unknown as MenuWindow).menu.element;
        const item = (id: string) => menu.querySelector<HTMLElement>(`[data-id="${id}"]`)!;
        const probe = (role: string) => {
          const span = document.createElement("span");
          span.style.color = `var(--mtrl-sys-color-${role})`;
          document.body.append(span);
          const colour = getComputedStyle(span).color;
          span.remove();
          return colour;
        };
        const read = (id: string, part?: string) => {
          const element = part ? item(id).querySelector<HTMLElement>(`.mtrl-menu__item-${part}`) : item(id);
          // A part the layout does not render (supporting text on the baseline
          // menu) has nothing to assert; the guards below skip it.
          if (!element) return { colour: "(absent)", background: "(absent)" };
          return { colour: getComputedStyle(element).color, background: getComputedStyle(element).backgroundColor };
        };
        return {
          references: Object.fromEntries(Object.entries(roles).map(([key, role]) => [key, probe(role)])),
          disabled: { item: read("disabled"), icon: read("disabled", "icon"), supporting: read("disabled", "supporting"), shortcut: read("disabled", "shortcut") },
          selected: { item: read("selected-disabled"), icon: read("selected-disabled", "icon"), supporting: read("selected-disabled", "supporting"), shortcut: read("selected-disabled", "shortcut"), mark: getComputedStyle(item("selected-disabled"), "::after").backgroundColor },
          enabled: { item: read("enabled"), icon: read("enabled", "icon"), supporting: read("enabled", "supporting"), shortcut: read("enabled", "shortcut") },
        };
      }, layout.roles);
      const { name } = layout;
      const { references: ref } = painted;
      // Disabled content: label, icon, supporting text and shortcut all dim with the label.
      against(`${name} disabled label`, painted.disabled.item.colour, ref.disabled, 0.38);
      against(`${name} disabled icon`, painted.disabled.icon.colour, ref.disabled, 0.38);
      if (layout.vertical) against(`${name} disabled supporting text`, painted.disabled.supporting.colour, ref.disabled, 0.38);
      against(`${name} disabled shortcut`, painted.disabled.shortcut.colour, ref.disabled, 0.38);
      // Selected and disabled: the selection's colours at the disabled opacity, throughout the item.
      against(`${name} selected disabled container`, painted.selected.item.background, ref.selectedContainer, name === "vertical-vibrant" ? 1 : 0.38);
      against(`${name} selected disabled label`, painted.selected.item.colour, ref.selectedContent, 0.38);
      against(`${name} selected disabled icon`, painted.selected.icon.colour, ref.selectedContent, 0.38);
      if (layout.vertical) against(`${name} selected disabled supporting text`, painted.selected.supporting.colour, ref.selectedContent, 0.38);
      against(`${name} selected disabled shortcut`, painted.selected.shortcut.colour, ref.selectedContent, 0.38);
      if (name === "baseline") against(`${name} selected disabled mark`, painted.selected.mark, ref.selectedContent, 0.38);
      // Enabled items keep their own colours: the fix dims only the disabled.
      against(`${name} enabled label`, painted.enabled.item.colour, ref.enabledLabel, 1);
      against(`${name} enabled icon`, painted.enabled.icon.colour, ref.enabledSupport, 1);
      if (layout.vertical) against(`${name} enabled supporting text`, painted.enabled.supporting.colour, ref.enabledSupport, 1);
      against(`${name} enabled shortcut`, painted.enabled.shortcut.colour, ref.enabledSupport, 1);
      // Hover: an item that cannot be chosen shows no state layer, selected or not.
      for (const id of layout.vertical ? ["selected-disabled"] : ["disabled", "selected-disabled"]) {
        const box = (await page.locator(`[data-id="${id}"]`).boundingBox())!;
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.waitForFunction(() => document.getAnimations().length === 0);
        const hovered = await page.evaluate((id) => {
          const element = document.querySelector(`[data-id="${id}"]`)!;
          return { hover: element.matches(":hover"), layer: getComputedStyle(element, "::before").opacity };
        }, id);
        assert.ok(hovered.hover, `${name} ${id}: the pointer is not over the item`);
        assert.equal(hovered.layer, "0", `${name} ${id}: the hover state layer is ${hovered.layer}, not 0`);
      }
      await page.evaluate(() => { (window as unknown as MenuWindow).menu.destroy(); document.body.replaceChildren(); });
    }
  } finally {
    await page.setViewportSize({ width: 600, height: 300 });
  }
  console.log("Passed packed menu disabled colours: icon, supporting text and shortcut share the label's 0.38 on baseline, vertical standard and vertical vibrant; selected disabled dims the selection colours; no hover layer on a disabled item.");
}
