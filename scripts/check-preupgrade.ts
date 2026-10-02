#!/usr/bin/env bun
// Pre-upgrade styles (FLO-293, ssr.md Phase A): no layout shift from the
// server's HTML to the upgraded element.
//
// Each case is the server-style HTML of one element (the host and its light
// DOM, as an adapter's server render emits it) in a page with the base styles
// and `mtrl/elements/preupgrade.css`. The host's box and two siblings after it
// (inline text on its line, a block below) are measured, then the elements
// script loads, the element upgrades, and they are measured again.
//
// The score is the Layout Instability (CLS) formula, impact fraction times
// distance fraction, with the viewport replaced by the case's stage: 360 px
// wide (a phone), as tall as its content. Against a whole screen a single
// component is diluted; against its stage, a shift that moves what follows it
// counts. The host counts as shifted when what it shows (its box, with what
// its shadow root renders) moves or changes size, a sibling when it moves.
// Every case must stay under 0.01.
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
import { cases, type PreupgradeCase } from "./fixtures/preupgrade-cases";
import { elements } from "../src/elements";
import { renderElement } from "../dist/ssr/index.js";

const phaseB = [
  renderElement("m-textfield", { label: "Name", value: "Ada" }),
  renderElement("m-button", {}, "Save"),
  renderElement("m-select", { label: "Pet", value: "Dog" }),
  // The deep text-field rule (multiline, supporting text, outlined, compact)
  // is one of the highest-specificity pre-upgrade selectors. The rollback has
  // to beat it, not only `m-textfield:not(:defined)`.
  renderElement("m-textfield", {
    id: "variant", label: "Name", value: "Ada", type: "multiline", variant: "outlined",
    density: "compact", "supporting-text": "Help",
  }),
  renderElement("m-navigation-rail", { id: "rail" }, '<div slot="header">Menu</div>'),
  renderElement("m-card", { id: "card" }, '<span slot="headline">Title</span>'),
  // The FAB menu opts out of the shadow and the mark. Inside a rendered
  // toolbar it is still an undefined custom element, and its own rule reserves
  // the 56px box. A bare twin beside it is that rule with no rendered parent.
  renderElement("m-toolbar", { id: "toolbar" }, '<m-fab-menu slot="fab"></m-fab-menu>'),
].join("") + '<m-textfield id="variant-bare" label="Name" value="Ada" type="multiline" variant="outlined" density="compact" supporting-text="Help"></m-textfield>'
  + '<m-navigation-rail id="rail-bare"><div slot="header">Menu</div></m-navigation-rail>'
  + '<m-card id="card-bare"><span slot="headline">Title</span></m-card>'
  + '<m-fab-menu id="fab-bare"></m-fab-menu>';

const THRESHOLD = 0.01;
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

const stage = (html: string): string =>
  `<div id="stage">${html}<span id="inline">Next</span><div id="block">Following text</div></div>`;

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
        return html(page(stage(`<m-button>Save</m-button><m-switch id="switch">Wi-Fi</m-switch>`), false)
          .replace("</head>", '<link rel="stylesheet" href="/preupgrade/button.css"></head>'));
      case "/phase-b":
        return html(page(stage(`${phaseB}<m-button id="bare">Bare</m-button>`), true));
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
        return html(page(stage(cases[index].html), preupgrade));
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
  const frame = bounds ?? { x: before.frame.x, y: before.frame.y, w: STAGE_WIDTH, h: Math.max(before.frame.h, after.frame.h, 1) };
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
}

const measure = async (path: string, preupgrade: boolean, hosts: string, script: string): Promise<[Snapshot, Snapshot]> => {
  const p = await browser.newPage({ viewport: { width: 400, height: 800 } });
  const errors: string[] = [];
  p.on("pageerror", (error) => errors.push(error.message));
  try {
    await p.goto(`http://127.0.0.1:${server.port}${path}?pre=${preupgrade ? 1 : 0}`);
    await settle(p);
    const siblings = "#inline, #block";
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
    const [before, after] = await measure(`/${index}`, preupgrade, "#stage > :first-child", "/elements.js");
    const moved = before.siblings
      .map((b, i) => `${(after.siblings[i].x - b.x).toFixed(1)},${(after.siblings[i].y - b.y).toFixed(1)}`)
      .join(" ");
    results.push({ name: label(item), score: score(before, after), before: before.hosts[0], after: after.hosts[0], moved });
  }
  return results;
};

const label = (item: PreupgradeCase): string => (item.variant === "default" ? item.element : `${item.element} [${item.variant}]`);
const size = (b: Box): string => `${b.w.toFixed(1)}x${b.h.toFixed(1)}`;
const report = (results: Result[]): void => {
  for (const r of results) {
    const mark = r.score < THRESHOLD ? "ok" : "FAIL";
    console.log(`  ${mark.padEnd(4)} ${r.name.padEnd(34)} ${r.score.toFixed(4)}  ${size(r.before)} -> ${size(r.after)}  siblings moved ${r.moved}`);
  }
};

const browser = await chromium.launch({ headless: true });
try {
  // Every element has a default case.
  const kebab = (name: string): string => name.replace(/[A-Z]/g, (ch) => `-${ch.toLowerCase()}`);
  const covered = new Set(cases.filter((item) => item.variant === "default").map((item) => item.element));
  assert.deepEqual(Object.keys(elements).map(kebab).filter((name) => !covered.has(name)), [], "Elements without a case");

  console.log(`With the pre-upgrade styles (score < ${THRESHOLD}):`);
  const withStyles = await runCases(true);
  report(withStyles);

  console.log("\nMutation: without the pre-upgrade styles:");
  const without = await runCases(false);
  report(without);

  const failing = withStyles.filter((r) => r.score >= THRESHOLD);
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

  // One element's file reserves that element only. The score is the button's
  // own box: the stage also holds a switch, and scoring the stage would count
  // the switch pushing #inline and #block. That shift is asserted on its own.
  // The script stays held back until the boxes are measured.
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
      console.log(`One file, button.css: ${one.toFixed(4)} (button ${before.button.h.toFixed(1)}px, switch ${before.sw.h.toFixed(1)}px before the script)`);
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
        const field = document.querySelector("m-textfield")!;
        const button = document.querySelector("m-button:not(#bare)")!;
        const select = document.querySelector("m-select")!;
        const bare = document.querySelector("#bare")!;
        const variant = document.querySelector("#variant")!;
        const variantBare = document.querySelector("#variant-bare")!;
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
        const box = (element: Element): { w: number; h: number } => {
          const r = element.getBoundingClientRect();
          return { w: r.width, h: r.height };
        };
        const style = getComputedStyle(field);
        return {
          root: !!field.shadowRoot && !!button.shadowRoot && !!select.shadowRoot && !!variant.shadowRoot && !!rail.shadowRoot && !!card.shadowRoot && !!toolbar.shadowRoot && !bare.shadowRoot && !variantBare.shadowRoot && !railBare.shadowRoot && !cardBare.shadowRoot && !fab.shadowRoot && !fabBare.shadowRoot,
          padding: style.padding,
          background: style.backgroundColor,
          before: getComputedStyle(field, "::before").content,
          after: getComputedStyle(field, "::after").content,
          button: button.getBoundingClientRect().width,
          select: select.getBoundingClientRect().width,
          bare: bare.getBoundingClientRect().height,
          variantPadding: getComputedStyle(variant).padding,
          variantBefore: getComputedStyle(variant, "::before").content,
          barePadding: getComputedStyle(variantBare).padding,
          bareBefore: getComputedStyle(variantBare, "::before").content,
          header: { visibility: getComputedStyle(header).visibility, ...box(header) },
          headerBare: { visibility: getComputedStyle(headerBare).visibility, ...box(headerBare) },
          headline: { visibility: getComputedStyle(headline).visibility, order: getComputedStyle(headline).order, ...box(headline) },
          headlineBare: { visibility: getComputedStyle(headlineBare).visibility, order: getComputedStyle(headlineBare).order, ...box(headlineBare) },
          fab: box(fab),
          fabBare: box(fabBare),
        };
      });
      assert(before.root, "phase B hosts did not render the roots the page asked for");
      assert(before.padding !== "22px 16px 0px", `text field still has pre-upgrade padding (${before.padding})`);
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
      await p.addScriptTag({ url: "/elements.js", type: "module" });
      await p.waitForFunction(() => (window as unknown as { ready?: boolean }).ready === true && !document.querySelector("#stage :not(:defined)"));
      await p.waitForTimeout(300);
      await settle(p);
      const after = await p.evaluate(() => ({
        button: document.querySelector("m-button:not(#bare)")!.getBoundingClientRect().width,
        select: document.querySelector("m-select")!.getBoundingClientRect().width,
        background: getComputedStyle(document.querySelector("m-textfield")!).backgroundColor,
      }));
      assert(Math.abs(before.button - after.button) < 0.5, `button width ${before.button} before the script, ${after.button} after`);
      assert(Math.abs(before.select - after.select) < 0.5, `select width ${before.select} before the script, ${after.select} after`);
      assert.equal(before.background, after.background, "text field background changed when the script ran");
      console.log(`Phase B, stylesheet loaded, script held back: field padding ${before.padding}, button ${before.button.toFixed(1)}px, select ${before.select.toFixed(1)}px, bare ${before.bare.toFixed(1)}px, header ${before.header.visibility} ${before.header.h.toFixed(1)}px (bare ${before.headerBare.visibility} ${before.headerBare.h.toFixed(1)}px), headline ${before.headline.visibility} ${before.headline.h.toFixed(1)}px order ${before.headline.order} (bare ${before.headlineBare.visibility} ${before.headlineBare.h.toFixed(1)}px order ${before.headlineBare.order}), fab ${before.fab.w.toFixed(1)}×${before.fab.h.toFixed(1)} (bare ${before.fabBare.w.toFixed(1)}×${before.fabBare.h.toFixed(1)})`);
    } finally {
      await p.close();
    }
  }

  assert.deepEqual(failing.map((r) => r.name), [], "Cases that shift on upgrade");
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
