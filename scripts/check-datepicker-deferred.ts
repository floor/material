#!/usr/bin/env bun
/**
 * The datepicker's deferred entry loads its calendar on first open.
 *
 * `material/components/datepicker/deferred` is the same picker as the default
 * entry — the field, the trigger, the API, isOpen(), the open and close
 * events — with the calendar imported on the first open, or on the trigger's
 * pointer or focus that precedes it. Two things keep that true: the build's
 * chunk graph (the entry's initial graph reaches no surface module) and the
 * browser (the surface's chunk is not fetched before the picker is used).
 * Both are checked against a red control: the same analysis on an entry that
 * imports the surface eagerly must find it in the initial graph, so a green
 * run here is evidence and not silence.
 *
 * The shell's own contract is not deferred. open() flips isOpen() and emits
 * `open` on the call's tick, and a close while the surface is in flight is
 * answered at once. The surface is what waits: the dialog's calendar, its
 * focus (once), its aria-expanded and the aria title that names the dialog.
 */
import assert from "node:assert/strict";
import { mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { chromium } from "playwright";
import type createDeferredDatePicker from "../src/components/datepicker/deferred";

const root = resolve(import.meta.dir, "..");
const scratch = join(root, "tmp", "check-datepicker-deferred");
const deferredOut = join(scratch, "deferred");
const eagerOut = join(scratch, "eager");

interface MetaOutput {
  readonly bytes: number;
  readonly entryPoint?: string;
  readonly imports?: readonly { readonly path: string; readonly kind: string; readonly external?: boolean }[];
  readonly inputs: Record<string, { readonly bytesInOutput: number }>;
}

type DatePickerWindow = Window & {
  createDeferredDatePicker: typeof createDeferredDatePicker;
  picker: ReturnType<typeof createDeferredDatePicker>;
  focuses: number;
  ready?: boolean;
};

const fileOf = (key: string): string => key.replace(/^\.\//, "");
const normalized = (path: string): string => (path.startsWith("./") ? path : `./${path}`);
const fetched = (): string[] =>
  performance.getEntriesByType("resource").map((entry) => new URL(entry.name).pathname);

/** The chunks the entry reaches through static imports: what the import costs before any lazy load. */
const initialGraphOf = (outputs: Record<string, MetaOutput>, entry: string): Set<string> => {
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
  return initial;
};

/** The chunks that hold the calendar: the surface module or its render, and nothing else of the picker's. */
const bodyChunksOf = (outputs: Record<string, MetaOutput>): string[] =>
  Object.keys(outputs).filter((key) =>
    Object.keys(outputs[key]!.inputs).some((input) => /components\/datepicker\/(surface|render)\.ts$/.test(input))
  );

// The installed bun-types declare neither `metafile` in BuildConfig nor the
// field it comes back in; Bun 1.4.2 has both. The cast is that gap, nothing else.
const build = async (entry: string, outdir: string, metafile = true) => {
  const result = (await Bun.build({
    entrypoints: [entry],
    outdir,
    minify: true,
    splitting: true,
    target: "browser",
    format: "esm",
    define: { "process.env.NODE_ENV": '"production"' },
    metafile,
  } as unknown as Parameters<typeof Bun.build>[0])) as unknown as {
    readonly success: boolean;
    readonly logs: readonly unknown[];
    readonly metafile: unknown;
  };
  assert(result.success, String(result.logs));
  return (typeof result.metafile === "string" ? JSON.parse(result.metafile) : result.metafile) as {
    outputs: Record<string, MetaOutput>;
  };
};

rmSync(scratch, { recursive: true, force: true });
mkdirSync(deferredOut, { recursive: true });
mkdirSync(eagerOut, { recursive: true });

const deferredBuild = await build(join(root, "src/components/datepicker/deferred.ts"), deferredOut);
const deferredOutputs = deferredBuild.outputs;
const entry = Object.keys(deferredOutputs).find((key) => deferredOutputs[key]!.entryPoint !== undefined);
assert(entry, "the build produced no entry chunk");

const initial = initialGraphOf(deferredOutputs, entry);
const bodyChunks = bodyChunksOf(deferredOutputs);
assert(bodyChunks.length > 0, "no chunk holds the calendar: the deferred entry no longer ships one");
const leaked = bodyChunks.filter((key) => initial.has(key)).map(fileOf);
assert.deepEqual(
  leaked,
  [],
  `the calendar is in the deferred entry's initial graph (chunk ${leaked.join(", ")})`
);
const bodyChunk = fileOf(bodyChunks[0]!);
console.log(`The deferred entry's initial graph: ${[...initial].map(fileOf).join(", ")}`);
console.log(`The calendar is its own chunk: ${bodyChunk}`);

// The red control: an entry that imports the surface eagerly. The same graph
// walk must find the calendar initial, or the check above proves nothing.
const shell = relative(scratch, join(root, "src/components/datepicker/shell.ts"));
const surface = relative(scratch, join(root, "src/components/datepicker/surface.ts"));
await Bun.write(
  join(scratch, "eager-entry.ts"),
  `import { createDatePickerShell } from ${JSON.stringify(shell)};\nimport { createCalendarSurface } from ${JSON.stringify(surface)};\nglobalThis._eager = () => createDatePickerShell({}, createCalendarSurface);\n`
);
const eagerBuild = await build(join(scratch, "eager-entry.ts"), eagerOut);
const eagerOutputs = eagerBuild.outputs;
const eagerEntry = Object.keys(eagerOutputs).find((key) => eagerOutputs[key]!.entryPoint !== undefined);
assert(eagerEntry, "the eager control produced no entry chunk");
const eagerBody = bodyChunksOf(eagerOutputs);
assert(eagerBody.length > 0, "the red control's calendar was not detected: the graph walk misses a static surface import");
const eagerInitial = initialGraphOf(eagerOutputs, eagerEntry);
assert(
  eagerBody.some((key) => eagerInitial.has(key)),
  "the red control imported the calendar statically and the check stayed green: the analysis is not seeing the graph"
);
console.log("Red control: an eager import puts the calendar in the initial graph, as it must.");

const files = new Map<string, string>();
for (const name of readdirSync(deferredOut)) {
  if (name.endsWith(".js")) files.set(name, readFileSync(join(deferredOut, name), "utf8"));
}
const entryFile = fileOf(entry);
assert(files.has(entryFile), `the entry file ${entryFile} was not written`);

const html = `<!doctype html><html><head><meta charset="utf-8"><title>datepicker deferred</title></head><body>
<script type="module">
import { createDeferredDatePicker } from "/${entryFile}";
window.createDeferredDatePicker = createDeferredDatePicker;
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
  const url = `http://127.0.0.1:${server.port}/`;
  const open = async () => {
    const page = await browser.newPage();
    await page.goto(url);
    await page.waitForFunction(() => (window as unknown as DatePickerWindow).ready === true);
    return page;
  };

  // A keyboard user reaches the closed picker and presses ArrowDown before the
  // surface's chunk can have arrived: open() is answered on the key's tick,
  // and the calendar shows, focuses once and names itself when the chunk lands.
  {
    const page = await open();
    const before = await page.evaluate(fetched);
    assert(
      !before.includes(`/${bodyChunk}`),
      `the calendar's chunk was fetched before the picker was used: ${bodyChunk} (fetched: ${before.join(", ")})`
    );

    const tick = await page.evaluate(() => {
      const state = window as unknown as DatePickerWindow;
      document.body.replaceChildren();
      const picker = state.createDeferredDatePicker({ label: "Departure" });
      state.picker = picker;
      document.body.append(picker.element);
      const dialog = picker.element.querySelector("dialog")!;
      const trigger = picker.element.querySelector<HTMLElement>('[data-action="open"]')!;
      state.focuses = 0;
      dialog.addEventListener("focusin", (event) => {
        if (event.target instanceof Element && event.target.closest("[data-date]")) state.focuses += 1;
      });
      const input = picker.element.querySelector("input")!;
      input.focus();
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
      return {
        open: picker.isOpen(),
        dialogOpen: dialog.hasAttribute("open"),
        expanded: trigger.getAttribute("aria-expanded"),
        calendar: dialog.querySelector("[data-date]") !== null,
      };
    });
    assert.deepEqual(
      tick,
      { open: true, dialogOpen: false, expanded: "false", calendar: false },
      "ArrowDown on a closed deferred picker opens it on the key's tick, before the calendar's chunk arrives"
    );

    await page.waitForFunction(
      () => {
        const state = window as unknown as DatePickerWindow;
        const dialog = state.picker.element.querySelector("dialog");
        return state.picker.isOpen() && dialog?.hasAttribute("open") === true && dialog.querySelector("[data-date]") !== null;
      },
      null,
      { timeout: 10_000, polling: 10 }
    );

    const shown = await page.evaluate(() => {
      const state = window as unknown as DatePickerWindow;
      const dialog = state.picker.element.querySelector("dialog")!;
      const trigger = state.picker.element.querySelector<HTMLElement>('[data-action="open"]')!;
      const active = document.activeElement;
      return {
        open: state.picker.isOpen(),
        dialogOpen: dialog.hasAttribute("open"),
        expanded: trigger.getAttribute("aria-expanded"),
        focuses: state.focuses,
        focusInCalendar: active !== null && dialog.contains(active) && active.closest("[data-date]") !== null,
        weeks: dialog.querySelectorAll("[data-date]").length,
      };
    });
    assert.deepEqual(
      { open: shown.open, dialogOpen: shown.dialogOpen, expanded: shown.expanded, focuses: shown.focuses, focusInCalendar: shown.focusInCalendar },
      { open: true, dialogOpen: true, expanded: "true", focuses: 1, focusInCalendar: true },
      "the calendar shows once, with focus inside it exactly once and aria-expanded set"
    );
    assert(shown.weeks >= 28, `the calendar rendered ${shown.weeks} day buttons`);

    const after = await page.evaluate(fetched);
    assert(
      after.includes(`/${bodyChunk}`),
      `the calendar's chunk ${bodyChunk} was never fetched (fetched: ${after.join(", ")})`
    );
    await page.close();
  }

  // The pointer opens a modal picker with a cold chunk too: the click is
  // answered on its own tick, and the dialog's name falls back to the label
  // until the surface renders the title its aria-labelledby points at.
  {
    const page = await open();
    const tick = await page.evaluate(() => {
      const state = window as unknown as DatePickerWindow;
      document.body.replaceChildren();
      const picker = state.createDeferredDatePicker({ variant: "modal", label: "Check-in" });
      state.picker = picker;
      document.body.append(picker.element);
      const dialog = picker.element.querySelector("dialog")!;
      const trigger = picker.element.querySelector<HTMLElement>('[data-action="open"]')!;
      trigger.click();
      return {
        open: picker.isOpen(),
        dialogOpen: dialog.hasAttribute("open"),
        expanded: trigger.getAttribute("aria-expanded"),
        label: dialog.getAttribute("aria-label"),
        labelledby: dialog.getAttribute("aria-labelledby"),
        titleExists: dialog.querySelector("[data-date]") !== null,
      };
    });
    assert.deepEqual(
      tick,
      { open: true, dialogOpen: false, expanded: "false", label: "Check-in", labelledby: tick.labelledby, titleExists: false },
      "a click on the trigger opens on the click's tick, named by aria-label while the title does not exist"
    );
    assert(tick.labelledby, "the modal dialog keeps its aria-labelledby target");

    await page.waitForFunction(
      () => {
        const state = window as unknown as DatePickerWindow;
        const dialog = state.picker.element.querySelector("dialog");
        return dialog?.hasAttribute("open") === true && document.getElementById(dialog.getAttribute("aria-labelledby") ?? "") !== null;
      },
      null,
      { timeout: 10_000, polling: 10 }
    );
    const opened = await page.evaluate(() => {
      const state = window as unknown as DatePickerWindow;
      const dialog = state.picker.element.querySelector("dialog")!;
      const title = document.getElementById(dialog.getAttribute("aria-labelledby") ?? "");
      return { title: title?.textContent?.trim() ?? null, open: state.picker.isOpen() };
    });
    assert.equal(opened.open, true);
    assert.equal(opened.title, "Check-in", "the surface renders the title that names the dialog");
    await page.close();
  }

  // The trigger's pointer preloads the surface without opening anything; the
  // first open then paints with no fetch of its own.
  {
    const page = await open();
    const before = await page.evaluate(fetched);
    assert(!before.includes(`/${bodyChunk}`), `the calendar's chunk was fetched before the trigger was pointed at: ${before.join(", ")}`);
    await page.evaluate(() => {
      const state = window as unknown as DatePickerWindow;
      document.body.replaceChildren();
      const picker = state.createDeferredDatePicker();
      state.picker = picker;
      document.body.append(picker.element);
      picker.element.querySelector<HTMLElement>('[data-action="open"]')!.dispatchEvent(new Event("pointerenter"));
    });
    await page.waitForFunction(
      (chunk) => performance.getEntriesByType("resource").some((entry) => new URL(entry.name).pathname === `/${chunk}`),
      bodyChunk,
      { timeout: 10_000, polling: 10 }
    );
    const preloaded = await page.evaluate(() => {
      const state = window as unknown as DatePickerWindow;
      const dialog = state.picker.element.querySelector("dialog")!;
      return { open: state.picker.isOpen(), dialogOpen: dialog.hasAttribute("open"), calendar: dialog.querySelector("[data-date]") !== null };
    });
    assert.deepEqual(
      { open: preloaded.open, dialogOpen: preloaded.dialogOpen },
      { open: false, dialogOpen: false },
      "pointerenter preloads the calendar without opening the picker"
    );
    assert.equal(preloaded.calendar, true, "the preloaded surface mounted, closed");

    const opened = await page.evaluate(() => {
      const state = window as unknown as DatePickerWindow;
      state.picker.open();
      return state.picker.element.querySelector("dialog")!.hasAttribute("open");
    });
    assert.equal(opened, true, "the first open after a preload shows at once");
    await page.close();
  }
  // The copied shell and surface honor the current locale and dialog-name
  // APIs as well as the deferred import contract above.
  {
    const page = await open();
    const shell = await page.evaluate(() => {
      const state = window as unknown as DatePickerWindow;
      const picker = state.createDeferredDatePicker({ variant: "modal", locale: "fr-FR", value: new Date(2026, 6, 15), ariaLabel: "Travel date" });
      state.picker = picker;
      document.body.append(picker.element);
      picker.setAriaLabel("Departure");
      const result = { value: picker.getFormattedValue(), outerName: picker.element.getAttribute("aria-label"), dialogName: picker.element.querySelector("dialog")!.getAttribute("aria-label") };
      picker.open();
      return result;
    });
    assert.deepEqual(shell, { value: "15/07/2026", outerName: null, dialogName: "Departure" });
    await page.waitForFunction(() => (window as unknown as DatePickerWindow).picker.element.querySelector("dialog[open] [data-date]") !== null);
    assert.equal(await page.getByRole("dialog", { name: "Departure", exact: true }).count(), 1);
    assert((await page.locator("dialog").textContent())?.toLowerCase().includes("juillet"));
    await page.locator('[data-date="2026-07-15"]').focus();
    await page.keyboard.press("Home");
    assert.equal(await page.evaluate(() => (document.activeElement as HTMLElement)?.dataset.date), "2026-07-13", "Home moves to the locale's Monday");
    await page.evaluate(() => { (window as unknown as DatePickerWindow).picker.setAriaLabel(""); });
    assert.equal(await page.getByRole("dialog", { name: "Select date", exact: true }).count(), 1);
    await page.close();
    console.log("Deferred locale formatting, Monday week navigation and dialog name updates passed.");
  }
} finally {
  await browser.close();
  server.stop(true);
  rmSync(scratch, { recursive: true, force: true });
}
