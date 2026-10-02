/** Layout of a radio group: a wrapping label, a one-line label, an unlabelled circle. */
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
  outside: string[];
  middle: { text: Rect; deltaBlock: number; deltaFirst: number };
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
  overlap: Hit | null;
};

type LayoutMeasure = {
  groups: GroupMeasure[];
  bare: BareMeasure[];
  checkbox: CheckboxMeasure | null;
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
    const label = "Example Example Example";
    let root: HTMLElement;
    if (api === "factory") {
      root = createRadios({
        name: `layout-${direction}-${dir}-${n++}`,
        direction,
        options: [
          { value: "a", label: "One" },
          { value: "b", label },
          { value: "c", label: "Three" },
        ],
      }).element;
      wrap.append(root);
    } else {
      const element = document.createElement("m-radios");
      if (direction === "horizontal") element.setAttribute("direction", "horizontal");
      element.setAttribute("aria-label", "Layout");
      element.innerHTML = `<m-radio value="a">One</m-radio><m-radio value="b">${label}</m-radio><m-radio value="c">Three</m-radio>`;
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
    const outside: string[] = [];
    items.forEach((item, i) => {
      if (!contained(rootBox, item.getBoundingClientRect())) outside.push(`row${i}`);
      if (!contained(rootBox, texts[i].getBoundingClientRect())) outside.push(`label${i}`);
    });
    const one = items[0];
    const oneCircle = circles[0].getBoundingClientRect();
    const oneText = texts[0].getBoundingClientRect();
    const oneControl = one.querySelector(".mtrl-radios__control")!.getBoundingClientRect();
    const oneLabel = one.querySelector("label")!.getBoundingClientRect();
    const oneBox = one.getBoundingClientRect();
    const rtl = getComputedStyle(one).direction === "rtl";
    const startOf = (box: DOMRect) => rtl ? oneBox.right - box.right : box.left - oneBox.left;
    const midCircle = circles[1].getBoundingClientRect();
    const midText = texts[1].getBoundingClientRect();
    groups.push({
      direction,
      dir,
      root: rect(root),
      textHits,
      circleHits,
      outside,
      middle: {
        text: rect(texts[1]),
        deltaBlock: r2((midCircle.top + midCircle.bottom) / 2 - (midText.top + midText.bottom) / 2),
        deltaFirst: r2((midCircle.top + midCircle.bottom) / 2 - (midText.top + 12)),
      },
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

/** Factory (`core:check`) or `<m-radios>` (`elements:check`). */
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
    console.log(
      `radios layout ${api} ${group.direction} ${group.dir}: root ${group.root.w}x${group.root.h} ` +
      `middle ${group.middle.text.w}x${group.middle.text.h} deltaBlock ${group.middle.deltaBlock} deltaFirst ${group.middle.deltaFirst} ` +
      `textHits ${JSON.stringify(group.textHits)} circleHits ${JSON.stringify(group.circleHits)} outside ${JSON.stringify(group.outside)} ` +
      `one circle ${group.one.circleStart},${group.one.circleTop} ${group.one.circleW}x${group.one.circleH} textTop ${group.one.textTop} gap ${group.one.gap} labelH ${group.one.labelH}`,
    );
  }
  for (const row of measured.bare) {
    console.log(
      `radios unlabelled ${api} ${row.direction} ${row.dir}: label ${row.label.w}x${row.label.h} ` +
      `circle dx ${row.circle.dx} dy ${row.circle.dy} ripple ${row.ripple ? `dx ${row.ripple.dx} dy ${row.ripple.dy}` : "missing"}`,
    );
  }

  try {
    for (const group of measured.groups) {
      const where = `${api} ${group.direction} ${group.dir}`;
      assert.equal(group.middle.text.h, 72, `${where}: the middle label wraps to three lines`);
      assert.deepEqual(group.textHits, [], `${where}: label rects intersect`);
      assert.deepEqual(group.circleHits, [], `${where}: a label intersects another option's circle`);
      assert.deepEqual(group.outside, [], `${where}: the group does not contain a row or a label`);
      // The checkbox centres its box on the label block (deltaBlock 0, 24px off
      // the first line) and the icon does not overlap the text. The radio takes
      // that rule: the circle's centre is the text block's centre.
      assert.ok(Math.abs(group.middle.deltaBlock) <= 0.5, `${where}: circle centred on the label block, delta ${group.middle.deltaBlock} (first line ${group.middle.deltaFirst})`);
      check(`radios: a three-line label stays inside the group and the circle centres on the text (${where})`);

      // Measured before the fix (this machine, Chromium, device pixel ratio 1;
      // the same figures as the 2026-10-02 radios sweep). A one-line label keeps
      // them: circle 14px from the row top and 10px from its inline start, text
      // 12px from the top, 8px between the 40px control and the text, row 48px.
      assert.equal(group.one.circleTop, 14, `${where}: one-line circle top`);
      assert.equal(group.one.circleStart, 10, `${where}: one-line circle inline start`);
      assert.equal(group.one.circleW, 20, `${where}: one-line circle width`);
      assert.equal(group.one.circleH, 20, `${where}: one-line circle height`);
      assert.equal(group.one.textTop, 12, `${where}: one-line text top`);
      assert.equal(group.one.textH, 24, `${where}: one-line text height`);
      assert.equal(group.one.gap, 8, `${where}: one-line gap`);
      assert.equal(group.one.labelH, 48, `${where}: one-line row`);
      check(`radios: a one-line label keeps its measured circle and text (${where})`);
    }
    for (const row of measured.bare) {
      const where = `${api} ${row.direction} ${row.dir}`;
      assert.equal(row.label.w, 48, `${where}: unlabelled target width`);
      assert.equal(row.label.h, 48, `${where}: unlabelled target height`);
      assert.ok(row.ripple, `${where}: state layer`);
      assert.ok(Math.abs(row.circle.dx) <= 0.5 && Math.abs(row.circle.dy) <= 0.5, `${where}: circle centred in the 48px target, dx ${row.circle.dx} dy ${row.circle.dy}`);
      assert.ok(Math.abs(row.ripple.dx) <= 0.5 && Math.abs(row.ripple.dy) <= 0.5, `${where}: state layer centred in the 48px target, dx ${row.ripple.dx} dy ${row.ripple.dy}`);
      check(`radios: an unlabelled circle and its state layer are centred (${where})`);
    }
  } finally {
    await page.evaluate(() => document.getElementById("radios-layout")?.remove());
  }
}
