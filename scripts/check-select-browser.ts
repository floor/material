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
      // The mark's box, from its own computed left and width inside the item
      const left = box.left + parseFloat(after.left);
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
