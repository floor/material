#!/usr/bin/env bun
/**
 * Optional sheets arrive with the lazy chunk that needs them, applied before
 * the first frame of the surface they style.
 *
 * The select's menu sheet and the button's progress sheet are not part of the
 * select's or the button's CSS entry: the on-demand menu and the lazy progress
 * bring them, and the surface is created only after the sheet is applied. This
 * check proves both halves in the two scopes the sheets apply to. It is red on
 * main, where both sheets are eager.
 *
 * Elements, `material/elements/css/select`:
 * - the menu's CSS module is not in the entry's static graph, and no chunk
 *   registers the menu's CSS before the first open;
 * - the shadow root has one sheet fewer until the first open, and a
 *   `.mtrl-menu` probe inside it is unlaid out (position static) until then;
 * - the menu's first inserted frame already carries the menu's box (fixed,
 *   112px min-width, 8px 0 padding, a corner radius, an opaque background),
 *   the first frame it is visible in is styled the same, and both equal the
 *   settled style.
 *
 * Documents, in a Vite-built app (the consumer's own bundler):
 * - the entry CSS does not define the menu's or the progress root's rule; the
 *   deferred rules are in a CSS asset no page requests before the pieces are
 *   used;
 * - probes are unlaid out until then;
 * - both surfaces' first frames are styled and equal their settled styles.
 *
 * A computed style read while the element is inserted is the style of its
 * first frame: adopted stylesheets and `@layer` apply synchronously, and a
 * MutationObserver callback runs before rendering. The check reads again on
 * the first animation frame after the surface becomes visible, the frame its
 * transition paints from, and once more when the transition has ended.
 *
 * Build first: this reads `dist/`.
 */
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { build, preview, type Manifest } from "vite";
import { chromium } from "playwright";
import type { Page } from "playwright";

const root = resolve(import.meta.dir, "..");
const scratch = join(root, "tmp", "check-lazy-sheets");
rmSync(scratch, { recursive: true, force: true });
mkdirSync(join(scratch, "elements"), { recursive: true });

/** The keys a first frame has to carry; they do not change while a surface animates. */
const FRAME_KEYS = ["position", "minWidth", "padding", "borderTopLeftRadius", "backgroundColor", "lineHeight"] as const;
type FrameStyle = Record<string, string>;

type FrameWindow = Window & { __frame?: { insert?: FrameStyle; frame?: FrameStyle }; __node?: Element };

/**
 * Installs the recorder for the first surface `selector` inserted under
 * `shadow` (an element id whose shadow root is the tree) or the document body.
 * It records the computed style at insertion and on the first animation frame
 * after a menu becomes visible; the progress has no visible class, so its
 * second read is the next frame.
 */
const installFirstFrame = async (page: Page, options: { shadow?: string; selector: string }): Promise<void> => {
  await page.evaluate(({ shadow, selector }: { shadow?: string; selector: string }) => {
    const window = globalThis as unknown as FrameWindow & { __frame: unknown };
    const read = (element: Element): Record<string, string> => {
      const style = getComputedStyle(element);
      return {
        position: style.position, minWidth: style.minWidth, padding: style.padding,
        borderTopLeftRadius: style.borderTopLeftRadius, backgroundColor: style.backgroundColor,
        lineHeight: style.lineHeight, visibility: style.visibility,
      };
    };
    const target: Node = shadow ? ((document.getElementById(shadow) as HTMLElement).shadowRoot as ShadowRoot) : document.body;
    window.__frame = undefined;
    /**
     * Records a candidate's inserted frame and then the frame it is visible
     * in, publishing only that pair. The factory menu's positioner inserts a
     * measurement clone — same classes, forced visible, inline hidden — and
     * removes it in the same task, so a disconnected node never publishes.
     */
    const accept = (node: Element): void => {
      const frame: { insert?: Record<string, string>; frame?: Record<string, string> } = { insert: read(node) };
      const next = (): void => {
        if (!node.isConnected) return;
        if (selector === ".mtrl-menu" && !node.classList.contains("mtrl-menu--visible")) {
          requestAnimationFrame(next);
          return;
        }
        requestAnimationFrame(() => {
          if (!node.isConnected) return;
          frame.frame = read(node);
          (window as unknown as { __node?: Element }).__node = node;
          window.__frame = frame;
        });
      };
      requestAnimationFrame(next);
    };
    new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (window.__frame || !(node instanceof Element) || !node.matches(selector)) continue;
          accept(node);
        }
      }
    }).observe(target, { childList: true, subtree: true });
  }, options);
};

const waitForFirstFrame = (page: Page): Promise<unknown> =>
  page.waitForFunction(() => {
    const window = globalThis as unknown as FrameWindow;
    return !!window.__frame?.frame;
  }, undefined, { timeout: 10_000 });

const frameOf = (page: Page): Promise<{ insert?: FrameStyle; frame?: FrameStyle }> =>
  page.evaluate(() => (globalThis as unknown as FrameWindow).__frame as { insert?: FrameStyle; frame?: FrameStyle });

/** The style after the surface has settled, read from the recorded node. */
const settledStyle = (page: Page): Promise<FrameStyle> =>
  page.evaluate(() => {
    const node = (globalThis as unknown as FrameWindow).__node as Element;
    const style = getComputedStyle(node);
    return {
      position: style.position, minWidth: style.minWidth, padding: style.padding,
      borderTopLeftRadius: style.borderTopLeftRadius, backgroundColor: style.backgroundColor,
      lineHeight: style.lineHeight, visibility: style.visibility,
    };
  });

/**
 * What a styled first frame carries, by surface. The element menu takes the
 * sheet's own `fixed`; the factory menu's positioner sets an inline position
 * on open (`features/position.ts`), so the document side asserts the box the
 * sheet gives it and `assertNoFlash` holds its position equal to the settled
 * style.
 */
const STYLED: Record<"menu" | "menu-document" | "progress", Partial<FrameStyle>> = {
  menu: { position: "fixed", minWidth: "112px", padding: "8px 0px" },
  "menu-document": { minWidth: "112px", padding: "8px 0px" },
  progress: { position: "relative", lineHeight: "0px" },
};

const assertStyled = (style: FrameStyle, expected: Partial<FrameStyle>, surface: string): void => {
  for (const [key, value] of Object.entries(expected)) {
    assert.equal(style[key], value, `the ${surface}'s first frame has ${key} ${style[key]}, expected ${value}`);
  }
  if ("minWidth" in expected) {
    assert.notEqual(style.borderTopLeftRadius, "0px", `the ${surface}'s first frame has no corner radius`);
    assert.notEqual(style.backgroundColor, "rgba(0, 0, 0, 0)", `the ${surface}'s first frame has no background`);
  }
};

const assertNoFlash = (frame: { insert?: FrameStyle; frame?: FrameStyle }, settled: FrameStyle, surface: string): void => {
  assert(frame.insert && frame.frame, `the ${surface} surface was not recorded`);
  for (const key of FRAME_KEYS) {
    assert.equal(frame.insert[key], settled[key], `${surface}: the inserted frame's ${key} differs from the settled style`);
    assert.equal(frame.frame[key], settled[key], `${surface}: the first visible frame's ${key} differs from the settled style`);
  }
  // The frame that paints is the one the surface is visible in; the inserted
  // frame is the hidden one the transition starts from.
  assert.equal(frame.frame.visibility, settled.visibility, `${surface}: the first visible frame is not visible`);
};

// ---------------------------------------------------------------------------
// Elements: the select's shadow root.
const entry = join(scratch, "elements-entry.js");
writeFileSync(entry, [
  'import "material/elements/css/select";',
  'import { defineSelect } from "material/elements";',
  "defineSelect();",
  "",
].join("\n"));

// The installed bun-types declare neither `metafile` in BuildConfig nor the
// field it comes back in; Bun 1.4.2 has both. The cast is that gap, nothing else.
const elementBuild = (await Bun.build({
  entrypoints: [entry],
  outdir: join(scratch, "elements"),
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
assert(elementBuild.success, String(elementBuild.logs));
const metafile = (typeof elementBuild.metafile === "string"
  ? JSON.parse(elementBuild.metafile)
  : elementBuild.metafile) as { outputs: Record<string, { entryPoint?: string; imports?: readonly { path: string; kind: string; external?: boolean }[]; inputs: Record<string, unknown> }> };
const outputs = metafile.outputs;
const entryChunk = Object.keys(outputs).find((key) => outputs[key]!.entryPoint !== undefined);
assert(entryChunk, "the element build produced no entry chunk");

// Everything the entry chunk reaches through static imports is its initial graph.
const initial = new Set<string>();
const visit = (key: string): void => {
  if (initial.has(key)) return;
  initial.add(key);
  for (const item of outputs[key]?.imports ?? []) {
    if (item.external || item.kind === "dynamic-import") continue;
    const target = item.path.startsWith("./") ? item.path : `./${item.path}`;
    if (outputs[target]) visit(target);
  }
};
visit(entryChunk);
const menuModuleChunks = Object.keys(outputs).filter((key) =>
  Object.keys(outputs[key]!.inputs).some((input) => /(^|\/)dist\/elements\/css\/menu\.js$/.test(input)),
);
assert(menuModuleChunks.length > 0, "the element build wrote no chunk for the menu's CSS module");
assert.deepEqual(
  menuModuleChunks.filter((key) => initial.has(key)).map((key) => key.replace(/^\.\//, "")),
  [],
  "the menu's CSS module is in the select CSS entry's initial graph",
);

const elementFiles = new Map<string, string>();
for (const name of readdirSync(join(scratch, "elements"))) {
  if (name.endsWith(".js")) elementFiles.set(name, readFileSync(join(scratch, "elements", name), "utf8"));
}
const menuChunk = [...elementFiles].find(([, text]) => text.includes("mtrl-menu--visible"))?.[0];
assert(menuChunk, "no built chunk registers the menu's CSS");

const html = `<!doctype html><html><head><meta charset="utf-8"><title>lazy sheets: elements</title>
<link rel="stylesheet" href="/base.css"></head><body>
<m-select id="cold" label="Destination" variant="outlined" value="paris">
  <m-select-option value="paris">Paris</m-select-option>
  <m-select-option value="lyon">Lyon</m-select-option>
</m-select>
<script type="module">
  await import("/elements-entry.js");
  window.app = { host: document.getElementById("cold") };
  window.ready = true;
</script></body></html>`;

const elementServer = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === "/") return new Response(html, { headers: { "Content-Type": "text/html", "Cache-Control": "no-store" } });
    if (path === "/base.css") {
      return new Response(readFileSync(join(root, "dist/styles/base.css")), { headers: { "Content-Type": "text/css", "Cache-Control": "no-store" } });
    }
    const text = elementFiles.get(path.slice(1));
    return text
      ? new Response(text, { headers: { "Content-Type": "text/javascript", "Cache-Control": "no-store" } })
      : new Response("not found", { status: 404 });
  },
});
const elementOrigin = `http://127.0.0.1:${elementServer.port}`;

const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 800, height: 600 }, reducedMotion: "reduce" });
  const errors: string[] = [];
  context.on("page", (page) => {
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    page.on("response", (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  });

  const page = await context.newPage();
  const requested = new Set<string>();
  page.on("request", (request) => requested.add(new URL(request.url()).pathname.slice(1)));
  await page.goto(`${elementOrigin}/`);
  await page.waitForFunction(() => (window as typeof window & { ready?: boolean }).ready === true);
  await page.waitForFunction(() => {
    const host = document.getElementById("cold") as HTMLElement & { shadowRoot: ShadowRoot | null };
    return !!host.shadowRoot && host.shadowRoot.adoptedStyleSheets.length > 0;
  });

  const before = await page.evaluate(() => {
    const host = document.getElementById("cold") as HTMLElement & { shadowRoot: ShadowRoot };
    const probe = document.createElement("div");
    probe.className = "mtrl-menu";
    host.shadowRoot.append(probe);
    const position = getComputedStyle(probe).position;
    probe.remove();
    return { position, sheets: host.shadowRoot.adoptedStyleSheets.length };
  });
  assert.equal(before.position, "static", "the menu's sheet is in the select's shadow root before the menu is used");
  assert(!requested.has(menuChunk), `the menu's CSS chunk was fetched before the first open (${menuChunk})`);

  await installFirstFrame(page, { shadow: "cold", selector: ".mtrl-menu" });
  await page.locator("#cold").click();
  await waitForFirstFrame(page);
  await page.waitForTimeout(450);
  const elementFrame = await frameOf(page);
  assertStyled(elementFrame.insert as FrameStyle, STYLED.menu, "menu");
  assertNoFlash(elementFrame, await settledStyle(page), "menu");

  const after = await page.evaluate(() => {
    const host = document.getElementById("cold") as HTMLElement & { shadowRoot: ShadowRoot };
    const probe = document.createElement("div");
    probe.className = "mtrl-menu";
    host.shadowRoot.append(probe);
    const position = getComputedStyle(probe).position;
    probe.remove();
    return { position, sheets: host.shadowRoot.adoptedStyleSheets.length };
  });
  assert.equal(after.position, "fixed", "the menu's sheet did not arrive with the menu");
  assert.equal(after.sheets, before.sheets + 1, "the first open did not adopt exactly the menu's sheet");
  assert(requested.has(menuChunk), "the menu's CSS chunk was not fetched by the first open");
  console.log(`elements: ${before.sheets} sheets before the first open, ${after.sheets} after; the menu's first frame is styled and equals its settled style`);

  // -------------------------------------------------------------------------
  // Documents: a Vite-built app, the consumer's own bundler.
  const app = mkdtempSync(join(tmpdir(), "mtrl-lazy-sheets-app-"));
  mkdirSync(join(app, "node_modules"));
  symlinkSync(root, join(app, "node_modules", "material"));
  writeFileSync(join(app, "package.json"), JSON.stringify({ name: "lazy-sheets-app", private: true }));
  mkdirSync(join(app, "src"));
  writeFileSync(join(app, "index.html"), '<!doctype html><html><head><meta charset="utf-8"><title>lazy sheets: documents</title></head><body><div id="host"></div><script type="module" src="/src/main.ts"></script></body></html>');
  writeFileSync(join(app, "src/main.ts"), [
    'import "material/styles/base";',
    'import "material/styles/select";',
    'import "material/styles/button";',
    'import { createSelect, createButton } from "material";',
    'const host = document.getElementById("host") as HTMLElement;',
    'const select = createSelect({ label: "Destination", variant: "outlined", options: [{ id: "paris", text: "Paris" }, { id: "lyon", text: "Lyon" }] });',
    "host.append(select.element);",
    'const button = createButton({ text: "Save", progress: { indeterminate: false, value: 40 } });',
    "host.append(button.element);",
    "(window as unknown as { app: unknown }).app = { select, button };",
    'document.body.dataset.ready = "true";',
    "",
  ].join("\n"));
  const outDir = join(app, "site");
  await build({
    root: app, configFile: false, envFile: false, logLevel: "error",
    build: { outDir, target: "esnext", manifest: true, rolldownOptions: { input: join(app, "index.html") } },
  });
  const manifest: Manifest = JSON.parse(readFileSync(join(outDir, ".vite/manifest.json"), "utf8"));
  const assets = (entryName: string, kind: "static" | "dynamic"): Set<string> => {
    const result = new Set<string>();
    const seen = new Set<string>();
    const walk = (key: string): void => {
      if (seen.has(key) || !manifest[key]) return;
      seen.add(key);
      const chunk = manifest[key];
      result.add(chunk.file);
      chunk.css?.forEach((file) => result.add(file));
      chunk.imports?.forEach(walk);
      if (kind === "dynamic") chunk.dynamicImports?.forEach(walk);
    };
    walk(entryName);
    return result;
  };
  const staticCss = [...assets("index.html", "static")].filter((file) => file.endsWith(".css"));
  // A sheet module that carries no JavaScript is a CSS-only manifest entry of
  // its own, linked from neither a chunk's imports nor its css list. Every
  // emitted stylesheet that the entry does not load statically is a deferred
  // candidate; the app imports exactly the five sheets, so the difference is
  // the menu's and the progress sheet.
  const emittedCss = new Set<string>();
  for (const chunk of Object.values(manifest)) {
    if (chunk.file.endsWith(".css")) emittedCss.add(chunk.file);
    chunk.css?.forEach((file) => emittedCss.add(file));
  }
  const lazyCss = [...emittedCss].filter((file) => !staticCss.includes(file)).sort();
  /**
   * Whether any file defines the class's own rule, `.mtrl-menu{`. A subject
   * starts a rule: at the file's start, or after the `{` of a block (`@layer`,
   * an at-rule) or the `}` of the rule before it — the sheets are compressed,
   * so no whitespace separates them. A compound or descendant subject
   * (`.mtrl-select>.mtrl-menu{`, which select.css has, or
   * `.mtrl-button__progress.mtrl-progress{`, which button.css has) is a rule
   * about the part, not the part's own sheet, and does not count.
   */
  const defines = (files: string[], selector: string): boolean => {
    const pattern = new RegExp(`(?:^|[{}])\\${selector}\\{`);
    return files.some((file) => pattern.test(readFileSync(join(outDir, file), "utf8")));
  };
  assert(staticCss.length > 0, "Vite discarded the style imports");
  assert(!defines(staticCss, ".mtrl-menu"), "the entry CSS defines the menu's rule");
  assert(!defines(staticCss, ".mtrl-progress"), "the entry CSS defines the progress rule");
  assert(defines(lazyCss, ".mtrl-menu"), "no lazy CSS asset defines the menu's rule");
  assert(defines(lazyCss, ".mtrl-progress"), "no lazy CSS asset defines the progress rule");

  const server = await preview({
    root: app, configFile: false, envFile: false, logLevel: "error",
    build: { outDir }, preview: { host: "127.0.0.1", port: 0, open: false },
  });
  const address = server.httpServer.address();
  assert(address && typeof address !== "string");
  const origin = `http://127.0.0.1:${address.port}`;
  try {
    const appPage = await context.newPage();
    const appRequested = new Set<string>();
    appPage.on("request", (request) => appRequested.add(new URL(request.url()).pathname.slice(1)));
    await appPage.goto(`${origin}/`);
    await appPage.locator('body[data-ready="true"]').waitFor();

    const probes = await appPage.evaluate(() => {
      const menu = document.createElement("div");
      menu.className = "mtrl-menu";
      const progress = document.createElement("div");
      progress.className = "mtrl-progress";
      document.body.append(menu, progress);
      return { menu: getComputedStyle(menu).position, progress: getComputedStyle(progress).position };
    });
    assert.equal(probes.menu, "static", "the menu's rule is applied before the menu is used");
    assert.equal(probes.progress, "static", "the progress rule is applied before the progress is used");
    assert(!lazyCss.some((file) => appRequested.has(file)), "a deferred CSS asset was fetched before the pieces were used");

    await installFirstFrame(appPage, { selector: ".mtrl-menu" });
    await appPage.locator(".mtrl-select").click();
    await waitForFirstFrame(appPage);
    await appPage.waitForTimeout(450);
    const menuFrame = await frameOf(appPage);
    assertStyled(menuFrame.insert as FrameStyle, STYLED["menu-document"], "menu");
    assertNoFlash(menuFrame, await settledStyle(appPage), "menu");

    await installFirstFrame(appPage, { selector: ".mtrl-progress" });
    await appPage.evaluate(() => {
      const button = (globalThis as unknown as { app: { button: { showProgress: () => Promise<unknown> } } }).app.button;
      void button.showProgress();
    });
    await waitForFirstFrame(appPage);
    await appPage.waitForTimeout(350);
    const progressFrame = await frameOf(appPage);
    assertStyled(progressFrame.insert as FrameStyle, STYLED.progress, "progress");
    assertNoFlash(progressFrame, await settledStyle(appPage), "progress");

    const after = await appPage.evaluate(() => {
      const menu = document.createElement("div");
      menu.className = "mtrl-menu";
      const progress = document.createElement("div");
      progress.className = "mtrl-progress";
      document.body.append(menu, progress);
      return { menu: getComputedStyle(menu).position, progress: getComputedStyle(progress).position };
    });
    assert.equal(after.menu, "fixed", "the menu's rule did not arrive with the menu");
    assert.equal(after.progress, "relative", "the progress rule did not arrive with the progress");
    assert(lazyCss.some((file) => appRequested.has(file)), "the deferred CSS assets were not fetched when the pieces were used");
    assert.deepEqual(errors, [], "Browser errors occurred");
    console.log(`documents: entry CSS ${staticCss.join(", ")}; deferred CSS ${lazyCss.join(", ")}; both first frames are styled and equal their settled styles`);
  } finally {
    await new Promise<void>((done, fail) => server.httpServer.close((error) => (error ? fail(error) : done())));
  }
} finally {
  await browser.close();
  elementServer.stop(true);
  rmSync(scratch, { recursive: true, force: true });
}

console.log("lazy-sheets:check passed: the menu and progress sheets arrive with their chunks, applied before the first frame");
