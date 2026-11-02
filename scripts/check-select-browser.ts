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
 */
import assert from "node:assert/strict";
import type { Page } from "playwright";

type SelectWindow = Window & {
  createSelect: (config: Record<string, unknown>) => { element: HTMLElement; open: () => unknown; close: () => unknown; destroy: () => void };
};
type Row = {
  name: string;
  field: number;
  menu: { width: number; start: number; end: number };
  mark: { end: number; overlap: number } | null;
  selected: { background: string; color: string };
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
    for (const dir of ["ltr", "rtl"]) for (const width of [100, 200, 280, 400]) {
      const cell = document.createElement("div");
      cell.dir = dir;
      cell.style.cssText = "position:absolute;top:24px;left:24px;right:24px";
      document.body.append(cell);
      let select: { open: () => unknown; close: () => unknown; destroy?: () => void };
      let scope: ParentNode;
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
        const made = (window as unknown as SelectWindow).createSelect({ label: "Pet", value: "cat", options, ...(api === "factory-top" ? { layer: "top" } : {}) });
        made.element.style.width = `${width}px`;
        cell.append(made.element);
        select = made;
        scope = cell;
      }
      select.open();
      // Past the menu's opening transition
      await new Promise((resolve) => setTimeout(resolve, 450));
      const rtl = dir === "rtl";
      const field = (scope.querySelector(".mtrl-text-field__field") as HTMLElement).getBoundingClientRect();
      const menu = (scope.querySelector(".mtrl-select__menu") as HTMLElement).getBoundingClientRect();
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
        name: `${dir}, ${width}px`,
        field: round(field.width),
        menu: { width: round(menu.width), start: round(rtl ? field.right - menu.right : menu.left - field.left), end: round(rtl ? menu.left - field.left : field.right - menu.right) },
        mark: after.content === "none" ? null : { end: round(rtl ? left - box.left : box.right - right), overlap: round(Math.max(0, Math.min(text.right, right) - Math.max(text.left, left))) },
        selected: { background: style.backgroundColor, color: style.color },
        roles: { background: role("secondary-container"), color: role("on-secondary-container") },
      });
      select.close();
      await new Promise((resolve) => setTimeout(resolve, 350));
      select.destroy?.();
      cell.remove();
    }
    return rows;
  }, api) as Row[];

  assert.equal(rows.length, 8);
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
    expect(row.mark !== null, `${row.name}: the selected option has a mark`);
    if (row.mark) {
      expect(row.mark.end === 12, `${row.name}: the mark is 12px from the item's end (${row.mark.end})`);
      expect(row.mark.overlap === 0, `${row.name}: the mark is clear of the option's text (${row.mark.overlap}px over it)`);
    }
    expect(row.selected.background === row.roles.background, `${row.name}: the selected option is on secondary-container (${row.selected.background})`);
    expect(row.selected.color === row.roles.color, `${row.name}: the selected option's text is on-secondary-container (${row.selected.color})`);
  }
  assert.deepEqual(failures, [], `${failures.length} of the select menu assertions failed`);
  console.log(`Passed select menu (${api}): 8 selects, 100 to 400px wide, left to right and right to left — the menu as wide as its field, the selected mark at the item's end, the selected option on secondary-container.`);
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
