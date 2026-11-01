#!/usr/bin/env bun
// Pre-upgrade styles (ssr.md Phase A): no layout shift from the
// server's HTML to the upgraded element.
//
// Each case is the server-style HTML of one element (the host and its light
// DOM, as an adapter's server render emits it) with the base styles and
// `material/elements/preupgrade.css`. The host and its following siblings are
// measured in a document that has not defined the subject, then equivalent
// markup is measured in an upgraded document. Both documents are reused;
// separate registries preserve the before/after definition boundary.
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
import { chromium, type Frame, type Page } from "playwright";
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
  // The belt: the same toolbar with the marker stripped from the static
  // markup. Markup that reaches the browser without the marker by any path —
  // an adapter not yet writing it, hand-written HTML, a cached page from an
  // older server render — still pins under the default prefix, where the
  // sheet can spell the tag.
  renderElement("m-toolbar", { id: "beltshape", "aria-label": "Shapes" },
    `<m-icon-button id="beltpinned" toggle selected size="l" aria-label="P" icon="${pinIcon}"></m-icon-button>`).replaceAll(' data-mtrl-icon-button=""', ""),
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
      case "/fixture":
        return html(page("", true));
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
  /**
   * Where each host's label text is, relative to that host's border box. Set
   * for a button with an icon: the light-DOM text before upgrade, the label
   * element after. A trailing icon can move the label while the host's box
   * stays put, which the score cannot see.
   */
  labels: (Point | null)[];
}

/** A box relative to the host's border box. `y` is the top, `h` its height. */
interface Point {
  x: number;
  y: number;
  h: number;
}

type MeasurementPage = Page | Frame;

const settle = (p: MeasurementPage): Promise<unknown> =>
  p.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(Array.from(document.images, image => image.decode().catch(() => {})));
    // Let layout work queued by connectedCallback reach a frame, then await
    // finite transitions instead of sleeping through every case. Infinite
    // decorative animations (for example a progress indicator) never settle.
    for (;;) {
      for (let i = 0; i < 2; i++) await new Promise((r) => requestAnimationFrame(r));
      const animations = document.getAnimations().filter(animation =>
        (animation.playState === "running" || animation.pending) &&
        animation.effect?.getComputedTiming().endTime !== Infinity);
      if (!animations.length) break;
      await Promise.all(animations.map(animation => animation.finished.catch(() => {})));
    }
  });

const snapshot = (p: MeasurementPage, hosts: string, siblings: string): Promise<Snapshot> =>
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
        const boxes = [host, ...Array.from(host.shadowRoot?.children ?? [])].filter(inPage).map(box)
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
      // Before upgrade the label is the host's text. After upgrade it is the
      // label element (the part that holds the slot). The host's own box can
      // stay still while this point moves.
      const labelAt = (host: Element): Point | null => {
        if (host.localName !== "m-button" || !host.hasAttribute("icon")) return null;
        const origin = host.getBoundingClientRect();
        const place = (rect: DOMRect): Point => ({ x: rect.x - origin.x, y: rect.y - origin.y, h: rect.height });
        const painted = host.shadowRoot?.querySelector("[part~='label'], .mtrl-button__text");
        if (painted) return place(painted.getBoundingClientRect());
        const text = Array.from(host.childNodes).find(
          (node) => node.nodeType === 3 && (node.textContent ?? "").trim() !== "",
        );
        if (!text) return null;
        const range = document.createRange();
        range.selectNodeContents(text);
        return place(range.getBoundingClientRect());
      };
      const hostElements = Array.from(document.querySelectorAll(hostSelector));
      return {
        frame: box(document.getElementById("stage") as Element),
        hosts: hostElements.map(visual),
        siblings: Array.from(document.querySelectorAll(siblingSelector), box),
        labels: hostElements.map(labelAt),
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
  /** The host's own height the control fixes, whatever the page's typography. */
  hostHeight?: number;
  /** The button's own box, for the subject check. */
  subjectMove?: number;
  /** Label position relative to the host, when this row is a button with an icon. */
  labelBefore: Point | null;
  labelAfter: Point | null;
}

/** The vertical centre of a label box, relative to the host. */
const labelCentre = (point: Point): number => point.y + point.h / 2;

/** How far the label moved, in px. Null when the row has no icon label to compare. */
const labelShift = (before: Point | null, after: Point | null): number | null => {
  if (!before && !after) return null;
  if (!before || !after) return Number.POSITIVE_INFINITY;
  return Math.max(Math.abs(before.x - after.x), Math.abs(labelCentre(before) - labelCentre(after)));
};

const LABEL_THRESHOLD = 0.5;

const labelPlace = (result: Result): string => {
  const { labelBefore: before, labelAfter: after } = result;
  if (!before || !after) return "label was not measured";
  const dx = after.x - before.x;
  const dy = labelCentre(after) - labelCentre(before);
  return `label x ${before.x.toFixed(1)} -> ${after.x.toFixed(1)} (${dx.toFixed(1)}), centre y ${labelCentre(before).toFixed(1)} -> ${labelCentre(after).toFixed(1)} (${dy.toFixed(1)})`;
};

const measure = async (path: string, preupgrade: boolean, hosts: string, script: string, item?: PreupgradeCase): Promise<[Snapshot, Snapshot]> => {
  const p = await browser.newPage({ viewport: { width: (item?.width ?? STAGE_WIDTH) + 40, height: 800 } });
  const errors: string[] = [];
  p.on("pageerror", (error) => errors.push(error.message));
  try {
    await p.goto(`http://127.0.0.1:${server.port}${path}?pre=${preupgrade ? 1 : 0}`);
    await settle(p);
    if (item?.prepareNeighbors) {
      await p.evaluate(async (element) => {
        const css = "/dist/elements/css/index.js";
        const entry = "/dist/elements/index.js";
        await import(css);
        const elements = await import(entry);
        elements.defineButton();
        elements.defineTextField();
        if (element === "tabs") elements.defineSwitch();
      }, item.element);
      await settle(p);
    }
    const siblings = (item?.siblings ?? SIBLINGS).join(", ");
    const before = await snapshot(p, hosts, siblings);
    const anchor = async (selector?: string) => p.locator(hosts).evaluate((host, selector) => {
      const target = selector ? host.shadowRoot!.querySelector(selector)! : host;
      const r = target.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height, position: getComputedStyle(target).position };
    }, selector);
    const anchorBefore = preupgrade && item?.fixedAnchor ? await anchor() : undefined;
    await p.addScriptTag({ url: script, type: "module" });
    await p.waitForFunction(() => (window as unknown as { ready?: boolean }).ready === true);
    await p.waitForFunction(() => !document.querySelector("#stage :not(:defined)"));
    await settle(p);
    const after = await snapshot(p, hosts, siblings);
    if (anchorBefore && item?.fixedAnchor) {
      const anchorAfter = await anchor(item.fixedAnchor);
      assert.equal(anchorBefore.position, "fixed", `${item.variant}: pre-upgrade corner is fixed`);
      assert.equal(anchorAfter.position, "fixed", `${item.variant}: upgraded corner is fixed`);
      for (const key of ["x", "y", "width", "height"] as const) {
        assert(Math.abs(anchorBefore[key] - anchorAfter[key]) < MOVE_LIMIT,
          `${item.variant}: fixed ${key} moved from ${anchorBefore[key]} to ${anchorAfter[key]}`);
      }
    }
    assert.deepEqual(errors, [], `${path}: page errors`);
    return [before, after];
  } finally {
    await p.close();
  }
};

// Definitions cannot be removed from a CustomElementRegistry. Keep the plain
// pre-upgrade page undefined for its lifetime, and reuse already-defined post
// pages. Two isolated child registries serve the prepared-neighbour rows: one
// defines button/text-field, the other also switch. Neither defines a subject
// it measures, and those definitions cannot leak into the plain pre-page.
const POST_PAGES = 4;
let reusablePages: Promise<{ before: Page; after: Page[] }> | undefined;
let beforeTail: Promise<unknown> = Promise.resolve();
const beforeTurn = async <T>(read: () => Promise<T>): Promise<T> => {
  const previous = beforeTail;
  let release!: () => void;
  beforeTail = new Promise<void>(resolve => { release = resolve; });
  await previous;
  try { return await read(); } finally { release(); }
};

const pages = () => reusablePages ??= (async () => {
  const before = await browser.newPage();
  // This page (and its child frames) may load only the explicitly prepared
  // neighbours, never the define-all entry used by the upgraded pages.
  await before.route("**/elements.js", route => route.abort());
  await before.goto(`http://127.0.0.1:${server.port}/fixture`);
  await before.evaluate(() => {
    const root = document.createElement("div");
    root.id = "preupgrade-case";
    document.body.append(root);
  });
  const after = await Promise.all(Array.from({ length: POST_PAGES }, async () => {
    const p = await browser.newPage();
    await p.goto(`http://127.0.0.1:${server.port}/fixture`);
    await p.addScriptTag({ url: "/elements.js", type: "module" });
    await p.waitForFunction(() => (window as unknown as { ready?: boolean }).ready === true);
    return p;
  }));
  return { before, after };
})();

const reset = async (p: MeasurementPage, item: PreupgradeCase, preupgrade: boolean, keepFrames = false): Promise<void> => {
  const width = (item.width ?? STAGE_WIDTH) + 40;
  if ("viewportSize" in p && p.viewportSize()?.width !== width) await p.setViewportSize({ width, height: 800 });
  await p.evaluate(({ html, preupgrade, keepFrames }) => {
    const root = keepFrames ? document.getElementById("preupgrade-case")! : document.body;
    root.replaceChildren();
    if (keepFrames) {
      root.style.display = "";
      document.querySelectorAll<HTMLIFrameElement>("iframe").forEach(frame => { frame.style.display = "none"; });
    }
    document.body.removeAttribute("class");
    document.body.removeAttribute("style");
    document.documentElement.removeAttribute("dir");
    document.documentElement.style.cssText = "";
    document.documentElement.setAttribute("data-theme", "baseline");
    (document.querySelector('link[href="/preupgrade.css"]') as HTMLLinkElement).disabled = !preupgrade;
    root.innerHTML = html;
  }, { html: stage(item.html, item), preupgrade, keepFrames });
};

const preparedFrames = new Map<string, Frame>();
const preparedFrame = async (p: Page, item: PreupgradeCase, preupgrade: boolean): Promise<Frame> => {
  const key = item.element === "tabs" ? "tabs-neighbours" : "control-neighbours";
  let target = preparedFrames.get(key);
  if (!target) {
    await p.evaluate(key => new Promise<void>(resolve => {
      const frame = document.createElement("iframe");
      frame.id = key;
      frame.style.cssText = "position:fixed;left:0;top:0;border:0;height:800px";
      frame.onload = () => resolve();
      frame.src = "/fixture";
      document.body.append(frame);
    }), key);
    const handle = await p.locator(`#${key}`).elementHandle();
    try { target = (await handle!.contentFrame())!; } finally { await handle!.dispose(); }
    await target.evaluate(async (element) => {
      const css = "/dist/elements/css/index.js";
      const entry = "/dist/elements/index.js";
      await import(css);
      const elements = await import(entry);
      elements.defineButton();
      elements.defineTextField();
      if (element === "tabs") elements.defineSwitch();
    }, item.element);
    preparedFrames.set(key, target);
  }
  await p.evaluate(({ key, width }) => {
    document.getElementById("preupgrade-case")!.style.display = "none";
    const frame = document.getElementById(key) as HTMLIFrameElement;
    frame.style.width = `${width}px`;
    frame.style.display = "block";
  }, { key, width: (item.width ?? STAGE_WIDTH) + 40 });
  await reset(target, item, preupgrade);
  return target;
};

const measureReused = async (p: Page, item: PreupgradeCase, preupgrade: boolean): Promise<[Snapshot, Snapshot]> => {
  const pool = await pages();
  const hosts = item.host ?? "#stage > :first-child";
  const siblings = (item.siblings ?? SIBLINGS).join(", ");
  const errors: string[] = [];
  const onError = (error: Error) => { errors.push(error.message); };
  const anchor = (target: MeasurementPage, selector?: string) => target.locator(hosts).evaluate((host, selector) => {
    const element = selector ? host.shadowRoot!.querySelector(selector)! : host;
    const r = element.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height, position: getComputedStyle(element).position };
  }, selector);
  const prepared = await beforeTurn(async () => {
    const beforePage = pool.before;
    beforePage.on("pageerror", onError);
    try {
      await reset(beforePage, item, preupgrade, true);
      const target: MeasurementPage = item.prepareNeighbors
        ? await preparedFrame(beforePage, item, preupgrade) : beforePage;
      await settle(target);
      return {
        snapshot: await snapshot(target, hosts, siblings),
        anchor: preupgrade && item.fixedAnchor ? await anchor(target) : undefined,
      };
    } finally { beforePage.off("pageerror", onError); }
  });
  p.on("pageerror", onError);
  try {
    await reset(p, item, preupgrade);
    await p.waitForFunction(() => !document.querySelector("#stage :not(:defined)"));
    await settle(p);
    const after = await snapshot(p, hosts, siblings);
    if (prepared.anchor && item.fixedAnchor) {
      const anchorBefore = prepared.anchor;
      const anchorAfter = await anchor(p, item.fixedAnchor);
      assert.equal(anchorBefore.position, "fixed", `${item.variant}: pre-upgrade corner is fixed`);
      assert.equal(anchorAfter.position, "fixed", `${item.variant}: upgraded corner is fixed`);
      for (const key of ["x", "y", "width", "height"] as const) {
        assert(Math.abs(anchorBefore[key] - anchorAfter[key]) < MOVE_LIMIT,
          `${item.variant}: fixed ${key} moved from ${anchorBefore[key]} to ${anchorAfter[key]}`);
      }
    }
    assert.deepEqual(errors, [], `/${cases.indexOf(item)}: page errors`);
    return [prepared.snapshot, after];
  } finally { p.off("pageerror", onError); }
};

const runCases = async (preupgrade: boolean): Promise<Result[]> => {
  const pool = await pages();
  const selected = cases.filter(item =>
    (!only.length || only.includes(item.element)) &&
    // Preserve the existing mutation exclusion: absolute-height rows assert
    // the placeholder itself, not a no-styles comparison.
    (preupgrade || item.hostHeight === undefined));
  const results: Result[] = new Array(selected.length);
  let next = 0;
  await Promise.all(pool.after.map(async p => {
    for (;;) {
      const index = next++;
      if (index >= selected.length) return;
      const item = selected[index];
      const [before, after] = await measureReused(p, item, preupgrade);
      const moves = before.siblings.map((b, i) => ({ dx: after.siblings[i].x - b.x, dy: after.siblings[i].y - b.y }));
      const moved = moves.map(({ dx, dy }) => `${dx.toFixed(1)},${dy.toFixed(1)}`).join(" ");
      const box = shiftOf(before.hosts[0], after.hosts[0]);
      results[index] = {
        name: label(item), score: score(before, after), before: before.hosts[0], after: after.hosts[0],
        moved, moves, siblings: item.siblings, knownMoves: item.knownMoves,
        boxMove: item.strictBox ? box : undefined,
        hostHeight: preupgrade ? item.hostHeight : undefined,
        subjectMove: item.element === "button" ? box : undefined,
        labelBefore: before.labels[0] ?? null,
        labelAfter: after.labels[0] ?? null,
      };
    }
  }));
  return results;
};

const label = (item: PreupgradeCase): string => (item.variant === "default" ? item.element : `${item.element} [${item.variant}]`);
const size = (b: Box): string => `${b.w.toFixed(1)}x${b.h.toFixed(1)}`;

/** Print the rows; return the names that failed. Control rows (the mutation run without the
    pre-upgrade stylesheet) print "shift" instead of FAIL: their shifts are the expected proof
    that the stylesheet reserves each box, not gate failures. */
const report = (results: Result[], checkMoves: boolean, control = false): string[] => {
  const failed: string[] = [];
  for (const r of results) {
    const height = r.hostHeight === undefined ? ""
      : Math.abs(r.before.h - r.hostHeight) > MOVE_LIMIT || Math.abs(r.after.h - r.hostHeight) > MOVE_LIMIT
        ? `  (host is ${size(r.before)} before and ${size(r.after)} after; expected height ${r.hostHeight}px ± ${MOVE_LIMIT}px)`
        : "";
    const { mark, note } = height ? { mark: "FAIL" as const, note: height }
      : checkMoves && r.boxMove !== undefined && r.boxMove > MOVE_LIMIT
        ? { mark: "FAIL", note: `  (host moved or resized ${r.boxMove.toFixed(6)}px; over ${MOVE_LIMIT}px)` }
        : markOf(r, checkMoves);
    if (mark === "FAIL") failed.push(r.name);
    const shown = control && mark === "FAIL" ? "shift" : mark;
    const box = r.subjectMove !== undefined ? `  box shift ${r.subjectMove.toFixed(2)}px` : "";
    const at = r.labelBefore || r.labelAfter ? `  ${labelPlace(r)}` : "";
    console.log(`  ${shown.padEnd(5)} ${r.name.padEnd(34)} ${r.score.toFixed(4)}  ${size(r.before)} -> ${size(r.after)}  siblings moved ${r.moved}${note}${box}${at}`);
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

  // A trailing icon can leave the host's box in place while the label inside
  // it jumps: the placeholder sits on the leading side, the icon the upgrade
  // draws on the trailing one. The score above cannot see that, so the label
  // is compared on its own.
  const movedLabels = withStyles.filter((r) => {
    const shift = labelShift(r.labelBefore, r.labelAfter);
    return shift !== null && shift > LABEL_THRESHOLD;
  });
  if (movedLabels.length) console.log("\nButton labels that move on upgrade:");
  assert.deepEqual(
    movedLabels.map((r) => `${r.name}: ${labelPlace(r)}`),
    [],
    "Button labels that move on upgrade",
  );

  console.log("\nMutation: without the pre-upgrade styles (control rows, marked shift):");
  const without = await runCases(false);
  report(without, false, true);

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
      const region = (box: Box): Snapshot => ({ frame: buttonBox, hosts: [box], siblings: [], labels: [null] });
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
        const shapeBeltHost = document.getElementById("beltpinned")!;
        const shapeBelt = shapeBeltHost.shadowRoot!.querySelector(".mtrl-icon-button")!;
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
          shapeBelt: getComputedStyle(shapeBelt).borderTopLeftRadius,
          beltMarked: shapeBeltHost.hasAttribute("data-mtrl-icon-button"),
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
      // The belt: no marker in the markup, and the default tag pins anyway.
      assert.equal(before.beltMarked, false, "the belt host still carries a marker");
      assert.equal(before.shapeBelt, "48px", "marker-less markup is not pinned by the default tag before upgrade");
      await p.addScriptTag({ url: "/elements.js", type: "module" });
      await p.waitForFunction(() => (window as unknown as { ready?: boolean }).ready === true && !document.querySelector("#stage :not(:defined)"));
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
      console.log(`Phase B, stylesheet loaded, script held back: field padding ${before.padding}, button ${before.button.toFixed(1)}px, select ${before.select.toFixed(1)}px, bare ${before.bare.toFixed(1)}px, header ${before.header.visibility} ${before.header.h.toFixed(1)}px (bare ${before.headerBare.visibility} ${before.headerBare.h.toFixed(1)}px), headline ${before.headline.visibility} ${before.headline.h.toFixed(1)}px order ${before.headline.order} (bare ${before.headlineBare.visibility} ${before.headlineBare.h.toFixed(1)}px order ${before.headlineBare.order}), fab ${before.fab.w.toFixed(1)}×${before.fab.h.toFixed(1)} (bare ${before.fabBare.w.toFixed(1)}×${before.fabBare.h.toFixed(1)}), shape pin ${before.shapePinned}/${before.shapeX} (deep ${before.shapeDeep}, belt ${before.shapeBelt} without the marker)`);
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
