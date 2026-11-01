// scripts/check-snackbar-progress-toolbar-rtl.ts
//
// The snackbar's start and end places, the linear progress label's edge and
// the toolbar's start and end placements, in every way a direction reaches
// them. A consumer bundle lowers `inset-inline-start` / `inset-inline-end`
// into `:lang()` arms that match a language, never `dir="rtl"`
// (src/styles/components/_text-field.scss): under the bundled sheet only, a
// start snackbar stayed at the left edge of a right-to-left page, the linear
// label kept its right edge, and a start toolbar kept its left one. The
// partials now write the physical side and the right-to-left side as a
// direction arm (the FAB placement form; the toolbar's hidden offsets already
// read the same arms through their direction multiplier), so the bundled and
// the unbundled sheet must agree.
//
// The same markup renders in an LTR page and in an RTL page, under the bundled
// full-css and under dist/styles.css, with the direction arriving as the page's
// dir, a dir on the root itself, the runtime's mtrl-rtl class on the root or on
// an ancestor, and a nearer dir="ltr" boundary. The element hosts render inside
// a shadow root, where the page's dir cannot reach the parts but the host
// resolves its computed direction — inherited through the boundary — into the
// mtrl-rtl class its own shadow tree reads. The toolbar has no element host: a
// factory's markup is light DOM, so the page's dir reaches it as an attribute
// and the runtime writes the class it resolved on the factory's own root
// (core/dom/direction). `lang="ar"` alone is not a direction: it must leave
// every part where the computed direction puts it.
//
// Called by rtl:check against the built package.
import assert from "node:assert/strict";
import type { Browser, Page } from "playwright";

const WIDTH = 600;
const HEIGHT = 720;

/** Distance from the window edge: the snackbar's 16dp, and the toolbar's 24dp
 *  when vertical (the placed floating margin its custom property carries). */
const SNACKBAR_MARGIN = 16;
const TOOLBAR_MARGIN = 24;
const CONTAINER_WIDTH = 320;

const ICON = '<svg viewBox="0 0 24 24" width="24" height="24"></svg>';

interface Box { x: number; width: number }
interface Label { offset: number; width: number }

/** Everything one case's markup lays out, in one place. */
interface Snapshot {
  snackbarStart: Box;
  snackbarEnd: Box;
  linearWidth: number;
  linearLabel: Label;
  /** The circular label's centre against its indicator's, both directions. */
  circularCentre: number;
  toolbarStart: Box;
  toolbarEnd: Box;
}

/** The class markup a factory renders: the snackbar with an action and a close
 *  affordance, a linear and a circular progress with their label, and a
 *  vertical toolbar at each side of a positioned container. The snackbar is
 *  measured through its visible state: the resting one is scaled to 0.8, and a
 *  rect reads the scaled box. */
const snackbar = (position: string, classes = "", attributes = ""): string =>
  `<div class="mtrl-snackbar mtrl-snackbar--visible mtrl-snackbar--with-action mtrl-snackbar--dismissible mtrl-snackbar--${position}${classes}"${attributes}>` +
  `<span class="mtrl-snackbar__text">Message</span>` +
  `<button type="button" class="mtrl-button mtrl-snackbar__action">Undo</button>` +
  `<button type="button" class="mtrl-icon-button mtrl-snackbar__close" aria-label="Close">${ICON}</button></div>`;

const linear = (classes = "", attributes = ""): string =>
  `<div style="width: 240px"><div class="mtrl-progress mtrl-progress--linear${classes}"${attributes}>` +
  `<canvas class="mtrl-progress__canvas" width="240" height="4"></canvas>` +
  `<span class="mtrl-progress__label">50%</span></div></div>`;

const circular = (classes = "", attributes = ""): string =>
  `<span class="mtrl-progress mtrl-progress--circular${classes}"${attributes}>` +
  `<canvas class="mtrl-progress__canvas" width="48" height="48"></canvas>` +
  `<span class="mtrl-progress__label">50%</span></span>`;

const toolbar = (side: string, classes = "", attributes = ""): string =>
  `<div id="toolbar-${side}-container" style="position: relative; width: ${CONTAINER_WIDTH}px; height: 160px">` +
  `<div class="mtrl-toolbar mtrl-toolbar--vertical mtrl-toolbar--${side}${classes}"${attributes}>` +
  `<div class="mtrl-toolbar__bar">` +
  `<button type="button" class="mtrl-icon-button" aria-label="Bold">${ICON}</button>` +
  `<button type="button" class="mtrl-icon-button" aria-label="Italic">${ICON}</button>` +
  `</div></div></div>`;

const caseMarkup = (classes = "", attributes = "", around = ""): string =>
  `<div${around}>` +
  snackbar("start", classes, attributes) +
  snackbar("end", classes, attributes) +
  linear(classes, attributes) +
  circular(classes, attributes) +
  toolbar("start", classes, attributes) +
  toolbar("end", classes, attributes) +
  `</div>`;

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
 * `direction`, so the mirrored geometry is the arms' reading of it.
 */
const CLASS_CASES: Case[] = [
  { name: "root dir=rtl", dir: "rtl", markup: caseMarkup("", ' dir="rtl"') },
  { name: "root mtrl-rtl", dir: "rtl", markup: caseMarkup(" mtrl-rtl", ' style="direction: rtl"') },
  { name: "ancestor mtrl-rtl", dir: "rtl", markup: caseMarkup("", "", ' class="mtrl-rtl" style="direction: rtl"') },
  { name: "root dir=ltr (in an RTL page)", dir: "ltr", markup: caseMarkup(" mtrl-ltr", ' dir="ltr"') },
  { name: "lang=ar alone", lang: "ar", markup: caseMarkup() },
];

const expectedDirection = (item: { dir?: Direction }, page: Direction): Direction => item.dir ?? page;

const measure = (page: Page, cases: Case[]): Promise<Record<string, Snapshot>> =>
  page.evaluate(async (cases) => {
    const host = document.getElementById("host") as HTMLElement;
    const frame = (): Promise<void> => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())));
    const box = (element: Element): { x: number; width: number } => {
      const rect = element.getBoundingClientRect();
      return { x: rect.x, width: rect.width };
    };
    const offset = (element: Element, from: Element): { x: number; width: number } => {
      const rect = element.getBoundingClientRect();
      return { x: rect.x - from.getBoundingClientRect().x, width: rect.width };
    };
    const measured: Record<string, Snapshot> = {};
    for (const item of cases) {
      document.documentElement.lang = item.lang ?? "";
      host.innerHTML = item.markup;
      await frame();
      const linearRoot = host.querySelector(".mtrl-progress--linear") as HTMLElement;
      const linearLabel = linearRoot.querySelector(".mtrl-progress__label") as HTMLElement;
      const circularRoot = host.querySelector(".mtrl-progress--circular") as HTMLElement;
      const circularLabel = circularRoot.querySelector(".mtrl-progress__label") as HTMLElement;
      const labelCentre = circularLabel.getBoundingClientRect().x + circularLabel.getBoundingClientRect().width / 2;
      const indicatorCentre = circularRoot.getBoundingClientRect().x + circularRoot.getBoundingClientRect().width / 2;
      measured[item.name] = {
        snackbarStart: box(host.querySelector(".mtrl-snackbar--start") as HTMLElement),
        snackbarEnd: box(host.querySelector(".mtrl-snackbar--end") as HTMLElement),
        linearWidth: linearRoot.getBoundingClientRect().width,
        linearLabel: {
          offset: linearLabel.getBoundingClientRect().x - linearRoot.getBoundingClientRect().x,
          width: linearLabel.getBoundingClientRect().width,
        },
        circularCentre: labelCentre - indicatorCentre,
        toolbarStart: offset(
          host.querySelector(".mtrl-toolbar--start") as HTMLElement,
          document.getElementById("toolbar-start-container") as HTMLElement,
        ),
        toolbarEnd: offset(
          host.querySelector(".mtrl-toolbar--end") as HTMLElement,
          document.getElementById("toolbar-end-container") as HTMLElement,
        ),
      };
      host.replaceChildren();
    }
    document.documentElement.lang = "";
    return measured;
  }, cases);

const near = (a: number, b: number): boolean => Math.abs(a - b) <= 0.5;

/** Every part on the side the direction puts it, mirrored about the viewport
 *  (the snackbar) or the part's own container (the rest). */
function assertMirrored(where: string, snap: Snapshot, direction: Direction, base: Snapshot): void {
  const start = direction === "rtl" ? WIDTH - SNACKBAR_MARGIN - base.snackbarStart.width : SNACKBAR_MARGIN;
  assert(
    near(snap.snackbarStart.x, start),
    `${where}: the start snackbar sits ${snap.snackbarStart.x}px from the left edge; expected ${start}px`,
  );
  const end = direction === "rtl" ? SNACKBAR_MARGIN : WIDTH - SNACKBAR_MARGIN - base.snackbarEnd.width;
  assert(
    near(snap.snackbarEnd.x, end),
    `${where}: the end snackbar sits ${snap.snackbarEnd.x}px from the left edge; expected ${end}px`,
  );
  const label = direction === "rtl" ? 0 : base.linearWidth - base.linearLabel.width;
  assert(
    near(snap.linearLabel.offset, label),
    `${where}: the linear label starts ${snap.linearLabel.offset}px into the indicator; expected ${label}px`,
  );
  assert(
    Math.abs(snap.circularCentre) <= 0.5,
    `${where}: the circular label's centre is ${snap.circularCentre}px off its indicator's; expected 0`,
  );
  const toolbarStart = direction === "rtl"
    ? CONTAINER_WIDTH - TOOLBAR_MARGIN - base.toolbarStart.width
    : TOOLBAR_MARGIN;
  assert(
    near(snap.toolbarStart.x, toolbarStart),
    `${where}: the start toolbar sits ${snap.toolbarStart.x}px into its container; expected ${toolbarStart}px`,
  );
  const toolbarEnd = direction === "rtl"
    ? TOOLBAR_MARGIN
    : CONTAINER_WIDTH - TOOLBAR_MARGIN - base.toolbarEnd.width;
  assert(
    near(snap.toolbarEnd.x, toolbarEnd),
    `${where}: the end toolbar sits ${snap.toolbarEnd.x}px into its container; expected ${toolbarEnd}px`,
  );
}

/** The class markup on both pages of one sheet. */
async function assertSheet(browser: Browser, base: string, sheet: string): Promise<void> {
  const ltrPage = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
  const rtlPage = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
  try {
    await ltrPage.goto(`${base}${sheet}?dir=ltr`);
    await rtlPage.goto(`${base}${sheet}?dir=rtl`);
    const ltr = await measure(ltrPage, [{ name: "plain", markup: caseMarkup() }, ...CLASS_CASES]);
    const rtl = await measure(rtlPage, [{ name: "plain", markup: caseMarkup() }, ...CLASS_CASES]);
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

/** The hosts: the snackbar and progress elements inside a shadow root — the
 *  page's dir does not cross the boundary, so their direction arrives as the
 *  mtrl-rtl class the host resolves from the direction it inherits — and the
 *  toolbar factory in the light DOM, where the page's dir is an attribute the
 *  runtime reads and answers with the class on the factory's own root. The
 *  toolbar's box is read against its container, as the class cases read
 *  theirs. */
const measureElements = (page: Page): Promise<{
  snackbar: { start: Box; end: Box };
  progress: { linearWidth: number; label: Label };
  toolbar: { box: Box; rtlClass: boolean; ltrClass: boolean };
}> =>
  page.evaluate(async () => {
    const host = document.getElementById("host") as HTMLElement;
    const frame = (): Promise<void> => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())));
    const box = (element: Element): { x: number; width: number } => {
      const rect = element.getBoundingClientRect();
      return { x: rect.x, width: rect.width };
    };
    // The elements carry their sheet in their own shadow trees, so a host
    // works inside a consumer's shadow root with nothing adopted there.
    const insideShadowRoot = (): { root: ShadowRoot; container: HTMLElement } => {
      const container = document.createElement("div");
      const root = container.attachShadow({ mode: "open" });
      host.append(container);
      return { root, container };
    };

    // One snackbar surface, both places: the element's queue shows one at a
    // time, and the position is a class on the same surface. The gate is the
    // visible state itself — under the page's reduced motion the enter scale
    // is gone, so the rect reads the resting box the frame it opens.
    const snackbarScope = insideShadowRoot();
    const snackbarHost = document.createElement("m-snackbar");
    snackbarHost.setAttribute("message", "Message");
    snackbarHost.setAttribute("action", "Undo");
    snackbarHost.setAttribute("dismissible", "");
    snackbarHost.setAttribute("position", "start");
    snackbarScope.root.append(snackbarHost);
    snackbarHost.show();
    let surface: HTMLElement | null = null;
    for (let attempt = 0; attempt < 90 && !surface; attempt++) {
      await frame();
      const candidate = snackbarHost.shadowRoot?.querySelector(".mtrl-snackbar") as HTMLElement | null;
      if (candidate && candidate.classList.contains("mtrl-snackbar--visible")) surface = candidate;
    }
    if (!surface) throw new Error("the snackbar element never opened");
    const start = box(surface);
    snackbarHost.setAttribute("position", "end");
    await frame();
    const end = box(surface);
    snackbarScope.container.remove();
    await frame();

    const progressScope = insideShadowRoot();
    const progressHost = document.createElement("m-progress");
    progressHost.setAttribute("value", "50");
    progressHost.setAttribute("max", "100");
    progressHost.setAttribute("show-label", "");
    progressHost.style.width = "240px";
    progressScope.root.append(progressHost);
    await frame();
    const linearRoot = progressHost.shadowRoot?.querySelector(".mtrl-progress--linear") as HTMLElement;
    const label = progressHost.shadowRoot?.querySelector(".mtrl-progress__label") as HTMLElement;
    if (!linearRoot || !label) throw new Error("the progress element rendered no linear label");
    const progress = {
      linearWidth: linearRoot.getBoundingClientRect().width,
      label: {
        offset: label.getBoundingClientRect().x - linearRoot.getBoundingClientRect().x,
        width: label.getBoundingClientRect().width,
      },
    };
    progressScope.container.remove();
    await frame();

    // The toolbar factory in the light DOM, the only tree a factory's own
    // direction code reads: the runtime resolves the page's dir onto the
    // factory's root, and the sheet reads the class it wrote.
    const container = document.createElement("div");
    container.style.cssText = "position: relative; width: 320px; height: 160px";
    host.append(container);
    const factory = (window as unknown as {
      mtrl: { createToolbar: (config: Record<string, unknown>) => { element: HTMLElement } };
    }).mtrl.createToolbar({
      variant: "floating",
      orientation: "vertical",
      placement: "start",
      items: [{ icon: '<svg viewBox="0 0 24 24" width="24" height="24"></svg>', ariaLabel: "Bold" }],
    });
    container.append(factory.element);
    await frame();
    const toolbarRoot = container.querySelector(".mtrl-toolbar") as HTMLElement | null;
    if (!toolbarRoot) throw new Error("the toolbar factory rendered no root");
    const toolbar = {
      box: {
        x: toolbarRoot.getBoundingClientRect().x - container.getBoundingClientRect().x,
        width: toolbarRoot.getBoundingClientRect().width,
      },
      rtlClass: toolbarRoot.classList.contains("mtrl-rtl"),
      ltrClass: toolbarRoot.classList.contains("mtrl-ltr"),
    };
    container.remove();
    return { snackbar: { start, end }, progress, toolbar };
  });

export async function checkSnackbarProgressToolbarRtl(browser: Browser, base: string): Promise<void> {
  // Bundled first: its first failure is the quote a regression shows.
  await assertSheet(browser, base, "plain");

  // The unbundled sheet, and the hosts on the same pages: inside a shadow root
  // the direction arrives as the host's class, which only the `:host(...)` arm
  // can read, and in the light DOM a factory carries the class on its own
  // root, which only the root-carried arm can read. The pages measure at
  // reduced motion, so the snackbar's enter scale never stands between the
  // check and the resting box.
  const ltrPage = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, reducedMotion: "reduce" });
  const rtlPage = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, reducedMotion: "reduce" });
  try {
    await ltrPage.goto(`${base}?dir=ltr`);
    await rtlPage.goto(`${base}?dir=rtl`);
    await ltrPage.waitForFunction(() => (window as unknown as { ready?: boolean }).ready === true);
    await rtlPage.waitForFunction(() => (window as unknown as { ready?: boolean }).ready === true);
    const ltr = await measure(ltrPage, [{ name: "plain", markup: caseMarkup() }, ...CLASS_CASES]);
    const rtl = await measure(rtlPage, [{ name: "plain", markup: caseMarkup() }, ...CLASS_CASES]);
    assertMirrored("unbundled: LTR", ltr.plain, "ltr", ltr.plain);
    assertMirrored("unbundled: page dir=rtl", rtl.plain, "rtl", ltr.plain);
    for (const item of CLASS_CASES) {
      assertMirrored(`unbundled: ${item.name}`, ltr[item.name], expectedDirection(item, "ltr"), ltr.plain);
      assertMirrored(`unbundled: ${item.name} (rtl page)`, rtl[item.name], expectedDirection(item, "rtl"), ltr.plain);
    }

    const elementLtr = await measureElements(ltrPage);
    const elementRtl = await measureElements(rtlPage);
    for (const [where, measured, direction] of [
      ["element: LTR", elementLtr, "ltr"],
      ["element: page dir=rtl", elementRtl, "rtl"],
    ] as const) {
      const start = direction === "rtl" ? WIDTH - SNACKBAR_MARGIN - measured.snackbar.start.width : SNACKBAR_MARGIN;
      assert(
        near(measured.snackbar.start.x, start),
        `${where}: the start snackbar element sits ${measured.snackbar.start.x}px from the left edge; expected ${start}px`,
      );
      const end = direction === "rtl" ? SNACKBAR_MARGIN : WIDTH - SNACKBAR_MARGIN - measured.snackbar.end.width;
      assert(
        near(measured.snackbar.end.x, end),
        `${where}: the end snackbar element sits ${measured.snackbar.end.x}px from the left edge; expected ${end}px`,
      );
      const label = direction === "rtl" ? 0 : measured.progress.linearWidth - measured.progress.label.width;
      assert(
        near(measured.progress.label.offset, label),
        `${where}: the linear label starts ${measured.progress.label.offset}px into the indicator; expected ${label}px`,
      );
      const toolbar = direction === "rtl"
        ? CONTAINER_WIDTH - TOOLBAR_MARGIN - measured.toolbar.box.width
        : TOOLBAR_MARGIN;
      assert(
        near(measured.toolbar.box.x, toolbar),
        `${where}: the toolbar factory sits ${measured.toolbar.box.x}px into its container; expected ${toolbar}px`,
      );
    }
    // An ordinary left-to-right page leaves the factory's class attribute as
    // authored (core/dom/direction), so the left-to-right assert is the absence
    // of the right-to-left class, not the presence of a left-to-right one.
    assert(!elementLtr.toolbar.rtlClass,
      "the toolbar factory resolved a right-to-left direction on a left-to-right page");
    assert(elementRtl.toolbar.rtlClass && !elementRtl.toolbar.ltrClass,
      "the toolbar factory did not resolve the page's direction");
  } finally {
    await ltrPage.close();
    await rtlPage.close();
  }

  console.log(
    "Snackbar, progress and toolbar placements: the start snackbar 16px from the left edge and the end one " +
    "mirrored, the linear label flush with the trailing edge, the circular label centred, and the start and " +
    "end toolbars 24px from their container's leading and trailing edges, mirrored for the page's dir, a dir " +
    "on the root, mtrl-rtl on the root and on an ancestor, the snackbar and progress elements inside a shadow " +
    "root, and a toolbar factory in the light DOM, in the bundled full-css and in dist/styles.css; a " +
    "nearer dir=ltr boundary keeps its own side, and lang=ar alone turns none of them.",
  );
}
