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

/**
 * An item that is not rendered cannot take focus, so it is not a keyboard
 * stop: the arrows, Home, End, typeahead and Enter move through and choose the
 * items that are shown. Material asks for exactly those moves — "Initial
 * focus: When a menu opens, focus should be placed on the first menu item",
 * "Up and Down arrows — For open menus: Moves focus to the next item",
 * "Home … Moves focus to the first item", "End … Moves focus to the last
 * item", "Letters — Focus moves to the next menu item starting with letter"
 * and "Space or Enter … Selects a menu item"
 * (m3.material.io/components/menus/accessibility). A `display: none` item is
 * not one of the items shown, and a browser will not focus it.
 *
 * The first, middle and last item of One–Two–Three–Four are hidden in turn.
 * Each case opens the menu with a real ArrowDown, presses real keys, reads the
 * focused item after each press and the item Enter chooses. Where the hidden
 * item is still a stop, focus sticks on the item before it, or never enters the
 * menu at all when the first item is hidden, and Enter chooses that item.
 */
export async function checkMenuHiddenItems(page: Page): Promise<void> {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  type Case = {
    name: string;
    hidden: string;
    opened: string;
    keys: Array<[string, string]>;
    chosen: string;
  };
  const cases: Case[] = [
    {
      name: "middle",
      hidden: "two",
      opened: "one",
      keys: [["End", "four"], ["Home", "one"], ["ArrowDown", "three"], ["ArrowDown", "four"], ["ArrowDown", "one"], ["t", "three"]],
      chosen: "three",
    },
    {
      name: "first",
      hidden: "one",
      opened: "two",
      keys: [["ArrowUp", "four"], ["Home", "two"], ["End", "four"], ["ArrowDown", "two"], ["f", "four"]],
      chosen: "four",
    },
    {
      name: "last",
      hidden: "four",
      opened: "one",
      keys: [["End", "three"], ["ArrowDown", "one"], ["Home", "one"], ["ArrowDown", "two"], ["t", "two"]],
      chosen: "two",
    },
  ];
  for (const { name, hidden, opened, keys, chosen } of cases) {
    const hiddenDisplay = await page.evaluate((hidden) => {
      document.body.replaceChildren();
      const state = window as unknown as MenuWindow & { chosen: string | null };
      state.chosen = null;
      const opener = document.createElement("button");
      opener.id = "menu-opener";
      opener.textContent = "Edit";
      document.body.append(opener);
      opener.focus();
      state.menu = state.createMenu({ opener, items: [
        { id: "one", text: "One" },
        { id: "two", text: "Two" },
        { id: "three", text: "Three" },
        { id: "four", text: "Four" },
      ] });
      const item = state.menu.element.querySelector<HTMLElement>(`[data-id="${hidden}"]`);
      if (item) item.style.display = "none";
      state.menu.on("select", (payload) => { state.chosen = payload.itemId; });
      state.menu.open(new KeyboardEvent("keydown", { key: "ArrowDown" }));
      return item ? getComputedStyle(item).display : "missing";
    }, hidden);
    assert.equal(hiddenDisplay, "none", `menu, ${name} item hidden: the item is display: none, so it cannot be a stop`);
    await page.waitForFunction(() => (window as unknown as MenuWindow).menu.element.classList.contains("mtrl-menu--visible"));
    // Focus is placed after the opening frame; when the first item shown is
    // not the first item declared, a tree that treated the hidden item as a
    // stop leaves focus outside the menu, so wait on the event's own budget
    // rather than on that focus.
    await page.waitForTimeout(250);
    const focused = (): Promise<string | null> => page.evaluate(() => document.activeElement?.getAttribute("data-id") ?? document.activeElement?.id ?? null);
    const at = await focused();
    assert.equal(at, opened, `menu, ${name} item hidden: opening puts focus on ${opened}, the first item shown (${at})`);
    for (const [key, expected] of keys) {
      await page.keyboard.press(key);
      await page.waitForTimeout(120);
      const active = await focused();
      assert.equal(active, expected, `menu, ${name} item hidden: after ${key === "t" ? "typing t" : key} focus is on ${expected} (${active})`);
    }
    await page.keyboard.press("Enter");
    await page.waitForTimeout(150);
    const selected = await page.evaluate(() => (window as unknown as MenuWindow & { chosen: string | null }).chosen);
    assert.equal(selected, chosen, `menu, ${name} item hidden: Enter chooses ${chosen}, the focused item (${selected})`);
    await page.evaluate(() => (window as unknown as MenuWindow).menu.destroy());
  }
  await page.evaluate(() => document.body.replaceChildren());
  console.log("Passed packed menu hidden items: with the first, middle or last item display: none, ArrowDown opens on the first item shown, the arrows, Home, End and typeahead move through the items shown and wrap past the hidden one, and Enter chooses the focused item.");
}

/**
 * A submenu opened after `setItems` serves the replacement, not the list the
 * menu was created with. Material asks the right arrow to open the focused
 * item's submenu — "Left and Right arrows — Opens or closes a submenu"
 * (m3.material.io/components/menus/accessibility) — so the second level it
 * opens belongs to the item on screen, replacement included.
 *
 * Two cases: the replacement keeps the top-level id and changes its children,
 * and it renames the top-level id. On a tree whose second-level handler finds
 * the parent item in the creation-time list, the first opens the old second
 * level and focuses its old child, and the second opens nothing at all.
 */
export async function checkMenuSubmenuSetItems(page: Page): Promise<void> {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const original = [
    { id: "one", text: "One" },
    { id: "two", text: "Two", hasSubmenu: true, submenu: [
      { id: "two-a", text: "Two A" },
      { id: "two-b", text: "Two B", hasSubmenu: true, submenu: [
        { id: "old-child", text: "Old child" },
      ] },
    ] },
    { id: "three", text: "Three" },
  ];
  const replacement = (rootId: string) => [
    { id: "one", text: "One" },
    { id: rootId, text: "Two", hasSubmenu: true, submenu: [
      { id: "new-a", text: "New A" },
      { id: "new-b", text: "New B", hasSubmenu: true, submenu: [
        { id: "new-child", text: "New child" },
      ] },
    ] },
    { id: "three", text: "Three" },
  ];
  const focused = (): Promise<string | null> =>
    page.evaluate(() => document.activeElement?.getAttribute("data-id") ?? null);
  const level = (depth: string) =>
    page.evaluate((depth) => {
      const menus = Array.from(
        document.querySelectorAll<HTMLElement>(".mtrl-menu--submenu"),
      ).filter((menu) =>
        menu.getAttribute("data-level") === depth &&
        menu.classList.contains("mtrl-menu--visible"),
      );
      const shown = menus[0];
      return {
        count: menus.length,
        parent: shown?.getAttribute("data-parent-item") ?? null,
        items: shown
          ? Array.from(shown.querySelectorAll<HTMLElement>(".mtrl-menu__item"))
            .map((item) => item.getAttribute("data-id"))
          : [],
      };
    }, depth);
  for (const { name, rootId } of [
    { name: "changed child", rootId: "two" },
    { name: "renamed root", rootId: "deux" },
  ]) {
    await page.evaluate(({ original, replacement }) => {
      document.body.replaceChildren();
      const state = window as unknown as MenuWindow;
      const opener = document.createElement("button");
      opener.id = "menu-opener";
      opener.textContent = "Edit";
      document.body.append(opener);
      opener.focus();
      state.menu = state.createMenu({ opener, items: original });
      state.menu.setItems(replacement);
      state.menu.open(new KeyboardEvent("keydown", { key: "ArrowDown" }));
    }, { original, replacement: replacement(rootId) });
    await page.waitForFunction(() =>
      (window as unknown as MenuWindow).menu.element.classList.contains("mtrl-menu--visible"));
    // The opening frame places focus, and the nested-item feature is fetched
    // at creation; this is the budget the probe used to see both settled.
    await page.waitForTimeout(450);
    let at = await focused();
    assert.equal(at, "one",
      `menu setItems, ${name}: opening focuses the replacement's first item (${at})`);
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(150);
    at = await focused();
    assert.equal(at, rootId,
      `menu setItems, ${name}: ArrowDown reaches ${rootId} (${at})`);
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(650);
    const first = await level("1");
    assert.deepEqual([first.count, first.parent, first.items], [1, rootId, ["new-a", "new-b"]],
      `menu setItems, ${name}: ArrowRight opens the replacement's first level (parent ${first.parent}, items ${first.items?.join(", ")})`);
    at = await focused();
    assert.equal(at, "new-a",
      `menu setItems, ${name}: focus enters the first level it opened (${at})`);
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(150);
    at = await focused();
    assert.equal(at, "new-b",
      `menu setItems, ${name}: ArrowDown reaches the replaced second-level item (${at})`);
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(650);
    const second = await level("2");
    assert.deepEqual([second.count, second.parent, second.items], [1, "new-b", ["new-child"]],
      `menu setItems, ${name}: ArrowRight on new-b opens its new child (parent ${second.parent}, items ${second.items?.join(", ") || "none"})`);
    at = await focused();
    assert.equal(at, "new-child",
      `menu setItems, ${name}: focus enters the second level it opened (${at})`);
    await page.evaluate(() => (window as unknown as MenuWindow).menu.destroy());
  }
  await page.evaluate(() => document.body.replaceChildren());
  console.log("Passed packed menu setItems submenus: after setItems changes a top-level item's children or renames the item, ArrowRight opens the replacement's levels and focuses its items.");
}
