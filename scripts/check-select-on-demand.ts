#!/usr/bin/env bun
/**
 * Select loads its menu behaviour on first open.
 *
 * A select's menu is most of what it costs, and the part of the menu that is
 * only needed once the menu is open -- where it is placed, how keys move in
 * it, what its opener does after the first open -- is a chunk of its own,
 * loaded by the first open. Two things keep that true: the build's chunk graph
 * (no chunk reachable from the entry through static imports holds
 * menu/features/position.ts, keyboard.ts or opener.ts) and the browser (the
 * chunk is not fetched before the first open).
 *
 * What a select owes on the tick open() returns is not deferred (the pinned
 * contract in test/components/synchronous-open.test.ts): isOpen(),
 * aria-expanded, the open event and, for a listbox, the option the input
 * points at, all of which are the menu's own DOM -- rendered at creation --
 * rather than the behaviour. The surface is never shown before it can be
 * placed: the controller asks the stand-in for its positioner before it
 * reveals.
 *
 * A select whose options nest is a menu button, not a listbox; its submenus
 * are placed through the same deferred positioner.
 */
import assert from "node:assert/strict";
import { mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium } from "playwright";
import type createSelect from "../src/components/select";

const root = resolve(import.meta.dir, "..");
const scratch = join(root, "tmp", "check-select-on-demand");

interface MetaOutput {
  readonly bytes: number;
  readonly entryPoint?: string;
  readonly imports?: readonly { readonly path: string; readonly kind: string; readonly external?: boolean }[];
  readonly inputs: Record<string, { readonly bytesInOutput: number }>;
}

interface SelectHandle {
  readonly element: HTMLElement;
  readonly textField: { readonly element: HTMLElement };
  open(interactionType?: "mouse" | "keyboard"): SelectHandle;
  close(): SelectHandle;
  isOpen(): boolean;
  on(event: string, handler: () => void): unknown;
  destroy?(): void;
}

type SelectWindow = Window & {
  createSelect: typeof createSelect;
  flat?: SelectHandle;
  nested?: SelectHandle;
  /** open() to placed and shown, the first time the behaviour chunk is needed. */
  firstOpenMs?: number;
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

/** Everything a chunk reaches through static imports, itself included. */
const staticClosure = (from: string): Set<string> => {
  const seen = new Set<string>();
  const visit = (key: string): void => {
    if (seen.has(key)) return;
    seen.add(key);
    for (const imp of outputs[key]?.imports ?? []) {
      if (imp.external) continue;
      const target = normalized(imp.path);
      if (!outputs[target] || imp.kind === "dynamic-import") continue;
      visit(target);
    }
  };
  visit(from);
  return seen;
};

// Everything the entry chunk reaches through static imports is its initial graph.
const initial = staticClosure(entry);

const holdsAny = (key: string, pattern: RegExp): boolean =>
  Object.keys(outputs[key]!.inputs).some((input) => pattern.test(input));
const chunksHolding = (pattern: RegExp): string[] =>
  Object.keys(outputs).filter((key) => holdsAny(key, pattern));
const inInitial = (pattern: RegExp): boolean => chunksHolding(pattern).some((key) => initial.has(key));

// The three behaviour stages are a chunk, and nothing in the initial graph
// holds them. This is the check's subject: a build that composes them at
// creation (as the select did before menu/surface.ts) fails here, by name.
const stages = /components\/menu\/features\/(?:position|keyboard|opener)\.ts$/;
const leaked = chunksHolding(stages).filter((key) => initial.has(key)).map(fileOf);
assert.deepEqual(
  leaked,
  [],
  `the menu's position, keyboard or opener is in select's initial graph (chunk ${leaked.join(", ")})`
);
const behaviourChunks = chunksHolding(/components\/menu\/features\/behaviour\.ts$/);
assert(
  behaviourChunks.length > 0,
  "no chunk holds menu/features/behaviour.ts: the select no longer ships the menu's behaviour on demand"
);
assert.equal(behaviourChunks.length, 1, `more than one chunk holds the menu's behaviour: ${behaviourChunks.map(fileOf).join(", ")}`);
const behaviourChunk = behaviourChunks[0]!;
assert(!initial.has(behaviourChunk), `the menu's behaviour chunk ${fileOf(behaviourChunk)} is in select's initial graph`);
const deferred = staticClosure(behaviourChunk);
const stageChunks = chunksHolding(stages);
assert(stageChunks.length > 0, "no chunk holds the menu's position, keyboard or opener");
const unreachable = stageChunks.filter((key) => !deferred.has(key)).map(fileOf);
assert.deepEqual(
  unreachable,
  [],
  `a chunk holds a menu behaviour stage but the behaviour chunk cannot reach it: ${unreachable.join(", ")}`
);

// The menu itself -- its surface, the stand-in and the controller that renders
// its items and answers open() -- is the select from creation.
for (const [pattern, what] of [
  [/components\/menu\/surface\.ts$/, "menu/surface.ts"],
  [/components\/menu\/features\/on-demand-behaviour\.ts$/, "menu/features/on-demand-behaviour.ts"],
  [/components\/menu\/features\/controller\.ts$/, "menu/features/controller.ts"],
] as const) {
  assert(inInitial(pattern), `${what} is not in select's initial graph: the menu is no longer created synchronously`);
}

console.log(`Select's initial graph: ${[...initial].map(fileOf).join(", ")}`);
console.log(`The menu's behaviour is its own chunk: ${fileOf(behaviourChunk)}`);

const files = new Map<string, string>();
for (const name of readdirSync(scratch)) {
  if (name.endsWith(".js")) files.set(name, readFileSync(join(scratch, name), "utf8"));
}
const entryFile = fileOf(entry);
assert(files.has(entryFile), `the entry file ${entryFile} was not written`);
const behaviourFile = fileOf(behaviourChunk);

const html = `<!doctype html><html><head><meta charset="utf-8"><title>select on demand</title>
<style>html, body { margin: 0; padding: 0 }</style></head><body>
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

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.port}/`);
  await page.waitForFunction(() => (window as unknown as { ready?: boolean }).ready === true);
  const before = await page.evaluate(fetched);
  assert(
    !before.includes(`/${behaviourFile}`),
    `the behaviour chunk was fetched before the first open: ${behaviourFile} (fetched: ${before.join(", ")})`
  );

  // Create, append and let a task pass, then read the closed select. The menu's
  // items were rendered at creation; nothing about the menu's behaviour has
  // been fetched yet.
  const mounted = await page.evaluate(async () => {
    const state = window as unknown as SelectWindow;
    document.body.replaceChildren();
    const select = state.createSelect({
      label: "Size",
      options: [
        { id: "xs", text: "Extra small" },
        { id: "s", text: "Small" },
        { id: "m", text: "Medium" },
      ],
      value: "s",
    });
    state.flat = select;
    select.element.style.width = "240px";
    document.body.append(select.element);
    await new Promise((done) => setTimeout(done, 0));
    const input = select.element.querySelector("input")!;
    return {
      role: input.getAttribute("role"),
      haspopup: input.getAttribute("aria-haspopup"),
      expanded: input.getAttribute("aria-expanded"),
      controls: input.getAttribute("aria-controls"),
      open: select.isOpen(),
    };
  });
  assert.deepEqual(
    mounted,
    { role: "combobox", haspopup: "listbox", expanded: "false", controls: null, open: false },
    "a closed select is a collapsed listbox combobox and names no popup"
  );

  // One tick: open and read the contract before any microtask can have run
  // the import's reply. The listbox is the menu's own DOM, so it is all there;
  // the surface is not shown yet, because it cannot be placed yet.
  const tick = await page.evaluate(() => {
    const state = window as unknown as SelectWindow;
    const select = state.flat!;
    const input = select.element.querySelector("input")!;
    const seen: string[] = [];
    select.on("open", () => {
      seen.push("open");
    });
    // The first open is the only one that waits for the chunk. Clock it from
    // open() to the menu being placed and shown, for the result; not asserted,
    // because the figure is the machine's. The menu element is attached to the
    // select during open(), so the observer goes on once open() has run; the
    // reveal is at least the controller's delay away.
    const started = performance.now();
    select.open();
    const menuNow = select.element.querySelector(".mtrl-select__menu");
    if (menuNow) {
      const observer = new MutationObserver(() => {
        if (menuNow.classList.contains("mtrl-menu--visible")) {
          state.firstOpenMs = performance.now() - started;
          observer.disconnect();
        }
      });
      observer.observe(menuNow, { attributes: true, attributeFilter: ["class"] });
    }
    const menu = select.element.querySelector(".mtrl-select__menu");
    if (!(menu instanceof HTMLElement)) throw new Error("the select has no menu element");
    const list = document.getElementById(input.getAttribute("aria-controls") ?? "");
    return {
      open: select.isOpen(),
      expanded: input.getAttribute("aria-expanded"),
      seen,
      controls: input.getAttribute("aria-controls"),
      listRole: list?.getAttribute("role") ?? null,
      options: list ? [...list.querySelectorAll<HTMLElement>('[role="option"]')].map((option) => option.id) : [],
      active: input.getAttribute("aria-activedescendant"),
      connected: menu.isConnected,
      visible: menu.classList.contains("mtrl-menu--visible"),
      top: menu.style.top,
      left: menu.style.left,
    };
  });
  assert.equal(tick.open, true, "isOpen() is true when open() returns");
  assert.equal(tick.expanded, "true", 'aria-expanded is "true" when open() returns');
  assert.deepEqual(tick.seen, ["open"], "open was emitted once, before open() returned");
  assert.notEqual(tick.controls, null, "the input names the listbox it controls");
  assert.equal(tick.listRole, "listbox", "the listbox the input controls is in the document on the tick open() returns");
  assert.equal(tick.options.length, 3, "the listbox holds the options on the tick open() returns");
  assert.equal(tick.active, tick.options[1], "the active option is the selected one, named by its id");
  assert.equal(tick.connected, true, "the menu element is in the document as it opens");
  assert.equal(tick.visible, false, "the menu is not shown before it can be placed");
  assert.deepEqual([tick.top, tick.left], ["", ""], "the menu is not placed before its positioner arrives");

  // The chunk arrives, and only then is the menu placed and shown.
  await page.waitForFunction(
    () => {
      const state = window as unknown as SelectWindow;
      const menu = state.flat?.element.querySelector(".mtrl-select__menu") as HTMLElement | null;
      return (
        !!menu &&
        menu.classList.contains("mtrl-menu--visible") &&
        menu.style.top !== "" &&
        menu.style.left !== ""
      );
    },
    null,
    { timeout: 10_000, polling: 10 }
  );

  const placed = await page.evaluate(() => {
    const state = window as unknown as SelectWindow;
    const select = state.flat!;
    const input = select.element.querySelector("input")!;
    const menu = select.element.querySelector(".mtrl-select__menu") as HTMLElement;
    const field = select.element.querySelector(".mtrl-text-field__field") as HTMLElement | null;
    const menuBox = menu.getBoundingClientRect();
    const fieldBox = field?.getBoundingClientRect();
    return {
      open: select.isOpen(),
      expanded: input.getAttribute("aria-expanded"),
      visible: menu.classList.contains("mtrl-menu--visible"),
      top: menu.style.top,
      left: menu.style.left,
      firstOpenMs: state.firstOpenMs ?? -1,
      placement: fieldBox
        ? {
            below: Math.round(menuBox.top - fieldBox.bottom),
            start: Math.round(menuBox.left - fieldBox.left),
          }
        : null,
    };
  });
  assert.equal(placed.open, true, "the menu stays open while its chunk arrives");
  assert.equal(placed.expanded, "true", "the input keeps aria-expanded while the chunk arrives");
  assert.equal(placed.visible, true, "the menu is shown once its positioner has arrived");
  assert.notEqual(placed.top, "", "the menu is placed vertically once its positioner has arrived");
  assert.notEqual(placed.left, "", "the menu is placed horizontally once its positioner has arrived");
  assert.ok(placed.placement, "the select has a text field to place against");
  assert.ok(
    Math.abs(placed.placement!.start) <= 1,
    `the menu starts at the field's start (${placed.placement!.start}px off)`
  );
  assert.ok(
    Math.abs(placed.placement!.below) <= 1,
    `the menu sits below the field (${placed.placement!.below}px off)`
  );
  assert.notEqual(placed.firstOpenMs, -1, "the first open reached placed and shown");
  console.log(`First open, open() to placed and shown: ${placed.firstOpenMs.toFixed(1)} ms`);
  const after = await page.evaluate(fetched);
  assert(
    after.includes(`/${behaviourFile}`),
    `the behaviour chunk ${behaviourFile} was never fetched (fetched: ${after.join(", ")})`
  );

  // A select whose options nest is a menu button; its submenu is placed by the
  // deferred positioner, queued until it arrives when the first open and the
  // submenu click share a tick.
  const nested = await page.evaluate(() => {
    const state = window as unknown as SelectWindow;
    const select = state.createSelect({
      label: "Share",
      options: [
        { id: "share", text: "Share", hasSubmenu: true, submenu: [{ id: "link", text: "Copy link" }] },
        { id: "copy", text: "Copy" },
      ],
    });
    state.nested = select;
    select.element.style.width = "240px";
    document.body.append(select.element);
    // A menu button's opener is the field, and the opener feature writes the
    // menu's ARIA there (select/features.ts makes the input a combobox only
    // for a listbox).
    const opener = select.textField.element;
    const initial = {
      haspopup: opener.getAttribute("aria-haspopup"),
      expanded: opener.getAttribute("aria-expanded"),
      controls: opener.getAttribute("aria-controls"),
    };
    select.open();
    const menu = select.element.querySelector(".mtrl-select__menu") as HTMLElement;
    const item = menu.querySelector(".mtrl-menu__item--submenu") as HTMLElement;
    item.click();
    return {
      initial,
      open: select.isOpen(),
      expanded: opener.getAttribute("aria-expanded"),
      controls: opener.getAttribute("aria-controls"),
      menuId: menu.id,
      menuRole: menu.querySelector("[role]")?.getAttribute("role") ?? null,
      menus: document.querySelectorAll(".mtrl-menu--submenu").length,
    };
  });
  assert.deepEqual(
    nested.initial,
    { haspopup: "true", expanded: "false", controls: nested.menuId },
    "menus with nesting are menu buttons: the field says it opens a menu, closed, and names it"
  );
  assert.equal(nested.open, true, "the menu-button select opens on the tick open() returns");
  assert.equal(nested.expanded, "true", 'the field says its menu is open on the tick open() returns');
  assert.equal(nested.menuRole, "menu", "the popup is a menu, not a listbox");
  assert.equal(nested.menus, 0, "the submenu is not built until its feature has arrived");

  await page.waitForFunction(
    () => {
      const state = window as unknown as SelectWindow;
      const menu = state.nested?.element.querySelector(".mtrl-select__menu") as HTMLElement | null;
      const parent = menu?.querySelector(".mtrl-menu__item--submenu");
      const submenu = document.querySelector(".mtrl-menu--submenu") as HTMLElement | null;
      return (
        !!parent &&
        parent.getAttribute("aria-expanded") === "true" &&
        !!submenu &&
        submenu.style.top !== "" &&
        submenu.style.left !== ""
      );
    },
    null,
    { timeout: 10_000, polling: 10 }
  );

  const submenu = await page.evaluate(() => {
    const submenu = document.querySelector(".mtrl-menu--submenu") as HTMLElement;
    const state = window as unknown as SelectWindow;
    const menu = state.nested!.element.querySelector(".mtrl-select__menu") as HTMLElement;
    const item = menu.querySelector(".mtrl-menu__item--submenu") as HTMLElement;
    const button = item.getBoundingClientRect();
    const box = submenu.getBoundingClientRect();
    return {
      items: [...submenu.querySelectorAll('[role="menuitem"]')].map((item) => item.textContent),
      top: submenu.style.top,
      left: submenu.style.left,
      toTheRight: box.left >= button.right - 2,
      parent: submenu.getAttribute("data-parent-item"),
      parentExpanded: item.getAttribute("aria-expanded"),
      parentVisible: menu.classList.contains("mtrl-menu--visible"),
    };
  });
  assert.deepEqual(submenu.items, ["Copy link"], "the submenu holds the nested option");
  assert.notEqual(submenu.top, "", "the submenu is placed vertically by the deferred positioner");
  assert.notEqual(submenu.left, "", "the submenu is placed horizontally by the deferred positioner");
  assert.equal(submenu.toTheRight, true, "the submenu opens to the right of its item");
  assert.equal(submenu.parent, "share", "the submenu names the item it belongs to");
  assert.equal(submenu.parentExpanded, "true", "the parent item says its submenu is open");
  assert.equal(submenu.parentVisible, true, "the parent menu was revealed once the behaviour arrived");

  await page.evaluate(() => {
    const state = window as unknown as SelectWindow;
    state.flat?.destroy?.();
    state.nested?.destroy?.();
  });
  console.log("Select menu-behaviour-on-demand check passed.");
} finally {
  await browser.close();
  server.stop();
  rmSync(scratch, { recursive: true, force: true });
}
