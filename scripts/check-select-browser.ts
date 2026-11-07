/**
 * The select's menu, rendered from the packed CSS: in the factory's default
 * layer (the menu inside the select's element), in the top layer, and in
 * `<m-select>`, which always uses the top layer.
 *
 * - The menu is the field's width, whatever the layer (Compose
 *   `exposedDropdownSize(matchAnchorWidth = true)`), and never under the
 *   112dp the site gives a menu ("Container width 112dp min").
 * - The selected option's mark is at the item's end, clear of its text, in
 *   both directions.
 * - The selected option has the M3 colours in every layer:
 *   `md.comp.menu.list-item.selected.container.color` is secondary-container,
 *   `…selected.label-text.color` on-secondary-container (m3.material.io token
 *   table; Compose `MenuTokens.ListItemSelectedContainerColor`).
 *
 * Each select is given its width, so the check does not depend on how an
 * unsized select sizes itself.
 *
 * The last check is the keyboard focus ring of the active option: focus stays
 * in the combobox input, so the ring is a marker the select writes and the
 * stylesheet draws.
 */
import assert from "node:assert/strict";
import type { Page } from "playwright";
import { parseColour } from "./check-menu-browser";

type SelectWindow = Window & {
  createSelect: (config: Record<string, unknown>) => { element: HTMLElement; open: () => unknown; close: () => unknown; destroy: () => void };
  setComponentDefaults?: (component: "menu", config: Record<string, unknown>) => void;
};
type Row = {
  name: string;
  baseline: boolean;
  field: number;
  menu: { width: number; start: number; end: number };
  mark: { end: number; overlap: number } | null;
  selected: { background: string; color: string; borderRadius: string };
  roles: { background: string; color: string };
};

export async function checkSelectMenu(page: Page, api: "factory" | "factory-top" | "element"): Promise<void> {
  const rows = await page.evaluate(async (api) => {
    const options = [{ id: "cat", text: "Cat" }, { id: "dog", text: "Dog" }];
    const role = (name: string): string => {
      const probe = document.createElement("i");
      probe.style.color = `var(--mtrl-sys-color-${name})`;
      document.body.append(probe);
      const value = getComputedStyle(probe).color;
      probe.remove();
      return value;
    };
    const round = (value: number) => Math.round(value * 100) / 100;
    const rows: Row[] = [];
    const cases: Array<{ dir: "ltr" | "rtl"; width: number; baseline: boolean }> = [
      ...(["ltr", "rtl"] as const).flatMap((dir) => [100, 200, 280, 400].map((width) => ({ dir, width, baseline: false }))),
      ...(["ltr", "rtl"] as const).map((dir) => ({ dir, width: 280, baseline: true })),
    ];
    for (const { dir, width, baseline } of cases) {
      const cell = document.createElement("div");
      cell.dir = dir;
      cell.style.cssText = "position:absolute;top:24px;left:24px;right:24px";
      document.body.append(cell);
      let select: { open: () => unknown; close: () => unknown; destroy?: () => void };
      let scope: ParentNode;
      const win = window as unknown as SelectWindow;
      if (baseline && api === "element") win.setComponentDefaults?.("menu", { variant: "baseline" });
      try {
        if (api === "element") {
          const host = document.createElement("m-select");
          host.setAttribute("label", "Pet");
          host.setAttribute("value", "cat");
          host.style.width = `${width}px`;
          for (const option of options) {
            const declared = document.createElement("m-select-option");
            declared.setAttribute("value", option.id);
            declared.setAttribute("label", option.text);
            host.append(declared);
          }
          cell.append(host);
          await new Promise((resolve) => setTimeout(resolve, 100));
          select = (host as unknown as { component: typeof select }).component;
          scope = host.shadowRoot as ShadowRoot;
        } else {
          const made = win.createSelect({
            label: "Pet",
            value: "cat",
            options,
            ...(api === "factory-top" ? { layer: "top" } : {}),
            ...(baseline ? { menu: { variant: "baseline" } } : {}),
          });
          made.element.style.width = `${width}px`;
          cell.append(made.element);
          select = made;
          scope = cell;
        }
        select.open();
        // Past the menu's opening transition
        await new Promise((resolve) => setTimeout(resolve, 450));
      } finally {
        if (baseline && api === "element") win.setComponentDefaults?.("menu", {});
      }
      const rtl = dir === "rtl";
      const field = (scope.querySelector(".mtrl-text-field__field") as HTMLElement).getBoundingClientRect();
      const menuElement = scope.querySelector(".mtrl-select__menu") as HTMLElement;
      // These assertions measure settled geometry and colours. A busy CI frame
      // can leave the selected corner transition just short of its final 12px.
      menuElement.getAnimations({ subtree: true }).forEach((animation) => animation.finish());
      const menu = menuElement.getBoundingClientRect();
      const item = scope.querySelector(".mtrl-menu__item--selected") as HTMLElement;
      const box = item.getBoundingClientRect();
      const style = getComputedStyle(item);
      const after = getComputedStyle(item, "::after");
      const range = document.createRange();
      range.selectNodeContents(item);
      const text = range.getBoundingClientRect();
      // The mark's box, from its own used left, margin and width inside the item
      const left = box.left + parseFloat(after.left) + parseFloat(after.marginLeft);
      const right = left + parseFloat(after.width);
      rows.push({
        name: `${dir}, ${width}px${baseline ? " (baseline)" : ""}`,
        baseline,
        field: round(field.width),
        menu: { width: round(menu.width), start: round(rtl ? field.right - menu.right : menu.left - field.left), end: round(rtl ? menu.left - field.left : field.right - menu.right) },
        mark: after.content === "none" ? null : { end: round(rtl ? left - box.left : box.right - right), overlap: round(Math.max(0, Math.min(text.right, right) - Math.max(text.left, left))) },
        selected: { background: style.backgroundColor, color: style.color, borderRadius: style.borderRadius },
        roles: baseline
          ? { background: role("secondary-container"), color: role("on-secondary-container") }
          : { background: role("tertiary-container"), color: role("on-tertiary-container") },
      });
      select.close();
      await new Promise((resolve) => setTimeout(resolve, 350));
      select.destroy?.();
      cell.remove();
    }
    return rows;
  }, api) as Row[];

  assert.equal(rows.length, 10);
  // Every failure is reported, not only the first
  const failures: string[] = [];
  const expect = (ok: boolean, message: string): void => { if (!ok) failures.push(message); };
  for (const row of rows) {
    const width = Math.max(row.field, 112);
    expect(row.menu.width === width, `${row.name}: the menu is ${width}px wide, as its ${row.field}px field${row.field < 112 ? " but not under 112" : ""} (${row.menu.width})`);
    // A field under 112px has a menu wider than itself: which edge that menu
    // keeps is the menu's own placement, not measured here
    if (row.field >= 112) {
      expect(row.menu.start === 0, `${row.name}: the menu starts at the field's start edge (${row.menu.start})`);
      expect(row.menu.end === 0, `${row.name}: the menu ends at the field's end edge (${row.menu.end})`);
    }
    if (row.baseline) {
      expect(row.mark !== null, `${row.name}: the baseline selected option has a mark`);
      if (row.mark) {
        expect(row.mark.end === 12, `${row.name}: the mark is 12px from the item's end (${row.mark.end})`);
        expect(row.mark.overlap === 0, `${row.name}: the mark is clear of the option's text (${row.mark.overlap}px over it)`);
      }
      expect(row.selected.background === row.roles.background, `${row.name}: the baseline selected option is on secondary-container (${row.selected.background})`);
      expect(row.selected.color === row.roles.color, `${row.name}: the baseline selected option's text is on-secondary-container (${row.selected.color})`);
    } else {
      expect(row.mark === null, `${row.name}: the vertical selected option suppresses the trailing mark`);
      expect(row.selected.borderRadius === "12px", `${row.name}: the vertical selected option rounds to 12px (${row.selected.borderRadius})`);
      expect(row.selected.background === row.roles.background, `${row.name}: the vertical selected option is on tertiary-container (${row.selected.background})`);
      expect(row.selected.color === row.roles.color, `${row.name}: the vertical selected option's text is on-tertiary-container (${row.selected.color})`);
    }
  }
  assert.deepEqual(failures, [], `${failures.length} of the select menu assertions failed`);
  console.log(`Passed select menu (${api}): 8 default vertical selects (100 to 400px, tertiary-container, 12px radius, no trailing mark) and 2 baseline selects (secondary-container, 12px trailing mark), left to right and right to left.`);
}

/**
 * An unsized select is as wide as an unsized text field: 280px
 * (`TextFieldDefaults.MinWidth`), whatever holds it, and the same
 * for the factory and for `<m-select>`. The factory's select took its
 * container's width (`.mtrl-select { width: 100% }`): 200, 400 and 1000px
 * here, where the text field and `<m-select>` were 280 in all three.
 */
export async function checkSelectWidth(page: Page, api: "factory" | "element"): Promise<void> {
  const widths = await page.evaluate(async (api) => {
    const options = [{ id: "cat", text: "Cat" }];
    const out: Record<string, number> = {};
    for (const [name, css] of [["200px container", "width:200px"], ["400px container", "width:400px"], ["unconstrained", ""]] as const) {
      const box = document.createElement("div");
      box.style.cssText = css;
      document.body.append(box);
      let root: HTMLElement;
      let destroy = (): void => {};
      if (api === "element") {
        const host = document.createElement("m-select");
        host.setAttribute("label", "Pet");
        const declared = document.createElement("m-select-option");
        declared.setAttribute("value", "cat");
        declared.setAttribute("label", "Cat");
        host.append(declared);
        box.append(host);
        await new Promise((resolve) => setTimeout(resolve, 100));
        root = host.shadowRoot?.firstElementChild as HTMLElement;
      } else {
        const select = (window as unknown as SelectWindow).createSelect({ label: "Pet", options });
        box.append(select.element);
        root = select.element;
        destroy = () => select.destroy();
      }
      out[name] = Math.round(root.getBoundingClientRect().width * 100) / 100;
      destroy();
      box.remove();
    }
    return out;
  }, api);
  assert.deepEqual(widths, { "200px container": 280, "400px container": 280, unconstrained: 280 },
    `an unsized select (${api}) is 280px wide in any container, as an unsized text field is`);
  console.log(`Passed select width (${api}): 280px in a 200px, a 400px and an unconstrained container.`);
}

/**
 * An option that is not rendered is not a keyboard stop either. The combobox
 * marks the selected option when it opens, ArrowDown, ArrowUp, Home, End and
 * typeahead move the active option through the options shown, and Enter
 * chooses the active one. The WAI-ARIA listbox pattern's keyboard rules are
 * "Down Arrow: Moves focus to the next option", "Home (Optional): Moves focus
 * to first option", "End (Optional): Moves focus to last option" and "Type a
 * character: focus moves to the next item with a name that starts with the
 * typed character" (w3.org/WAI/ARIA/apg/patterns/listbox, read 2026-11-01). The
 * active option is the one `aria-activedescendant` names, and a `display: none`
 * element cannot take focus, so it cannot be that option.
 *
 * The first, middle and last of Cat–Dog–Fox are hidden in turn, and once the
 * selected option itself. Each case opens with a real ArrowDown on the field
 * and reads `aria-activedescendant` after each real key press, then what Enter
 * commits. Where the hidden option is still a stop, it becomes the active
 * option and Enter commits it — a value nobody could see.
 */
export async function checkSelectHiddenOptions(page: Page): Promise<void> {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  type Combobox = {
    element: HTMLElement;
    getValue: () => string | null;
    on: (event: "change", handler: (payload: { value: unknown }) => void) => unknown;
    destroy: () => void;
  };
  type Case = { name: string; hidden: string; value: string; keys: Array<[string, string]>; chosen: string | null };
  const cases: Case[] = [
    { name: "middle", hidden: "dog", value: "cat", keys: [["ArrowDown", "fox"], ["ArrowUp", "cat"], ["End", "fox"], ["Home", "cat"], ["f", "fox"]], chosen: "fox" },
    { name: "first", hidden: "cat", value: "dog", keys: [["ArrowUp", "dog"], ["Home", "dog"], ["End", "fox"], ["ArrowDown", "fox"], ["f", "fox"]], chosen: "fox" },
    { name: "last", hidden: "fox", value: "cat", keys: [["ArrowDown", "dog"], ["End", "dog"], ["Home", "cat"], ["ArrowDown", "dog"], ["ArrowUp", "cat"], ["d", "dog"]], chosen: "dog" },
    // The selected option is the hidden one: opening marks nothing, and Enter
    // keeps the value the field shows instead of choosing an option unseen.
    { name: "selected", hidden: "dog", value: "dog", keys: [], chosen: null },
  ];
  for (const { name, hidden, value, keys, chosen } of cases) {
    await page.evaluate((value) => {
      document.body.replaceChildren();
      const state = window as unknown as { createSelect: (config: Record<string, unknown>) => Combobox; select: Combobox; changes: string[] };
      state.changes = [];
      const select = state.createSelect({ label: "Pet", value, options: [
        { id: "cat", text: "Cat" },
        { id: "dog", text: "Dog" },
        { id: "fox", text: "Fox" },
      ] });
      select.element.style.cssText = "position:absolute;top:24px;left:24px;width:280px";
      document.body.append(select.element);
      state.select = select;
      select.on("change", (payload) => state.changes.push(String(payload.value)));
      (select.element.querySelector("input") as HTMLInputElement).focus();
    }, value);
    // The menu, and its options, are placed on the first open.
    await page.keyboard.press("ArrowDown");
    await page.waitForFunction(() => {
      const state = window as unknown as { select: Combobox };
      return !!state.select.element.querySelector(".mtrl-select__menu")?.classList.contains("mtrl-menu--visible");
    });
    // The active option is placed after the opening frame.
    await page.waitForTimeout(250);
    // A consumer hides an option with display: none.
    const hiddenDisplay = await page.evaluate((hidden) => {
      const state = window as unknown as { select: Combobox };
      const option = state.select.element.querySelector<HTMLElement>(`[data-id="${hidden}"]`);
      if (option) option.style.display = "none";
      return option ? getComputedStyle(option).display : "missing";
    }, hidden);
    assert.equal(hiddenDisplay, "none", `select, ${name} option hidden: the option is display: none, so it cannot take focus`);
    const read = (): Promise<string | null> => page.evaluate(() => {
      const state = window as unknown as { select: Combobox };
      const input = state.select.element.querySelector("input") as HTMLInputElement;
      const id = input.getAttribute("aria-activedescendant");
      const active = id ? document.getElementById(id) : null;
      return active ? active.getAttribute("data-id") : null;
    });
    if (name === "selected") {
      // Close, and open again on the selected option, which is now hidden.
      await page.keyboard.press("Escape");
      await page.waitForTimeout(400);
      await page.keyboard.press("ArrowDown");
      await page.waitForTimeout(250);
    }
    const opened = await read();
    assert.equal(opened, name === "selected" ? null : value,
      `select, ${name} option hidden: opening marks ${name === "selected" ? "no option" : `the shown selected option ${value}`} (${opened})`);
    for (const [key, expected] of keys) {
      await page.keyboard.press(key);
      await page.waitForTimeout(120);
      const active = await read();
      assert.equal(active, expected, `select, ${name} option hidden: after ${key === "f" || key === "d" ? `typing ${key}` : key} the active option is ${expected} (${active})`);
    }
    await page.keyboard.press("Enter");
    await page.waitForTimeout(180);
    const after = await page.evaluate(() => {
      const state = window as unknown as { select: Combobox; changes: string[] };
      return { changes: state.changes.splice(0), value: state.select.getValue() };
    });
    assert.deepEqual(after, { changes: chosen === null ? [] : [chosen], value: chosen ?? value },
      `select, ${name} option hidden: Enter commits ${chosen ?? `nothing, keeping ${value}`} (${JSON.stringify(after)})`);
    await page.evaluate(() => (window as unknown as { select: Combobox }).select.destroy());
  }
  await page.evaluate(() => document.body.replaceChildren());
  console.log("Passed packed select hidden options: with the first, middle or last option display: none, opening marks the selected option that is shown, ArrowDown, ArrowUp, Home, End and typeahead skip the hidden one, Enter commits the active visible option, and a hidden selected option leaves nothing active so Enter changes nothing.");
}

type Ring = {
  id: string | null;
  keyboardActive: boolean;
  outlineStyle: string;
  outlineWidth: string;
  outlineOffset: string;
  outlineColor: string;
  background: string;
};
type Snapshot = {
  focusOnInput: boolean;
  activeClassId: string | null;
  activeDescendantId: string | null;
  ring: Ring | null;
  others: Ring[];
  secondary: string;
  menuBackground: string;
};

/** WCAG 2.x relative luminance, from the channels {@link parseColour} reads. */
const luminance = (red: number, green: number, blue: number): number => {
  const channel = (value: number): number => {
    const scaled = value / 255;
    return scaled <= 0.04045 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
};

const contrastRatio = (foreground: string, background: string): number => {
  const [r1, g1, b1] = parseColour(foreground);
  const [r2, g2, b2] = parseColour(background);
  const [high, low] = [luminance(r1, g1, b1), luminance(r2, g2, b2)].sort((a, b) => b - a);
  return (high + 0.05) / (low + 0.05);
};

/**
 * The active option of a keyboard-operated select draws the M3 focus
 * indicator. Focus never leaves the combobox input (WAI-ARIA select-only
 * combobox), so `:focus-visible` never matches the option the keyboard is on;
 * before this check that option carried only the 10% on-surface focus state
 * layer — no perimeter, and two points of alpha from the 8% hover tint, so a
 * sighted keyboard user could not tell it from a hovered option.
 *
 * WCAG 2.4.7 (Focus Visible, AA) is met for the widget by the input's own
 * ring, but the option `aria-activedescendant` names is what Enter chooses,
 * and a tint is not a focus indicator. WCAG 2.4.11 (Focus Not Obscured,
 * Minimum, AA) wants the indicator inside the menu's scrolling list rather
 * than clipped at its edge, which the inward offset does. WCAG 2.4.13 (Focus
 * Appearance, AAA) wants a 2px perimeter at 3:1; the 3dp secondary ring gives
 * it, and its contrast against the option's own background
 * (surface-container, or secondary-container for the selected option) is
 * measured here in light and dark.
 *
 * The ring is drawn for keyboard navigation only: a pointer opening marks the
 * selected option and paints no ring, hovering paints none, and the first key
 * press moves the ring to the option it reaches. Light, dark and
 * forced-colors modes each check the ring on the active option, none on the
 * other options, the marker following ArrowDown, no ring on a pointer opening
 * or on hover, and the ring appearing when the keyboard takes over a menu the
 * pointer opened.
 */
export async function checkSelectActiveOptionFocusRing(page: Page): Promise<void> {
  type Combobox = { element: HTMLElement; destroy: () => void };
  type State = Window & { createSelect: SelectWindow["createSelect"]; select?: Combobox };
  const modes = [
    { name: "light", themeMode: "light", forcedColors: "none" as const },
    { name: "dark", themeMode: "dark", forcedColors: "none" as const },
    { name: "forced-colors", themeMode: "light", forcedColors: "active" as const },
  ] as const;

  const mount = (themeMode: string) => page.evaluate((themeMode) => {
    const state = window as unknown as State;
    state.select?.destroy();
    document.body.replaceChildren();
    // The mode needs both attributes: with no data-theme the baseline
    // theme's dark block does not match, and the page stays light
    document.documentElement.setAttribute("data-theme", "baseline");
    document.documentElement.setAttribute("data-theme-mode", themeMode);
    state.select = state.createSelect({
      label: "Pet",
      value: "cat",
      options: [
        { id: "cat", text: "Cat" },
        { id: "dog", text: "Dog" },
        { id: "fox", text: "Fox" },
      ],
    });
    state.select.element.style.cssText = "position:absolute;left:24px;top:24px;width:280px";
    document.body.append(state.select.element);
    (state.select.element.querySelector("input") as HTMLInputElement).focus();
  }, themeMode);

  const waitOpen = () => page.waitForFunction(() => {
    const state = window as unknown as State;
    const menu = state.select?.element.querySelector(".mtrl-select__menu");
    return !!menu?.classList.contains("mtrl-menu--visible") && !!state.select?.element.querySelector(".mtrl-menu__item--active");
  });

  const waitClosed = () => page.waitForFunction(() =>
    !(window as unknown as State).select?.element.querySelector(".mtrl-select__menu")?.classList.contains("mtrl-menu--visible"));

  const snapshot = (): Promise<Snapshot> => page.evaluate(() => {
    const state = window as unknown as State;
    const select = state.select!;
    const input = select.element.querySelector("input") as HTMLInputElement;
    const menu = select.element.querySelector(".mtrl-select__menu") as HTMLElement | null;
    const probe = document.createElement("span");
    probe.style.color = "var(--mtrl-sys-color-secondary)";
    document.body.append(probe);
    const secondary = getComputedStyle(probe).color;
    probe.remove();
    const ring = (item: HTMLElement): Ring => {
      const style = getComputedStyle(item);
      return {
        id: item.getAttribute("data-id"),
        keyboardActive: item.classList.contains("mtrl-menu__item--keyboard-active"),
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
        outlineOffset: style.outlineOffset,
        outlineColor: style.outlineColor,
        background: style.backgroundColor,
      };
    };
    const items = Array.from(select.element.querySelectorAll<HTMLElement>(".mtrl-menu__item"));
    const activeItem = items.find((item) => item.classList.contains("mtrl-menu__item--active")) ?? null;
    const descendant = input.getAttribute("aria-activedescendant");
    const descendantItem = descendant ? document.getElementById(descendant) : null;
    return {
      focusOnInput: document.activeElement === input,
      activeClassId: activeItem?.getAttribute("data-id") ?? null,
      activeDescendantId: descendantItem?.getAttribute("data-id") ?? null,
      ring: activeItem ? ring(activeItem) : null,
      others: items.filter((item) => item !== activeItem).map(ring),
      secondary,
      menuBackground: menu ? getComputedStyle(menu).backgroundColor : "",
    };
  });

  // Every failure is reported, so one run shows every mode
  const failures: string[] = [];
  const expect = (ok: boolean, message: string): void => { if (!ok) failures.push(message); };
  const secondaryByMode: Record<string, string> = {};

  try {
    for (const mode of modes) {
      const label = mode.name;
      await page.emulateMedia({ reducedMotion: "reduce", forcedColors: mode.forcedColors });
      await mount(mode.themeMode);

      await page.keyboard.press("ArrowDown");
      await waitOpen();
      const opened = await snapshot();
      expect(opened.focusOnInput, `${label}: the combobox input keeps focus while an option is active`);
      expect(opened.ring !== null, `${label}: opening by keyboard marks an active option`);
      expect(opened.activeClassId === opened.activeDescendantId,
        `${label}: the active class and aria-activedescendant name the same option (${opened.activeClassId} vs ${opened.activeDescendantId})`);
      if (opened.ring) {
        const ring = opened.ring;
        expect(ring.keyboardActive, `${label}: the option the keyboard reached carries the select's keyboard marker`);
        expect(ring.outlineStyle === "solid", `${label}: the active option draws a focus ring (outline-style ${ring.outlineStyle})`);
        expect(ring.outlineWidth === "3px", `${label}: the ring is 3px (${ring.outlineWidth})`);
        expect(ring.outlineOffset === "-3px", `${label}: the ring is drawn inward, 3px inside the option (${ring.outlineOffset})`);
        if (mode.forcedColors === "none") {
          expect(ring.outlineColor === opened.secondary,
            `${label}: the ring is the secondary token (${ring.outlineColor} vs ${opened.secondary})`);
          secondaryByMode[mode.name] = ring.outlineColor;
          const backdrop = parseColour(ring.background)[3] === 0 ? opened.menuBackground : ring.background;
          const ratio = contrastRatio(ring.outlineColor, backdrop);
          expect(ratio >= 3, `${label}: the ring holds 3:1 against the option's own background (${ratio.toFixed(2)}:1)`);
        } else {
          const [, , , alpha] = parseColour(ring.outlineColor);
          expect(alpha > 0, `${label}: the forced-colors ring is non-transparent (${ring.outlineColor})`);
        }
      }
      for (const other of opened.others) {
        expect(other.outlineStyle === "none",
          `${label}: the option ${other.id} the keyboard has not reached draws no ring (outline-style ${other.outlineStyle})`);
        expect(!other.keyboardActive, `${label}: the option ${other.id} carries no keyboard marker`);
      }

      // The ring follows the keyboard and leaves the option it left
      await page.keyboard.press("ArrowDown");
      await page.waitForFunction((previous) => {
        const state = window as unknown as State;
        const input = state.select!.element.querySelector("input") as HTMLInputElement;
        const id = input.getAttribute("aria-activedescendant");
        const active = id ? document.getElementById(id) : null;
        return !!active && active.getAttribute("data-id") !== previous;
      }, opened.ring?.id ?? null);
      const moved = await snapshot();
      expect(moved.ring !== null, `${label}: ArrowDown moves the active option`);
      if (moved.ring) {
        expect(moved.ring.keyboardActive, `${label}: the option ArrowDown reached carries the keyboard marker`);
        expect(moved.ring.outlineStyle === "solid" && moved.ring.outlineWidth === "3px" && moved.ring.outlineOffset === "-3px",
          `${label}: the ring follows ArrowDown (outline ${moved.ring.outlineStyle} ${moved.ring.outlineWidth} ${moved.ring.outlineOffset})`);
      }
      const left = moved.others.find((other) => other.id === opened.ring?.id);
      expect(left?.outlineStyle === "none", `${label}: the option the keyboard left draws no ring (outline-style ${left?.outlineStyle})`);
      expect(!left?.keyboardActive, `${label}: the option the keyboard left drops the keyboard marker`);

      // A pointer opening marks the selected option, and paints no ring
      await page.keyboard.press("Escape");
      await waitClosed();
      await page.locator(".mtrl-select .mtrl-text-field__field").click();
      await waitOpen();
      const pointer = await snapshot();
      expect(pointer.focusOnInput, `${label}: a pointer opening keeps focus on the combobox input`);
      expect(pointer.ring !== null, `${label}: a pointer opening marks the selected option active`);
      if (pointer.ring) {
        expect(!pointer.ring.keyboardActive, `${label}: a pointer opening does not mark the option as keyboard-reached`);
        expect(pointer.ring.outlineStyle === "none",
          `${label}: a pointer opening draws no focus ring (outline-style ${pointer.ring.outlineStyle})`);
      }
      for (const other of pointer.others) {
        expect(other.outlineStyle === "none", `${label}: the option ${other.id} draws no ring under the pointer (outline-style ${other.outlineStyle})`);
      }

      // Hovering an option paints no ring either
      const hoveredId = pointer.others[0]?.id;
      if (hoveredId) {
        await page.locator(`.mtrl-select__menu .mtrl-menu__item[data-id="${hoveredId}"]`).hover();
        const hovered = await snapshot();
        const hoveredRing = hovered.others.find((other) => other.id === hoveredId);
        expect(hoveredRing?.outlineStyle === "none",
          `${label}: hovering the option ${hoveredId} draws no focus ring (outline-style ${hoveredRing?.outlineStyle})`);
        expect(!hoveredRing?.keyboardActive, `${label}: hovering the option ${hoveredId} marks nothing as keyboard-reached`);
        expect(hovered.ring?.outlineStyle === "none",
          `${label}: hover leaves the active option ringless (outline-style ${hovered.ring?.outlineStyle})`);
        await page.mouse.move(4, 4);
      }

      // The keyboard takes over the menu the pointer opened, ring and all
      await page.keyboard.press("ArrowDown");
      await page.waitForFunction((previous) => {
        const state = window as unknown as State;
        const input = state.select!.element.querySelector("input") as HTMLInputElement;
        const id = input.getAttribute("aria-activedescendant");
        const active = id ? document.getElementById(id) : null;
        return !!active && active.getAttribute("data-id") !== previous;
      }, pointer.ring?.id ?? null);
      const takeover = await snapshot();
      expect(takeover.ring?.keyboardActive === true, `${label}: the first key press marks the option it reaches`);
      expect(takeover.ring?.outlineStyle === "solid",
        `${label}: the keyboard takes over the pointer-opened menu with a ring (outline-style ${takeover.ring?.outlineStyle})`);

      await page.evaluate(() => {
        const state = window as unknown as State;
        state.select?.destroy();
        document.body.replaceChildren();
        document.documentElement.removeAttribute("data-theme-mode");
        document.documentElement.removeAttribute("data-theme");
      });
    }

    expect(secondaryByMode.light !== undefined && secondaryByMode.dark !== undefined && secondaryByMode.light !== secondaryByMode.dark,
      "light and dark modes resolve distinct --mtrl-sys-color-secondary ring colours");
    assert.deepEqual(failures, [], `${failures.length} of the select active option focus ring assertions failed:\n${failures.join("\n")}`);
  } finally {
    await page.emulateMedia({ reducedMotion: "no-preference", forcedColors: "none" });
  }
  console.log("Passed packed select active option focus ring: in light, dark and forced-colors modes the option a key reaches draws the 3dp inward secondary ring (3:1 against its own background in light and dark), the ring follows ArrowDown and leaves the option it left, and a pointer opening or a hover draws no ring.");
}
