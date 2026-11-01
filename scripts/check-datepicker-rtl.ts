// scripts/check-datepicker-rtl.ts
//
// The date picker's inline-end insets, in every way a direction reaches it.
// The bundled full stylesheet is minified with target browser, and the
// minifier lowers `inset-inline-start/end` into :lang() arms that match a
// language, never dir="rtl" (src/styles/components/_text-field.scss): under
// the bundled sheet only, a date picker on a right-to-left page kept its
// trigger, its docked calendar and its full-screen buttons on the
// left-to-right side. The partial now writes each physical side and the
// right-to-left side as a direction arm, so the bundled and the unbundled
// sheet must agree.
//
// The same markup renders in an LTR page and in an RTL page, under the
// bundled full-css and under dist/styles.css, with the direction arriving as
// the page's dir, a dir on the picker's root, the runtime's mtrl-rtl class on
// the root or on an ancestor, a nearer dir="ltr" boundary, and as an element
// host inside a shadow root. `lang="ar"` alone is not a direction: it must
// leave the insets where the computed direction puts them. Docked, modal and
// full-screen pickers are measured open, and the range band's bleed into the
// grid padding on both sides.
//
// Called by rtl:check against the built package.
import assert from "node:assert/strict";
import type { Browser, Page } from "playwright";

const WIDTH = 600;
const HEIGHT = 720;

/** The `/plain` fixture puts the markup at the viewport's top-left, where a
 *  pointer at (0, 0) can sit on the field; a hovered control changes only its
 *  state layer here, but the split button's corner morph taught this pass to
 *  park the pointer on the empty bottom-right corner before measuring. */
const parkPointer = (page: Page): Promise<void> => page.mouse.move(WIDTH - 1, HEIGHT - 1);

interface Box { x: number; width: number }

/** The band's bleed pseudo-element: where it starts and how wide it is, against
 *  the cell's own width. `left` is the used value, so an `auto` side has
 *  resolved past the cell edge the band continues from or to. */
interface BleedSide { left: number; width: number; cellWidth: number }
interface Bleed { first: BleedSide; last: BleedSide; found: boolean }

interface Measured {
  root: Box;
  field: Box;
  trigger: Box | null;
  calendar: Box | null;
  header: Box | null;
  modeToggle: Box | null;
  close: Box | null;
  save: Box | null;
  bleed: Bleed;
}

type Variant = "docked" | "modal" | "fullscreen";

/** One month's week: seven in-range cells, so the first and the last are the
 *  ones whose band bleeds into the grid's inline padding. */
const WEEK =
  `<div class="mtrl-datepicker__week">` +
  Array.from(
    { length: 7 },
    (_, index) => `<div class="mtrl-datepicker__cell mtrl-datepicker__cell--range">` +
      `<button type="button" class="mtrl-datepicker__day">${index + 1}</button></div>`,
  ).join("") +
  `</div>`;

const FIELD =
  `<div class="mtrl-datepicker__anchor">` +
  `<input class="mtrl-datepicker__input" type="text" aria-label="Date">` +
  `<button type="button" class="mtrl-datepicker__trigger" aria-label="Choose date"></button>` +
  `</div>`;

/**
 * The factory's markup, as the component renders it: a field with the trigger
 * at its inline end, and the calendar as a `<dialog>` that is open. The
 * wrapper is 280px so the docked calendar (360px) is wider than its field:
 * with equal widths an inline-start-aligned box and an inline-end-aligned one
 * cover the same pixels and the insets could not be told apart.
 */
const picker = (variant: Variant, classes = "", attributes = "", around = ""): string => {
  const fullscreen = variant === "fullscreen";
  const calendar = `mtrl-datepicker__calendar mtrl-datepicker--${variant === "docked" ? "docked" : "modal"} mtrl-datepicker--range${fullscreen ? " mtrl-datepicker--fullscreen" : ""}`;
  const header = variant === "docked"
    ? `<div class="mtrl-datepicker__header"></div>`
    : `<div class="mtrl-datepicker__modal-header">` +
      (fullscreen ? `<button type="button" class="mtrl-datepicker__close" aria-label="Close"></button>` +
        `<button type="button" class="mtrl-datepicker__save">Save</button>` : "") +
      `<div class="mtrl-datepicker__title"></div><div class="mtrl-datepicker__headline"></div>` +
      `<button type="button" class="mtrl-datepicker__mode-toggle"></button></div>`;
  return `<div${around || ' style="width: 280px"'}><div class="mtrl-datepicker${classes}"${attributes}>` +
    FIELD +
    `<dialog class="${calendar}" open>${header}` +
    `<div class="mtrl-datepicker__days">${WEEK}</div></dialog>` +
    `</div></div>`;
};

type Direction = "ltr" | "rtl";

interface Case {
  name: string;
  variant: Variant;
  /** The direction the case's own markup establishes; the page's when absent. */
  dir?: Direction;
  lang?: string;
  markup: string;
}

/**
 * The class-markup cases. A marker class is placed with the CSS direction its
 * runtime resolved, not with the class alone: the class does not set
 * `direction`, so the field's own layout is the browser's.
 */
const CLASS_CASES: Case[] = [
  { name: "root dir=rtl", variant: "docked", dir: "rtl", markup: picker("docked", "", ' dir="rtl"') },
  { name: "root mtrl-rtl", variant: "docked", dir: "rtl", markup: picker("docked", " mtrl-rtl", ' style="direction: rtl"') },
  { name: "ancestor mtrl-rtl", variant: "docked", dir: "rtl", markup: picker("docked", "", ' style="direction: rtl"', ' class="mtrl-rtl" style="direction: rtl; width: 280px"') },
  { name: "root dir=ltr (in an RTL page)", variant: "docked", dir: "ltr", markup: picker("docked", " mtrl-ltr", ' dir="ltr"') },
  { name: "root mtrl-ltr, no dir", variant: "docked", dir: "ltr", markup: picker("docked", " mtrl-ltr", ' style="direction: ltr"') },
  { name: "lang=ar alone", variant: "docked", lang: "ar", markup: picker("docked") },
];

const MODAL_CASES: Case[] = [
  { name: "modal root dir=rtl", variant: "modal", dir: "rtl", markup: picker("modal", "", ' dir="rtl"') },
  { name: "modal root mtrl-rtl", variant: "modal", dir: "rtl", markup: picker("modal", " mtrl-rtl", ' style="direction: rtl"') },
  { name: "modal ancestor mtrl-rtl", variant: "modal", dir: "rtl", markup: picker("modal", "", ' style="direction: rtl"', ' class="mtrl-rtl" style="direction: rtl; width: 280px"') },
  { name: "modal root dir=ltr (in an RTL page)", variant: "modal", dir: "ltr", markup: picker("modal", " mtrl-ltr", ' dir="ltr"') },
  { name: "modal root mtrl-ltr, no dir", variant: "modal", dir: "ltr", markup: picker("modal", " mtrl-ltr", ' style="direction: ltr"') },
  { name: "modal lang=ar alone", variant: "modal", lang: "ar", markup: picker("modal") },
];

const FULLSCREEN_CASES: Case[] = [
  { name: "fullscreen root dir=rtl", variant: "fullscreen", dir: "rtl", markup: picker("fullscreen", "", ' dir="rtl"') },
  { name: "fullscreen root mtrl-rtl", variant: "fullscreen", dir: "rtl", markup: picker("fullscreen", " mtrl-rtl", ' style="direction: rtl"') },
  { name: "fullscreen ancestor mtrl-rtl", variant: "fullscreen", dir: "rtl", markup: picker("fullscreen", "", ' style="direction: rtl"', ' class="mtrl-rtl" style="direction: rtl; width: 280px"') },
  { name: "fullscreen root dir=ltr (in an RTL page)", variant: "fullscreen", dir: "ltr", markup: picker("fullscreen", " mtrl-ltr", ' dir="ltr"') },
  { name: "fullscreen root mtrl-ltr, no dir", variant: "fullscreen", dir: "ltr", markup: picker("fullscreen", " mtrl-ltr", ' style="direction: ltr"') },
  { name: "fullscreen lang=ar alone", variant: "fullscreen", lang: "ar", markup: picker("fullscreen") },
];

const PLAIN: Case = { name: "plain", variant: "docked", markup: picker("docked") };
const PLAIN_MODAL: Case = { name: "plain modal", variant: "modal", markup: picker("modal") };
const PLAIN_FULLSCREEN: Case = { name: "plain fullscreen", variant: "fullscreen", markup: picker("fullscreen") };

const expectedDirection = (item: { dir?: Direction }, page: Direction): Direction => item.dir ?? page;

const measure = (page: Page, cases: Case[]): Promise<Record<string, Measured>> =>
  page.evaluate(async (cases) => {
    const host = document.getElementById("host") as HTMLElement;
    const frame = (): Promise<void> => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())));
    const box = (element: Element): { x: number; width: number } => {
      const rect = element.getBoundingClientRect();
      return { x: rect.x, width: rect.width };
    };
    const bleedSide = (cell: Element): { left: number; width: number; cellWidth: number } => {
      const style = getComputedStyle(cell, "::before");
      return { left: parseFloat(style.left), width: parseFloat(style.width), cellWidth: box(cell).width };
    };
    const measured: Record<string, Measured> = {};
    for (const item of cases) {
      document.documentElement.lang = item.lang ?? "";
      host.innerHTML = item.markup;
      await frame();
      const root = host.querySelector(".mtrl-datepicker") as HTMLElement;
      const field = root.querySelector(".mtrl-datepicker__anchor") as HTMLElement;
      const trigger = root.querySelector(".mtrl-datepicker__trigger");
      const calendar = root.querySelector(".mtrl-datepicker--docked, .mtrl-datepicker--modal");
      const header = root.querySelector(".mtrl-datepicker__modal-header");
      const modeToggle = root.querySelector(".mtrl-datepicker__mode-toggle");
      const close = root.querySelector(".mtrl-datepicker__close");
      const save = root.querySelector(".mtrl-datepicker__save");
      const cells = Array.from(root.querySelectorAll(".mtrl-datepicker__week > .mtrl-datepicker__cell"));
      const first = cells[0];
      const last = cells[cells.length - 1];
      measured[item.name] = {
        root: box(root),
        field: box(field),
        trigger: trigger ? box(trigger) : null,
        calendar: calendar ? box(calendar) : null,
        header: header ? box(header) : null,
        modeToggle: modeToggle ? box(modeToggle) : null,
        close: close ? box(close) : null,
        save: save ? box(save) : null,
        bleed: { first: bleedSide(first), last: bleedSide(last), found: true },
      };
      host.replaceChildren();
    }
    document.documentElement.lang = "";
    return measured;
  }, cases);

const near = (a: number, b: number): boolean => Math.abs(a - b) <= 0.5;

/** How far `element` sits from the inline-start edge of `container`. */
const startGap = (element: Box, container: Box, direction: Direction): number =>
  direction === "rtl"
    ? container.x + container.width - (element.x + element.width)
    : element.x - container.x;

function assertBleed(where: string, bleed: Bleed, direction: Direction): void {
  assert(bleed.found, `${where}: no range cell sits at a week boundary, so the band's bleed was not measured`);
  // First child not the range start: the band runs on from its inline-start
  // edge, past the cell into the grid padding. Last child not the range end:
  // it runs out past its inline-end edge. The pseudo is one grid inset (12px)
  // wide; a used left of -width is past the cell's left edge, a used left of
  // the cell width is past its right one.
  const first = direction === "rtl" ? bleed.first.cellWidth : -bleed.first.width;
  const last = direction === "rtl" ? -bleed.last.width : bleed.last.cellWidth;
  assert(
    near(bleed.first.left, first),
    `${where}: the first in-range cell's band bleed sits at left=${bleed.first.left}px; expected ${first}px, outside its inline-start edge`,
  );
  assert(
    near(bleed.last.left, last),
    `${where}: the last in-range cell's band bleed sits at left=${bleed.last.left}px; expected ${last}px, outside its inline-end edge`,
  );
}

/**
 * Every inset the partial writes, read against the box it is placed in: the
 * trigger at the field's inline end, the docked calendar under the field's
 * inline start, the mode toggle and Save at the header's inline end, Close at
 * its inline start, and the range band's bleed on the cell's sides.
 */
function assertCase(where: string, measured: Measured, variant: Variant, direction: Direction): void {
  if (variant === "docked") {
    assert(measured.calendar, `${where}: the docked calendar did not render`);
    const calendarGap = startGap(measured.calendar, measured.field, direction);
    assert(
      near(calendarGap, 0),
      `${where}: the docked calendar's inline-start edge is ${calendarGap}px inside the field's; expected 0`,
    );
    assert(measured.trigger, `${where}: the trigger did not render`);
    const triggerEnd = direction === "rtl"
      ? measured.trigger.x - measured.field.x
      : measured.field.x + measured.field.width - (measured.trigger.x + measured.trigger.width);
    assert(
      near(triggerEnd, 4),
      `${where}: the trigger is ${triggerEnd}px from the field's ${direction === "rtl" ? "start" : "end"} edge; expected 4`,
    );
  }
  if (variant === "modal" || variant === "fullscreen") {
    assert(measured.header, `${where}: the header did not render`);
    assert(measured.modeToggle, `${where}: the mode toggle did not render`);
    const modeEnd = direction === "rtl"
      ? measured.modeToggle.x - measured.header.x
      : measured.header.x + measured.header.width - (measured.modeToggle.x + measured.modeToggle.width);
    assert(
      near(modeEnd, 12),
      `${where}: the mode toggle is ${modeEnd}px from the header's ${direction === "rtl" ? "start" : "end"} edge; expected 12`,
    );
  }
  if (variant === "fullscreen") {
    assert(measured.close && measured.save, `${where}: the close and save buttons did not render`);
    const closeStart = startGap(measured.close, measured.header!, direction);
    assert(
      near(closeStart, 4),
      `${where}: Close is ${closeStart}px from the header's inline start; expected 4`,
    );
    const saveEnd = direction === "rtl"
      ? measured.save.x - measured.header!.x
      : measured.header!.x + measured.header!.width - (measured.save.x + measured.save.width);
    assert(
      near(saveEnd, 12),
      `${where}: Save is ${saveEnd}px from the header's ${direction === "rtl" ? "start" : "end"} edge; expected 12`,
    );
  }
  assertBleed(where, measured.bleed, direction);
}

interface ElementCase {
  name: string;
  dir?: Direction;
  shadow: boolean;
  variant: "docked" | "modal";
}

const ELEMENT_CASES: ElementCase[] = [
  { name: "element (docked)", shadow: false, variant: "docked" },
  { name: "element (modal)", shadow: false, variant: "modal" },
  { name: "element in a shadow root (docked)", shadow: true, variant: "docked" },
  { name: "element in a shadow root (modal)", shadow: true, variant: "modal" },
  { name: "element dir=rtl (docked)", dir: "rtl", shadow: false, variant: "docked" },
  { name: "element dir=ltr in a shadow root (modal)", dir: "ltr", shadow: true, variant: "modal" },
];

const measureElements = (page: Page, cases: ElementCase[]): Promise<Record<string, Measured>> =>
  page.evaluate(async (cases) => {
    const host = document.getElementById("host") as HTMLElement;
    const frame = (): Promise<void> => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())));
    const box = (element: Element): { x: number; width: number } => {
      const rect = element.getBoundingClientRect();
      return { x: rect.x, width: rect.width };
    };
    const bleedSide = (cell: Element): { left: number; width: number; cellWidth: number } => {
      const style = getComputedStyle(cell, "::before");
      return { left: parseFloat(style.left), width: parseFloat(style.width), cellWidth: box(cell).width };
    };
    const measured: Record<string, Measured> = {};
    for (const item of cases) {
      host.replaceChildren();
      const container = document.createElement("div");
      const mount = item.shadow ? container.attachShadow({ mode: "open" }) : container;
      const element = document.createElement("m-datepicker") as HTMLElement & { close: () => void };
      element.setAttribute("selection-mode", "range");
      element.setAttribute("value", "2026-10-09/2026-10-13");
      if (item.variant === "modal") element.setAttribute("variant", "modal");
      if (item.dir) element.setAttribute("dir", item.dir);
      element.setAttribute("open", "");
      mount.append(element);
      host.append(container);
      await frame();
      const scope = element.shadowRoot as ShadowRoot;
      const root = scope.querySelector(".mtrl-datepicker") as HTMLElement;
      const field = scope.querySelector(".mtrl-datepicker__anchor") as HTMLElement;
      const trigger = scope.querySelector(".mtrl-datepicker__trigger");
      const calendar = scope.querySelector(".mtrl-datepicker--docked, .mtrl-datepicker--modal");
      const header = scope.querySelector(".mtrl-datepicker__modal-header");
      const modeToggle = scope.querySelector(".mtrl-datepicker__mode-toggle");
      const selected = Array.from(scope.querySelectorAll(".mtrl-datepicker__week > .mtrl-datepicker__cell"));
      const first = selected.find((cell) => cell.classList.contains("mtrl-datepicker__cell--range") &&
        !cell.classList.contains("mtrl-datepicker__cell--range-start") &&
        cell === cell.parentElement!.firstElementChild);
      const last = selected.find((cell) => cell.classList.contains("mtrl-datepicker__cell--range") &&
        !cell.classList.contains("mtrl-datepicker__cell--range-end") &&
        cell === cell.parentElement!.lastElementChild);
      measured[item.name] = {
        root: box(root),
        field: box(field),
        trigger: trigger ? box(trigger) : null,
        calendar: calendar ? box(calendar) : null,
        header: header ? box(header) : null,
        modeToggle: modeToggle ? box(modeToggle) : null,
        close: null,
        save: null,
        bleed: first && last
          ? { first: bleedSide(first), last: bleedSide(last), found: true }
          : { first: { left: 0, width: 0, cellWidth: 0 }, last: { left: 0, width: 0, cellWidth: 0 }, found: false },
      };
      element.close();
      element.remove();
    }
    host.replaceChildren();
    return measured;
  }, cases);

/** The class markup on both pages of one sheet. */
async function assertSheet(browser: Browser, base: string, sheet: string): Promise<void> {
  const ltrPage = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
  const rtlPage = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
  try {
    await ltrPage.goto(`${base}${sheet}?dir=ltr`);
    await rtlPage.goto(`${base}${sheet}?dir=rtl`);
    await parkPointer(ltrPage);
    await parkPointer(rtlPage);
    const cases = [PLAIN, PLAIN_MODAL, PLAIN_FULLSCREEN, ...CLASS_CASES, ...MODAL_CASES, ...FULLSCREEN_CASES];
    const ltr = await measure(ltrPage, cases);
    const rtl = await measure(rtlPage, cases);
    // The page's own direction is the defect this pass exists for: its cases come first.
    for (const item of [PLAIN, PLAIN_MODAL, PLAIN_FULLSCREEN]) {
      assertCase(`${sheet}: LTR`, ltr[item.name], item.variant, "ltr");
      assertCase(`${sheet}: page dir=rtl`, rtl[item.name], item.variant, "rtl");
    }
    for (const item of [...CLASS_CASES, ...MODAL_CASES, ...FULLSCREEN_CASES]) {
      assertCase(`${sheet}: ${item.name}`, ltr[item.name], item.variant, expectedDirection(item, "ltr"));
      assertCase(`${sheet}: ${item.name} (rtl page)`, rtl[item.name], item.variant, expectedDirection(item, "rtl"));
    }
  } finally {
    await ltrPage.close();
    await rtlPage.close();
  }
}

/** The element host's direction reaches the sheet as its mtrl-rtl class. */
async function assertElements(page: Page, where: string, pageDirection: Direction): Promise<void> {
  const measured = await measureElements(page, ELEMENT_CASES);
  for (const item of ELEMENT_CASES) {
    assertCase(`${where}: ${item.name}`, measured[item.name], item.variant, expectedDirection(item, pageDirection));
  }
}

export async function checkDatepickerRtl(browser: Browser, base: string): Promise<void> {
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
    const cases = [PLAIN, PLAIN_MODAL, PLAIN_FULLSCREEN, ...CLASS_CASES, ...MODAL_CASES, ...FULLSCREEN_CASES];
    const ltr = await measure(ltrPage, cases);
    const rtl = await measure(rtlPage, cases);
    for (const item of [PLAIN, PLAIN_MODAL, PLAIN_FULLSCREEN]) {
      assertCase(`unbundled: LTR`, ltr[item.name], item.variant, "ltr");
      assertCase(`unbundled: page dir=rtl`, rtl[item.name], item.variant, "rtl");
    }
    for (const item of [...CLASS_CASES, ...MODAL_CASES, ...FULLSCREEN_CASES]) {
      assertCase(`unbundled: ${item.name}`, ltr[item.name], item.variant, expectedDirection(item, "ltr"));
      assertCase(`unbundled: ${item.name} (rtl page)`, rtl[item.name], item.variant, expectedDirection(item, "rtl"));
    }

    await assertElements(ltrPage, "element (ltr page)", "ltr");
    await assertElements(rtlPage, "element (rtl page)", "rtl");
  } finally {
    await ltrPage.close();
    await rtlPage.close();
  }

  console.log(
    "Date picker insets: the trigger, the docked calendar, the full-screen buttons and the range band's " +
      "bleed follow the computed direction — the page's dir, a dir on the picker's root, mtrl-rtl on the root " +
      "and on an ancestor, a nearer dir=ltr boundary, and an element host inside a shadow root — in the bundled " +
      "full-css and in dist/styles.css; lang=ar alone does not turn them.",
  );
}
