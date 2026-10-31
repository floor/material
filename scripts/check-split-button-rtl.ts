// scripts/check-split-button-rtl.ts
//
// The split button's corner pairs, in every way a direction reaches it. The
// bundled full stylesheet is minified with target browser, and the minifier
// lowers the logical corner properties into :lang() arms that match a
// language, never dir="rtl" (src/styles/components/_text-field.scss): under
// the bundled sheet only, a split button on a right-to-left page kept its
// left-to-right corners while its halves swapped places. The partial now
// writes each physical pair and the right-to-left pair as a direction arm, so
// the bundled and the unbundled sheet must agree.
//
// The same markup renders in an LTR page and in an RTL page, under the
// bundled full-css and under dist/styles.css, with the direction arriving as
// the page's dir, a dir on the root itself, the runtime's mtrl-rtl class on
// the root or on an ancestor, a nearer dir="ltr" boundary, and as an element
// host inside a shadow root. `lang="ar"` alone is not a direction: it must
// leave the corners where the computed direction puts them.
//
// Called by rtl:check against the built package.
import assert from "node:assert/strict";
import type { Browser, Page } from "playwright";

const WIDTH = 600;
const HEIGHT = 720;

/** The `/plain` page puts the split button at the viewport's top-left corner,
 *  where a pointer at (0, 0) sits on it. A half under the pointer is mid-morph
 *  (the state rule hands it --mtrl-split-button-corner-active through a 425ms
 *  spring), and the two-frame wait reads a transition frame: CI caught the
 *  trailing half at 4.76898px instead of 4. Park the pointer on the empty
 *  bottom-right corner before measuring resting corners. */
const parkPointer = (page: Page): Promise<void> => page.mouse.move(WIDTH - 1, HEIGHT - 1);

/** The default size (s): outer corners are half the height, inner ones are
 *  ShapeTokens.CornerExtraSmall. */
const PILL = 20;
const CORNER = 4;

interface Box { x: number; width: number }
interface Corners { tl: number; tr: number; br: number; bl: number }
interface Split { root: Box; leading: Box; trailing: Box; leadingCorners: Corners; trailingCorners: Corners }

interface Pair { leading: Corners; trailing: Corners }

/** The leading half's inner corners sit on its trailing edge. */
const LTR_PAIR: Pair = {
  leading: { tl: PILL, tr: CORNER, br: CORNER, bl: PILL },
  trailing: { tl: CORNER, tr: PILL, br: PILL, bl: CORNER },
};

/** Mirrored: the leading half's inner corners sit on its leading edge. */
const RTL_PAIR: Pair = {
  leading: { tl: CORNER, tr: PILL, br: PILL, bl: CORNER },
  trailing: { tl: PILL, tr: CORNER, br: CORNER, bl: PILL },
};

/** The class markup a factory renders: both halves are the library's buttons,
 *  at the default size, the shape rules a split button lives under. */
const HALVES =
  `<button type="button" class="mtrl-button mtrl-button--filled mtrl-button--s mtrl-split-button__leading">Save</button>` +
  `<button type="button" class="mtrl-button mtrl-button--filled mtrl-button--s mtrl-split-button__trailing">` +
  `<span class="mtrl-button__icon"><svg width="22" height="22" viewBox="0 0 22 22"></svg></span></button>`;

const root = (classes = "", attributes = "", around = ""): string =>
  `<div${around}><div class="mtrl-split-button mtrl-split-button--s${classes}"${attributes}>${HALVES}</div></div>`;

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
 * `direction`, so the swap of the halves is the browser's.
 */
const CLASS_CASES: Case[] = [
  { name: "root dir=rtl", dir: "rtl", markup: root("", ' dir="rtl"') },
  { name: "root mtrl-rtl", dir: "rtl", markup: root(" mtrl-rtl", ' style="direction: rtl"') },
  { name: "ancestor mtrl-rtl", dir: "rtl", markup: root("", ' style="direction: rtl"', ' class="mtrl-rtl" style="direction: rtl"') },
  { name: "root dir=ltr (in an RTL page)", dir: "ltr", markup: root(" mtrl-ltr", ' dir="ltr"') },
  { name: "root mtrl-ltr, no dir", dir: "ltr", markup: root(" mtrl-ltr", ' style="direction: ltr"') },
  { name: "lang=ar alone", lang: "ar", markup: root() },
];

const expectedDirection = (item: { dir?: Direction }, page: Direction): Direction => item.dir ?? page;

const measure = (page: Page, cases: Case[]): Promise<Record<string, Split>> =>
  page.evaluate(async (cases) => {
    const host = document.getElementById("host") as HTMLElement;
    const frame = (): Promise<void> => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())));
    const box = (element: Element): { x: number; width: number } => {
      const rect = element.getBoundingClientRect();
      return { x: rect.x, width: rect.width };
    };
    const corners = (element: Element): { tl: number; tr: number; br: number; bl: number } => {
      const style = getComputedStyle(element);
      return {
        tl: parseFloat(style.borderTopLeftRadius),
        tr: parseFloat(style.borderTopRightRadius),
        br: parseFloat(style.borderBottomRightRadius),
        bl: parseFloat(style.borderBottomLeftRadius),
      };
    };
    const measured: Record<string, Split> = {};
    for (const item of cases) {
      document.documentElement.lang = item.lang ?? "";
      host.innerHTML = item.markup;
      await frame();
      const element = host.querySelector(".mtrl-split-button") as HTMLElement;
      const leading = element.querySelector(".mtrl-split-button__leading") as HTMLElement;
      const trailing = element.querySelector(".mtrl-split-button__trailing") as HTMLElement;
      measured[item.name] = {
        root: box(element),
        leading: box(leading),
        trailing: box(trailing),
        leadingCorners: corners(leading),
        trailingCorners: corners(trailing),
      };
      host.replaceChildren();
    }
    document.documentElement.lang = "";
    return measured;
  }, cases);

interface ElementCase {
  name: string;
  dir?: Direction;
  shadow: boolean;
}

const ELEMENT_CASES: ElementCase[] = [
  { name: "element", shadow: false },
  { name: "element in a shadow root", shadow: true },
  { name: "element dir=rtl", dir: "rtl", shadow: false },
  { name: "element dir=ltr in a shadow root", dir: "ltr", shadow: true },
];

const measureElements = (page: Page, cases: ElementCase[]): Promise<Record<string, Split>> =>
  page.evaluate(async (cases) => {
    const host = document.getElementById("host") as HTMLElement;
    const frame = (): Promise<void> => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())));
    const box = (element: Element): { x: number; width: number } => {
      const rect = element.getBoundingClientRect();
      return { x: rect.x, width: rect.width };
    };
    const corners = (element: Element): { tl: number; tr: number; br: number; bl: number } => {
      const style = getComputedStyle(element);
      return {
        tl: parseFloat(style.borderTopLeftRadius),
        tr: parseFloat(style.borderTopRightRadius),
        br: parseFloat(style.borderBottomRightRadius),
        bl: parseFloat(style.borderBottomLeftRadius),
      };
    };
    const measured: Record<string, Split> = {};
    for (const item of cases) {
      host.replaceChildren();
      const container = document.createElement("div");
      const mount = item.shadow ? container.attachShadow({ mode: "open" }) : container;
      const element = document.createElement("m-split-button");
      element.textContent = "Save";
      if (item.dir) element.setAttribute("dir", item.dir);
      mount.append(element);
      host.append(container);
      await frame();
      const scope = element.shadowRoot as ShadowRoot;
      const split = scope.querySelector(".mtrl-split-button") as HTMLElement;
      const leading = scope.querySelector(".mtrl-split-button__leading") as HTMLElement;
      const trailing = scope.querySelector(".mtrl-split-button__trailing") as HTMLElement;
      measured[item.name] = {
        root: box(split),
        leading: box(leading),
        trailing: box(trailing),
        leadingCorners: corners(leading),
        trailingCorners: corners(trailing),
      };
    }
    host.replaceChildren();
    return measured;
  }, cases);

const near = (a: number, b: number): boolean => Math.abs(a - b) <= 0.5;
const offset = (split: Split, half: "leading" | "trailing"): number => split[half].x - split.root.x;

/** The pair on the right sides, and the halves ordered as the direction puts them. */
function assertMirrored(where: string, split: Split, direction: Direction, base: Split): void {
  const pair = direction === "rtl" ? RTL_PAIR : LTR_PAIR;
  assert.deepEqual(
    split.leadingCorners,
    pair.leading,
    `${where}: the leading half's corners are ${JSON.stringify(split.leadingCorners)}; expected ${JSON.stringify(pair.leading)}`,
  );
  assert.deepEqual(
    split.trailingCorners,
    pair.trailing,
    `${where}: the trailing half's corners are ${JSON.stringify(split.trailingCorners)}; expected ${JSON.stringify(pair.trailing)}`,
  );
  assert(
    near(split.root.width, base.root.width),
    `${where}: the split button is ${split.root.width}px wide; the LTR one is ${base.root.width}px`,
  );
  for (const half of ["leading", "trailing"] as const) {
    const expected = direction === "rtl"
      ? base.root.width - offset(base, half) - base[half].width
      : offset(base, half);
    assert(
      near(offset(split, half), expected),
      `${where}: the ${half} half starts ${offset(split, half)}px into the root; expected ${expected}px`,
    );
  }
}

/** The class markup on both pages of one sheet. */
async function assertSheet(browser: Browser, base: string, sheet: string): Promise<void> {
  const ltrPage = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
  const rtlPage = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
  try {
    await ltrPage.goto(`${base}${sheet}?dir=ltr`);
    await rtlPage.goto(`${base}${sheet}?dir=rtl`);
    await parkPointer(ltrPage);
    await parkPointer(rtlPage);
    const ltr = await measure(ltrPage, [{ name: "plain", markup: root() }, ...CLASS_CASES]);
    const rtl = await measure(rtlPage, [{ name: "plain", markup: root() }, ...CLASS_CASES]);
    // The plain LTR page is the reference every other case is read against.
    assertMirrored(`${sheet}: LTR`, ltr.plain, "ltr", ltr.plain);
    // The lowering is the defect this pass exists for: its case comes first.
    assertMirrored(`${sheet}: page dir=rtl`, rtl.plain, "rtl", ltr.plain);
    for (const item of CLASS_CASES) {
      assertMirrored(`${sheet}: ${item.name}`, ltr[item.name], expectedDirection(item, "ltr"), ltr.plain);
      assertMirrored(`${sheet}: ${item.name} (rtl page)`, rtl[item.name], expectedDirection(item, "rtl"), ltr.plain);
    }
  } finally {
    await ltrPage.close();
    await rtlPage.close();
  }
}

export async function checkSplitButtonRtl(browser: Browser, base: string): Promise<void> {
  // Bundled first: its first failure is the quote a regression shows.
  await assertSheet(browser, base, "plain");

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
    await ltrPage.waitForFunction(() => (window as unknown as { ready?: boolean }).ready === true);
    await rtlPage.waitForFunction(() => (window as unknown as { ready?: boolean }).ready === true);
    const ltr = await measure(ltrPage, [{ name: "plain", markup: root() }, ...CLASS_CASES]);
    const rtl = await measure(rtlPage, [{ name: "plain", markup: root() }, ...CLASS_CASES]);
    assertMirrored("unbundled: LTR", ltr.plain, "ltr", ltr.plain);
    assertMirrored("unbundled: page dir=rtl", rtl.plain, "rtl", ltr.plain);
    for (const item of CLASS_CASES) {
      assertMirrored(`unbundled: ${item.name}`, ltr[item.name], expectedDirection(item, "ltr"), ltr.plain);
      assertMirrored(`unbundled: ${item.name} (rtl page)`, rtl[item.name], expectedDirection(item, "rtl"), ltr.plain);
    }

    const elementLtr = await measureElements(ltrPage, ELEMENT_CASES);
    const elementRtl = await measureElements(rtlPage, ELEMENT_CASES);
    const reference = elementLtr.element;
    assertMirrored("element: LTR", reference, "ltr", reference);
    for (const item of ELEMENT_CASES) {
      assertMirrored(`element: ${item.name}`, elementLtr[item.name], expectedDirection(item, "ltr"), reference);
      assertMirrored(`element: ${item.name} (rtl page)`, elementRtl[item.name], expectedDirection(item, "rtl"), reference);
    }
  } finally {
    await ltrPage.close();
    await rtlPage.close();
  }

  console.log(
    "Split button corners: the outer pair on the outer side and the inner pair facing the gap " +
      `(${PILL}/${CORNER}px at the default size), mirrored for the page's dir, a dir on the root, ` +
      "mtrl-rtl on the root and on an ancestor, an element host inside a shadow root, and a nearer " +
      "dir=ltr boundary, in the bundled full-css and in dist/styles.css; lang=ar alone does not turn them.",
  );
}
