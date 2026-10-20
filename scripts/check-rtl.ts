#!/usr/bin/env bun
// scripts/check-rtl.ts
//
// Right-to-left pages, both ways. Each fixture renders identical markup in an
// LTR page and in an RTL page, and every RTL box must be the mirror of its LTR
// box about the 600px viewport, with every physical padding, margin and border
// swapped. The case that matters is a component inside a shadow root: its
// sheet cannot see the page's `dir` attribute, so the direction arrives as the
// host's `mtrl-rtl` class (set from the host's computed direction) and is read
// with `:host(.mtrl-rtl) &`. The numbers #113 lists are asserted where a
// measure does not depend on text metrics.
//
//   bun run build && bun run rtl:check
import assert from "node:assert/strict";
import { chromium, type Page } from "playwright";
import { checkSideSheetRtl } from "./check-side-sheet-rtl";

const WIDTH = 600;
const ICON = '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M4 4h16v16H4z"/></svg>';

interface Box { x: number; width: number }
interface Edges { left: number; right: number }

interface Measures {
  drawerStart: { sheet: Box; border: Edges; padding: Edges; icon: Box; label: Box; badge: Box } | null;
  drawerEnd: { sheet: Box } | null;
  top: { leading: Box; leadingMargin: Edges; headline: Box; headlineMargin: Edges } | null;
  bottom: { padding: Edges; actions: Box } | null;
  dialog: { close: Box; closeMargin: Edges } | null;
  card: { avatar: Box; avatarMargin: Edges; action: Box; actionMargin: Edges } | null;
  split: { chevron: Box } | null;
}

const bundle = await Bun.build({ entrypoints: ["scripts/fixtures/elements.ts"], target: "browser", minify: false });
assert(bundle.success, String(bundle.logs));
const js = await bundle.outputs[0].text();

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === "/elements.js") return new Response(js, { headers: { "Content-Type": "text/javascript" } });
    if (path === "/styles.css") return new Response(Bun.file("dist/styles.css"));
    const direction = new URL(request.url).searchParams.get("dir") === "rtl" ? "rtl" : "ltr";
    return new Response(
      `<!doctype html><html dir="${direction}" data-theme="baseline"><head><link rel="stylesheet" href="/styles.css">
<style>body{margin:0;width:${WIDTH}px}</style></head>
<body><main id="host"></main><script type="module" src="/elements.js"></script></body></html>`,
      { headers: { "Content-Type": "text/html" } },
    );
  },
});

/** Every measure of the fixtures, in the page's current direction. */
const measureFixtures = (page: Page): Promise<Measures> => page.evaluate(async (icon) => {
  type Host = HTMLElement & { shadowRoot: ShadowRoot };
  const host = document.getElementById("host") as HTMLElement;
  const frame = (): Promise<void> => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())));
  const box = (el: Element): Box => {
    const rect = el.getBoundingClientRect();
    return { x: rect.x, width: rect.width };
  };
  const edges = (el: Element, left: string, right: string): Edges => {
    const style = getComputedStyle(el);
    return { left: parseFloat(style.getPropertyValue(left)), right: parseFloat(style.getPropertyValue(right)) };
  };
  const part = (root: Host, selector: string): HTMLElement => {
    const el = root.shadowRoot.querySelector(selector) as HTMLElement | null;
    if (!el) throw new Error(`no ${selector} in <${root.localName}>`);
    return el;
  };

  // Modal drawer, start edge: the sheet, its border, an item and the item's parts.
  host.innerHTML = `<m-drawer id="drawer" modal open headline="Mail" position="start">
    <m-drawer-item value="inbox" icon='${icon}' badge="24">Inbox</m-drawer-item>
    <m-drawer-item value="sent">Sent</m-drawer-item></m-drawer>`;
  await frame();
  const drawer = document.getElementById("drawer") as Host;
  const sheet = part(drawer, ".mtrl-drawer__sheet");
  const item = part(drawer, ".mtrl-drawer__item");
  const drawerStart = {
    sheet: box(sheet),
    border: edges(sheet, "border-left-width", "border-right-width"),
    padding: edges(item, "padding-left", "padding-right"),
    icon: box(part(drawer, ".mtrl-drawer__item-icon")),
    label: box(part(drawer, ".mtrl-drawer__item-label")),
    badge: box(part(drawer, ".mtrl-drawer__item-badge")),
  };
  drawer.remove();
  await frame();

  // Modal drawer, end edge: only the sheet's side.
  host.innerHTML = `<m-drawer id="drawer-end" modal open headline="Mail" position="end">
    <m-drawer-item value="inbox">Inbox</m-drawer-item></m-drawer>`;
  await frame();
  const drawerEndHost = document.getElementById("drawer-end") as Host;
  const drawerEnd = { sheet: box(part(drawerEndHost, ".mtrl-drawer__sheet")) };
  drawerEndHost.remove();
  await frame();

  // Medium top app bar: leading section, headline and their margins.
  host.innerHTML = `<m-top-app-bar id="top" type="medium" headline="Inbox" aria-label="Mail bar">
    <m-icon-button slot="leading" aria-label="Menu" icon='${icon}'></m-icon-button></m-top-app-bar>`;
  await frame();
  const top = document.getElementById("top") as Host;
  const leading = part(top, ".mtrl-top-app-bar__leading");
  const headline = part(top, ".mtrl-top-app-bar__headline");
  const topMeasures = {
    leading: box(leading),
    leadingMargin: edges(leading, "margin-left", "margin-right"),
    headline: box(headline),
    headlineMargin: edges(headline, "margin-left", "margin-right"),
  };

  // Bottom app bar: its padding and the actions row inside it.
  host.insertAdjacentHTML("beforeend", `<m-bottom-app-bar id="bottom" aria-label="Actions">
    <m-icon-button aria-label="Archive" icon='${icon}'></m-icon-button></m-bottom-app-bar>`);
  await frame();
  const bottom = document.getElementById("bottom") as Host;
  const bottomMeasures = {
    padding: edges(part(bottom, ".mtrl-bottom-app-bar"), "padding-left", "padding-right"),
    actions: box(part(bottom, ".mtrl-bottom-app-bar__actions")),
  };

  // Dialog: the close button and its margin.
  host.insertAdjacentHTML("beforeend", `<m-dialog id="dialog" open close-button headline="Title">Content</m-dialog>`);
  await frame();
  const dialog = document.getElementById("dialog") as Host;
  const close = part(dialog, ".mtrl-dialog__header-close");
  const dialogMeasures = { close: box(close), closeMargin: edges(close, "margin-left", "margin-right") };
  dialog.remove();

  // Card: the avatar and the header action, both with physical margins.
  host.insertAdjacentHTML("beforeend", `<m-card id="card" headline="Trip">
    <span slot="avatar">A</span><m-icon-button slot="header-action" aria-label="More" icon='${icon}'></m-icon-button>
    <p>Walks and trams.</p></m-card>`);
  await frame();
  const card = document.getElementById("card") as Host;
  const avatar = part(card, ".mtrl-card__header-avatar");
  const action = part(card, ".mtrl-card__header-action");
  const cardMeasures = {
    avatar: box(avatar),
    avatarMargin: edges(avatar, "margin-left", "margin-right"),
    action: box(action),
    actionMargin: edges(action, "margin-left", "margin-right"),
  };

  // Extra-large split button: the chevron's offset is mirrored physically.
  host.insertAdjacentHTML("beforeend", `<m-split-button id="split" size="xl">Save
    <m-menu-item value="draft">Save draft</m-menu-item></m-split-button>`);
  await frame();
  const split = document.getElementById("split") as Host;
  const splitMeasures = { chevron: box(part(split, ".mtrl-split-button__chevron")) };

  return {
    drawerStart,
    drawerEnd,
    top: topMeasures,
    bottom: bottomMeasures,
    dialog: dialogMeasures,
    card: cardMeasures,
    split: splitMeasures,
  };
}, ICON);

const browser = await chromium.launch({ headless: true });
const TOLERANCE = 0.5;
const near = (a: number, b: number): boolean => Math.abs(a - b) <= TOLERANCE;
const mirror = (box: Box): number => WIDTH - box.x - box.width;

/** Where the direction did not reach: each line is one measure that is not mirrored. */
const differences = (ltr: Measures, rtl: Measures): string[] => {
  const found: string[] = [];
  const box = (name: string, l: Box, r: Box): void => {
    if (!near(r.x, mirror(l)) || !near(r.width, l.width)) {
      found.push(`${name}: LTR x=${l.x} w=${l.width}; RTL x=${r.x} w=${r.width}, mirror x=${mirror(l)}`);
    }
  };
  const swap = (name: string, l: Edges, r: Edges): void => {
    if (!near(r.left, l.right) || !near(r.right, l.left)) {
      found.push(`${name}: LTR left=${l.left} right=${l.right}; RTL left=${r.left} right=${r.right}`);
    }
  };
  const start = ltr.drawerStart, startRtl = rtl.drawerStart;
  assert(start && startRtl, "the start drawer did not render");
  box("drawer start sheet", start.sheet, startRtl.sheet);
  swap("drawer start sheet border", start.border, startRtl.border);
  swap("drawer item padding", start.padding, startRtl.padding);
  box("drawer item icon", start.icon, startRtl.icon);
  box("drawer item label", start.label, startRtl.label);
  box("drawer item badge", start.badge, startRtl.badge);
  const end = ltr.drawerEnd, endRtl = rtl.drawerEnd;
  assert(end && endRtl, "the end drawer did not render");
  box("drawer end sheet", end.sheet, endRtl.sheet);
  const top = ltr.top, topRtl = rtl.top;
  assert(top && topRtl, "the top app bar did not render");
  box("top app bar leading", top.leading, topRtl.leading);
  swap("top app bar leading margin", top.leadingMargin, topRtl.leadingMargin);
  box("top app bar headline", top.headline, topRtl.headline);
  swap("top app bar headline margin", top.headlineMargin, topRtl.headlineMargin);
  const bottom = ltr.bottom, bottomRtl = rtl.bottom;
  assert(bottom && bottomRtl, "the bottom app bar did not render");
  swap("bottom app bar padding", bottom.padding, bottomRtl.padding);
  box("bottom app bar actions", bottom.actions, bottomRtl.actions);
  const dialog = ltr.dialog, dialogRtl = rtl.dialog;
  assert(dialog && dialogRtl, "the dialog did not render");
  box("dialog close", dialog.close, dialogRtl.close);
  swap("dialog close margin", dialog.closeMargin, dialogRtl.closeMargin);
  const card = ltr.card, cardRtl = rtl.card;
  assert(card && cardRtl, "the card did not render");
  box("card avatar", card.avatar, cardRtl.avatar);
  swap("card avatar margin", card.avatarMargin, cardRtl.avatarMargin);
  box("card header action", card.action, cardRtl.action);
  swap("card header action margin", card.actionMargin, cardRtl.actionMargin);
  const split = ltr.split, splitRtl = rtl.split;
  assert(split && splitRtl, "the split button did not render");
  box("split button chevron", split.chevron, splitRtl.chevron);
  return found;
};

try {
  const ltrPage = await browser.newPage({ viewport: { width: WIDTH, height: 720 }, reducedMotion: "reduce" });
  const rtlPage = await browser.newPage({ viewport: { width: WIDTH, height: 720 }, reducedMotion: "reduce" });
  await ltrPage.goto(`${server.url.href}?dir=ltr`);
  await rtlPage.goto(`${server.url.href}?dir=rtl`);
  for (const page of [ltrPage, rtlPage]) {
    await page.waitForFunction(() => (window as unknown as { ready?: boolean }).ready === true);
  }
  await checkSideSheetRtl(ltrPage);
  const ltr = await measureFixtures(ltrPage);
  const rtl = await measureFixtures(rtlPage);

  // #113's own numbers, where the measure is not text-dependent.
  assert.deepEqual(
    [ltr.drawerStart!.sheet.x, rtl.drawerStart!.sheet.x, ltr.drawerEnd!.sheet.x, rtl.drawerEnd!.sheet.x],
    [0, 240, 240, 0],
    "the modal drawer's start/end sheets are not mirrored (LTR start, RTL start, LTR end, RTL end)",
  );
  assert.equal(ltr.drawerStart!.sheet.width, 360);
  assert.deepEqual(ltr.drawerStart!.padding, { left: 16, right: 24 });
  assert.deepEqual(rtl.drawerStart!.padding, { left: 24, right: 16 });
  assert.deepEqual(ltr.drawerStart!.icon, { x: 28, width: 24 });
  assert.equal(rtl.drawerStart!.icon.x, 548);
  assert.deepEqual(ltr.bottom!.padding, { left: 4, right: 16 });
  assert.deepEqual(rtl.bottom!.padding, { left: 16, right: 4 });
  assert.equal(ltr.bottom!.actions.x, 4);
  assert.equal(rtl.bottom!.actions.x, WIDTH - 4 - rtl.bottom!.actions.width);
  assert.deepEqual(ltr.dialog!.closeMargin, { left: 0, right: -8 });
  assert.deepEqual(rtl.dialog!.closeMargin, { left: -8, right: 0 });
  // The dialog is a centred box, not the viewport: its close button mirrors
  // about the viewport, which the `differences` pass below asserts.
  assert.deepEqual(ltr.card!.avatarMargin, { left: 0, right: 16 });
  assert.deepEqual(rtl.card!.avatarMargin, { left: 16, right: 0 });
  assert.equal(ltr.card!.avatar.x, 16);
  assert.equal(rtl.card!.avatar.x, WIDTH - 16 - rtl.card!.avatar.width);
  assert.deepEqual(ltr.card!.actionMargin, { left: 8, right: 0 });
  assert.deepEqual(rtl.card!.actionMargin, { left: 0, right: 8 });

  const found = differences(ltr, rtl);
  assert.deepEqual(found, [], `direction rules did not reach these parts:\n${found.join("\n")}`);

  // A page that switches direction after the elements connected: the observer
  // re-reads the host's computed direction and the sheet follows.
  const switched = await ltrPage.evaluate(async () => {
    document.documentElement.dir = "rtl";
    await new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())));
    const leading = document.querySelector("m-top-app-bar")!.shadowRoot!.querySelector(".mtrl-top-app-bar__leading")!;
    const style = getComputedStyle(leading);
    return { left: parseFloat(style.marginLeft), right: parseFloat(style.marginRight), rtl: document.querySelector("m-top-app-bar")!.classList.contains("mtrl-rtl") };
  });
  assert.deepEqual(switched, { left: 16, right: 0, rtl: true }, "a runtime dir change did not reach the connected elements");

  console.log(
    `Passed RTL: ${Object.keys(ltr).length} fixtures measured in LTR and RTL, every box mirrored ` +
      `(drawer start sheet 0→240, drawer item padding 16/24→24/16, icon x 28→548, bottom padding 4/16→16/4, ` +
      `dialog close x ${ltr.dialog!.close.x}→${rtl.dialog!.close.x}), and a runtime dir change followed.`,
  );
} finally {
  await browser.close();
  server.stop(true);
}
