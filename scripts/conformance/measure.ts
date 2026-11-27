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
import { settle } from "../browser-settle";
import { THEME_ROLES } from "../../src/core/theme/tokens";
import { matrixSeed, parseColour, type ThemePalettes } from "./matrix-colours";
import { pascal, shapeOverrides, typographyRoles, type TypographyDetails } from "./matrix-metrics";

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
  /** Include occupied, near-opaque regions of the canvas bitmap in CSS pixels. */
  bitmap?: boolean;
};

export type State = "rest" | "hover" | "focus" | "pressed" | "disabled" | "dragged";

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
  viewport?: { width: number; height: number };
  /** The theme mode for the colour rows: `light` (default) or `dark`. */
  scheme?: "light" | "dark";
  /**
   * Milliseconds to wait after the mount before the state is applied, for a
   * component whose parts animate in (a list that reveals its items): a state
   * aimed at a part still at width 0 has nowhere to land.
   */
  before?: number;
  /** Wait for CSS transitions on the first part before reading its settled state. */
  settleTransitions?: boolean;
  /** Properties to read in place of the default set. */
  properties?: readonly string[];
};

type Paint = {
  pixels: number;
  bounds: [number, number, number, number];
  radius: number;
  verticalTravel: number;
  centerRuns: [number, number][];
};

export type PartResult = {
  rect: { x: number; y: number; width: number; height: number };
  style: Record<string, string>;
  bitmap?: { width: number; height: number; colours: Record<string, Paint> };
};

export type CaseResult = {
  id: string;
  state: State;
  density: number;
  zoom: number;
  parts: Record<string, PartResult | null>;
  themes?: {
    palettes: ThemePalettes;
    light: CaseResult["parts"];
    dark: CaseResult["parts"];
    seed: CaseResult["parts"];
  };
  metrics?: {
    compact: CaseResult["parts"];
    shapeProfile: CaseResult["parts"];
    typography: Record<string, TypographyDetails>;
  };
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

/** Common CLI options. The positional filter remains supported for direct runs. */
export const fixtureEngine = (): "chromium" | "webkit" =>
  process.argv.includes("--webkit") ? "webkit" : "chromium";

export const selectFixtureCases = <T extends { id: string }>(cases: T[]): T[] => {
  const args = process.argv.slice(2);
  const exact = args.find(arg => arg.startsWith("--cases="));
  if (exact) {
    const ids = new Set<string>(JSON.parse(exact.slice("--cases=".length)));
    const selected = cases.filter(row => ids.has(row.id));
    for (const row of selected) ids.delete(row.id);
    if (ids.size || !selected.length) throw new Error(`Missing fixture cases: ${JSON.stringify([...ids])}`);
    return selected;
  }
  const flag = args.find(arg => arg.startsWith("--case="));
  const filter = flag ? flag.slice("--case=".length) : args.find(arg => !arg.startsWith("--"));
  const selected = filter === undefined ? cases : cases.filter(row => filter && row.id.includes(filter));
  if (!selected.length) throw new Error(filter ? `No case matches ${JSON.stringify(filter)}` : "No fixture cases selected");
  return selected;
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

const serve = (entryCode: string, themeCode: string | undefined) =>
  Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch(request) {
      const path = new URL(request.url).pathname;
      if (path === "/__styles.css") return new Response(loadStyles(), { headers: { "Content-Type": "text/css" } });
      if (path === "/__component.js") return new Response(entryCode, { headers: { "Content-Type": "text/javascript" } });
      if (path === "/__theme.js" && themeCode) return new Response(themeCode, { headers: { "Content-Type": "text/javascript" } });
      return new Response(PAGE, { headers: { "Content-Type": "text/html" } });
    },
  });

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
  } else if (state === "pressed" || state === "dragged") {
    const box = await page.locator(selector).first().boundingBox();
    if (!box) throw new Error(`${state}: ${selector} has no box`);
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    // A native drag starts only after the pointer moves past the platform
    // threshold. The button stays down through the read; release ends it.
    if (state === "dragged") await page.mouse.move(x + 40, y + 40, { steps: 10 });
  }
};

const releaseState = async (page: Page, state: State) => {
  if (state === "pressed" || state === "dragged") await page.mouse.up();
  if (state !== "rest") await page.mouse.move(0, 0);
};

/**
 * Boot one harness: a page that imports the component, and a `measure` that
 * runs the cases. The caller closes it.
 */
export const createConformanceHarness = async (options: HarnessOptions): Promise<Harness> => {
  const entry = await loadEntry(options);
  const selectedCases = (flag: string) => {
    const arg = process.argv.find(arg => arg.startsWith(flag));
    return new Set<string>(arg ? JSON.parse(arg.slice(flag.length)) : []);
  };
  const themeCases = selectedCases("--theme-cases=");
  const metricCases = selectedCases("--metric-cases=");
  let themeCode: string | undefined;
  if (themeCases.size) {
    const bundle = await Bun.build({ entrypoints: [join(root, "dist", "theme", "index.js")], target: "browser", format: "esm" });
    if (!bundle.success) throw new Error(`bundling the runtime theme: ${bundle.logs.join("\n")}`);
    themeCode = await bundle.outputs[0]!.text();
  }
  const server = serve(entry.code, themeCode);
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

  const measureOn = async (page: Page, cases: Case[], scheme?: "light" | "dark", densityOverride?: number, themeLabel?: string): Promise<CaseResult[]> => {
    const rows: CaseResult[] = [];
    const defaultViewport = page.viewportSize()!;
    for (const testCase of cases) {
      const viewport = testCase.viewport ?? defaultViewport;
      const currentViewport = page.viewportSize();
      if (currentViewport?.width !== viewport.width || currentViewport.height !== viewport.height) {
        await page.setViewportSize(viewport);
      }
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
          density: densityOverride ?? testCase.density ?? null,
          zoom: testCase.zoom ?? 1,
          scheme: scheme ?? testCase.scheme ?? "light",
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
      // A keyboard state lands after its key: a menu's ArrowDown opens the menu
      // and moves focus to its first item a frame or more later, and a read
      // taken at the first quiet frame sees an unfocused item -- in WebKit on a
      // cold page that was an `outline-style: none` ring in the seed theme,
      // which resolved to transparent (#00000000). The case's own state
      // selector is the contract that the state landed; wait for it before
      // settling, so the read is of the state the case names.
      const verified = testCase.parts.find((part) => part.name === "verifiedState");
      if (verified) {
        // The same resolver and scope the read uses: the part's document flag,
        // and `>>>` crossing into a shadow root.
        const landed = await page.waitForFunction(
          ({ selector, documentScope }) => {
            const mount = document.querySelector("#mount");
            if (!mount) return false;
            if (selector === ":root") return true;
            let scope: ParentNode = documentScope ? document : mount;
            let found: Element | null = null;
            for (const step of selector.split(">>>").map((entry) => entry.trim())) {
              found = scope.querySelector(step);
              if (!found) return false;
              scope = found.shadowRoot ?? found;
            }
            return found !== null;
          },
          { selector: verified.selector, documentScope: verified.document ?? false },
          { timeout: 5000, polling: 100 },
        ).catch(() => null);
        if (!landed) {
          const theme = themeLabel ?? testCase.scheme ?? "light";
          throw new Error(`${testCase.id} (${theme}): the verified state never landed: no element matches ${verified.selector}`);
        }
      }
      // Settle running animations, including a colour transition that starts on
      // a later frame, then the scrollers and the measured parts. Indefinite
      // loading indicators redraw their canvas on every frame and are excluded
      // from the frame-to-frame bitmap stability poll.
      const readParts = (excludeIndefinite = false) => page.evaluate(
        ({ parts, properties, excludeIndefinite }) => {
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
          function readBitmap(canvas: HTMLCanvasElement, box: DOMRect): PartResult["bitmap"] {
            const { width, height } = canvas;
            const ctx = canvas.getContext("2d");
            if (!ctx || !width || !height || !box.width || !box.height) return undefined;
            const data = ctx.getImageData(0, 0, width, height).data;
            const scaleX = box.width / width;
            const scaleY = box.height / height;
            const colours = new Map<number, Paint & { columns: Map<number, [number, number]> }>();
            for (let y = 0; y < height; y++) {
              for (let x = 0; x < width; x++) {
                const i = (y * width + x) * 4;
                if (data[i + 3]! < 230) continue;
                const key = data[i]! * 65536 + data[i + 1]! * 256 + data[i + 2]!;
                let c = colours.get(key);
                if (!c) {
                  c = { pixels: 0, bounds: [x, y, x + 1, y + 1], radius: 0, verticalTravel: 0, centerRuns: [], columns: new Map() };
                  colours.set(key, c);
                }
                c.pixels++;
                c.bounds[0] = Math.min(x, c.bounds[0]);
                c.bounds[1] = Math.min(y, c.bounds[1]);
                c.bounds[2] = Math.max(x + 1, c.bounds[2]);
                c.bounds[3] = Math.max(y + 1, c.bounds[3]);
                c.radius = Math.max(c.radius, Math.hypot((x + .5 - width / 2) * scaleX, (y + .5 - height / 2) * scaleY));
                const column = c.columns.get(x);
                if (column) column[1] = y;
                else c.columns.set(x, [y, y]);
                if (y === Math.floor(height / 2)) {
                  const last = c.centerRuns.at(-1);
                  if (last && last[1] === x) last[1]++;
                  else c.centerRuns.push([x, x + 1]);
                }
              }
            }
            const paint: Record<string, Paint> = {};
            for (const [key, c] of colours) {
              if (c.pixels < 4) continue;
              const centres = [...c.columns.values()].map(([a, b]) => (a + b) / 2);
              paint[`#${key.toString(16).padStart(6, "0").toUpperCase()}`] = {
                pixels: c.pixels,
                bounds: [c.bounds[0] * scaleX, c.bounds[1] * scaleY, c.bounds[2] * scaleX, c.bounds[3] * scaleY],
                radius: c.radius,
                verticalTravel: (Math.max(...centres) - Math.min(...centres)) * scaleY,
                centerRuns: c.centerRuns.map(([a, b]) => [a * scaleX, b * scaleX]),
              };
            }
            return { width, height, colours: paint };
          }
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
            const isIndefinite = excludeIndefinite && !!element.closest(".mtrl-loading-indicator:not(.mtrl-loading-indicator--determinate)");
            const bitmap = !isIndefinite && part.bitmap && element instanceof HTMLCanvasElement ? readBitmap(element, rect) : undefined;
            result[part.name] = { rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }, style, bitmap };
          }
          return result;
        },
        { parts: testCase.parts, properties: testCase.properties ?? [...CONFORMANCE_PROPERTIES] as string[], excludeIndefinite },
      );
      const isIndefiniteLoading = options.component === "loading-indicator" && testCase.id.includes("indeterminate");
      if (!isIndefiniteLoading) {
        await settle(page, { read: () => readParts(true) });
      } else {
        await settle(page);
      }
      const parts = await readParts(false);
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

  async function readTheme(
    browser: Browser, viewport: { width: number; height: number }, cases: Case[],
    theme: "dark" | "seed" | "compact" | "shapeProfile",
  ) {
    const page = await browser.newPage({ viewport });
    try {
      await page.goto(url);
      await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true);
      const palette = async () => {
        const values = await page.evaluate(roles => {
          const style = getComputedStyle(document.documentElement);
          return roles.map(role => style.getPropertyValue(`--mtrl-sys-color-${role}`).trim());
        }, THEME_ROLES);
        return Object.fromEntries(THEME_ROLES.map((key, index) => [
          pascal(key),
          parseColour(values[index]!).hex,
        ]));
      };
      const light = await palette();
      if (theme === "seed") {
        await page.evaluate(async seed => {
          const path = "/__theme.js";
          const { applyScheme, createScheme } = await import(path);
          applyScheme(createScheme(seed), document.documentElement);
        }, matrixSeed);
      } else if (theme === "shapeProfile") {
        await page.evaluate(overrides => {
          for (const [property, value] of Object.entries(overrides)) document.documentElement.style.setProperty(property, value);
        }, shapeOverrides);
      }
      const rows = await measureOn(page, cases, theme === "dark" ? "dark" : "light", theme === "compact" ? -2 : undefined, theme);
      const typography = theme === "compact" ? await page.evaluate(roles => {
        const style = getComputedStyle(document.documentElement);
        return roles.map(role => {
          const value = (key: string) => style.getPropertyValue(`--mtrl-sys-typescale-${role}-${key}`).trim();
          return { size: value("font-size"), weight: value("font-weight"), lineHeight: value("line-height"), tracking: value("letter-spacing") };
        });
      }, typographyRoles) : [];
      return {
        light, palette: await palette(), rows,
        typography: Object.fromEntries(typography.map((metrics, i) => [pascal(typographyRoles[i]!), metrics])),
      };
    } finally {
      await page.close();
    }
  }

  return {
    source: entry.source,
    url,
    page: pages[0]!,
    measure: async (cases: Case[]): Promise<CaseResult[]> => {
      const all: CaseResult[] = [];
      const selected = cases.filter(testCase => themeCases.has(testCase.id));
      const metrics = selected.filter(testCase => metricCases.has(testCase.id));
      for (const [index, page] of pages.entries()) {
        if (!selected.length) {
          all.push(...await measureOn(page, cases));
          continue;
        }
        if (selected.some(testCase => testCase.scheme === "dark")) {
          throw new Error("Three-theme cases must start in the baseline light theme");
        }
        const viewport = page.viewportSize()!;
        const browser = browsers[index]!;
        const [rows, dark, seed, compact, shape] = await Promise.all([
          measureOn(page, cases),
          readTheme(browser, viewport, selected, "dark"),
          readTheme(browser, viewport, selected, "seed"),
          metrics.length ? readTheme(browser, viewport, metrics, "compact") : undefined,
          metrics.length ? readTheme(browser, viewport, metrics, "shapeProfile") : undefined,
        ]);
        const palettes = { light: dark.light, dark: dark.palette, seed: seed.palette };
        const byId = new Map(rows.map(row => [row.id, row]));
        for (const [i, testCase] of selected.entries()) {
          const row = byId.get(testCase.id)!;
          row.themes = { palettes, light: row.parts, dark: dark.rows[i]!.parts, seed: seed.rows[i]!.parts };
        }
        if (compact && shape) for (const [i, testCase] of metrics.entries()) {
          byId.get(testCase.id)!.metrics = {
            compact: compact.rows[i]!.parts, shapeProfile: shape.rows[i]!.parts, typography: compact.typography,
          };
        }
        all.push(...rows);
      }
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
  const harness = await createConformanceHarness({ component, engine: fixtureEngine() });
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
