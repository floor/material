// scripts/check-chips-rtl.ts
//
// The chips' connected corners and touch targets, in every way a direction
// reaches them. The bundled full stylesheet is minified with target browser,
// and the minifier lowers the logical properties into :lang() arms that match
// a language, never dir="rtl" (src/styles/components/_text-field.scss): under
// the bundled sheet only, a chip on a right-to-left page kept the remove
// button's left corners square (its connected edge is the right one there),
// and both ::before touch targets — the action's, spanning the action, and the
// remove's 48px one, anchored to the chip's end — stayed on the left-to-right
// side. The partial now writes the physical sides and the right-to-left pair
// as direction arms, and the trailing target as a physical edge pair with the
// inline-start margin absorbing the difference, so no :not() has to follow a
// ::before; the bundled and the unbundled sheet must agree.
//
// Every variant (assist, filter, input, suggestion) renders with a leading
// icon, the filter chip with a trailing action and the input chip with its
// remove button, under the bundled full-css and under dist/styles.css, with
// the direction arriving as the page's dir, a dir on the chip set's root, the
// runtime's mtrl-rtl class on the set, on a chip's root or on an ancestor, a
// nearer dir="ltr" boundary, and as an element host inside a shadow root.
// `lang="ar"` alone is not a direction: it must leave the sides where the
// computed direction puts them.
//
// Called by rtl:check against the built package.
import assert from "node:assert/strict";
import type { Browser, Page } from "playwright";

const WIDTH = 600;
const HEIGHT = 720;

/** The chip's radius: v.chip('border-radius'). */
const RADIUS = 8;
/** The trailing control's touch target (m3.material.io, chips: 48x48dp). */
const TARGET = 48;
/** The action's touch target reaches 8dp above and below the 32dp chip. */
const ACTION_REACH = 8;

/** `/plain` puts the chip set at the viewport's top-left corner, under the
 *  pointer at (0, 0). Park it on the empty bottom-right corner so no chip is
 *  hovered while its geometry is read (the split button's CI lesson). */
const parkPointer = (page: Page): Promise<void> => page.mouse.move(WIDTH - 1, HEIGHT - 1);

const ICON = '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M4 4h16v16H4z"/></svg>';
const CLOSE = '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M6 6l12 12M18 6L6 18"/></svg>';

const action = (label: string, trailing = ""): string =>
  `<span class="mtrl-chip__action"><span class="mtrl-chip__leading-icon" aria-hidden="true">${ICON}</span>` +
  `<span class="mtrl-chip__label">${label}</span>${trailing}</span>`;

/** The markup a factory renders: one chip per variant. The filter chip's
 *  trailing icon carries its own action (onTrailingClick), and the input chip
 *  is removable, so both trailing controls are measured. `extra` is appended
 *  to every chip root's class list (the runtime's mtrl-rtl/mtrl-ltr markers). */
const chipsMarkup = (extra = ""): string =>
  `<div class="mtrl-chip mtrl-chip--assist mtrl-chip--leading${extra}">${action("Assist")}</div>` +
  `<div class="mtrl-chip mtrl-chip--filter mtrl-chip--leading mtrl-chip--trailing${extra}" role="group">` +
  `${action("Filter", `<span class="mtrl-chip__trailing-icon" aria-hidden="true">${ICON}</span>`)}` +
  `<button type="button" class="mtrl-chip__trailing-action">${CLOSE}</button></div>` +
  `<div class="mtrl-chip mtrl-chip--input mtrl-chip--leading${extra}" role="group">${action("Input")}` +
  `<button type="button" class="mtrl-chip__remove">${CLOSE}</button></div>` +
  `<div class="mtrl-chip mtrl-chip--suggestion mtrl-chip--leading${extra}">${action("Suggestion")}</div>`;

interface SetOptions {
  /** Classes on the chip set's root. */
  classes?: string;
  /** Attributes on the chip set's root. */
  attributes?: string;
  /** Attributes on a wrapper around the chip set (an ancestor marker). */
  around?: string;
  /** Classes on every chip root. */
  chip?: string;
}

const set = ({ classes = "", attributes = "", around = "", chip = "" }: SetOptions = {}): string =>
  `<div${around}><div class="mtrl-chips${classes}"${attributes}>` +
  `<div class="mtrl-chips__container">${chipsMarkup(chip)}</div></div></div>`;

type Direction = "ltr" | "rtl";

interface Case {
  name: string;
  /** The direction the case's own markup establishes; the page's when absent. */
  dir?: Direction;
  lang?: string;
  markup: string;
}

/**
 * The class-markup cases. A marker class is placed with the CSS direction its
 * runtime resolved, not with the class alone: the class does not set
 * `direction`, so the trailing control's swap to the other end is the
 * browser's.
 */
const CLASS_CASES: Case[] = [
  { name: "set dir=rtl", dir: "rtl", markup: set({ attributes: ' dir="rtl"' }) },
  { name: "set mtrl-rtl", dir: "rtl", markup: set({ classes: " mtrl-rtl", attributes: ' style="direction: rtl"' }) },
  { name: "chip mtrl-rtl", dir: "rtl", markup: set({ attributes: ' style="direction: rtl"', chip: " mtrl-rtl" }) },
  { name: "ancestor mtrl-rtl", dir: "rtl", markup: set({ attributes: ' style="direction: rtl"', around: ' class="mtrl-rtl" style="direction: rtl"' }) },
  { name: "set dir=ltr (in an RTL page)", dir: "ltr", markup: set({ classes: " mtrl-ltr", attributes: ' dir="ltr"' }) },
  { name: "set mtrl-ltr, no dir", dir: "ltr", markup: set({ classes: " mtrl-ltr", attributes: ' style="direction: ltr"' }) },
  { name: "chip mtrl-ltr, no dir", dir: "ltr", markup: set({ attributes: ' style="direction: ltr"', chip: " mtrl-ltr" }) },
  { name: "lang=ar alone", lang: "ar", markup: set() },
];

const expectedDirection = (item: { dir?: Direction }, page: Direction): Direction => item.dir ?? page;

interface Box { left: number; top: number; right: number; bottom: number; width: number; height: number }
interface Corners { tl: number; tr: number; br: number; bl: number }
interface Before { left: number | null; right: number | null; marginLeft: number | null; top: number | null; width: number | null; height: number | null }

interface ChipMeasure {
  root: Box;
  corners: Corners;
  action: Box;
  actionBefore: Before;
  control: { box: Box; corners: Corners; before: Before } | null;
}

interface Measured { [name: string]: Partial<Record<string, ChipMeasure>> }

const measure = (page: Page, cases: Case[]): Promise<Measured> =>
  page.evaluate(async (cases) => {
    const host = document.getElementById("host") as HTMLElement;
    const frame = (): Promise<void> => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())));
    const box = (element: Element): Box => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
    };
    const corners = (element: Element): Corners => {
      const style = getComputedStyle(element);
      return {
        tl: parseFloat(style.borderTopLeftRadius),
        tr: parseFloat(style.borderTopRightRadius),
        br: parseFloat(style.borderBottomRightRadius),
        bl: parseFloat(style.borderBottomLeftRadius),
      };
    };
    const number = (value: string): number | null => {
      const parsed = parseFloat(value);
      return Number.isFinite(parsed) ? parsed : null;
    };
    const before = (element: Element): Before => {
      const style = getComputedStyle(element, "::before");
      return {
        left: number(style.left),
        right: number(style.right),
        marginLeft: number(style.marginLeft),
        top: number(style.top),
        width: number(style.width),
        height: number(style.height),
      };
    };
    const read = (root: HTMLElement): ChipMeasure => {
      const action = root.querySelector(".mtrl-chip__action") as HTMLElement;
      const control = root.querySelector(".mtrl-chip__remove, .mtrl-chip__trailing-action");
      return {
        root: box(root),
        corners: corners(root),
        action: box(action),
        actionBefore: before(action),
        control: control ? { box: box(control), corners: corners(control), before: before(control) } : null,
      };
    };
    const measured: Measured = {};
    for (const item of cases) {
      document.documentElement.lang = item.lang ?? "";
      host.innerHTML = item.markup;
      await frame();
      const perVariant: Partial<Record<string, ChipMeasure>> = {};
      for (const variant of ["assist", "filter", "input", "suggestion"]) {
        perVariant[variant] = read(host.querySelector(`.mtrl-chip--${variant}`) as HTMLElement);
      }
      measured[item.name] = perVariant;
      host.replaceChildren();
    }
    document.documentElement.lang = "";
    return measured;
  }, cases);

interface ElementCase { name: string; dir?: Direction; shadow: boolean }

const ELEMENT_CASES: ElementCase[] = [
  { name: "element", shadow: false },
  { name: "element in a shadow root", shadow: true },
  { name: "element dir=rtl", dir: "rtl", shadow: false },
  { name: "element dir=ltr in a shadow root", dir: "ltr", shadow: true },
];

const measureElements = (page: Page, cases: ElementCase[]): Promise<Measured> =>
  page.evaluate(async (cases) => {
    const host = document.getElementById("host") as HTMLElement;
    const frame = (): Promise<void> => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())));
    const box = (element: Element): Box => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
    };
    const corners = (element: Element): Corners => {
      const style = getComputedStyle(element);
      return {
        tl: parseFloat(style.borderTopLeftRadius),
        tr: parseFloat(style.borderTopRightRadius),
        br: parseFloat(style.borderBottomRightRadius),
        bl: parseFloat(style.borderBottomLeftRadius),
      };
    };
    const number = (value: string): number | null => {
      const parsed = parseFloat(value);
      return Number.isFinite(parsed) ? parsed : null;
    };
    const before = (element: Element): Before => {
      const style = getComputedStyle(element, "::before");
      return {
        left: number(style.left),
        right: number(style.right),
        marginLeft: number(style.marginLeft),
        top: number(style.top),
        width: number(style.width),
        height: number(style.height),
      };
    };
    const read = (root: HTMLElement): ChipMeasure => {
      const action = root.querySelector(".mtrl-chip__action") as HTMLElement;
      const control = root.querySelector(".mtrl-chip__remove, .mtrl-chip__trailing-action");
      return {
        root: box(root),
        corners: corners(root),
        action: box(action),
        actionBefore: before(action),
        control: control ? { box: box(control), corners: corners(control), before: before(control) } : null,
      };
    };
    const icon = '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M4 4h16v16H4z"/></svg>';
    const measured: Measured = {};
    for (const item of cases) {
      host.replaceChildren();
      const container = document.createElement("div");
      const mount = item.shadow ? container.attachShadow({ mode: "open" }) : container;
      const element = document.createElement("m-chips");
      element.setAttribute("aria-label", "Chips");
      if (item.dir) element.setAttribute("dir", item.dir);
      for (const [variant, label] of [["assist", "One"], ["filter", "Two"], ["input", "Three"], ["suggestion", "Four"]]) {
        const chip = document.createElement("m-chip");
        chip.setAttribute("variant", variant);
        chip.setAttribute("icon", icon);
        chip.textContent = label;
        element.append(chip);
      }
      mount.append(element);
      host.append(container);
      await frame();
      const scope = element.shadowRoot as ShadowRoot;
      const perVariant: Partial<Record<string, ChipMeasure>> = {};
      for (const variant of ["assist", "filter", "input", "suggestion"]) {
        perVariant[variant] = read(scope.querySelector(`.mtrl-chip--${variant}`) as HTMLElement);
      }
      measured[item.name] = perVariant;
    }
    host.replaceChildren();
    return measured;
  }, cases);

const near = (a: number, b: number): boolean => Math.abs(a - b) <= 0.5;

const VARIANTS = ["assist", "filter", "input", "suggestion"] as const;

/** Which trailing control each variant's markup renders. The element's filter
 *  chip has no trailing action: the element API exposes no onTrailingClick. */
type Trailing = Record<string, string | null>;
const CLASS_TRAILING: Trailing = { assist: null, filter: "trailing-action", input: "remove", suggestion: null };
const ELEMENT_TRAILING: Trailing = { assist: null, filter: null, input: "remove", suggestion: null };

/** The control on the side the direction puts it, its corners connected there,
 *  and both touch targets where the chip's geometry places them. */
function assertChips(where: string, chips: Partial<Record<string, ChipMeasure>>, direction: Direction, base: Partial<Record<string, ChipMeasure>>, trailing: Trailing = CLASS_TRAILING): void {
  // The control's connected edge is physical: the inline end the direction puts
  // it on, which mirrors when the direction does.
  const side = direction === "rtl" ? "left" : "right";
  const connected: Corners = direction === "rtl"
    ? { tl: RADIUS, tr: 0, br: 0, bl: RADIUS }
    : { tl: 0, tr: RADIUS, br: RADIUS, bl: 0 };
  for (const key of VARIANTS) {
    const chip = chips[key]!;
    const reference = base[key]!;
    assert.deepEqual(
      chip.corners,
      { tl: RADIUS, tr: RADIUS, br: RADIUS, bl: RADIUS },
      `${where}: the ${key} chip's corners are ${JSON.stringify(chip.corners)}; expected the full ${RADIUS}px radius all round`,
    );
    assert(
      near(chip.root.width, reference.root.width),
      `${where}: the ${key} chip is ${chip.root.width}px wide; the LTR one is ${reference.root.width}px`,
    );
    // The action's touch target spans the action in either direction: a
    // symmetric inset needs no arm, so an auto side or a width other than the
    // action's is the lowered `inset-inline: 0` showing.
    assert(chip.actionBefore.left !== null, `${where}: the ${key} chip's action touch target starts at left=auto; expected 0 inside the action`);
    assert(near(chip.actionBefore.left!, 0), `${where}: the ${key} chip's action touch target starts at left=${chip.actionBefore.left}px inside the action; expected 0`);
    assert(chip.actionBefore.width !== null, `${where}: the ${key} chip's action touch target has width=auto; expected the action's ${chip.action.width}px`);
    assert(near(chip.actionBefore.width!, chip.action.width), `${where}: the ${key} chip's action touch target is ${chip.actionBefore.width}px wide; the action is ${chip.action.width}px`);
    assert(
      chip.actionBefore.height !== null && near(chip.actionBefore.height!, chip.action.height + 2 * ACTION_REACH),
      `${where}: the ${key} chip's action touch target is ${chip.actionBefore.height}px tall; expected ${chip.action.height + 2 * ACTION_REACH} (the action plus ${ACTION_REACH}px above and below)`,
    );
    const control = trailing[key]!;
    if (control === null) {
      assert.equal(chip.control, null, `${where}: the ${key} chip grew a trailing control it does not render`);
      continue;
    }
    const measured = chip.control;
    assert(measured !== null, `${where}: the ${key} chip has no ${control} button; expected one`);
    const box = measured!.box;
    assert.deepEqual(
      measured!.corners,
      connected,
      `${where}: the ${key} chip's ${control} corners are ${JSON.stringify(measured!.corners)}; expected ${JSON.stringify(connected)}`,
    );
    const gap = direction === "rtl" ? box.left - chip.root.left : chip.root.right - box.right;
    assert(
      near(gap, 0),
      `${where}: the ${key} chip's ${control} sits ${gap}px inside the chip's ${side} edge; expected it flush`,
    );
    assert(
      measured!.before.width !== null && near(measured!.before.width!, TARGET) &&
        measured!.before.height !== null && near(measured!.before.height!, TARGET),
      `${where}: the ${key} chip's ${control} touch target is ${measured!.before.width}x${measured!.before.height}px; expected ${TARGET}x${TARGET}`,
    );
    // The target's box, not the declaration that places it: the start edge the
    // direction puts it on is the chip's end, and its 48px runs from there back
    // over the label. A physical edge pair with an auto start margin and a
    // logical inset anchored to the inline end both resolve to this box; only
    // the anchored-to-the-end one mirrors.
    assert(
      measured!.before.left !== null && measured!.before.marginLeft !== null,
      `${where}: the ${key} chip's ${control} touch target leaves left or its start margin unresolved; cannot read its box`,
    );
    const edge = measured!.before.left! + measured!.before.marginLeft!;
    const wanted = direction === "rtl" ? 0 : box.width - TARGET;
    assert(
      near(edge, wanted),
      `${where}: the ${key} chip's ${control} touch target spans ${edge}px..${edge + TARGET}px of the ${box.width}px control; expected ${wanted}px..${wanted + TARGET}px, so its ${TARGET}px runs back from the chip's ${side} edge`,
    );
    assert(
      measured!.before.top !== null && near(measured!.before.top!, box.height / 2),
      `${where}: the ${key} chip's ${control} touch target starts at top=${measured!.before.top}px; expected ${box.height / 2} (50% of the ${box.height}px control, before its centring transform)`,
    );
  }
}

/** The class markup on the bundled sheet. */
async function assertBundled(browser: Browser, base: string): Promise<void> {
  const ltrPage = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
  const rtlPage = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
  try {
    // `base` ends with a slash; a leading one here would ask for `//plain`,
    // which the server does not route to the bundled page.
    await ltrPage.goto(`${base}plain?dir=ltr`);
    await rtlPage.goto(`${base}plain?dir=rtl`);
    await parkPointer(ltrPage);
    await parkPointer(rtlPage);
    const ltr = await measure(ltrPage, [{ name: "plain", markup: set() }, ...CLASS_CASES]);
    const rtl = await measure(rtlPage, [{ name: "plain", markup: set() }, ...CLASS_CASES]);
    // The lowering is the defect this pass exists for: its case comes first.
    assertChips("bundled: page dir=rtl", rtl.plain, "rtl", ltr.plain);
    assertChips("bundled: LTR", ltr.plain, "ltr", ltr.plain);
    for (const item of CLASS_CASES) {
      assertChips(`bundled: ${item.name}`, ltr[item.name], expectedDirection(item, "ltr"), ltr.plain);
      assertChips(`bundled: ${item.name} (rtl page)`, rtl[item.name], expectedDirection(item, "rtl"), ltr.plain);
    }
  } finally {
    await ltrPage.close();
    await rtlPage.close();
  }
}

export async function checkChipsRtl(browser: Browser, base: string): Promise<void> {
  // Bundled first: its first failure is the quote a regression shows.
  await assertBundled(browser, base);

  // The unbundled sheet, and the elements on the same pages: inside a shadow
  // root the direction arrives as the host's mtrl-rtl class, which only the
  // `:host(...)` arm can read.
  const ltrPage = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
  const rtlPage = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
  try {
    await ltrPage.goto(`${base}?dir=ltr`);
    await rtlPage.goto(`${base}?dir=rtl`);
    await parkPointer(ltrPage);
    await parkPointer(rtlPage);
    for (const page of [ltrPage, rtlPage]) {
      await page.waitForFunction(() => (window as unknown as { ready?: boolean }).ready === true);
    }
    const ltr = await measure(ltrPage, [{ name: "plain", markup: set() }, ...CLASS_CASES]);
    const rtl = await measure(rtlPage, [{ name: "plain", markup: set() }, ...CLASS_CASES]);
    assertChips("unbundled: page dir=rtl", rtl.plain, "rtl", ltr.plain);
    assertChips("unbundled: LTR", ltr.plain, "ltr", ltr.plain);
    for (const item of CLASS_CASES) {
      assertChips(`unbundled: ${item.name}`, ltr[item.name], expectedDirection(item, "ltr"), ltr.plain);
      assertChips(`unbundled: ${item.name} (rtl page)`, rtl[item.name], expectedDirection(item, "rtl"), ltr.plain);
    }

    const elementLtr = await measureElements(ltrPage, ELEMENT_CASES);
    const elementRtl = await measureElements(rtlPage, ELEMENT_CASES);
    const reference = elementLtr.element;
    assertChips("element: LTR", reference, "ltr", reference, ELEMENT_TRAILING);
    for (const item of ELEMENT_CASES) {
      assertChips(`element: ${item.name}`, elementLtr[item.name], expectedDirection(item, "ltr"), reference, ELEMENT_TRAILING);
      assertChips(`element: ${item.name} (rtl page)`, elementRtl[item.name], expectedDirection(item, "rtl"), reference, ELEMENT_TRAILING);
    }
  } finally {
    await ltrPage.close();
    await rtlPage.close();
  }

  console.log(
    "Chip sides: the trailing control's connected corners and both touch targets " +
      "(the action's, spanning the action, and the remove button's 48px one, anchored to the chip's end) " +
      "follow the computed direction — the page's dir, a dir on the chip set's root, mtrl-rtl on the set, " +
      "on a chip's root and on an ancestor, a nearer dir=ltr boundary, and an element host inside a shadow " +
      "root — in the bundled full-css and in dist/styles.css; lang=ar alone does not turn them.",
  );
}
