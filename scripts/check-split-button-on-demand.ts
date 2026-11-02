#!/usr/bin/env bun
/**
 * Split button loads its menu on first open.
 *
 * The menu is most of what a split button with items costs, so it is a chunk
 * of its own, loaded by the first open. Two things keep that true: the build's
 * chunk graph (no chunk that holds a menu module other than menu/inner is
 * reachable from the entry through static imports) and the browser (the menu's
 * chunk is not fetched before the first open).
 *
 * The button's own contract is not deferred. On the tick the trailing button
 * is clicked, isExpanded(), aria-expanded and the expand/change events are
 * there, while the menu's surface is not: the stand-in answers them and the
 * menu opens when its chunk arrives.
 */
import assert from "node:assert/strict";
import { mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium } from "playwright";
import type createSplitButton from "../src/components/split-button";

const root = resolve(import.meta.dir, "..");
const scratch = join(root, "tmp", "check-split-button-on-demand");

interface MetaOutput {
  readonly bytes: number;
  readonly entryPoint?: string;
  readonly imports?: readonly { readonly path: string; readonly kind: string; readonly external?: boolean }[];
  readonly inputs: Record<string, { readonly bytesInOutput: number }>;
}

interface MenuHandle {
  isOpen(): boolean;
  readonly element: HTMLElement;
  on(event: string, handler: () => void): unknown;
}

type SplitWindow = Window & {
  createSplitButton: typeof createSplitButton;
  split: ReturnType<typeof createSplitButton>;
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
  entrypoints: [join(root, "src/components/split-button/index.ts")],
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
// inner symbol module (menu/inner.ts) is the one menu module that stays initial.
const isMenuModule = (path: string): boolean =>
  /(^|\/)components\/menu\//.test(path) && !/(^|\/)components\/menu\/inner\.ts$/.test(path);
const menuChunks = Object.keys(outputs).filter((key) =>
  Object.keys(outputs[key]!.inputs).some(isMenuModule)
);
assert(menuChunks.length > 0, "no chunk holds the menu: the split button no longer ships one");
const leaked = menuChunks.filter((key) => initial.has(key)).map(fileOf);
assert.deepEqual(
  leaked,
  [],
  `the menu is in split button's initial graph (chunk ${leaked.join(", ")})`
);
const controller = Object.keys(outputs).find((key) =>
  Object.keys(outputs[key]!.inputs).some((input) => /components\/menu\/features\/controller\.ts$/.test(input))
);
assert(controller, "no chunk holds the menu controller");
const menuChunk = fileOf(controller);

console.log(`Split button's initial graph: ${[...initial].map(fileOf).join(", ")}`);
console.log(`The menu is its own chunk: ${menuChunk}`);

const files = new Map<string, string>();
for (const name of readdirSync(scratch)) {
  if (name.endsWith(".js")) files.set(name, readFileSync(join(scratch, name), "utf8"));
}
const entryFile = fileOf(entry);
assert(files.has(entryFile), `the entry file ${entryFile} was not written`);

const html = `<!doctype html><html><head><meta charset="utf-8"><title>split button on demand</title></head><body>
<script type="module">
import { createSplitButton } from "/${entryFile}";
window.createSplitButton = createSplitButton;
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

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.port}/`);
  await page.waitForFunction(() => (window as unknown as { ready?: boolean }).ready === true);
  const before = await page.evaluate(fetched);
  assert(
    !before.includes(`/${menuChunk}`),
    `the menu's chunk was fetched before the first open: ${menuChunk} (fetched: ${before.join(", ")})`
  );

  // One tick: create, click the trailing button, and read the contract before
  // any microtask can have run the import's reply.
  const tick = await page.evaluate(() => {
    const state = window as unknown as SplitWindow;
    document.body.replaceChildren();
    const split = state.createSplitButton({
      text: "Save",
      items: [
        { id: "draft", text: "Save as draft" },
        { id: "copy", text: "Save a copy" },
      ],
    });
    state.split = split;
    document.body.append(split.element);
    const symbol = Object.getOwnPropertySymbols(split).find((key) => key.description === "mtrl.menu");
    const menu = (split as unknown as Record<symbol, MenuHandle>)[symbol!];
    const seen: string[] = [];
    let opens = 0;
    split.on("expand", () => seen.push("expand"));
    split.on("change", () => seen.push("change"));
    menu.on("open", () => {
      opens += 1;
    });
    const before = {
      expanded: split.isExpanded(),
      aria: split.trailingElement.getAttribute("aria-expanded"),
      seen: [...seen],
    };
    split.trailingElement.click();
    return {
      before,
      after: {
        expanded: split.isExpanded(),
        aria: split.trailingElement.getAttribute("aria-expanded"),
        haspopup: split.trailingElement.getAttribute("aria-haspopup"),
        seen: [...seen],
        opens,
        menuOpen: menu.isOpen(),
        menuConnected: menu.element.isConnected,
      },
    };
  });
  assert.deepEqual(tick.before, { expanded: false, aria: "false", seen: [] }, "the button starts collapsed");
  assert.deepEqual(
    tick.after,
    {
      expanded: true,
      aria: "true",
      haspopup: "menu",
      seen: ["expand", "change"],
      opens: 1,
      menuOpen: true,
      menuConnected: false,
    },
    "the first open answers its state, ARIA and events on the click's tick, before the menu's chunk arrives"
  );

  await page.waitForFunction(
    () => {
      const state = window as unknown as SplitWindow;
      const symbol = Object.getOwnPropertySymbols(state.split).find((key) => key.description === "mtrl.menu");
      const menu = (state.split as unknown as Record<symbol, MenuHandle>)[symbol!];
      return menu.isOpen()
        && menu.element.isConnected
        && menu.element.querySelectorAll('[role="menuitem"]').length === 2;
    },
    null,
    { timeout: 10_000, polling: 10 }
  );

  const opened = await page.evaluate(() => {
    const state = window as unknown as SplitWindow;
    const symbol = Object.getOwnPropertySymbols(state.split).find((key) => key.description === "mtrl.menu");
    const menu = (state.split as unknown as Record<symbol, MenuHandle>)[symbol!];
    return {
      expanded: state.split.isExpanded(),
      aria: state.split.trailingElement.getAttribute("aria-expanded"),
      connected: menu.element.isConnected,
      items: [...menu.element.querySelectorAll('[role="menuitem"]')].map((item) => item.textContent),
    };
  });
  assert.deepEqual(
    opened,
    { expanded: true, aria: "true", connected: true, items: ["Save as draft", "Save a copy"] },
    "the menu, once its chunk has arrived, is open and holds the items"
  );
  const after = await page.evaluate(fetched);
  assert(
    after.includes(`/${menuChunk}`),
    `the menu's chunk ${menuChunk} was never fetched (fetched: ${after.join(", ")})`
  );

  await page.evaluate(() => (window as unknown as SplitWindow).split.destroy());
  console.log("Split button menu-on-demand check passed.");
} finally {
  await browser.close();
  server.stop();
  rmSync(scratch, { recursive: true, force: true });
}
