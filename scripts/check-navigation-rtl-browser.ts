import assert from "node:assert/strict";
import type { Browser, Page } from "playwright";

/**
 * The navigation bar and rail mirror under every direction marker.
 *
 * Both partials write their start-edge insets on the left-to-right physical
 * side and mirror them with the direction arms (`m.rtl` / `m.rtl-selector`),
 * because a consumer's bundler lowers logical insets into `:lang()` lists that
 * match no `dir="rtl"` — in bundled `full-css` the navigation badge and the
 * expanded rail's label sat on the wrong edge. The marker can sit on the
 * component root itself (the runtime writes `mtrl-rtl` there, and `dir` may be
 * set on it), on an ancestor, or on a shadow host; a `dir="ltr"` subtree of an
 * RTL page cuts the mirroring; `lang` alone must not mirror. Measured in the
 * unbundled sheet (factories, light DOM) and in the bundled one (class markup,
 * the lowering pipeline a consumer's bundler emits).
 */

const ICON = '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M4 4h16v16H4z"/></svg>';
const TOLERANCE = 0.5;

/** One part's box, relative to the box that positions it. */
type Offset = { x: number; width: number };

type UnbundledRow = {
  name: string;
  marked: boolean;
  railRoot: number;
  indicator: Offset;
  icon: Offset;
  badge: Offset;
  dot: Offset;
  expandedRoot: number;
  expandedLabel: Offset;
  expandedBadge: Offset;
  barBadge: Offset;
  barBadgeCentre: number;
  barDot: Offset;
  barDotCentre: number;
  barIndicatorCentre: number;
};

const near = (problems: string[], name: string, actual: number, wanted: number): void => {
  if (Math.abs(actual - wanted) >= TOLERANCE) problems.push(`${name} ${actual.toFixed(1)}, expected ${wanted.toFixed(1)}`);
};

/** The factories' parts, one row per marker placement, in the page's direction. */
const measureUnbundled = (page: Page): Promise<UnbundledRow[]> =>
  page.evaluate(async (icon): Promise<UnbundledRow[]> => {
    const w = window as unknown as {
      mtrl: {
        createNavigationRail: (config: object) => { element: HTMLElement };
        createNavigationBar: (config: object) => { element: HTMLElement };
      };
    };
    const host = document.getElementById("host")!;
    const frame = (): Promise<void> => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())));
    const first = (root: ParentNode, selector: string): HTMLElement => root.querySelector(selector) as HTMLElement;
    const rel = (of: DOMRect, box: DOMRect): Offset => ({ x: box.x - of.x, width: box.width });
    const rows: UnbundledRow[] = [];
    for (const name of ["plain", "root-class", "root-dir", "ancestor-class", "ancestor-dir"]) {
      host.innerHTML = "";
      const wrap = document.createElement("div");
      host.append(wrap);
      const items = [
        { id: "home", label: "Home", icon, active: true },
        { id: "chat", label: "Chat", icon, badge: "3" },
        { id: "alert", label: "Alerts", icon, badge: true },
      ];
      const rail = w.mtrl.createNavigationRail({ items });
      const expanded = w.mtrl.createNavigationRail({ items, expanded: true });
      const bar = w.mtrl.createNavigationBar({ items, itemLayout: "vertical" });
      wrap.append(rail.element, expanded.element, bar.element);
      // The direction tracker reads on insertion; mark after it, so the case
      // measures the marker itself, not a pending read.
      await frame();
      const roots = [rail.element, expanded.element, bar.element];
      if (name === "root-class") for (const root of roots) root.classList.add("mtrl-rtl");
      if (name === "root-dir") for (const root of roots) root.setAttribute("dir", "rtl");
      if (name === "ancestor-class") wrap.classList.add("mtrl-rtl");
      if (name === "ancestor-dir") wrap.setAttribute("dir", "rtl");
      await frame();
      const railRoot = rail.element.getBoundingClientRect();
      const expandedItem = first(expanded.element, ".mtrl-navigation-rail__item").getBoundingClientRect();
      // The bar's indicator, badge and dot belong to different items (the
      // active one, the badged one, the dotted one), and each is positioned by
      // its own item's content box — measure each against that content.
      const box = (el: HTMLElement): DOMRect => el.getBoundingClientRect();
      const contentOf = (el: HTMLElement): DOMRect => box(el.closest(".mtrl-navigation-bar__content") as HTMLElement);
      const indicator = first(bar.element, ".mtrl-navigation-bar__indicator");
      const badge = first(bar.element, ".mtrl-navigation-bar__badge");
      const dot = first(bar.element, ".mtrl-navigation-bar__badge--dot");
      const content = contentOf(indicator);
      rows.push({
        name,
        marked: rail.element.classList.contains("mtrl-rtl"),
        railRoot: railRoot.width,
        indicator: rel(railRoot, first(rail.element, ".mtrl-navigation-rail__indicator").getBoundingClientRect()),
        icon: rel(railRoot, first(rail.element, ".mtrl-navigation-rail__icon").getBoundingClientRect()),
        badge: rel(railRoot, first(rail.element, ".mtrl-navigation-rail__badge").getBoundingClientRect()),
        dot: rel(railRoot, first(rail.element, ".mtrl-navigation-rail__badge--dot").getBoundingClientRect()),
        expandedRoot: expanded.element.getBoundingClientRect().width,
        expandedLabel: rel(expandedItem, first(expanded.element, ".mtrl-navigation-rail__label").getBoundingClientRect()),
        expandedBadge: rel(expandedItem, first(expanded.element, ".mtrl-navigation-rail__badge").getBoundingClientRect()),
        barBadge: rel(contentOf(badge), box(badge)),
        barBadgeCentre: contentOf(badge).width / 2,
        barDot: rel(contentOf(dot), box(dot)),
        barDotCentre: contentOf(dot).width / 2,
        barIndicatorCentre: box(indicator).x + box(indicator).width / 2 - (content.x + content.width / 2),
      });
      host.innerHTML = "";
      await frame();
    }
    return rows;
  }, ICON);

/** Hand-written class markup: what the shipped stylesheet alone positions. */
const RAIL_ITEM = (badge: string): string => `
      <a class="mtrl-navigation-rail__item${badge === "3" ? " mtrl-navigation-rail__item--badged" : ""}" href="#">
        <div class="mtrl-navigation-rail__content">
          <div class="mtrl-navigation-rail__indicator"></div>
          <div class="mtrl-navigation-rail__icon"><svg viewBox="0 0 24 24" width="24" height="24"><path d="M4 4h16v16H4z"/></svg></div>
          <span class="mtrl-navigation-rail__label">Home</span>
          <span class="mtrl-navigation-rail__badge${badge === "dot" ? " mtrl-navigation-rail__badge--dot" : ""}" aria-hidden="true">${badge === "dot" ? "" : badge}</span>
        </div>
      </a>`;
const RAIL = (expanded: boolean, badge: string): string => `
  <nav class="mtrl-navigation-rail${expanded ? " mtrl-navigation-rail--expanded" : ""}">
    <div class="mtrl-navigation-rail__items">${RAIL_ITEM(badge)}</div>
  </nav>`;
const BAR = `
  <nav class="mtrl-navigation-bar mtrl-navigation-bar--vertical">
    <div class="mtrl-navigation-bar__items">
      <a class="mtrl-navigation-bar__item" href="#">
        <div class="mtrl-navigation-bar__content">
          <div class="mtrl-navigation-bar__indicator"></div>
          <div class="mtrl-navigation-bar__icon"><svg viewBox="0 0 24 24" width="24" height="24"><path d="M4 4h16v16H4z"/></svg></div>
          <span class="mtrl-navigation-bar__label">Home</span>
          <span class="mtrl-navigation-bar__badge" aria-hidden="true">3</span>
        </div>
      </a>
    </div>
  </nav>`;
const MODAL = `
  <dialog class="mtrl-navigation-rail mtrl-navigation-rail--modal" open>
    <div class="mtrl-navigation-rail__header"></div>
    <div class="mtrl-navigation-rail__items">${RAIL_ITEM("3")}</div>
  </dialog>`;

// An `--auto` bar: horizontal items once the bar's own container is 600px or
// wider, vertical below. The pill must fill the content box in the horizontal
// form and stay a centred 56dp pill in the vertical one, in every direction
// form — the horizontal geometry lives in a container query whose (0,2,0)
// rules a (0,3,0) direction arm would outrank.
const AUTO_BAR = (width: number): string => `
  <div style="width: ${width}px">
    <nav class="mtrl-navigation-bar mtrl-navigation-bar--auto">
      <div class="mtrl-navigation-bar__items">
        <a class="mtrl-navigation-bar__item" href="#">
          <div class="mtrl-navigation-bar__content">
            <div class="mtrl-navigation-bar__indicator"></div>
            <div class="mtrl-navigation-bar__icon"><svg viewBox="0 0 24 24" width="24" height="24"><path d="M4 4h16v16H4z"/></svg></div>
            <span class="mtrl-navigation-bar__label">Chat</span>
          </div>
        </a>
      </div>
    </nav>
  </div>`;

type AutoRow = { name: string; pill: number; centre: number; content: number };

const measureAutoBar = (page: Page, markup: string): Promise<AutoRow[]> =>
  page.evaluate(async (markup): Promise<AutoRow[]> => {
    const host = document.getElementById("host")!;
    const frame = (): Promise<void> => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())));
    const rows: AutoRow[] = [];
    for (const name of ["plain", "root-class", "root-dir"]) {
      host.innerHTML = "";
      const wrap = document.createElement("div");
      host.append(wrap);
      wrap.innerHTML = markup;
      await frame();
      const nav = wrap.querySelector(".mtrl-navigation-bar") as HTMLElement;
      if (name === "root-class") nav.classList.add("mtrl-rtl");
      if (name === "root-dir") nav.setAttribute("dir", "rtl");
      await frame();
      const pill = nav.querySelector(".mtrl-navigation-bar__indicator")!.getBoundingClientRect();
      const content = nav.querySelector(".mtrl-navigation-bar__content")!.getBoundingClientRect();
      rows.push({ name, pill: pill.width, centre: pill.x + pill.width / 2 - (content.x + content.width / 2), content: content.width });
      host.innerHTML = "";
    }
    return rows;
  }, markup);

type BundledRow = {
  name: string;
  viewport: number;
  railRoot: number;
  badge: Offset;
  dot: Offset;
  expandedRoot: number;
  expandedLabel: Offset;
  expandedBadge: Offset;
  barContent: number;
  barBadge: Offset;
  modal: { x: number; width: number; topLeft: number; topRight: number };
};

const measureBundled = (page: Page, markup: string): Promise<BundledRow[]> =>
  page.evaluate(async (markup): Promise<BundledRow[]> => {
    const host = document.getElementById("host")!;
    const frame = (): Promise<void> => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())));
    const first = (root: ParentNode, selector: string): HTMLElement => root.querySelector(selector) as HTMLElement;
    const rel = (of: DOMRect, box: DOMRect): Offset => ({ x: box.x - of.x, width: box.width });
    const rows: BundledRow[] = [];
    for (const name of ["plain", "root-class", "root-dir", "ancestor-class", "ancestor-dir"]) {
      host.innerHTML = "";
      const wrap = document.createElement("div");
      host.append(wrap);
      wrap.innerHTML = markup;
      await frame();
      const rails = [...wrap.querySelectorAll(".mtrl-navigation-rail:not(.mtrl-navigation-rail--modal):not(.mtrl-navigation-rail--expanded)")];
      const expandedRail = first(wrap, ".mtrl-navigation-rail--expanded:not(.mtrl-navigation-rail--modal)");
      const bar = first(wrap, ".mtrl-navigation-bar");
      const modal = first(wrap, ".mtrl-navigation-rail--modal") as HTMLDialogElement;
      if (name === "root-class") for (const el of [rails[0]!, rails[1]!, expandedRail, bar, modal]) el.classList.add("mtrl-rtl");
      if (name === "root-dir") for (const el of [rails[0]!, rails[1]!, expandedRail, bar, modal]) el.setAttribute("dir", "rtl");
      if (name === "ancestor-class") wrap.classList.add("mtrl-rtl");
      if (name === "ancestor-dir") wrap.setAttribute("dir", "rtl");
      await frame();
      const badgeRoot = rails[0]!.getBoundingClientRect();
      const dotRoot = rails[1]!.getBoundingClientRect();
      const expandedItem = first(expandedRail, ".mtrl-navigation-rail__item").getBoundingClientRect();
      const content = first(bar, ".mtrl-navigation-bar__content").getBoundingClientRect();
      const modalBox = modal.getBoundingClientRect();
      const modalStyle = getComputedStyle(modal);
      rows.push({
        name,
        viewport: innerWidth,
        railRoot: badgeRoot.width,
        badge: rel(badgeRoot, first(rails[0]!, ".mtrl-navigation-rail__badge").getBoundingClientRect()),
        dot: rel(dotRoot, first(rails[1]!, ".mtrl-navigation-rail__badge").getBoundingClientRect()),
        expandedRoot: expandedRail.getBoundingClientRect().width,
        expandedLabel: rel(expandedItem, first(expandedRail, ".mtrl-navigation-rail__label").getBoundingClientRect()),
        expandedBadge: rel(expandedItem, first(expandedRail, ".mtrl-navigation-rail__badge").getBoundingClientRect()),
        barContent: content.width,
        barBadge: rel(content, first(bar, ".mtrl-navigation-bar__badge").getBoundingClientRect()),
        modal: {
          x: modalBox.x,
          width: modalBox.width,
          topLeft: parseFloat(modalStyle.borderTopLeftRadius),
          topRight: parseFloat(modalStyle.borderTopRightRadius),
        },
      });
      host.innerHTML = "";
      await frame();
    }
    return rows;
  }, markup);

/** A rail inside a shadow root that adopts the sheet, its host carrying the class. */
const measureShadow = (page: Page, markup: string): Promise<{ root: number; badge: Offset; dot: Offset; expandedRoot: number; label: Offset }> =>
  page.evaluate(async (markup) => {
    const host = document.getElementById("host")!;
    const frame = (): Promise<void> => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())));
    const css = await (await fetch("/styles.bundled.css")).text();
    const adopt = document.createElement("div");
    adopt.className = "mtrl-rtl";
    host.append(adopt);
    const shadow = adopt.attachShadow({ mode: "open" });
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    shadow.adoptedStyleSheets = [sheet];
    shadow.innerHTML = markup;
    await frame();
    const first = (root: ParentNode, selector: string): HTMLElement => root.querySelector(selector) as HTMLElement;
    const rel = (of: DOMRect, box: DOMRect): Offset => ({ x: box.x - of.x, width: box.width });
    const rails = [...shadow.querySelectorAll(".mtrl-navigation-rail:not(.mtrl-navigation-rail--expanded)")];
    const expanded = first(shadow, ".mtrl-navigation-rail--expanded");
    const expandedItem = first(expanded, ".mtrl-navigation-rail__item").getBoundingClientRect();
    const badgeRoot = rails[0]!.getBoundingClientRect();
    const measured = {
      root: badgeRoot.width,
      badge: rel(badgeRoot, first(rails[0]!, ".mtrl-navigation-rail__badge").getBoundingClientRect()),
      dot: rel(rails[1]!.getBoundingClientRect(), first(rails[1]!, ".mtrl-navigation-rail__badge").getBoundingClientRect()),
      expandedRoot: expanded.getBoundingClientRect().width,
      label: rel(expandedItem, first(expanded, ".mtrl-navigation-rail__label").getBoundingClientRect()),
    };
    host.innerHTML = "";
    return measured;
  }, markup);

/** `lang` alone sets no direction: the geometry must stay left-to-right. */
const measureLang = (page: Page, markup: string): Promise<number> =>
  page.evaluate(async (markup) => {
    document.documentElement.lang = "ar";
    const host = document.getElementById("host")!;
    host.innerHTML = markup;
    await new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())));
    const root = host.querySelector(".mtrl-navigation-rail")!.getBoundingClientRect();
    const badge = host.querySelector(".mtrl-navigation-rail__badge")!.getBoundingClientRect();
    const x = badge.x - root.x;
    host.innerHTML = "";
    document.documentElement.lang = "";
    return x;
  }, markup);

export async function checkNavigationRtl(browser: Browser, href: string, ltrPage: Page, rtlPage: Page): Promise<void> {
  const problems: string[] = [];
  const report = (where: string, cases: string[]): void => {
    const line = cases.length ? `FAIL ${where}: ${cases.join("; ")}` : `ok ${where}`;
    console.log(`  ${line}`);
    if (cases.length) problems.push(line);
  };

  // ---- the unbundled sheet: factories, light DOM, every marker placement
  for (const [page, pageDir] of [[ltrPage, "ltr"], [rtlPage, "rtl"]] as const) {
    for (const row of await measureUnbundled(page)) {
      const rtl = pageDir === "rtl" || row.name !== "plain";
      const p: string[] = [];
      const where = `navigation (${pageDir} page, ${row.name})`;
      if (pageDir === "ltr" && row.name === "root-class" && !row.marked) p.push("the root's mtrl-rtl class did not stay");
      // The collapsed rail: the symmetric parts stay centred, the badge mirrors.
      near(p, "rail indicator x", row.indicator.x, 20);
      near(p, "rail icon x", row.icon.x, 36);
      near(p, "rail badge x", row.badge.x, rtl ? row.railRoot - 48 - row.badge.width : 48);
      near(p, "rail dot x", row.dot.x, rtl ? row.railRoot - 54 - row.dot.width : 54);
      // The expanded rail: the label mirrors, the badge moves to the other edge.
      near(p, "expanded label x", row.expandedLabel.x, rtl ? row.expandedRoot - 68 - row.expandedLabel.width : 68);
      near(p, "expanded badge x", row.expandedBadge.x, rtl ? 36 : row.expandedRoot - 36 - row.expandedBadge.width);
      // The vertical bar: the badge anchors its start edge at its own item's
      // content centre (items shrink-wrap their labels), the dot 6dp past it.
      near(p, "bar badge x", row.barBadge.x, rtl ? row.barBadgeCentre - row.barBadge.width : row.barBadgeCentre);
      near(p, "bar dot x", row.barDot.x, rtl ? row.barDotCentre - row.barDot.width - 6 : row.barDotCentre + 6);
      near(p, "bar indicator centre", row.barIndicatorCentre, 0);
      report(where, p);
    }
  }
  // ---- the auto bar: horizontal items at 600px and wider, vertical below,
  // in both sheets and every marker form
  for (const [page, pageName] of [[ltrPage, "ltr page"], [rtlPage, "rtl page"]] as const) {
    for (const width of [640, 400] as const) {
      for (const row of await measureAutoBar(page, AUTO_BAR(width))) {
        const p: string[] = [];
        const where = `auto bar ${width}px (${pageName}, ${row.name})`;
        if (width >= 600) {
          near(p, "pill fills the content", row.pill, row.content);
          if (row.content < 50) p.push(`content ${row.content.toFixed(1)} is not the horizontal layout`);
        } else {
          near(p, "pill width", row.pill, 56);
          near(p, "pill centre", row.centre, 0);
        }
        report(where, p);
      }
    }
  }

  // A `dir="ltr"` subtree of the RTL page keeps its own geometry (the cut).
  {
    const cut = await rtlPage.evaluate(async (icon) => {
      const w = window as unknown as { mtrl: { createNavigationRail: (config: object) => { element: HTMLElement } } };
      const host = document.getElementById("host")!;
      host.innerHTML = "";
      const cutRoot = document.createElement("div");
      cutRoot.setAttribute("dir", "ltr");
      cutRoot.className = "mtrl-ltr";
      host.append(cutRoot);
      const rail = w.mtrl.createNavigationRail({ items: [{ id: "home", label: "Home", icon, badge: "3" }] });
      cutRoot.append(rail.element);
      await new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())));
      const root = rail.element.getBoundingClientRect();
      const badge = rail.element.querySelector(".mtrl-navigation-rail__badge")!.getBoundingClientRect();
      const x = badge.x - root.x;
      host.innerHTML = "";
      return x;
    }, ICON);
    const p: string[] = [];
    near(p, "badge x", cut, 48);
    report("an mtrl-ltr rail inside an RTL page", p);
  }

  // ---- the bundled sheet: the lowering pipeline a consumer's bundler emits
  const bundledMarkup = `${RAIL(false, "3")}${RAIL(false, "dot")}${RAIL(true, "3")}${BAR}${MODAL}`;
  const railOnly = `${RAIL(false, "3")}`;
  for (const dir of ["ltr", "rtl"] as const) {
    const page = await browser.newPage({ viewport: { width: 600, height: 720 }, reducedMotion: "reduce" });
    await page.goto(`${href}plain?dir=${dir}`);
    for (const row of await measureBundled(page, bundledMarkup)) {
      const rtl = dir === "rtl" || row.name !== "plain";
      const p: string[] = [];
      const where = `bundled navigation (${dir} page, ${row.name})`;
      near(p, "rail badge x", row.badge.x, rtl ? row.railRoot - 48 - row.badge.width : 48);
      near(p, "rail dot x", row.dot.x, rtl ? row.railRoot - 54 - row.dot.width : 54);
      near(p, "expanded label x", row.expandedLabel.x, rtl ? row.expandedRoot - 68 - row.expandedLabel.width : 68);
      near(p, "expanded badge x", row.expandedBadge.x, rtl ? 36 : row.expandedRoot - 36 - row.expandedBadge.width);
      near(p, "bar badge x", row.barBadge.x, rtl ? row.barContent / 2 - row.barBadge.width : row.barContent / 2);
      if (row.modal.width <= 0) p.push("the modal rail has no box");
      else {
        near(p, "modal x", row.modal.x, rtl ? row.viewport - row.modal.width : 0);
        const [inner, outer] = rtl ? [row.modal.topLeft, row.modal.topRight] : [row.modal.topRight, row.modal.topLeft];
        if (inner <= 0 || outer !== 0) p.push(`modal corners inner ${inner}, outer ${outer}`);
      }
      report(where, p);
    }
    // The auto bar's pill against the container query, in the bundled sheet
    // the consumer actually ships.
    for (const row of await measureAutoBar(page, AUTO_BAR(640))) {
      const p: string[] = [];
      const where = `bundled auto bar 640px (${dir} page, ${row.name})`;
      near(p, "pill fills the content", row.pill, row.content);
      if (row.content < 50) p.push(`content ${row.content.toFixed(1)} is not the horizontal layout`);
      report(where, p);
    }
    if (dir === "rtl") {
      const shadow = await measureShadow(page, `${RAIL(false, "3")}${RAIL(false, "dot")}${RAIL(true, "3")}`);
      const p: string[] = [];
      near(p, "badge x", shadow.badge.x, shadow.root - 48 - shadow.badge.width);
      near(p, "dot x", shadow.dot.x, shadow.root - 54 - shadow.dot.width);
      near(p, "expanded label x", shadow.label.x, shadow.expandedRoot - 68 - shadow.label.width);
      report("bundled shadow-host navigation", p);
    } else {
      const p: string[] = [];
      near(p, "badge x", await measureLang(page, railOnly), 48);
      report("bundled lang-only navigation (no dir, no class)", p);
    }
    await page.close();
  }

  assert.equal(problems.length, 0, `\n${problems.join("\n")}`);
  console.log("  navigation: the bar and the rail mirrored under every marker, in both sheets");
}
