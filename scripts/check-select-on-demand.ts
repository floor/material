#!/usr/bin/env bun
/**
 * Select loads its menu on first open.
 *
 * The menu is most of what a select costs, so it is a chunk of its own, loaded
 * by the first open — or by the focus and the pointer that precede it. Two
 * things keep that true: the build's chunk graph (no chunk that holds a menu
 * module other than menu/inner and menu/on-demand is reachable from the entry
 * through static imports) and the browser (the menu's chunk is not fetched
 * before the select is used).
 *
 * The select's own contract is not deferred. The combobox's ARIA is there at
 * creation, the open answers on the key's or the press's tick, and the
 * listbox's active option and aria-controls are placed against the real
 * listbox when the chunk arrives. A key pressed on a closed select whose chunk
 * is still in flight is answered the same as one pressed on a loaded menu:
 * ArrowDown opens with the first option active, and typing moves to the
 * matching option (WAI-ARIA Authoring Practices, "Select-Only Combobox").
 */
import assert from "node:assert/strict";
import { mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

import { webkit, type Browser, type Page } from "playwright";
import * as sass from "sass";

import { launchChromium } from "./browser-profile";
import { settle } from "./browser-settle";
import { directionArmsPrelude, sassOptions } from "./build-styles";
import type createSelect from "../src/components/select";

const root = resolve(import.meta.dir, "..");
const scratch = join(root, "tmp", "check-select-on-demand");

interface MetaOutput {
  readonly bytes: number;
  readonly entryPoint?: string;
  readonly imports?: readonly { readonly path: string; readonly kind: string; readonly external?: boolean }[];
  readonly inputs: Record<string, { readonly bytesInOutput: number }>;
}

interface MenuHandle {
  isOpen(): boolean;
  open(): unknown;
  readonly element: HTMLElement;
  on(event: string, handler: () => void): unknown;
}

type SelectWindow = Window & {
  createSelect: typeof createSelect;
  select: ReturnType<typeof createSelect>;
};

const fileOf = (key: string): string => key.replace(/^\.\//, "");
const normalized = (path: string): string => (path.startsWith("./") ? path : `./${path}`);
const fetched = (): string[] =>
  performance.getEntriesByType("resource").map((entry) => new URL(entry.name).pathname);

rmSync(scratch, { recursive: true, force: true });
mkdirSync(scratch, { recursive: true });

// The installed bun-types declare neither `metafile` in BuildConfig nor the
// field it comes back in; Bun 1.4.2 has both. The cast is that gap, nothing else.
const build = (await Bun.build({
  entrypoints: [join(root, "src/components/select/index.ts")],
  outdir: scratch,
  minify: true,
  splitting: true,
  target: "browser",
  format: "esm",
  define: { "process.env.NODE_ENV": '"production"' },
  metafile: true,
} as unknown as Parameters<typeof Bun.build>[0])) as unknown as {
  readonly success: boolean;
  readonly logs: readonly unknown[];
  readonly metafile: unknown;
};
assert(build.success, String(build.logs));
const metafile = (typeof build.metafile === "string" ? JSON.parse(build.metafile) : build.metafile) as {
  outputs: Record<string, MetaOutput>;
};
const outputs = metafile.outputs;

const entry = Object.keys(outputs).find((key) => outputs[key]!.entryPoint !== undefined);
assert(entry, "the build produced no entry chunk");

// Everything the entry chunk reaches through static imports is its initial graph.
const initial = new Set<string>();
const visit = (key: string): void => {
  if (initial.has(key)) return;
  initial.add(key);
  for (const imp of outputs[key]?.imports ?? []) {
    if (imp.external) continue;
    const target = normalized(imp.path);
    if (!outputs[target] || imp.kind === "dynamic-import") continue;
    visit(target);
  }
};
visit(entry);

// A chunk holds the menu when one of its modules is the menu's own code: the
// inner symbol module stays initial, and so does the stand-in that answers the
// menu's API until the chunk arrives.
const isMenuModule = (path: string): boolean =>
  /(^|\/)components\/menu\//.test(path) &&
  !/(^|\/)components\/menu\/(inner|on-demand)\.ts$/.test(path);
const menuChunks = Object.keys(outputs).filter((key) =>
  Object.keys(outputs[key]!.inputs).some(isMenuModule)
);
assert(menuChunks.length > 0, "no chunk holds the menu: the select no longer ships one");
const leaked = menuChunks.filter((key) => initial.has(key)).map(fileOf);
assert.deepEqual(
  leaked,
  [],
  `the menu is in select's initial graph (chunk ${leaked.join(", ")})`
);
const controller = Object.keys(outputs).find((key) =>
  Object.keys(outputs[key]!.inputs).some((input) => /components\/menu\/features\/controller\.ts$/.test(input))
);
assert(controller, "no chunk holds the menu controller");
const menuChunk = fileOf(controller);

console.log(`Select's initial graph: ${[...initial].map(fileOf).join(", ")}`);
console.log(`The menu is its own chunk: ${menuChunk}`);

const files = new Map<string, string>();
for (const name of readdirSync(scratch)) {
  if (name.endsWith(".js")) files.set(name, readFileSync(join(scratch, name), "utf8"));
}
const entryFile = fileOf(entry);
assert(files.has(entryFile), `the entry file ${entryFile} was not written`);

const html = `<!doctype html><html><head><meta charset="utf-8"><title>select on demand</title></head><body>
<script type="module">
import { createSelect } from "/${entryFile}";
window.createSelect = createSelect;
window.ready = true;
</script></body></html>`;

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === "/") {
      return new Response(html, { headers: { "Content-Type": "text/html", "Cache-Control": "no-store" } });
    }
    const file = files.get(path.slice(1));
    if (file !== undefined) {
      return new Response(file, { headers: { "Content-Type": "text/javascript", "Cache-Control": "no-store" } });
    }
    return new Response("not found", { status: 404 });
  },
});

const OPTIONS = [
  { id: "apple", text: "Apple" },
  { id: "banana", text: "Banana" },
  { id: "cherry", text: "Cherry" },
];

const iconCss = sass.compileString(
  directionArmsPrelude() + readFileSync(join(root, "src/styles/main.scss"), "utf8"),
  sassOptions(),
).css;

const channels = (color: string): string => {
  const match = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/.exec(color);
  if (!match) return color.replace(/\s/g, "");
  return match.slice(1, 4).map((part) => String(Math.round(Number(part)))).join(",");
};

/**
 * Focus eases the trailing icon's colour on the span. The svg inherits it, so
 * the two colours match on every frame. Sampling runs in the page: settle
 * would wait out the transition and hide a second ease. WebKit tabs with
 * Alt+Tab. Opening still runs a transform transition on the svg.
 */
const checkIconColour = async (page: Page, engine: string): Promise<void> => {
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "no-preference" });
  await page.addStyleTag({ content: iconCss });
  await page.evaluate((options) => {
    document.documentElement.dataset.theme = "baseline";
    const state = window as unknown as SelectWindow;
    document.body.replaceChildren();
    const before = document.createElement("button");
    before.id = "before-select";
    before.textContent = "Before";
    document.body.append(before);
    const select = state.createSelect({ label: "Fruit", options, variant: "outlined" });
    state.select = select;
    document.body.append(select.element);
  }, OPTIONS);
  await settle(page);
  await page.locator("#before-select").focus();
  await page.keyboard.press(engine === "webkit" ? "Alt+Tab" : "Tab");
  const samples = await page.evaluate(() => new Promise<Array<{ span: string; svg: string }>>((resolve) => {
    const span = document.querySelector<HTMLElement>(".mtrl-text-field__trailing-icon");
    const svg = span?.querySelector("svg");
    if (!span || !svg) {
      resolve([]);
      return;
    }
    const taken: Array<{ span: string; svg: string }> = [];
    const started = performance.now();
    const tick = () => {
      taken.push({ span: getComputedStyle(span).color, svg: getComputedStyle(svg).color });
      if (performance.now() - started < 600) requestAnimationFrame(tick);
      else resolve(taken);
    };
    tick();
  }));
  assert(samples.length > 2, `${engine}: the icon colour was not sampled`);
  const mismatched = samples.filter((sample) => channels(sample.span) !== channels(sample.svg));
  assert.equal(
    mismatched.length,
    0,
    `${engine}: the arrow's colour left the span's on ${mismatched.length} of ${samples.length} frames`,
  );
  assert.notEqual(
    channels(samples[0]!.span),
    channels(samples[samples.length - 1]!.span),
    `${engine}: focus did not change the icon colour`,
  );

  await page.evaluate((options) => {
    const state = window as unknown as SelectWindow;
    document.body.replaceChildren();
    const select = state.createSelect({ label: "Fruit", options, variant: "outlined" });
    state.select = select;
    document.body.append(select.element);
  }, OPTIONS);
  await settle(page);
  const rotation = await page.evaluate(() => new Promise<{ property: string; duration: string; seen: string[]; running: string[]; open: boolean }>((resolve) => {
    const svg = document.querySelector<SVGElement>(".mtrl-text-field__trailing-icon svg")!;
    const seen: string[] = [];
    svg.addEventListener("transitionrun", (event) => {
      if (event.target === svg) seen.push(event.propertyName);
    });
    document.querySelector("input")!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const style = getComputedStyle(svg);
      const running = svg.getAnimations().flatMap((animation) => {
        const property = (animation as CSSTransition).transitionProperty;
        return property ? [property] : [];
      });
      resolve({
        property: style.transitionProperty,
        duration: style.transitionDuration,
        seen,
        running,
        open: document.querySelector(".mtrl-select")!.classList.contains("mtrl-select--open"),
      });
    }));
  }));
  assert.equal(rotation.open, true, `${engine}: ArrowDown did not open the select`);
  assert.equal(rotation.property, "transform", `${engine}: the svg transitions transform only, measured ${rotation.property}`);
  const durations = rotation.duration.split(",").map((part) => {
    const trimmed = part.trim();
    const value = parseFloat(trimmed);
    return trimmed.endsWith("ms") ? value : value * 1000;
  });
  assert(
    durations.length > 0 && durations.every((ms) => Math.abs(ms - 250) < 1),
    `${engine}: the rotation uses duration-medium1 (250ms), measured ${rotation.duration}`,
  );
  assert(
    rotation.seen.includes("transform") || rotation.running.includes("transform"),
    `${engine}: opening did not run a transform transition on the svg`,
  );
  await settle(page, {
    target: ".mtrl-text-field__trailing-icon svg",
    read: () => page.evaluate(() => getComputedStyle(document.querySelector(".mtrl-text-field__trailing-icon svg")!).transform),
  });
  await page.close();
};

const browser = await launchChromium({ headless: true });
try {
  const url = `http://127.0.0.1:${server.port}/`;
  const open = async () => {
    const page = await browser.newPage();
    await page.goto(url);
    await page.waitForFunction(() => (window as unknown as { ready?: boolean }).ready === true);
    return page;
  };

  // A keyboard user reaches a closed select and presses ArrowDown before the
  // focus's preload can have arrived: the listbox opens, and once its chunk
  // is there the first option is active.
  {
    const page = await open();
    const before = await page.evaluate(fetched);
    assert(
      !before.includes(`/${menuChunk}`),
      `the menu's chunk was fetched before the select was used: ${menuChunk} (fetched: ${before.join(", ")})`
    );

    // One tick: create, focus (which starts the preload) and press ArrowDown,
    // so the import's reply cannot have run before the key is handled.
    const tick = await page.evaluate((options) => {
      const state = window as unknown as SelectWindow;
      document.body.replaceChildren();
      const select = state.createSelect({ label: "Fruit", options });
      state.select = select;
      document.body.append(select.element);
      const input = select.element.querySelector("input")!;
      const menu = (() => {
        const symbol = Object.getOwnPropertySymbols(select).find((key) => key.description === "mtrl.menu");
        return (select as unknown as Record<symbol, MenuHandle>)[symbol!];
      })();
      const created = {
        role: input.getAttribute("role"),
        haspopup: input.getAttribute("aria-haspopup"),
        expanded: input.getAttribute("aria-expanded"),
        controls: input.getAttribute("aria-controls"),
        menuOpen: menu.isOpen(),
        surface: menu.element.isConnected,
      };
      input.focus();
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
      return {
        created,
        after: {
          expanded: input.getAttribute("aria-expanded"),
          menuOpen: menu.isOpen(),
          surface: menu.element.isConnected,
        },
      };
    }, OPTIONS);
    assert.deepEqual(
      tick.created,
      {
        role: "combobox",
        haspopup: "listbox",
        expanded: "false",
        controls: null,
        menuOpen: false,
        surface: false,
      },
      "a select-only combobox carries role, haspopup and aria-expanded at creation, before its menu loads"
    );
    assert.deepEqual(
      tick.after,
      { expanded: "true", menuOpen: true, surface: false },
      "ArrowDown on a closed select opens it on the key's tick, before the menu's chunk arrives"
    );

    await page.waitForFunction(
      () => {
        const state = window as unknown as SelectWindow;
        const symbol = Object.getOwnPropertySymbols(state.select).find((key) => key.description === "mtrl.menu");
        const menu = (state.select as unknown as Record<symbol, MenuHandle>)[symbol!];
        return menu.element.isConnected && menu.element.querySelectorAll('[role="option"]').length === 3;
      },
      null,
      { timeout: 10_000, polling: 10 }
    );

    const placed = await page.evaluate(() => {
      const state = window as unknown as SelectWindow;
      const symbol = Object.getOwnPropertySymbols(state.select).find((key) => key.description === "mtrl.menu");
      const menu = (state.select as unknown as Record<symbol, MenuHandle>)[symbol!];
      const input = state.select.element.querySelector("input")!;
      const list = menu.element.querySelector('[role="listbox"]');
      const activeId = input.getAttribute("aria-activedescendant");
      const active = activeId ? document.getElementById(activeId) : null;
      return {
        open: menu.isOpen(),
        controls: input.getAttribute("aria-controls"),
        listId: list?.id ?? null,
        active: active?.textContent?.trim() ?? null,
        activeRole: active?.getAttribute("role") ?? null,
      };
    });
    assert.deepEqual(
      placed,
      {
        open: true,
        controls: placed.listId,
        listId: placed.listId,
        active: "Apple",
        activeRole: "option",
      },
      "when the chunk arrives, aria-controls names the listbox and ArrowDown has placed the first option active"
    );
    assert(placed.listId, "the listbox has no id for aria-controls to name");

    const after = await page.evaluate(fetched);
    assert(
      after.includes(`/${menuChunk}`),
      `the menu's chunk ${menuChunk} was never fetched (fetched: ${after.join(", ")})`
    );
    await page.close();
  }

  // Typing on the closed select while the chunk is in flight is applied to
  // the listbox when it arrives, as it is on a loaded one.
  {
    const page = await open();
    await page.evaluate((options) => {
      const state = window as unknown as SelectWindow;
      document.body.replaceChildren();
      const select = state.createSelect({ label: "Fruit", options });
      state.select = select;
      document.body.append(select.element);
      const input = select.element.querySelector("input")!;
      input.focus();
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "c", bubbles: true, cancelable: true }));
    }, OPTIONS);
    await page.waitForFunction(
      () => {
        const state = window as unknown as SelectWindow;
        const symbol = Object.getOwnPropertySymbols(state.select).find((key) => key.description === "mtrl.menu");
        const menu = (state.select as unknown as Record<symbol, MenuHandle>)[symbol!];
        return menu.element.querySelectorAll('[role="option"]').length === 3;
      },
      null,
      { timeout: 10_000, polling: 10 }
    );
    const typed = await page.evaluate(() => {
      const state = window as unknown as SelectWindow;
      const input = state.select.element.querySelector("input")!;
      const activeId = input.getAttribute("aria-activedescendant");
      const active = activeId ? document.getElementById(activeId) : null;
      return { active: active?.textContent?.trim() ?? null };
    });
    assert.deepEqual(typed, { active: "Cherry" }, "a character typed before the chunk arrived moves to its option");
    await page.close();
  }

  // The focus that precedes the open starts the chunk while the listbox stays
  // closed, so the surface is usually there by the gesture that opens it.
  {
    const page = await open();
    await page.evaluate((options) => {
      const state = window as unknown as SelectWindow;
      document.body.replaceChildren();
      const select = state.createSelect({ label: "Fruit", options });
      state.select = select;
      document.body.append(select.element);
      select.element.querySelector("input")!.focus();
    }, OPTIONS);
    await page.waitForFunction(
      (chunk) => performance.getEntriesByType("resource").some((entry) => new URL(entry.name).pathname === `/${chunk}`),
      menuChunk,
      { timeout: 10_000, polling: 10 }
    );
    const preloaded = await page.evaluate(() => {
      const state = window as unknown as SelectWindow;
      const symbol = Object.getOwnPropertySymbols(state.select).find((key) => key.description === "mtrl.menu");
      const menu = (state.select as unknown as Record<symbol, MenuHandle>)[symbol!];
      const input = state.select.element.querySelector("input")!;
      return { open: menu.isOpen(), expanded: input.getAttribute("aria-expanded") };
    });
    assert.deepEqual(
      preloaded,
      { open: false, expanded: "false" },
      "focus alone starts the chunk without opening the listbox"
    );
    await page.close();
  }

  // The pointer opens the listbox; its options are the real menu's, and a
  // press on one chooses it.
  {
    const page = await open();
    await page.evaluate((options) => {
      const state = window as unknown as SelectWindow;
      document.body.replaceChildren();
      const select = state.createSelect({ label: "Fruit", options });
      state.select = select;
      document.body.append(select.element);
    }, OPTIONS);
    await page.locator("input").first().click();
    await page.waitForFunction(
      () => {
        const state = window as unknown as SelectWindow;
        const symbol = Object.getOwnPropertySymbols(state.select).find((key) => key.description === "mtrl.menu");
        const menu = (state.select as unknown as Record<symbol, MenuHandle>)[symbol!];
        return menu.isOpen() && menu.element.querySelectorAll('[role="option"]').length === 3;
      },
      null,
      { timeout: 10_000, polling: 10 }
    );
    const opened = await page.evaluate(() => {
      const state = window as unknown as SelectWindow;
      const input = state.select.element.querySelector("input")!;
      return { expanded: input.getAttribute("aria-expanded"), controls: !!input.getAttribute("aria-controls") };
    });
    assert.deepEqual(opened, { expanded: "true", controls: true }, "the press opens the listbox and names it");

    await page.evaluate(() => {
      const state = window as unknown as SelectWindow;
      const symbol = Object.getOwnPropertySymbols(state.select).find((key) => key.description === "mtrl.menu");
      const menu = (state.select as unknown as Record<symbol, MenuHandle>)[symbol!];
      const option = [...menu.element.querySelectorAll<HTMLElement>('[role="option"]')]
        .find((item) => item.textContent?.trim() === "Banana")!;
      option.click();
    });
    const chosen = await page.evaluate(() => {
      const state = window as unknown as SelectWindow;
      const input = state.select.element.querySelector("input")!;
      return {
        value: state.select.getValue(),
        text: input.value,
        expanded: input.getAttribute("aria-expanded"),
      };
    });
    assert.deepEqual(
      chosen,
      { value: "banana", text: "Banana", expanded: "false" },
      "a press on an option chooses it and closes the listbox"
    );
    await page.close();
  }

  // A select with submenus is a menu button, not a listbox: its opener carries
  // the menu's creation-time ARIA, and the real menu replaces the stand-in's id.
  {
    const page = await open();
    const created = await page.evaluate(() => {
      const state = window as unknown as SelectWindow;
      document.body.replaceChildren();
      const select = state.createSelect({
        label: "Fruit",
        options: [
          { id: "apple", text: "Apple" },
          { id: "more", text: "More", hasSubmenu: true, submenu: [{ id: "cherry", text: "Cherry" }] },
        ],
      });
      state.select = select;
      document.body.append(select.element);
      const symbol = Object.getOwnPropertySymbols(select).find((key) => key.description === "mtrl.menu");
      const menu = (select as unknown as Record<symbol, MenuHandle>)[symbol!];
      const opener = select.textField!.element;
      return {
        role: select.element.querySelector("input")!.getAttribute("role"),
        haspopup: opener.getAttribute("aria-haspopup"),
        expanded: opener.getAttribute("aria-expanded"),
        controls: opener.getAttribute("aria-controls"),
        surface: menu.element.isConnected,
      };
    });
    assert.deepEqual(
      {
        role: created.role,
        haspopup: created.haspopup,
        expanded: created.expanded,
        controls: /^menu-\d+-\d+$/.test(created.controls ?? ""),
        surface: created.surface,
      },
      { role: null, haspopup: "true", expanded: "false", controls: true, surface: false },
      "a menu-button select's opener carries haspopup, expanded and a placeholder aria-controls at creation"
    );

    await page.evaluate(() => {
      const state = window as unknown as SelectWindow;
      const symbol = Object.getOwnPropertySymbols(state.select).find((key) => key.description === "mtrl.menu");
      const menu = (state.select as unknown as Record<symbol, MenuHandle>)[symbol!];
      menu.open();
    });
    await page.waitForFunction(
      () => {
        const state = window as unknown as SelectWindow;
        const symbol = Object.getOwnPropertySymbols(state.select).find((key) => key.description === "mtrl.menu");
        const menu = (state.select as unknown as Record<symbol, MenuHandle>)[symbol!];
        return menu.isOpen() && menu.element.isConnected && !!menu.element.id;
      },
      null,
      { timeout: 10_000, polling: 10 }
    );
    const attached = await page.evaluate(() => {
      const state = window as unknown as SelectWindow;
      const symbol = Object.getOwnPropertySymbols(state.select).find((key) => key.description === "mtrl.menu");
      const menu = (state.select as unknown as Record<symbol, MenuHandle>)[symbol!];
      const opener = state.select.textField!.element;
      return {
        controls: opener.getAttribute("aria-controls"),
        id: menu.element.id,
        expanded: opener.getAttribute("aria-expanded"),
      };
    });
    assert.deepEqual(
      { controls: attached.controls, id: attached.id, expanded: attached.expanded },
      { controls: attached.id, id: attached.id, expanded: "true" },
      "the real menu replaces the stand-in's placeholder id and reports itself expanded"
    );
    await page.close();
  }

  await checkIconColour(await open(), "chromium");
  // components-b installs Chromium only. A missing WebKit skips; Chromium
  // still sampled the icon above.
  let webkitBrowser: Browser | null = null;
  try {
    webkitBrowser = await webkit.launch({ headless: true });
  } catch {
    console.log("select icon colour: WebKit is not installed here, skipped");
  }
  if (webkitBrowser) {
    try {
      const page = await webkitBrowser.newPage();
      await page.goto(url);
      await page.waitForFunction(() => (window as unknown as { ready?: boolean }).ready === true);
      await checkIconColour(page, "webkit");
    } finally {
      await webkitBrowser.close();
    }
  }

  console.log("Select menu-on-demand check passed.");
} finally {
  await browser.close();
  server.stop();
  rmSync(scratch, { recursive: true, force: true });
}
