import assert from "node:assert/strict";
import type { Page } from "playwright";

/** Logical corners must follow direction; the old physical option must not. */
export async function checkFabPlacement(page: Page, check: (name: string) => void): Promise<void> {
  const rows = await page.evaluate(async () => {
    type Factory = (config: Record<string, unknown>) => { element: HTMLElement; destroy: () => void };
    const w = window as unknown as { mtrl: { createFab: Factory; createExtendedFab: Factory } };
    const host = document.getElementById("host")!;
    const rows: Array<{ kind: string; route: string; dir: string; placement: string; position: string; x: number; y: number; width: number; height: number; cssPosition: string }> = [];
    const settled = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    for (const kind of ["fab", "extended-fab"]) for (const route of ["factory", "element"]) {
      for (const dir of ["ltr", "rtl"]) for (const placement of ["none", "top-start", "top-end", "bottom-start", "bottom-end", "alias"]) {
        document.documentElement.dir = dir;
        host.replaceChildren();
        const position = placement === "alias" ? "bottom-right" : "top-left";
        let target: HTMLElement;
        let made: ReturnType<Factory> | undefined;
        if (route === "factory") {
          const create = kind === "fab" ? w.mtrl.createFab : w.mtrl.createExtendedFab;
          made = create({ text: "Compose", ariaLabel: "Compose", position, ...(placement === "alias" ? {} : { placement }) });
          host.append(made.element);
          target = made.element;
        } else {
          const element = document.createElement(`m-${kind}`);
          element.setAttribute("aria-label", "Compose");
          element.setAttribute("position", position);
          if (placement !== "alias") element.setAttribute("placement", placement);
          element.textContent = kind === "extended-fab" ? "Compose" : "";
          host.append(element);
          target = element.shadowRoot!.querySelector<HTMLElement>(`.mtrl-${kind}`)!;
        }
        await settled();
        const r = target.getBoundingClientRect();
        rows.push({ kind, route, dir, placement, position, x: r.x, y: r.y, width: r.width, height: r.height, cssPosition: getComputedStyle(target).position });
        made?.destroy();
      }
    }
    document.documentElement.dir = "ltr";
    return { rows, viewport: { width: innerWidth, height: innerHeight } };
  });
  console.log(`FAB placement: ${JSON.stringify(rows)}`);
  for (const row of rows.rows) {
    const where = `${row.kind}/${row.route}/${row.dir}/${row.placement}`;
    if (row.placement === "none") { assert.notEqual(row.cssPosition, "fixed", `${where}: none overrides physical position`); continue; }
    const bottom = row.placement === "alias" || row.placement.startsWith("bottom");
    const right = row.placement === "alias" || ((row.placement.endsWith("end")) === (row.dir === "ltr"));
    assert.equal(row.cssPosition, "fixed", `${where}: fixed to the viewport`);
    assert(Math.abs(row.x - (right ? rows.viewport.width - row.width - 16 : 16)) < 0.5, `${where}: wrong inline corner, x=${row.x}`);
    assert(Math.abs(row.y - (bottom ? rows.viewport.height - row.height - 16 : 16)) < 0.5, `${where}: wrong block corner, y=${row.y}`);
  }
  // Changing and removing attributes must re-read precedence, and inherited
  // direction must work without reconstructing the component.
  for (const kind of ["fab", "extended-fab"]) {
    const changed = await page.evaluate(async kind => {
      const host = document.getElementById("host")!;
      host.innerHTML = `<m-${kind} position="bottom-right" placement="top-start" aria-label="Compose">${kind === "extended-fab" ? "Compose" : ""}</m-${kind}>`;
      const element = host.firstElementChild!;
      const box = () => { const target = element.shadowRoot!.querySelector<HTMLElement>(`.mtrl-${kind}`)!; const r = target.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width }; };
      const settle = () => new Promise<void>(r => requestAnimationFrame(() => r()));
      await settle();
      const initial = box();
      document.documentElement.dir = "rtl";
      await settle();
      const rtl = box();
      element.setAttribute("placement", "bottom-start");
      await settle();
      const changed = box();
      element.removeAttribute("placement");
      await settle();
      const removed = box();
      document.documentElement.dir = "ltr";
      return { initial, rtl, changed, removed, width: innerWidth, height: innerHeight };
    }, kind);
    assert.equal(changed.initial.x, 16);
    assert.equal(changed.initial.y, 16);
    assert.equal(changed.rtl.x, changed.width - changed.rtl.width - 16);
    assert.equal(changed.changed.x, changed.width - changed.changed.width - 16);
    assert(changed.changed.y > changed.rtl.y + 100);
    assert.equal(changed.removed.x, changed.width - changed.removed.width - 16);
    check(`${kind}: placement changes after upgrade, follows live inherited rtl, and removal restores the physical alias`);
  }
  check("FAB and extended FAB: four logical corners and none, factory/element parity, placement beats position, deprecated bottom-right remains physical in rtl");
}
