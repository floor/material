#!/usr/bin/env bun
// scripts/conformance/measure.ts
/**
 * The "ours" half of a conformance table: one Playwright harness that mounts a
 * component, applies a case (variant, size, state, density, zoom), and returns
 * the computed style and rects of the parts it names — so a component's own
 * script is only a list of cases.
 *
 * A case says what to mount (page-side, against the component's creators) and
 * which parts to read; the harness serves the built package from `dist/` when
 * there is one (`bun run build`), and otherwise bundles the component's source
 * so the same script runs before a build — the JSON says which it read.
 *
 *   import { createConformanceHarness } from "./measure";
 *
 *   const harness = await createConformanceHarness({ component: "button" });
 *   const rows = await harness.measure([
 *     {
 *       id: "filled/m/rest",
 *       mount: (mtrl, host) => {
 *         const button = mtrl.createButton({ label: "Label" });
 *         host.append(button.element);
 *       },
 *       parts: [{ name: "root", selector: ".mtrl-button" }, { name: "label", selector: "span" }],
 *     },
 *   ]);
 *   await harness.close();
 *
 * A press may paint two things: the `::before` state layer (hover's opacity)
 * and the ripple wave the press mounts (`.mtrl-ripple-wave`, the pressed
 * opacity). Read both when the table has a pressed row — the wave is where the
 * press opacity lives.
 *
 * Density is the stylesheet's `--mtrl-density` variable (0, -1, -2, -3): the
 * harness sets it on the mount root, as the pages do. Zoom is the document's
 * `zoom`, for the cases where the property is checked under a scaled preview.
 *
 *   bun run scripts/conformance/measure.ts button     # the worked example
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

import * as sass from "sass";
import { chromium, webkit, type Browser, type BrowserType, type Page } from "playwright";

import { directionArmsPrelude, sassOptions } from "../build-styles";

const root = resolve(import.meta.dir, "..", "..");

/** The computed properties a conformance row usually needs. */
export const CONFORMANCE_PROPERTIES = [
  "height", "width", "minHeight", "maxWidth",
  "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
  "gap", "columnGap", "rowGap",
  "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth",
  "borderTopColor", "borderTopLeftRadius", "borderTopRightRadius", "borderBottomRightRadius", "borderBottomLeftRadius",
  "backgroundColor", "color", "opacity", "boxShadow", "outlineStyle", "outlineWidth", "outlineColor", "outlineOffset",
  "fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing",
  "transform", "transition", "cursor",
  // A state layer or a focus ring lives on a pseudo-element: read its own box
  // and paint, not the host's.
  "content", "display", "insetTop", "insetRight", "insetBottom", "insetLeft",
] as const;

export type ConformanceProperty = (typeof CONFORMANCE_PROPERTIES)[number];

export type Part = {
  name: string;
  /** A selector inside the mount root; `>>>` steps into a shadow root. */
  selector: string;
  /** A portalled part within the current browser document. */
  document?: boolean;
  /** Read the element's own `::before` or `::after`, where state layers live. */
  pseudo?: "::before" | "::after" | "::placeholder" | "::backdrop";
};

export type State = "rest" | "hover" | "focus" | "pressed" | "disabled";

export type Case = {
  /** The row id the table uses, e.g. "filled/m/rest". */
  id: string;
  /**
   * Page-side: mount the component into `host` through the module namespace.
   * `config` is the case's own data, which crosses as JSON: a closure cannot.
   */
  mount: (mtrl: Record<string, (...args: never[]) => unknown>, host: HTMLElement, config?: unknown) => void;
  /** The case's data for `mount`. */
  config?: unknown;
  /** The parts to read, relative to the mount root. */
  parts: Part[];
  state?: State;
  /** Tab through intervening stops until this light-DOM selector owns focus. */
  focusTarget?: string;
  /** Real keyboard input applied after the mounted component settles. */
  keys?: string[];
  /** The stylesheet's `--mtrl-density`: 0, -1, -2 or -3. */
  density?: number;
  /** `documentElement.style.zoom` for a case that checks a scaled preview. */
  zoom?: number;
  /** The theme mode for the colour rows: `light` (default) or `dark`. */
  scheme?: "light" | "dark";
  /**
   * Milliseconds to wait after the mount before the state is applied, for a
   * component whose parts animate in (a list that reveals its items): a state
   * aimed at a part still at width 0 has nowhere to land.
   */
  before?: number;
  /** Properties to read in place of the default set. */
  properties?: readonly string[];
};

export type PartResult = {
  rect: { x: number; y: number; width: number; height: number };
  style: Record<string, string>;
};

export type CaseResult = {
  id: string;
  state: State;
  density: number;
  zoom: number;
  parts: Record<string, PartResult | null>;
};

export type Harness = {
  source: "dist" | "src";
  url: string;
  measure: (cases: Case[]) => Promise<CaseResult[]>;
  /** A raw page for a measurement the case shape does not cover. */
  page: Page;
  close: () => Promise<void>;
};

/**
 * Fail loudly on a fixture that did not mount what a row names: every part a
 * case asked for must be found, and its box must have a size. A null part or
 * a zero box is a broken mount or a wrong selector, never a conformance
 * result, so the table is never written from one.
 */
export const assertFixture = (rows: CaseResult[]): void => {
  for (const row of rows) {
    for (const [name, part] of Object.entries(row.parts)) {
      if (!part) throw new Error(`${row.id}: part ${JSON.stringify(name)} was not found`);
      if (!(part.rect.width > 0 && part.rect.height > 0)) {
        throw new Error(`${row.id}: part ${JSON.stringify(name)} has no box (${part.rect.width}×${part.rect.height})`);
      }
    }
  }
};

export type HarnessOptions = {
  /** The `src/components/<name>` folder and the `dist/components/<name>` entry. */
  component: string;
  /** Load the package entry when a case composes factories from several subpaths. */
  packageEntry?: boolean;
  /** `chromium` (default), `webkit`, or both through `engines`. */
  engine?: "chromium" | "webkit";
  /** Read every engine and return the rows of each, one block per engine. */
  engines?: ("chromium" | "webkit")[];
  /** The viewport, 900×600 by default: enough for a dialog or a menu. */
  viewport?: { width: number; height: number };
};


/** `dist/components/<name>/index.js` when it exists, else a bundle of the source. */
const loadEntry = async (options: HarnessOptions): Promise<{ source: "dist" | "src"; code: string }> => {
  const folder = options.packageEntry ? [] : ["components", options.component];
  const built = join(root, "dist", ...folder, "index.js");
  const source = existsSync(built) && statSync(built).size > 0 ? "dist" : "src";
  const entry = source === "dist" ? built : resolve(root, "src", ...folder, "index.ts");
  const bundle = await Bun.build({ entrypoints: [entry], target: "browser", format: "esm", minify: true });
  if (!bundle.success) throw new Error(`bundling ${options.component}: ${bundle.logs.join("\n")}`);
  return { source, code: await bundle.outputs[0]!.text() };
};

/** The stylesheet the component draws with: the built one, else a compiled source sheet. */
const loadStyles = (): string => {
  const built = join(root, "dist", "styles.css");
  if (existsSync(built)) return readFileSync(built, "utf8");
  return sass.compileString(directionArmsPrelude() + readFileSync(join(root, "src/styles/main.scss"), "utf8"), sassOptions()).css;
};

/** The page: one mount root, the component's namespace on `window`. */
const PAGE = `<!doctype html><html data-theme="baseline"><head>
<link rel="stylesheet" href="/__styles.css">
<style>body{margin:0;padding:24px;font-family:sans-serif}#mount{display:inline-block}</style></head>
<body><div id="mount"></div>
<script type="module">
  const module = await import("/__component.js");
  window.mtrl = module.default && typeof module.default === "object" ? { ...module, ...module.default } : { ...module };
  window.__ready = true;
</script></body></html>`;

const serve = () =>
  Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch(request) {
      const path = new URL(request.url).pathname;
      if (path === "/__styles.css") return new Response(loadStyles(), { headers: { "Content-Type": "text/css" } });
      if (path === "/__component.js") return new Response(entryCode, { headers: { "Content-Type": "text/javascript" } });
      return new Response(PAGE, { headers: { "Content-Type": "text/html" } });
    },
  });

let entryCode = "";

const applyState = async (page: Page, selector: string, state: State, focusTarget?: string) => {
  if (state === "hover") await page.hover(selector);
  else if (state === "focus") {
    // A programmatic focus does not match `:focus-visible`: the ring is read
    // from a real tab stop, so the keyboard moves it there.
    // An open modal can already own focus. Keep its entry stop so the
    // fixture exercises natural Tab movement inside it.
    if (!focusTarget) await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.());
    const isWebKit = page.context().browser()?.browserType().name() === "webkit";
    for (let attempt = 0; attempt < 12; attempt++) {
      // WebKit on macOS can skip links and buttons on unmodified Tab.
      // The alternate sequence also lets custom focus traps see plain Tab.
      const alternate = focusTarget ? attempt >= 6 : attempt < 6;
      await page.keyboard.press(isWebKit && alternate ? "Alt+Tab" : "Tab");
      // Default to the first stop inside the mount. A fixture can name its target.
      const inside = await page.evaluate((target) => {
        const host = document.querySelector("#mount");
        const active = document.activeElement;
        return !!active && (target ? active.matches(target) : !!host && host.contains(active));
      }, focusTarget);
      if (inside) break;
    }
  }
  else if (state === "disabled") {
    // The case's mount built it disabled; the state names the row.
  } else if (state === "pressed") {
    const box = await page.locator(selector).first().boundingBox();
    if (!box) throw new Error(`pressed: ${selector} has no box`);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
  }
};

const releaseState = async (page: Page, state: State) => {
  if (state === "pressed") await page.mouse.up();
  if (state !== "rest") await page.mouse.move(0, 0);
};

/**
 * Boot one harness: a page that imports the component, and a `measure` that
 * runs the cases. The caller closes it.
 */
export const createConformanceHarness = async (options: HarnessOptions): Promise<Harness> => {
  const entry = await loadEntry(options);
  entryCode = entry.code;
  const server = serve();
  const url = `http://127.0.0.1:${server.port}`;
  const engines: BrowserType[] = (options.engines ?? [options.engine ?? "chromium"]).map((engine) =>
    engine === "webkit" ? webkit : chromium,
  );
  const browsers: Browser[] = [];
  const pages: Page[] = [];
  for (const engine of engines) {
    const browser = await engine.launch({ headless: true });
    browsers.push(browser);
    const page = await browser.newPage({ viewport: options.viewport ?? { width: 900, height: 600 } });
    await page.goto(url);
    await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true);
    pages.push(page);
  }

  const measureOn = async (page: Page, cases: Case[]): Promise<CaseResult[]> => {
    const rows: CaseResult[] = [];
    for (const testCase of cases) {
      const state = testCase.state ?? "rest";
      // The mount is a function, so it crosses as source and is rebuilt
      // inside the page, where the module namespace lives.
      await page.evaluate(
        async ({ mountSource, mountConfig, density, zoom, scheme }) => {
          const host = document.querySelector<HTMLElement>("#mount")!;
          host.replaceChildren();
          document.documentElement.style.zoom = String(zoom);
          document.documentElement.setAttribute("data-theme-mode", scheme);
          if (density === null) document.documentElement.style.removeProperty("--mtrl-density");
          else document.documentElement.style.setProperty("--mtrl-density", String(density));
          const mtrl = (window as unknown as { mtrl: Record<string, (...args: never[]) => unknown> }).mtrl;
          const mount = new Function("mtrl", "host", "config", `return (${mountSource})(mtrl, host, config);`) as (
            mtrl: unknown,
            host: HTMLElement,
            config: unknown,
          ) => void;
          mount(mtrl, host, mountConfig);
          // A mount that returns before its layout settles (a font, an image,
          // a transition's first frame) gets two frames to commit.
          await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
        },
        {
          mountSource: testCase.mount.toString(),
          mountConfig: testCase.config ?? null,
          density: testCase.density ?? null,
          zoom: testCase.zoom ?? 1,
          scheme: testCase.scheme ?? "light",
        },
      );
      if (testCase.before) await page.waitForTimeout(testCase.before);
      for (const key of testCase.keys ?? []) await page.keyboard.press(key);
      // The state is applied from the outside: Playwright's pointer and focus,
      // not a simulated class.
      try {
        await applyState(page, testCase.parts[0]!.selector, state, testCase.focusTarget);
      } catch {
        // A part that cannot take the state is read at rest.
      }
      // A state that runs a spring settles before it is read: the conformance
      // value is the resting one, not a frame of the transition.
      await page.waitForTimeout(500);
      const parts = await page.evaluate(
        ({ parts, properties }) => {
          const root = document.querySelector<HTMLElement>("#mount")!;
          // `a >>> b` enters a's shadow root for b, then b's for the next.
          const resolve = (selector: string, documentScope = false): HTMLElement | null => {
            if (selector === ":root") return root;
            let scope: ParentNode = documentScope ? document : root;
            let found: Element | null = null;
            for (const step of selector.split(">>>").map((part) => part.trim())) {
              found = scope.querySelector(step);
              if (!found) return null;
              scope = found.shadowRoot ?? found;
            }
            return found as HTMLElement | null;
          };
          const result: Record<string, unknown> = {};
          for (const part of parts) {
            const element = resolve(part.selector, part.document);
            if (!element) {
              result[part.name] = null;
              continue;
            }
            const rect = element.getBoundingClientRect();
            // A pseudo-element has no rect of its own through the DOM: its
            // inset is read as the style, and its box is the host's.
            const computed = getComputedStyle(element, part.pseudo ?? undefined);
            const style: Record<string, string> = {};
            for (const property of properties) {
              style[property] = computed.getPropertyValue(property) || computed[property as keyof CSSStyleDeclaration]?.toString() || "";
            }
            result[part.name] = { rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }, style };
          }
          return result;
        },
        { parts: testCase.parts, properties: testCase.properties ?? [...CONFORMANCE_PROPERTIES] as string[] },
      );
      await releaseState(page, state);
      rows.push({
        id: testCase.id,
        state,
        density: testCase.density ?? 0,
        zoom: testCase.zoom ?? 1,
        parts: parts as CaseResult["parts"],
      });
    }
    return rows;
  };

  return {
    source: entry.source,
    url,
    page: pages[0]!,
    measure: async (cases: Case[]): Promise<CaseResult[]> => {
      const all: CaseResult[] = [];
      for (const page of pages) all.push(...(await measureOn(page, cases)));
      return all;
    },
    close: async () => {
      for (const browser of browsers) await browser.close();
      server.stop(true);
    },
  };
};

// ── The worked example: `bun run scripts/conformance/measure.ts button` ──

if (import.meta.main) {
  const component = process.argv[2] ?? "button";
  const harness = await createConformanceHarness({ component, engines: ["chromium"] });
  const cases: Case[] = [
    {
      id: "filled/m/rest",
      mount: (mtrl, host) => {
        const create = mtrl.createButton as unknown as (config: Record<string, unknown>) => { element: HTMLElement };
        const button = create({ label: "Label" });
        // The factory's `label` is the accessible name; the visible text is
        // the button's content.
        button.element.append(Object.assign(document.createElement("span"), { textContent: "Label" }));
        host.append(button.element);
      },
      parts: [
        { name: "root", selector: ".mtrl-button" },
        { name: "label", selector: "span" },
      ],
    },
    {
      id: "filled/m/hover",
      state: "hover",
      mount: (mtrl, host) => {
        const create = mtrl.createButton as unknown as (config: Record<string, unknown>) => { element: HTMLElement };
        const button = create({ label: "Label" });
        // The factory's `label` is the accessible name; the visible text is
        // the button's content.
        button.element.append(Object.assign(document.createElement("span"), { textContent: "Label" }));
        host.append(button.element);
      },
      parts: [{ name: "root", selector: ".mtrl-button" }, { name: "label", selector: "span" }],
    },
    {
      id: "filled/m/state layer (::before)",
      state: "hover",
      mount: (mtrl, host) => {
        const create = mtrl.createButton as unknown as (config: Record<string, unknown>) => { element: HTMLElement };
        const button = create({ label: "Label" });
        button.element.append(Object.assign(document.createElement("span"), { textContent: "Label" }));
        host.append(button.element);
      },
      parts: [{ name: "state layer", selector: ".mtrl-button", pseudo: "::before" }],
    },
    {
      id: "filled/m/dark",
      scheme: "dark",
      mount: (mtrl, host) => {
        const create = mtrl.createButton as unknown as (config: Record<string, unknown>) => { element: HTMLElement };
        const button = create({ label: "Label" });
        button.element.append(Object.assign(document.createElement("span"), { textContent: "Label" }));
        host.append(button.element);
      },
      parts: [{ name: "root", selector: ".mtrl-button" }, { name: "label", selector: "span" }],
    },
    {
      id: "filled/m/disabled",
      state: "disabled",
      mount: (mtrl, host) => {
        const create = mtrl.createButton as unknown as (config: Record<string, unknown>) => { element: HTMLElement };
        const button = create({ label: "Label", disabled: true });
        button.element.append(Object.assign(document.createElement("span"), { textContent: "Label" }));
        host.append(button.element);
      },
      parts: [{ name: "root", selector: ".mtrl-button" }, { name: "label", selector: "span" }],
    },
    {
      id: "filled/m/density -2",
      density: -2,
      mount: (mtrl, host) => {
        const create = mtrl.createButton as unknown as (config: Record<string, unknown>) => { element: HTMLElement };
        const button = create({ label: "Label" });
        // The factory's `label` is the accessible name; the visible text is
        // the button's content.
        button.element.append(Object.assign(document.createElement("span"), { textContent: "Label" }));
        host.append(button.element);
      },
      parts: [{ name: "root", selector: ".mtrl-button" }],
    },
  ];
  const rows = await harness.measure(cases);
  console.log(JSON.stringify({ component, source: harness.source, rows }, null, 2));
  await harness.close();
}
