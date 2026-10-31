import assert from "node:assert/strict";
import type { Page } from "playwright";

/** Insets in pixels: distances from each side of the menu root's box. */
type Insets = { top: number; right: number; bottom: number; left: number };

/** One measured case, all boxes relative to the menu root. */
type Measured = {
  name: string;
  marked: boolean;
  viewport: { width: number; height: number };
  root: { top: number; right: number; left: number; width: number };
  fab: Insets;
  list: Insets & { width: number; gap: number };
};

/**
 * A `bottom-start` FAB menu flips its inner FAB and list with the menu root.
 *
 * The placement class and the direction marker share one element: the runtime
 * writes `mtrl-rtl` on the factory root, and `dir="rtl"` may be set on it too.
 * The inner close FAB and the list must follow that marker, not only one on a
 * strict ancestor, and stay put in left-to-right.
 */
export async function checkFabMenuRtl(page: Page, check: (name: string) => void, icon: string): Promise<void> {
  const cases = ["ltr", "root-class", "root-dir", "ancestor-class", "ancestor-dir"];
  const rows = await page.evaluate(async ({ icon, cases }): Promise<Measured[]> => {
    type Made = { element: HTMLElement; open: () => void; close: () => void };
    const w = window as unknown as { mtrl: { createFabMenu: (config: object) => Made } };
    const host = document.getElementById("host")!;
    const items = [
      { id: "reply", text: "Reply", icon },
      { id: "forward", text: "Forward" },
    ];
    const boxOf = (element: Element) => {
      const box = element.getBoundingClientRect();
      return { top: box.top, right: box.right, bottom: box.bottom, left: box.left, width: box.width, height: box.height };
    };
    const turn = () => new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    const settle = async (root: HTMLElement): Promise<void> => {
      for (const end = Date.now() + 2000; Date.now() < end;) {
        for (const animation of root.getAnimations({ subtree: true })) animation.finish();
        const buttons = [...root.querySelectorAll<HTMLElement>(".mtrl-fab-menu__item")];
        if (buttons.length > 0 && buttons.every((button) => button.getBoundingClientRect().width > 40)) return;
        await turn();
      }
    };
    const rows: Measured[] = [];
    for (const name of cases) {
      host.innerHTML = "";
      const wrap = document.createElement("div");
      const made = w.mtrl.createFabMenu({
        placement: "bottom-start", presentation: "list", size: "medium", icon, ariaLabel: "Compose", items,
      });
      const root = made.element;
      wrap.append(root);
      host.append(wrap);
      // The direction tracker re-reads on the insertion; mark the root after it,
      // so the case measures the marker the runtime writes, not a pending read.
      await turn();
      if (name === "root-class") root.classList.add("mtrl-rtl");
      if (name === "root-dir") root.setAttribute("dir", "rtl");
      if (name === "ancestor-class") wrap.classList.add("mtrl-rtl");
      if (name === "ancestor-dir") wrap.setAttribute("dir", "rtl");
      made.open();
      await settle(root);
      const ofRoot = boxOf(root);
      const fab = boxOf(root.querySelector(".mtrl-fab-menu__fab")!);
      const list = boxOf(root.querySelector(".mtrl-fab-menu__list")!);
      rows.push({
        name,
        marked: root.classList.contains("mtrl-rtl"),
        viewport: { width: innerWidth, height: innerHeight },
        root: { top: ofRoot.top, right: ofRoot.right, left: ofRoot.left, width: ofRoot.width },
        fab: {
          top: fab.top - ofRoot.top,
          right: ofRoot.right - fab.right,
          bottom: ofRoot.bottom - fab.bottom,
          left: fab.left - ofRoot.left,
        },
        list: {
          top: list.top - ofRoot.top,
          right: ofRoot.right - list.right,
          bottom: ofRoot.bottom - list.bottom,
          left: list.left - ofRoot.left,
          width: list.width,
          gap: ofRoot.top - list.bottom,
        },
      });
      made.close();
      await turn();
    }
    return rows;
  }, { icon, cases });

  const failures: string[] = [];
  for (const row of rows) {
    const rtl = row.name !== "ltr";
    const where = `FAB menu bottom-start (${row.name})`;
    const problems: string[] = [];
    const expect = (side: string, actual: number, wanted: number): void => {
      if (Math.abs(actual - wanted) >= 0.5) problems.push(`${side} ${actual.toFixed(1)}, expected ${wanted}`);
    };
    if (row.name === "root-class" && !row.marked) problems.push("the mtrl-rtl class did not stay on the root");
    if (row.name === "root-dir" && !row.marked) problems.push("the root's own dir=\"rtl\" did not mark it");
    // The outer menu sits on the inline start edge in both directions.
    if (rtl) expect("outer menu right", row.root.right, row.viewport.width - 16);
    else expect("outer menu left", row.root.left, 16);
    // The close FAB keeps the top inline-start corner: left, or right in RTL.
    const fab = rtl ? { top: 0, right: 0, bottom: 24, left: 24 } : { top: 0, right: 24, bottom: 24, left: 0 };
    for (const side of ["top", "right", "bottom", "left"] as const) expect(`inner FAB ${side}`, row.fab[side], fab[side]);
    // The list opens inward: anchored to the same edge, overhanging into the page.
    const overhang = row.list.width - row.root.width;
    if (overhang <= 0.5) problems.push(`the list (${row.list.width.toFixed(1)}) is not wider than the root (${row.root.width.toFixed(1)})`);
    if (rtl) {
      expect("list right", row.list.right, 0);
      expect("list left", row.list.left, -overhang);
    } else {
      expect("list left", row.list.left, 0);
      expect("list right", row.list.right, -overhang);
    }
    expect("the list's gap above the root", row.list.gap, 8);
    const line = problems.length ? `FAIL ${where}: ${problems.join("; ")}` : `ok ${where}`;
    console.log(`  ${line}`);
    if (problems.length) failures.push(line);
    else check(`${where}: the inner FAB and the list flip with the menu root`);
  }
  assert.equal(failures.length, 0, failures.join("\n"));
}
