import assert from "node:assert/strict";
import type { Page } from "playwright";

/** Measure the slotted actions, not just the modifier on their shadow row. */
export async function checkCardActions(page: Page, check: (name: string) => void): Promise<void> {
  const rows = await page.evaluate(async () => {
    const host = document.getElementById("host")!;
    const result: Array<{ dir: string; align: string; justify: string; leading: number; trailing: number; gap: number }> = [];
    const settled = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    const w = window as unknown as { mtrl: { createCard: (config: { buttons: Array<{ text: string }> }) => { element: HTMLElement; destroy: () => void } } };
    const factory = w.mtrl.createCard({ buttons: [{ text: "Save" }] });
    host.replaceChildren(factory.element);
    for (let i = 0; i < 20 && !factory.element.querySelector(".mtrl-card__actions"); i++) await settled();
    const reference = factory.element.querySelector<HTMLElement>(".mtrl-card__actions")!;
    if (!reference || getComputedStyle(reference).justifyContent !== "flex-end") throw new Error("Factory buttons must provide the end-aligned reference");
    factory.destroy();
    for (const dir of ["ltr", "rtl"]) {
      host.innerHTML = `<m-card dir="${dir}" style="width:360px"><button slot="actions" style="width:60px;height:24px">Cancel</button><button slot="actions" style="width:60px;height:24px">Save</button></m-card>`;
      const card = host.firstElementChild!;
      const buttons = [...card.querySelectorAll("button")];
      for (const align of ["default", "start", "center", "end", "space-between", "removed"]) {
        if (align === "removed") card.removeAttribute("actions-align");
        else if (align !== "default") card.setAttribute("actions-align", align);
        await settled();
        const row = card.shadowRoot!.querySelector<HTMLElement>(".mtrl-card__actions")!;
        const box = row.getBoundingClientRect();
        const first = buttons[0]!.getBoundingClientRect();
        const last = buttons[1]!.getBoundingClientRect();
        result.push({ dir, align, justify: getComputedStyle(row).justifyContent,
          leading: dir === "ltr" ? first.left - box.left : box.right - first.right,
          trailing: dir === "ltr" ? box.right - last.right : last.left - box.left,
          gap: dir === "ltr" ? last.left - first.right : first.left - last.right,
        });
      }
    }
    return result;
  });
  console.log(`Card action alignment: ${JSON.stringify(rows)}`);
  for (const row of rows) {
    const align = row.align === "default" || row.align === "removed" ? "end" : row.align;
    if (align === "end") assert(row.leading > row.trailing + 100, `${row.dir} ${row.align}: actions at logical end, ${JSON.stringify(row)}`);
    else if (align === "start") assert(row.trailing > row.leading + 100, `${row.dir}: actions at logical start`);
    else if (align === "center") assert(Math.abs(row.leading - row.trailing) < 0.5, `${row.dir}: actions centered`);
    else assert(row.gap > 100 && Math.abs(row.leading - row.trailing) < 0.5, `${row.dir}: space between the slotted actions`);
  }
  check("card: actions-align defaults to end, changes through every factory alignment after upgrade and removes to end, ltr and rtl");
}
