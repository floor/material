#!/usr/bin/env bun
// Pre-upgrade styles (ssr.md Phase A): no layout shift from the
// server's HTML to the upgraded element.
//
// Each case is the server-style HTML of one element (the host and its light
// DOM, as an adapter's server render emits it) in a page with the base styles
// and `material/elements/preupgrade.css`. The host's box and two siblings after it
// (inline text on its line, a block below) are measured, then the elements
// script loads, the element upgrades, and they are measured again.
//
// The score is the Layout Instability (CLS) formula, impact fraction times
// distance fraction, with the viewport replaced by the case's stage: 360 px
// wide (a phone), as tall as its content. Against a whole screen a single
// component is diluted; against its stage, a shift that moves what follows it
// counts. The host counts as shifted when what it shows (its box, with what
// its shadow root renders) moves or changes size, a sibling when it moves.
// Every case must stay under 0.01, and a case fails outright when a sibling
// moves more than MOVE_LIMIT, whatever the score reads (see the constant).
// A button's own box must also move or resize by less than that limit, unless a
// subject pin records the expected change: a 4px inset mismatch can move
// adjacent content while scoring below the threshold.
//
// The mutation check runs the same cases without the pre-upgrade stylesheet:
// it must fail most elements, or the check is not measuring anything.
// Then the same through the React adapter's server render, `renderToString`
// and hydration, with and without the stylesheet. One element's file alone
// must reserve that element's box, measured on that element, and must leave
// another element on the page to shift. A phase-B page (declarative roots)
// that loads the stylesheet, with the element script still held back, must
// not paint the pre-upgrade rules over those roots, and a host on the same
// page without a root must still keep its reserved box.
//
//   bun run build && bun run scripts/check-preupgrade.ts [element…]

import assert from "node:assert/strict";
import { chromium, type Page } from "playwright";
import { THRESHOLD, MOVE_LIMIT, SIBLINGS, markOf, validateKnownMoves, type KnownMove } from "./preupgrade-moves";
import { cases, type PreupgradeCase } from "./fixtures/preupgrade-cases";
import { elements } from "../src/elements";
import { renderElement } from "../dist/ssr/index.js";

const pinIcon = "<svg viewBox='0 0 24 24'><path d='M4 4h16v16H4z'/></svg>";

const phaseB = [
  renderElement("m-text-field", { label: "Name", value: "Ada" }),
  renderElement("m-button", {}, "Save"),
  renderElement("m-select", { label: "Pet", value: "Dog" }),
  // The deep text-field rule (multiline, supporting text, outlined, compact)
  // is one of the highest-specificity pre-upgrade selectors. The rollback has
  // to beat it, not only `m-text-field:not(:defined)`.
  renderElement("m-text-field", {
    id: "variant", label: "Name", value: "Ada", type: "multiline", variant: "outlined",
    density: "compact", "supporting-text": "Help",
  }),
  renderElement("m-navigation-rail", { id: "rail" }, '<div slot="header">Menu</div>'),
  renderElement("m-card", { id: "card" }, '<span slot="headline">Title</span>'),
  // The FAB menu opts out of the shadow and the mark. Inside a rendered
  // toolbar it is still an undefined custom element, and its own rule reserves
  // the 56px box. A bare twin beside it is that rule with no rendered parent.
  renderElement("m-toolbar", { id: "toolbar" }, '<m-fab-menu slot="fab"></m-fab-menu>'),
  // A directly slotted selected icon button keeps its round radius at first
  // paint, before upgrade, whatever the tag prefix: the pin comes from the
  // toolbar's inline sheet and the marker attribute the renderer writes into
  // the host markup. An icon button deeper in the toolbar — the overflow
  // slot's content — morphs square, as standalone.
  renderElement("m-toolbar", { id: "shape", "aria-label": "Shapes" },
    `<m-icon-button id="pinned" toggle selected size="m" aria-label="P" icon="${pinIcon}"></m-icon-button>` +
    `<div slot="overflow"><m-icon-button id="deep" toggle selected aria-label="D" icon="${pinIcon}"></m-icon-button></div>`),
  renderElement("x-toolbar", { id: "xshape", "aria-label": "Shapes" },
    `<x-icon-button id="xpinned" toggle selected size="xl" aria-label="P" icon="${pinIcon}"></x-icon-button>`, { prefix: "x" }),
].join("") + '<m-text-field id="variant-bare" label="Name" value="Ada" type="multiline" variant="outlined" density="compact" supporting-text="Help"></m-text-field>'
  + '<m-text-field id="field-bare" label="Name" value="Ada"></m-text-field>'
  + '<m-navigation-rail id="rail-bare"><div slot="header">Menu</div></m-navigation-rail>'
  + '<m-card id="card-bare"><span slot="headline">Title</span></m-card>'
  + '<m-fab-menu id="fab-bare"></m-fab-menu>';

const STAGE_WIDTH = 360;

const only = process.argv.slice(2);

const build = async (entry: string, target: "browser" | "bun"): Promise<string> => {
  const result = await Bun.build({
    entrypoints: [entry],
    target,
    define: { "process.env.NODE_ENV": '"production"' },
  });
  assert(result.success, String(result.logs));
  return result.outputs[0].text();
};

const elementsJs = await build("scripts/fixtures/preupgrade.ts", "browser");
const reactClientJs = await build("scripts/fixtures/preupgrade-react-client.ts", "browser");
const reactServer = `${process.cwd()}/.check-preupgrade-react.js`;
await Bun.write(reactServer, await build("scripts/fixtures/preupgrade-react-server.ts", "bun"));
let reactHtml: string;
try {
  reactHtml = ((await import(reactServer)) as { render: () => string }).render();
} finally {
  await Bun.file(reactServer).delete();
}

const page = (body: string, preupgrade: boolean): string =>
  `<!doctype html><html data-theme="baseline"><head>
<link rel="stylesheet" href="/base.css">${preupgrade ? '\n<link rel="stylesheet" href="/preupgrade.css">' : ""}
<style>body{margin:0;min-height:0}#stage{width:${STAGE_WIDTH}px}</style></head>
<body>${body}</body></html>`;

const stage = (html: string, item?: PreupgradeCase): string =>
  `<div id="stage" style="${item?.style ?? ""};width:${item?.width ?? STAGE_WIDTH}px">${html}<span id="inline">Next</span><div id="block">Following text</div></div>`;

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch(request) {
    const url = new URL(request.url);
    const preupgrade = url.searchParams.get("pre") === "1";
    const js = (text: string) => new Response(text, { headers: { "Content-Type": "text/javascript" } });
    const html = (text: string) => new Response(text, { headers: { "Content-Type": "text/html" } });
    switch (url.pathname) {
      case "/base.css":
        return new Response(Bun.file("dist/styles/base.css"));
      case "/preupgrade.css":
        return new Response(Bun.file("dist/elements/preupgrade.css"));
      case "/preupgrade/button.css":
        return new Response(Bun.file("dist/elements/preupgrade/button.css"));
      case "/one":
        return html(page(stage(`<div><m-button>Save</m-button></div><div><m-switch id="switch">Wi-Fi</m-switch></div>`), false)
          .replace("</head>", '<link rel="stylesheet" href="/preupgrade/button.css"></head>'));
      case "/phase-b":
        return html(page(stage(`${phaseB}<m-button id="bare">Bare</m-button>`), true));
      // A filled password field beside an empty one, both undefined: the value
      // must not be painted, and the two boxes must be the same. A hidden field
      // beside them, in a real form: no value, no box before upgrade or after,
      // and the value it carries still reaches the form and reads back.
      case "/secret":
        return html(page(stage(
          `<m-text-field id="password" type="password" label="Password" value="hunter2"></m-text-field><m-text-field id="empty-password" type="password" label="Password"></m-text-field><div><m-text-field id="password-upper" type="PASSWORD" label="Password" value="hunter2"></m-text-field><m-text-field id="empty-password-upper" type="PASSWORD" label="Password"></m-text-field></div><div><m-text-field id="password-title" type="Password" label="Password" value="hunter2"></m-text-field><m-text-field id="empty-password-title" type="Password" label="Password"></m-text-field></div><form id="secret-form"><m-text-field id="hidden" type="hidden" name="token" value="synthetic-token"></m-text-field><m-text-field id="hidden-upper" type="HIDDEN" name="token-upper" value="synthetic-token-2"></m-text-field><m-text-field id="hidden-title" type="Hidden" name="token-title" value="synthetic-token-3"></m-text-field></form>`,
          { element: "text-field", variant: "type=password", html: "", width: 840 },
        ), true));
      case "/elements.js":
        return js(elementsJs);
      case "/react.js":
        return js(reactClientJs);
      case "/react":
        return html(page(`<div id="stage"><div id="root">${reactHtml}</div><div id="block">Following text</div></div>`, preupgrade));
      default: {
        // The built modules as they are, one module graph: the CSS modules and
        // the elements must share their registry.
        if (url.pathname.startsWith("/dist/")) return new Response(Bun.file(url.pathname.slice(1)));
        const index = Number(url.pathname.slice(1));
        return html(page(stage(cases[index].html, cases[index]), preupgrade));
      }
    }
  },
});

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
interface Snapshot {
  frame: Box;
  /** The host (or, for the React page, each rendered child), then the siblings that follow. */
  hosts: Box[];
  siblings: Box[];
}

const settle = (p: Page): Promise<unknown> =>
  p.evaluate(async () => {
    await document.fonts.ready;
    for (let i = 0; i < 2; i++) await new Promise((r) => requestAnimationFrame(r));
  });

const snapshot = (p: Page, hosts: string, siblings: string): Promise<Snapshot> =>
  p.evaluate(
    ([hostSelector, siblingSelector]) => {
      const box = (element: Element): Box => {
        const r = element.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height };
      };
      // What the host shows in the page: its box, and the boxes of what its
      // shadow root renders, which may sit outside it (the top app bar's
      // absolute bar). Not what is hidden, fixed to the viewport or in the top
      // layer, which appears over the page rather than moving it; and clipped
      // to the viewport, where a closed drawer's sheet waits off-screen.
      const inPage = (element: Element): boolean =>
        element.checkVisibility({ opacityProperty: true, visibilityProperty: true }) &&
        getComputedStyle(element).position !== "fixed" &&
        !element.matches(":modal, :popover-open");
      const visual = (host: Element): Box => {
        const boxes = [box(host), ...Array.from(host.shadowRoot?.children ?? []).filter(inPage).map(box)]
          .filter((b) => b.w > 0 && b.h > 0)
          .map((b) => {
            const x = Math.max(b.x, 0);
            const y = Math.max(b.y, 0);
            return { x, y, w: Math.min(b.x + b.w, innerWidth) - x, h: Math.min(b.y + b.h, innerHeight) - y };
          })
          .filter((b) => b.w > 0 && b.h > 0);
        if (!boxes.length) return { ...box(host), w: 0, h: 0 };
        const x = Math.min(...boxes.map((b) => b.x));
        const y = Math.min(...boxes.map((b) => b.y));
        const right = Math.max(...boxes.map((b) => b.x + b.w));
        const bottom = Math.max(...boxes.map((b) => b.y + b.h));
        return { x, y, w: right - x, h: bottom - y };
      };
      return {
        frame: box(document.getElementById("stage") as Element),
        hosts: Array.from(document.querySelectorAll(hostSelector), visual),
        siblings: Array.from(document.querySelectorAll(siblingSelector), box),
      };
    },
    [hosts, siblings] as const
  );

/** Area of the union of rectangles inside the frame, on a 1 px grid. */
const unionArea = (rects: Box[], frame: Box): number => {
  if (!rects.length) return 0;
  const w = Math.ceil(frame.w);
  const h = Math.ceil(frame.h);
  const grid = new Uint8Array(w * h);
  let area = 0;
  for (const r of rects) {
    const x0 = Math.max(0, Math.floor(r.x - frame.x));
    const y0 = Math.max(0, Math.floor(r.y - frame.y));
    const x1 = Math.min(w, Math.ceil(r.x - frame.x + r.w));
    const y1 = Math.min(h, Math.ceil(r.y - frame.y + r.h));
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        if (!grid[y * w + x]) {
          grid[y * w + x] = 1;
          area++;
        }
      }
    }
  }
  return area;
};

/** The rectangle that contains both boxes. */
const span = (a: Box, b: Box): Box => {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    x,
    y,
    w: Math.max(Math.max(a.x + a.w, b.x + b.w) - x, 1),
    h: Math.max(Math.max(a.y + a.h, b.y + b.h) - y, 1),
  };
};

/** How far a box moved or changed size, in px. Under 0.5 the score ignores it. */
const shiftOf = (a: Box, b: Box): number =>
  Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.w - b.w), Math.abs(a.h - b.h));

/** Impact fraction times distance fraction, over a frame that holds both states. */
const score = (before: Snapshot, after: Snapshot, bounds?: Box): number => {
  const frame = bounds ?? { x: before.frame.x, y: before.frame.y, w: before.frame.w, h: Math.max(before.frame.h, after.frame.h, 1) };
  const impact: Box[] = [];
  let distance = 0;
  const shifted = (a: Box, b: Box, resized: boolean): void => {
    const moved = Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
    const grown = resized ? Math.max(Math.abs(a.w - b.w), Math.abs(a.h - b.h)) : 0;
    const d = Math.max(moved, grown);
    if (d < 0.5) return;
    distance = Math.max(distance, d);
    impact.push(a, b);
  };
  assert.equal(before.hosts.length, after.hosts.length, "The hosts changed between the snapshots");
  before.hosts.forEach((box, i) => shifted(box, after.hosts[i], true));
  before.siblings.forEach((box, i) => shifted(box, after.siblings[i], false));
  return (unionArea(impact, frame) / (frame.w * frame.h)) * (distance / Math.max(frame.w, frame.h));
};

interface Result {
  name: string;
  score: number;
  before: Box;
  after: Box;
  /** How far each sibling moved, for the report. */
  moved: string;
  /** The same per sibling, for the move limit: x and y in px. */
  moves: { dx: number; dy: number }[];
  siblings?: readonly string[];
  knownMoves?: readonly KnownMove[];
  boxMove?: number;
  /** The button's own box, for the subject check. */
  subjectMove?: number;
}

const measure = async (path: string, preupgrade: boolean, hosts: string, script: string, item?: PreupgradeCase): Promise<[Snapshot, Snapshot]> => {
  const p = await browser.newPage({ viewport: { width: (item?.width ?? STAGE_WIDTH) + 40, height: 800 } });
  const errors: string[] = [];
  p.on("pageerror", (error) => errors.push(error.message));
  try {
    await p.goto(`http://127.0.0.1:${server.port}${path}?pre=${preupgrade ? 1 : 0}`);
    await settle(p);
    if (item?.prepareNeighbors) {
      await p.evaluate(async () => {
        const css = "/dist/elements/css/index.js";
        const entry = "/dist/elements/index.js";
        await import(css);
        const elements = await import(entry);
        elements.defineButton();
        elements.defineTextField();
      });
      await settle(p);
    }
    const siblings = (item?.siblings ?? SIBLINGS).join(", ");
    const before = await snapshot(p, hosts, siblings);
    await p.addScriptTag({ url: script, type: "module" });
    await p.waitForFunction(() => (window as unknown as { ready?: boolean }).ready === true);
    await p.waitForFunction(() => !document.querySelector("#stage :not(:defined)"));
    // Factories that finish their layout on a later frame or timer.
    await p.waitForTimeout(300);
    await settle(p);
    const after = await snapshot(p, hosts, siblings);
    assert.deepEqual(errors, [], `${path}: page errors`);
    return [before, after];
  } finally {
    await p.close();
  }
};

const runCases = async (preupgrade: boolean): Promise<Result[]> => {
  const results: Result[] = [];
  for (const [index, item] of cases.entries()) {
    if (only.length && !only.includes(item.element)) continue;
    const [before, after] = await measure(`/${index}`, preupgrade, item.host ?? "#stage > :first-child", "/elements.js", item);
    const moves = before.siblings.map((b, i) => ({ dx: after.siblings[i].x - b.x, dy: after.siblings[i].y - b.y }));
    const moved = moves.map(({ dx, dy }) => `${dx.toFixed(1)},${dy.toFixed(1)}`).join(" ");
    const box = shiftOf(before.hosts[0], after.hosts[0]);
    results.push({
      name: label(item), score: score(before, after), before: before.hosts[0], after: after.hosts[0],
      moved, moves, siblings: item.siblings, knownMoves: item.knownMoves,
      boxMove: item.strictBox ? box : undefined,
      subjectMove: item.element === "button" ? box : undefined,
    });
  }
  return results;
};

const label = (item: PreupgradeCase): string => (item.variant === "default" ? item.element : `${item.element} [${item.variant}]`);
const size = (b: Box): string => `${b.w.toFixed(1)}x${b.h.toFixed(1)}`;

/** Print the rows; return the names that failed. */
const report = (results: Result[], checkMoves: boolean): string[] => {
  const failed: string[] = [];
  for (const r of results) {
    const { mark, note } = checkMoves && r.boxMove !== undefined && r.boxMove > MOVE_LIMIT
      ? { mark: "FAIL", note: `  (host moved or resized ${r.boxMove.toFixed(6)}px; over ${MOVE_LIMIT}px)` }
      : markOf(r, checkMoves);
    if (mark === "FAIL") failed.push(r.name);
    const box = r.subjectMove !== undefined ? `  box shift ${r.subjectMove.toFixed(2)}px` : "";
    console.log(`  ${mark.padEnd(5)} ${r.name.padEnd(34)} ${r.score.toFixed(4)}  ${size(r.before)} -> ${size(r.after)}  siblings moved ${r.moved}${note}${box}`);
  }
  return failed;
};

const browser = await chromium.launch({ headless: true });
try {
  // Every element has a default case.
  const kebab = (name: string): string => name.replace(/[A-Z]/g, (ch) => `-${ch.toLowerCase()}`);
  const covered = new Set(cases.filter((item) => item.variant === "default").map((item) => item.element));
  assert.deepEqual(Object.keys(elements).map(kebab).filter((name) => !covered.has(name)), [], "Elements without a case");

  console.log(`With the pre-upgrade styles (score < ${THRESHOLD}, siblings within ${MOVE_LIMIT}px, button box under ${MOVE_LIMIT}px):`);
  const withStyles = await runCases(true);
  const failing = report(withStyles, true);
  if (process.env.PREUPGRADE_RESULTS) await Bun.write(process.env.PREUPGRADE_RESULTS, JSON.stringify(withStyles, null, 2));

  validateKnownMoves(withStyles, only);

  console.log("\nMutation: without the pre-upgrade styles:");
  const without = await runCases(false);
  report(without, false);

  const defaults = without.filter((r) => !r.name.includes("["));
  const caught = defaults.filter((r) => r.score >= THRESHOLD);
  console.log(`\nMutation: ${caught.length} of ${defaults.length} elements shift without the pre-upgrade styles.`);

  let react: { withStyles: number; without: number } | null = null;
  if (!only.length) {
    const hosts = "#root > main > *";
    const [a, b] = await measure("/react", true, hosts, "/react.js");
    const [c, d] = await measure("/react", false, hosts, "/react.js");
    react = { withStyles: score(a, b), without: score(c, d) };
    console.log(`\nReact renderToString + hydration: ${react.withStyles.toFixed(4)} with, ${react.without.toFixed(4)} without.`);
  }

  // One element's file reserves that element only. The button and the switch
  // are each in their own block. As inline siblings the unreserved switch
  // grows, the line box gets taller, and the button's y moves with it, so
  // scoring the button's rectangle still counts the neighbour. The switch's
  // own shift is asserted separately. The script stays held back until the
  // boxes are measured.
  let one = 0;
  let buttonMove = 0;
  let switchMove = 0;
  if (!only.length) {
    const p = await browser.newPage({ viewport: { width: 400, height: 800 } });
    try {
      await p.goto(`http://127.0.0.1:${server.port}/one`);
      await settle(p);
      const boxes = () => p.evaluate(() => {
        const rect = (element: Element): Box => {
          const r = element.getBoundingClientRect();
          return { x: r.x, y: r.y, w: r.width, h: r.height };
        };
        const button = document.querySelector("m-button")!;
        const sw = document.querySelector("m-switch")!;
        const sheets = Array.from(document.styleSheets, (sheet) => {
          try { return Array.from(sheet.cssRules, (rule) => rule.cssText).join(""); }
          catch { return ""; }
        }).join("");
        return {
          button: rect(button),
          sw: rect(sw),
          buttonRule: sheets.includes("m-button:not(:defined)"),
          switchRule: sheets.includes("m-switch:not(:defined)"),
        };
      });
      const before = await boxes();
      assert(before.button.h > 30, "button.css did not reserve the button");
      assert(before.buttonRule, "button.css did not apply the button rule");
      assert(!before.switchRule, "button.css included another element's rules");
      await p.addScriptTag({ url: "/elements.js", type: "module" });
      await p.waitForFunction(() => (window as unknown as { ready?: boolean }).ready === true && !document.querySelector("#stage :not(:defined)"));
      await settle(p);
      const after = await boxes();
      const buttonBox = span(before.button, after.button);
      const region = (box: Box): Snapshot => ({ frame: buttonBox, hosts: [box], siblings: [] });
      one = score(region(before.button), region(after.button), buttonBox);
      buttonMove = shiftOf(before.button, after.button);
      switchMove = shiftOf(before.sw, after.sw);
      console.log(`One file, button.css: ${one.toFixed(4)} (button ${before.button.w.toFixed(1)}×${before.button.h.toFixed(1)} at y ${before.button.y.toFixed(1)} -> ${after.button.w.toFixed(1)}×${after.button.h.toFixed(1)} at y ${after.button.y.toFixed(1)}, moved ${buttonMove.toFixed(2)}; switch ${before.sw.h.toFixed(1)} -> ${after.sw.h.toFixed(1)}, moved ${switchMove.toFixed(2)})`);
    } finally {
      await p.close();
    }
  }

  // Phase B: the stylesheet is loaded and the script is still held back.
  // A rendered host must not take the pre-upgrade paint; a bare host must.
  if (!only.length) {
    const p = await browser.newPage({ viewport: { width: 400, height: 800 } });
    try {
      await p.goto(`http://127.0.0.1:${server.port}/phase-b`);
      await settle(p);
      const before = await p.evaluate(() => {
        const field = document.querySelector("m-text-field")!;
        const button = document.querySelector("m-button:not(#bare)")!;
        const select = document.querySelector("m-select")!;
        const bare = document.querySelector("#bare")!;
        const variant = document.querySelector("#variant")!;
        const variantBare = document.querySelector("#variant-bare")!;
        const fieldBare = document.querySelector("#field-bare")!;
        const rail = document.querySelector("#rail")!;
        const railBare = document.querySelector("#rail-bare")!;
        const card = document.querySelector("#card")!;
        const cardBare = document.querySelector("#card-bare")!;
        const header = rail.querySelector("[slot=header]")!;
        const headerBare = railBare.querySelector("[slot=header]")!;
        const headline = card.querySelector("[slot=headline]")!;
        const headlineBare = cardBare.querySelector("[slot=headline]")!;
        const toolbar = document.querySelector("#toolbar")!;
        const fab = toolbar.querySelector("m-fab-menu")!;
        const fabBare = document.querySelector("#fab-bare")!;
        const shapePinned = document.getElementById("pinned")!.shadowRoot!.querySelector(".mtrl-icon-button")!;
        const shapeDeep = document.getElementById("deep")!.shadowRoot!.querySelector(".mtrl-icon-button")!;
        const shapeX = document.getElementById("xpinned")!.shadowRoot!.querySelector(".mtrl-icon-button")!;
        const box = (element: Element): { w: number; h: number } => {
          const r = element.getBoundingClientRect();
          return { w: r.width, h: r.height };
        };
        const style = getComputedStyle(field);
        return {
          root: !!field.shadowRoot && !!button.shadowRoot && !!select.shadowRoot && !!variant.shadowRoot && !!rail.shadowRoot && !!card.shadowRoot && !!toolbar.shadowRoot && !bare.shadowRoot && !variantBare.shadowRoot && !fieldBare.shadowRoot && !railBare.shadowRoot && !cardBare.shadowRoot && !fab.shadowRoot && !fabBare.shadowRoot,
          padding: getComputedStyle(field, "::before").padding,
          fieldBarePadding: getComputedStyle(fieldBare, "::before").padding,
          background: style.backgroundColor,
          before: getComputedStyle(field, "::before").content,
          after: getComputedStyle(field, "::after").content,
          button: button.getBoundingClientRect().width,
          select: select.getBoundingClientRect().width,
          bare: bare.getBoundingClientRect().height,
          variantPadding: getComputedStyle(variant, "::before").padding,
          variantBefore: getComputedStyle(variant, "::before").content,
          barePadding: getComputedStyle(variantBare, "::before").padding,
          bareBefore: getComputedStyle(variantBare, "::before").content,
          header: { visibility: getComputedStyle(header).visibility, ...box(header) },
          headerBare: { visibility: getComputedStyle(headerBare).visibility, ...box(headerBare) },
          headline: { visibility: getComputedStyle(headline).visibility, order: getComputedStyle(headline).order, ...box(headline) },
          headlineBare: { visibility: getComputedStyle(headlineBare).visibility, order: getComputedStyle(headlineBare).order, ...box(headlineBare) },
          fab: box(fab),
          fabBare: box(fabBare),
          shapePinned: getComputedStyle(shapePinned).borderTopLeftRadius,
          shapeDeep: getComputedStyle(shapeDeep).borderTopLeftRadius,
          shapeX: getComputedStyle(shapeX).borderTopLeftRadius,
        };
      });
      assert(before.root, "phase B hosts did not render the roots the page asked for");
      // Against a bare twin's padding, not a pinned value: a pin passes on anything once the padding changes
      assert(before.padding !== before.fieldBarePadding, `text field still has pre-upgrade padding (${before.padding})`);
      assert(before.before === "none", `text field ::before is pre-upgrade text (${before.before})`);
      assert(before.after === "none", `text field ::after is pre-upgrade text (${before.after})`);
      assert(before.bare > 30, "a host without a declarative root lost its reserved box");
      assert(before.variantPadding !== before.barePadding, `outlined multiline text field still has pre-upgrade padding (${before.variantPadding})`);
      assert(before.variantBefore === "none", `outlined multiline ::before is pre-upgrade text (${before.variantBefore})`);
      assert(before.bareBefore !== "none", "the bare outlined multiline host lost its pre-upgrade ::before");
      // The rail's header slot is a direct child. The pre-upgrade rule hides it
      // and gives it a 64px box; the rendered host's child is neither.
      assert.equal(before.headerBare.visibility, "hidden");
      assert.equal(Math.round(before.headerBare.h), 64);
      assert.equal(before.header.visibility, "visible");
      assert.notEqual(Math.round(before.header.h), Math.round(before.headerBare.h));
      // The card's headline is a direct child. The rule sets order (and the
      // title type, which sizes the bare twin). The rendered headline keeps
      // neither the hidden treatment nor that order.
      assert.equal(before.headline.visibility, "visible");
      assert.equal(before.headlineBare.visibility, "visible");
      assert.equal(before.headlineBare.order, "-2");
      assert.notEqual(before.headline.order, before.headlineBare.order);
      assert(before.headline.h > 0 && before.headlineBare.h > 0, "a card headline has no box");
      // The toolbar's FAB menu is an undefined custom element. Its pre-upgrade
      // rule reserves 56px; the bare twin is the same rule. The rollback must
      // not take that box away.
      assert.equal(Math.round(before.fabBare.w), 56);
      assert.equal(Math.round(before.fabBare.h), 56);
      assert.equal(Math.round(before.fab.w), Math.round(before.fabBare.w));
      assert.equal(Math.round(before.fab.h), Math.round(before.fabBare.h));
      // The toolbar shape pin, before the script runs: a slotted selected host
      // keeps its round radius (28px at m, 68px at xl) from the toolbar's
      // inline sheet and the marker in the static markup, the default prefix
      // and a custom one alike; the overflow slot's content morphs square,
      // as standalone.
      assert.equal(before.shapePinned, "28px", "a slotted selected host is not round before upgrade");
      assert.equal(before.shapeX, "68px", "a custom-prefix slotted selected host is not round before upgrade");
      assert.equal(before.shapeDeep, "12px", "the overflow slot's content is not standalone before upgrade");
      await p.addScriptTag({ url: "/elements.js", type: "module" });
      await p.waitForFunction(() => (window as unknown as { ready?: boolean }).ready === true && !document.querySelector("#stage :not(:defined)"));
      await p.waitForTimeout(300);
      await settle(p);
      const after = await p.evaluate(() => ({
        button: document.querySelector("m-button:not(#bare)")!.getBoundingClientRect().width,
        select: document.querySelector("m-select")!.getBoundingClientRect().width,
        background: getComputedStyle(document.querySelector("m-text-field")!).backgroundColor,
        shapePinned: getComputedStyle(document.getElementById("pinned")!.shadowRoot!.querySelector(".mtrl-icon-button")!).borderTopLeftRadius,
        shapeX: getComputedStyle(document.getElementById("xpinned")!.shadowRoot!.querySelector(".mtrl-icon-button")!).borderTopLeftRadius,
      }));
      assert(Math.abs(before.button - after.button) < 0.5, `button width ${before.button} before the script, ${after.button} after`);
      assert(Math.abs(before.select - after.select) < 0.5, `select width ${before.select} before the script, ${after.select} after`);
      assert.equal(before.background, after.background, "text field background changed when the script ran");
      // No flash of the square shape across the upgrade boundary: the radius
      // the page painted with no script is the radius it keeps with it.
      assert.equal(after.shapePinned, "28px", "the slotted selected host changed radius at upgrade");
      assert.equal(after.shapeX, "68px", "the custom-prefix slotted selected host changed radius at upgrade");
      console.log(`Phase B, stylesheet loaded, script held back: field padding ${before.padding}, button ${before.button.toFixed(1)}px, select ${before.select.toFixed(1)}px, bare ${before.bare.toFixed(1)}px, header ${before.header.visibility} ${before.header.h.toFixed(1)}px (bare ${before.headerBare.visibility} ${before.headerBare.h.toFixed(1)}px), headline ${before.headline.visibility} ${before.headline.h.toFixed(1)}px order ${before.headline.order} (bare ${before.headlineBare.visibility} ${before.headlineBare.h.toFixed(1)}px order ${before.headlineBare.order}), fab ${before.fab.w.toFixed(1)}×${before.fab.h.toFixed(1)} (bare ${before.fabBare.w.toFixed(1)}×${before.fabBare.h.toFixed(1)}), shape pin ${before.shapePinned}/${before.shapeX} (deep ${before.shapeDeep})`);
    } finally {
      await p.close();
    }
  }

  // A password or hidden field paints no value before upgrade (#53). The value
  // attribute holds the password or the token in clear text, and the stylesheet
  // paints it with `content: attr(value) ' '` for every type; both exceptions
  // paint the space alone. The password keeps the empty field's line box, so
  // the filled field's box — width, height and, as the field clips, the bottom
  // edge the baseline sits on — is the empty one's, and nothing moves at
  // upgrade. A hidden field takes no space at all, before upgrade or after (the
  // upgraded host is not rendered), and stays form-associated: the same page
  // proves the value reaches a real form and reads back.
  if (!only.length || only.includes("text-field")) {
    const p = await browser.newPage({ viewport: { width: 900, height: 800 } });
    try {
      await p.goto(`http://127.0.0.1:${server.port}/secret`);
      await settle(p);
      const fields = async () => p.evaluate(() => {
        const box = (element: Element): Box => {
          const r = element.getBoundingClientRect();
          return { x: r.x, y: r.y, w: r.width, h: r.height };
        };
        const ids = ["password", "empty-password", "password-upper", "empty-password-upper", "password-title", "empty-password-title", "hidden", "hidden-upper", "hidden-title"];
        const form = document.getElementById("secret-form") as HTMLFormElement | null;
        const submitted = form ? new FormData(form) : null;
        return Object.fromEntries(ids.map((id) => {
          const host = document.getElementById(id)! as HTMLElement & { value?: string };
          const input = host.shadowRoot?.querySelector("input") as HTMLInputElement | null;
          return [id, {
            content: getComputedStyle(host, "::before").content,
            display: getComputedStyle(host).display,
            box: box(host),
            value: host.value,
            submitted: submitted?.get(host.getAttribute("name") ?? "") ?? null,
            input: input && { type: input.type, display: getComputedStyle(input).display, box: box(input) },
          }];
        }));
      });
      const before = await fields();
      assert(!before.password.content.includes("hunter2"), `a password field paints its value before upgrade (::before content ${before.password.content})`);
      assert.equal(before.password.content, before["empty-password"].content, "a filled password field paints a different ::before than an empty one");
      const { box: filledBox } = before.password;
      const { box: emptyBox } = before["empty-password"];
      assert.equal(filledBox.w, emptyBox.w, "a filled password field is not as wide as an empty one");
      assert.equal(filledBox.h, emptyBox.h, "a filled password field is not as tall as an empty one");
      // Both are inline boxes on one line, so the same y is the same baseline.
      assert.equal(filledBox.y, emptyBox.y, "a filled password field does not sit on the empty one's baseline");
      assert(
        Math.abs(emptyBox.x - (filledBox.x + filledBox.w)) < 0.5,
        `a filled password field's box is not its own (${filledBox.w}px wide, the next field at ${emptyBox.x - filledBox.x})`,
      );
      // The type selector is case-insensitive for passwords as well as hidden fields.
      for (const [filled, empty, type] of [
        ["password", "empty-password", "password"],
        ["password-upper", "empty-password-upper", "PASSWORD"],
        ["password-title", "empty-password-title", "Password"],
      ]) {
        const field = before[filled];
        const blank = before[empty];
        assert.equal(field.content, '" "', `${type} paints more than the empty line-box space`);
        assert.equal(blank.content, '" "', `empty ${type} paints more than the empty line-box space`);
        assert.equal(field.box.w, blank.box.w, `${type} filled/empty widths differ`);
        assert.equal(field.box.h, blank.box.h, `${type} filled/empty heights differ`);
        assert.equal(field.box.y, blank.box.y, `${type} filled/empty baselines differ`);
        assert(Math.abs(blank.box.x - (field.box.x + field.box.w)) < 0.5, `${type} filled/empty fields overlap`);
        console.log(`Password ${type} before upgrade: ::before ${field.content}, filled ${field.box.w}×${field.box.h}, empty ${blank.box.w}×${blank.box.h}; no value painted`);
      }
      for (const id of ["hidden", "hidden-upper", "hidden-title"]) {
        assert(!before[id].content.includes("synthetic-token"), `a ${id.includes("upper") ? "HIDDEN" : "hidden"} field paints its value before upgrade (::before content ${before[id].content})`);
        assert.equal(before[id].display, "none", `a ${id} field is rendered before upgrade (display ${before[id].display})`);
        assert.equal(before[id].box.w, 0, `a ${id} field takes space before upgrade (${before[id].box.w}px wide)`);
        assert.equal(before[id].box.h, 0, `a ${id} field takes space before upgrade (${before[id].box.h}px tall)`);
        assert.equal(before[id].submitted, null, `a ${id} field submits before upgrade, and cannot: the element is not defined yet`);
      }
      // The upgraded element in the same page: no space either, and the value
      // still reads and still reaches the form.
      await p.addScriptTag({ url: "/elements.js", type: "module" });
      await p.waitForFunction(() => (window as unknown as { ready?: boolean }).ready === true);
      await p.waitForFunction(() => !document.querySelector("#stage :not(:defined)"));
      await p.waitForTimeout(300);
      await settle(p);
      const after = await fields();
      const tokens: Record<string, [string, string]> = {
        hidden: ["token", "synthetic-token"],
        "hidden-upper": ["token-upper", "synthetic-token-2"],
        "hidden-title": ["token-title", "synthetic-token-3"],
      };
      for (const [id, [name, token]] of Object.entries(tokens)) {
        assert.equal(after[id].display, "none", `the upgraded ${id} is rendered (display ${after[id].display})`);
        assert.equal(after[id].box.w, 0, `the upgraded ${id} takes space (${after[id].box.w}px wide)`);
        assert.equal(after[id].box.h, 0, `the upgraded ${id} takes space (${after[id].box.h}px tall)`);
        assert.equal(after[id].input?.type, "hidden", `the upgraded ${id} is not a hidden input`);
        assert.equal(after[id].input?.display, "none", `the upgraded ${id}'s input is rendered (${after[id].input?.display})`);
        assert.equal(after[id].value, token, `the upgraded ${id}'s value does not read back (${after[id].value})`);
        assert.equal(after[id].submitted, token, `the upgraded ${id} does not submit its value under ${name} (FormData has ${after[id].submitted})`);
      }
      console.log(`Password before upgrade: filled field ::before ${before.password.content}, box ${filledBox.w}×${filledBox.h} at (${filledBox.x}, ${filledBox.y}); empty field ::before ${before["empty-password"].content}, box ${emptyBox.w}×${emptyBox.h} at (${emptyBox.x}, ${emptyBox.y})`);
      console.log(`Hidden before upgrade: filled field ::before ${before.hidden.content}, box ${before.hidden.box.w}×${before.hidden.box.h}, display ${before.hidden.display}; HIDDEN ::before ${before["hidden-upper"].content}, box ${before["hidden-upper"].box.w}×${before["hidden-upper"].box.h}, display ${before["hidden-upper"].display}; Hidden ::before ${before["hidden-title"].content}, box ${before["hidden-title"].box.w}×${before["hidden-title"].box.h}, display ${before["hidden-title"].display}`);
      console.log(`Hidden after upgrade: box ${after.hidden.box.w}×${after.hidden.box.h}, display ${after.hidden.display}, input type ${after.hidden.input?.type} display ${after.hidden.input?.display} at ${after.hidden.input?.box.w}×${after.hidden.input?.box.h}; the form sees token=${after.hidden.submitted}, value reads ${after.hidden.value}`);
    } finally {
      await p.close();
    }
  }

  assert.deepEqual(failing, [], "Cases that shift on upgrade: score over the threshold, a sibling over the move limit, or a button box at or over the move limit");
  // The button's own box. A move of at least 0.5 px counts even when the
  // region score stays under the threshold.
  assert(buttonMove < 0.5 && one < THRESHOLD, "One element's pre-upgrade file shifts on upgrade");
  if (!only.length) {
    assert(switchMove >= 0.5, "One element's pre-upgrade file reserved another element");
    // Most elements must shift without the styles, or the score measures nothing.
    assert(caught.length > defaults.length / 2, `Only ${caught.length} of ${defaults.length} elements shift without the styles`);
    assert(react && react.withStyles < THRESHOLD, "The React page shifts on upgrade");
    assert(react && react.without >= THRESHOLD, "The React page does not shift without the styles");
  }
  console.log(`\npreupgrade check passed (${withStyles.length} cases)`);
} finally {
  await browser.close();
  server.stop(true);
}
