/** Layout of a radio group: two wrapping labels, a one-line label, an unlabelled circle. */
import assert from "node:assert/strict";
import type { Page } from "playwright";

type Rect = { l: number; t: number; r: number; b: number; w: number; h: number };
type Delta = { dx: number; dy: number };
type Hit = { pair: string; x: number; y: number };

type GroupMeasure = {
  direction: string;
  dir: string;
  root: Rect;
  textHits: Hit[];
  circleHits: Hit[];
  /** Text rects that paint outside their own row. */
  textOutsideRow: string[];
  /** Row rects that paint outside the group. */
  rowsOutside: string[];
  longs: Array<{ text: Rect; deltaBlock: number; deltaFirst: number }>;
  one: { circleTop: number; circleStart: number; circleW: number; circleH: number; textTop: number; textH: number; gap: number; labelH: number };
};

type BareMeasure = {
  direction: string;
  dir: string;
  label: Rect;
  circle: Delta;
  ripple: Delta | null;
};

type CheckboxMeasure = {
  root: Rect;
  icon: Rect;
  label: Rect;
  iconCenterY: number;
  labelCenterY: number;
  firstLineCenterY: number;
  deltaBlock: number;
  deltaFirst: number;
  overlap: { x: number; y: number } | null;
};

const mount = (api: "factory" | "element") => {
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const rect = (el: Element): Rect => {
    const b = el.getBoundingClientRect();
    return { l: r2(b.left), t: r2(b.top), r: r2(b.right), b: r2(b.bottom), w: r2(b.width), h: r2(b.height) };
  };
  const overlap = (a: DOMRect, b: DOMRect): { x: number; y: number } | null => {
    const x = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    return x > 0.5 && y > 0.5 ? { x: r2(x), y: r2(y) } : null;
  };
  const contained = (outer: DOMRect, inner: DOMRect): boolean =>
    inner.left >= outer.left - 0.5 && inner.right <= outer.right + 0.5 &&
    inner.top >= outer.top - 0.5 && inner.bottom <= outer.bottom + 0.5;

  const host = document.createElement("div");
  host.id = "radios-layout";
  document.body.append(host);

  const w = window as unknown as {
    inputs?: { createRadios: (c: object) => { element: HTMLElement }; createCheckbox: (c: object) => { element: HTMLElement } };
    mtrl?: { createRadios: (c: object) => { element: HTMLElement }; createCheckbox: (c: object) => { element: HTMLElement } };
  };
  const createRadios = (w.inputs?.createRadios ?? w.mtrl?.createRadios)!;
  const createCheckbox = w.inputs?.createCheckbox ?? w.mtrl?.createCheckbox;

  let checkbox: CheckboxMeasure | null = null;
  if (createCheckbox) {
    const wrap = document.createElement("div");
    wrap.style.cssText = "width:160px";
    host.append(wrap);
    const box = createCheckbox({ label: "A label much longer than its container" });
    box.element.style.width = "160px";
    wrap.append(box.element);
    const icon = box.element.querySelector(".mtrl-checkbox__icon")!;
    const label = box.element.querySelector(".mtrl-checkbox__label")!;
    const ib = icon.getBoundingClientRect();
    const lb = label.getBoundingClientRect();
    checkbox = {
      root: rect(box.element),
      icon: rect(icon),
      label: rect(label),
      iconCenterY: r2((ib.top + ib.bottom) / 2),
      labelCenterY: r2((lb.top + lb.bottom) / 2),
      firstLineCenterY: r2(lb.top + 12),
      deltaBlock: r2((ib.top + ib.bottom) / 2 - (lb.top + lb.bottom) / 2),
      deltaFirst: r2((ib.top + ib.bottom) / 2 - (lb.top + 12)),
      overlap: overlap(ib, lb),
    };
  }

  const groups: GroupMeasure[] = [];
  let n = 0;
  for (const direction of ["vertical", "horizontal"]) for (const dir of ["ltr", "rtl"]) {
    const wrap = document.createElement("div");
    wrap.dir = dir;
    wrap.style.cssText = "width:160px";
    host.append(wrap);
    // Three lines (72px) in a 160px container, both directions, on this machine.
    // Two adjacent options carry it; the first option stays one line.
    const label = "Example Example Example";
    const options = [
      { value: "a", label: "One" },
      { value: "b", label },
      { value: "c", label },
    ];
    let root: HTMLElement;
    if (api === "factory") {
      root = createRadios({ name: `layout-${direction}-${dir}-${n++}`, direction, options }).element;
      wrap.append(root);
    } else {
      const element = document.createElement("m-radios");
      if (direction === "horizontal") element.setAttribute("direction", "horizontal");
      element.setAttribute("aria-label", "Layout");
      element.innerHTML = options.map((option) => `<m-radio value="${option.value}">${option.label}</m-radio>`).join("");
      wrap.append(element);
      root = element.shadowRoot!.querySelector(".mtrl-radios") as HTMLElement;
    }
    const items = [...root.querySelectorAll(".mtrl-radios__item")] as HTMLElement[];
    const texts = items.map((item) => item.querySelector(".mtrl-radios__text")!);
    const circles = items.map((item) => item.querySelector(".mtrl-radios__circle")!);
    const rootBox = root.getBoundingClientRect();
    const textHits: Hit[] = [];
    const circleHits: Hit[] = [];
    for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
      const hit = overlap(texts[i].getBoundingClientRect(), texts[j].getBoundingClientRect());
      if (hit) textHits.push({ pair: `${i}+${j}`, ...hit });
    }
    for (let i = 0; i < texts.length; i++) for (let j = 0; j < circles.length; j++) {
      if (i === j) continue;
      const hit = overlap(texts[i].getBoundingClientRect(), circles[j].getBoundingClientRect());
      if (hit) circleHits.push({ pair: `text${i}+circle${j}`, ...hit });
    }
    const textOutsideRow: string[] = [];
    const rowsOutside: string[] = [];
    items.forEach((item, i) => {
      const row = item.getBoundingClientRect();
      if (!contained(rootBox, row)) rowsOutside.push(`row${i}`);
      if (!contained(row, texts[i].getBoundingClientRect())) textOutsideRow.push(`label${i}`);
    });
    const one = items[0];
    const oneCircle = circles[0].getBoundingClientRect();
    const oneText = texts[0].getBoundingClientRect();
    const oneControl = one.querySelector(".mtrl-radios__control")!.getBoundingClientRect();
    const oneLabel = one.querySelector("label")!.getBoundingClientRect();
    const oneBox = one.getBoundingClientRect();
    const rtl = getComputedStyle(one).direction === "rtl";
    const startOf = (box: DOMRect) => rtl ? oneBox.right - box.right : box.left - oneBox.left;
    const longOf = (index: number) => {
      const circle = circles[index].getBoundingClientRect();
      const text = texts[index].getBoundingClientRect();
      return {
        text: rect(texts[index]),
        deltaBlock: r2((circle.top + circle.bottom) / 2 - (text.top + text.bottom) / 2),
        deltaFirst: r2((circle.top + circle.bottom) / 2 - (text.top + 12)),
      };
    };
    groups.push({
      direction,
      dir,
      root: rect(root),
      textHits,
      circleHits,
      textOutsideRow,
      rowsOutside,
      longs: [longOf(1), longOf(2)],
      one: {
        circleTop: r2(oneCircle.top - oneBox.top),
        circleStart: r2(startOf(oneCircle)),
        circleW: r2(oneCircle.width),
        circleH: r2(oneCircle.height),
        textTop: r2(oneText.top - oneBox.top),
        textH: r2(oneText.height),
        gap: r2(rtl ? oneControl.left - oneText.right : oneText.left - oneControl.right),
        labelH: r2(oneLabel.height),
      },
    });
  }

  const bare: BareMeasure[] = [];
  for (const direction of ["vertical", "horizontal"]) for (const dir of ["ltr", "rtl"]) {
    const wrap = document.createElement("div");
    wrap.dir = dir;
    wrap.style.cssText = "display:inline-block";
    host.append(wrap);
    let root: HTMLElement;
    if (api === "factory") {
      root = createRadios({
        name: `bare-${direction}-${dir}-${n++}`,
        direction,
        options: [{ value: "a", label: "" }],
      }).element;
      wrap.append(root);
    } else {
      const element = document.createElement("m-radios");
      if (direction === "horizontal") element.setAttribute("direction", "horizontal");
      element.setAttribute("aria-label", "Unlabelled");
      element.innerHTML = `<m-radio value="a"></m-radio>`;
      wrap.append(element);
      root = element.shadowRoot!.querySelector(".mtrl-radios") as HTMLElement;
    }
    const label = root.querySelector(".mtrl-radios__label")!;
    const circle = root.querySelector(".mtrl-radios__circle")!;
    const ripple = root.querySelector(".mtrl-radios__ripple");
    const lb = label.getBoundingClientRect();
    const centre = (el: Element): Delta => {
      const b = el.getBoundingClientRect();
      return {
        dx: r2((b.left + b.right) / 2 - (lb.left + lb.right) / 2),
        dy: r2((b.top + b.bottom) / 2 - (lb.top + lb.bottom) / 2),
      };
    };
    bare.push({
      direction,
      dir,
      label: rect(label),
      circle: centre(circle),
      ripple: ripple ? centre(ripple) : null,
    });
  }

  return { groups, bare, checkbox };
};

/**
 * Factory (`core:check`) or `<m-radios>` (`elements:check`).
 *
 * Checkbox, three lines, 160px wide, label "A label much longer than its container"
 * (printed below, not asserted): root 160×80 at (0,0); icon 18×18 at (0,31),
 * centre Y 40; label 130×72 at (30,4), centre Y 40; first-line centre Y 16;
 * deltaBlock 0, deltaFirst 24; the icon and the label do not overlap. The box is
 * centred on the label block, so a radio keeps its circle centred on the label block.
 */
export async function checkRadiosLayout(page: Page, api: "factory" | "element", check: (name: string) => void): Promise<void> {
  const measured = await page.evaluate(mount, api);
  if (measured.checkbox) {
    const c = measured.checkbox;
    console.log(
      `checkbox three-line: root ${c.root.w}x${c.root.h} at (${c.root.l},${c.root.t}) ` +
      `icon ${c.icon.w}x${c.icon.h} at (${c.icon.l},${c.icon.t}) ` +
      `label ${c.label.w}x${c.label.h} at (${c.label.l},${c.label.t}) ` +
      `iconCenterY ${c.iconCenterY} labelCenterY ${c.labelCenterY} firstLineCenterY ${c.firstLineCenterY} ` +
      `deltaBlock ${c.deltaBlock} deltaFirst ${c.deltaFirst} overlap ${c.overlap ? `${c.overlap.x}x${c.overlap.y}` : "none"}`,
    );
  }
  for (const group of measured.groups) {
    const longs = group.longs.map((long) => `${long.text.w}x${long.text.h} deltaBlock ${long.deltaBlock} deltaFirst ${long.deltaFirst}`).join(" | ");
    console.log(
      `radios layout ${api} ${group.direction} ${group.dir}: root ${group.root.w}x${group.root.h} ` +
      `longs ${longs} textHits ${JSON.stringify(group.textHits)} circleHits ${JSON.stringify(group.circleHits)} ` +
      `textOutsideRow ${JSON.stringify(group.textOutsideRow)} rowsOutside ${JSON.stringify(group.rowsOutside)} ` +
      `one circle ${group.one.circleStart},${group.one.circleTop} ${group.one.circleW}x${group.one.circleH} textTop ${group.one.textTop} gap ${group.one.gap} labelH ${group.one.labelH}`,
    );
  }
  for (const row of measured.bare) {
    console.log(
      `radios unlabelled ${api} ${row.direction} ${row.dir}: label ${row.label.w}x${row.label.h} ` +
      `circle dx ${row.circle.dx} dy ${row.circle.dy} ripple ${row.ripple ? `dx ${row.ripple.dx} dy ${row.ripple.dy}` : "missing"}`,
    );
  }

  const failures: string[] = [];
  try {
    for (const group of measured.groups) {
      const where = `${api} ${group.direction} ${group.dir}`;
      for (const [index, long] of group.longs.entries()) {
        if (long.text.h !== 72) failures.push(`${where}: long label ${index + 1} is ${long.text.h}px, not three lines`);
        if (Math.abs(long.deltaBlock) > 0.5) failures.push(`${where}: long label ${index + 1} circle off the label block by ${long.deltaBlock} (first line ${long.deltaFirst})`);
      }
      if (group.textHits.length) failures.push(`${where}: label rects intersect ${JSON.stringify(group.textHits)}`);
      if (group.circleHits.length) failures.push(`${where}: a label intersects another option's circle ${JSON.stringify(group.circleHits)}`);
      if (group.textOutsideRow.length) failures.push(`${where}: a row does not contain its text ${JSON.stringify(group.textOutsideRow)}`);
      if (group.rowsOutside.length) failures.push(`${where}: the group does not contain a row ${JSON.stringify(group.rowsOutside)}`);
      // Measured before the fix (this machine, Chromium, device pixel ratio 1;
      // the same figures as the 2026-10-02 radios sweep). A one-line label keeps
      // them: circle 14px from the row top and 10px from its inline start, text
      // 12px from the top, 8px between the 40px control and the text, row 48px.
      const one = group.one;
      if (one.circleTop !== 14) failures.push(`${where}: one-line circle top ${one.circleTop}`);
      if (one.circleStart !== 10) failures.push(`${where}: one-line circle inline start ${one.circleStart}`);
      if (one.circleW !== 20 || one.circleH !== 20) failures.push(`${where}: one-line circle ${one.circleW}x${one.circleH}`);
      if (one.textTop !== 12) failures.push(`${where}: one-line text top ${one.textTop}`);
      if (one.textH !== 24) failures.push(`${where}: one-line text height ${one.textH}`);
      if (one.gap !== 8) failures.push(`${where}: one-line gap ${one.gap}`);
      if (one.labelH !== 48) failures.push(`${where}: one-line row ${one.labelH}`);
    }
    for (const row of measured.bare) {
      const where = `${api} ${row.direction} ${row.dir}`;
      if (row.label.w !== 48 || row.label.h !== 48) failures.push(`${where}: unlabelled target ${row.label.w}x${row.label.h}`);
      if (!row.ripple) failures.push(`${where}: state layer missing`);
      else if (Math.abs(row.circle.dx) > 0.5 || Math.abs(row.circle.dy) > 0.5) failures.push(`${where}: circle centred in the 48px target, dx ${row.circle.dx} dy ${row.circle.dy}`);
      if (row.ripple && (Math.abs(row.ripple.dx) > 0.5 || Math.abs(row.ripple.dy) > 0.5)) failures.push(`${where}: state layer centred in the 48px target, dx ${row.ripple.dx} dy ${row.ripple.dy}`);
    }
    assert.deepEqual(failures, []);
    for (const group of measured.groups) {
      const where = `${api} ${group.direction} ${group.dir}`;
      check(`radios: two three-line labels stay in their rows and the circle centres on the text (${where})`);
      check(`radios: a one-line label keeps its measured circle and text (${where})`);
    }
    for (const row of measured.bare) {
      check(`radios: an unlabelled circle and its state layer are centred (${api} ${row.direction} ${row.dir})`);
    }
  } finally {
    await page.evaluate(() => document.getElementById("radios-layout")?.remove());
  }
}
