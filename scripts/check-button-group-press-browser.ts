/** A held press in a standard group never clips a neighbour's label (floor/material#552). */
import assert from "node:assert/strict";
import type { Page } from "playwright";

/** What layout sees on one neighbour of a pressed button. */
type NeighbourSample = {
  width: number;
  padStart: number;
  padEnd: number;
  labelClient: number;
  labelScroll: number;
};

/** One measurement of the whole group while a button is held or released. */
type PressSample = {
  pressedWidth: number;
  neighbours: NeighbourSample[];
  groupWidth: number;
};

/**
 * The press interaction of a standard button group, in a real browser.
 *
 * m3.material.io (button groups, specs) sets the pressed width multiplier
 * (15% at every size) and says a press "modify[s] the width and shape of
 * that button and adjacent buttons"; how much a neighbour may lose is this
 * library's own contract — "limited to the neighbour's padding on the facing
 * side so its label never clips" (button-group.ts). JSDOM has no layout, so
 * the unit press tests cannot see a clipped label; this check can.
 *
 * A real pointer is held down (no pointerup) on the end and the middle button
 * of groups at m, s and xs, in LTR and RTL. While held, each neighbour's
 * label must keep its whole text — `scrollWidth` within `clientWidth` — both
 * mid-ease (80 ms) and settled (the :active spatial spring is 450 ms), and
 * the neighbour must actually narrow and the pressed button widen, so a
 * press interaction that silently stopped cannot pass. Release must restore
 * the stylesheet's width and paddings.
 */
export async function checkButtonGroupPress(page: Page, check: (name: string) => void): Promise<void> {
  // Long labels, so an intrinsic text width beyond any container here makes
  // scrollWidth a real measure of a clipped label. The middle-press cases use
  // a shorter pressed label: three m buttons with the longer one overflow the
  // 900px viewport the page runs at.
  const NEIGHBOUR_LABEL = "Categorisation and filters for this list";
  const END_PRESSED_LABEL = "Show related products and collections";
  const MIDDLE_PRESSED_LABEL = "Show related products";

  await page.evaluate(() => {
    const host = document.getElementById("host") as HTMLElement;
    host.innerHTML = "";
  });

  const mount = async (id: string, size: string, dir: string, pressed: "end" | "middle") => {
    const pressedLabel = pressed === "end" ? END_PRESSED_LABEL : MIDDLE_PRESSED_LABEL;
    const labels = pressed === "end" ? [NEIGHBOUR_LABEL, pressedLabel] : [NEIGHBOUR_LABEL, pressedLabel, NEIGHBOUR_LABEL];
    await page.evaluate(
      ({ caseId, sizeName, direction, texts }) => {
        const w = window as unknown as {
          mtrl: { createButtonGroup: (c: object) => { element: HTMLElement } };
        };
        const host = document.getElementById("host") as HTMLElement;
        host.innerHTML = "";
        const holder = document.createElement("div");
        holder.id = caseId;
        holder.setAttribute("dir", direction);
        const group = w.mtrl.createButtonGroup({
          kind: "standard",
          size: sizeName,
          buttons: texts.map((text: string) => ({ text })),
        });
        group.element.id = `${caseId}-group`;
        holder.append(group.element);
        host.append(holder);
      },
      { caseId: id, sizeName: size, direction: dir, texts: labels }
    );
  };

  const sample = (id: string, pressedIndex: number): Promise<PressSample> =>
    page.evaluate(
      ({ caseId, pressed }) => {
        const group = document.getElementById(`${caseId}-group`)!;
        const buttons = [...group.querySelectorAll("button")] as HTMLElement[];
        // The label span: the leaf child carrying the button's whole text.
        const labelOf = (button: HTMLElement): HTMLElement =>
          ([...button.querySelectorAll("*")] as HTMLElement[]).find(
            (child) => child.childElementCount === 0 && child.textContent?.trim() === button.textContent?.trim()
          ) as HTMLElement;
        const neighbourOf = (button: HTMLElement) => {
          const style = getComputedStyle(button);
          const label = labelOf(button);
          return {
            width: button.getBoundingClientRect().width,
            padStart: parseFloat(style.paddingLeft),
            padEnd: parseFloat(style.paddingRight),
            labelClient: label ? label.clientWidth : -1,
            labelScroll: label ? label.scrollWidth : -1,
          };
        };
        return {
          pressedWidth: buttons[pressed].getBoundingClientRect().width,
          neighbours: buttons.filter((_, i) => i !== pressed).map(neighbourOf),
          groupWidth: group.getBoundingClientRect().width,
        };
      },
      { caseId: id, pressed: pressedIndex }
    );

  for (const size of ["m", "s", "xs"] as const) {
    for (const dir of ["ltr", "rtl"] as const) {
      for (const pressed of ["end", "middle"] as const) {
        const id = `bg-press-${size}-${dir}-${pressed}`;
        // Index 1 is the end button of two, and the middle button of three.
        const pressedIndex = 1;
        await mount(id, size, dir, pressed);
        const before = await sample(id, pressedIndex);
        const target = page.locator(`#${id}-group button`).nth(pressedIndex);
        const box = await target.boundingBox();
        assert.ok(box, `no box for ${id}`);
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        // The :active spatial spring is 450ms: 80ms is mid-ease, 560ms settled.
        await page.waitForTimeout(80);
        const mid = await sample(id, pressedIndex);
        await page.waitForTimeout(480);
        const settled = await sample(id, pressedIndex);
        await page.mouse.up();
        await page.waitForTimeout(520);
        const released = await sample(id, pressedIndex);

        const where = `${size} ${dir}, ${pressed} button pressed`;
        for (const at of [
          { name: "mid-ease", data: mid },
          { name: "settled", data: settled },
        ]) {
          for (const [i, n] of at.data.neighbours.entries()) {
            assert.ok(
              n.labelScroll <= n.labelClient + 0.5,
              `${where}: neighbour ${i} clips its label ${at.name} — scrollWidth ${n.labelScroll} > clientWidth ${n.labelClient}`
            );
          }
        }
        for (const [i, n] of settled.neighbours.entries()) {
          assert.ok(
            n.width < before.neighbours[i].width - 1,
            `${where}: neighbour ${i} does not narrow while pressed (${before.neighbours[i].width} → ${n.width})`
          );
        }
        assert.ok(
          settled.pressedWidth > before.pressedWidth + 1,
          `${where}: the pressed button does not widen (${before.pressedWidth} → ${settled.pressedWidth})`
        );
        assert.ok(
          Math.abs(settled.groupWidth - before.groupWidth) < 0.5,
          `${where}: the group width changes while pressed (${before.groupWidth} → ${settled.groupWidth})`
        );
        for (const [i, n] of released.neighbours.entries()) {
          assert.ok(
            Math.abs(n.width - before.neighbours[i].width) < 0.5,
            `${where}: neighbour ${i} keeps width ${n.width} after release, was ${before.neighbours[i].width}`
          );
          assert.ok(
            Math.abs(n.padStart - before.neighbours[i].padStart) < 0.5 &&
              Math.abs(n.padEnd - before.neighbours[i].padEnd) < 0.5,
            `${where}: neighbour ${i} keeps padding ${n.padStart}/${n.padEnd} after release, was ${before.neighbours[i].padStart}/${before.neighbours[i].padEnd}`
          );
        }
        check(`button group press: the held ${where} keeps every neighbour's label whole and restores on release`);
      }
    }
  }
}
