// The trailing icon button on <m-text-field>, in a real browser.
//
// Server-rendered first, then upgraded or hydrated: the host dispatches
// `trailing` on click, Enter and Space, and changing the button's label keeps
// that button, the input and focus. The element, then React, Vue, Solid and
// Svelte. Runs against the build.
//
//   bun run build && bun run scripts/check-text-field-trailing.ts

import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { chromium, type Browser, type Page } from "playwright";
import { compile } from "svelte/compiler";
import type { BunPlugin } from "bun";
import { renderElement } from "../dist/ssr/index.js";
import { TRAILING_ICON } from "./fixtures/text-field-trailing/shared";

const svelte = (generate: "client" | "server"): BunPlugin => ({
  name: "svelte",
  setup(build) {
    // Bun's own svelte handling leaves the component as a path string. Compiling
    // in a namespace is what produces a component function.
    build.onResolve({ filter: /\.svelte$/ }, (args) => ({
      path: args.path.startsWith(".") ? resolve(args.importer ? dirname(args.importer) : process.cwd(), args.path) : args.path,
      namespace: "svelte-compiled",
    }));
    build.onLoad({ filter: /.*/, namespace: "svelte-compiled" }, async ({ path }) => ({
      contents: compile(await Bun.file(path).text(), { filename: path, generate, dev: true }).js.code,
      loader: "js",
    }));
  },
});

const bundle = async (entry: string, target: "browser" | "bun"): Promise<string> => {
  const result = await Bun.build({
    entrypoints: [entry],
    target,
    plugins: entry.includes("svelte") ? [svelte(target === "bun" ? "server" : "client")] : [],
    define: { "process.env.NODE_ENV": '"development"' },
  });
  assert(result.success, String(result.logs));
  return result.outputs[0].text();
};

const expectedEvents = [
  { value: "secret", eventType: "click", bubbles: true, composed: true },
  { value: "secret", eventType: "click", bubbles: true, composed: true },
  { value: "secret", eventType: "click", bubbles: true, composed: true },
];

type TrailingEvent = { value: unknown; eventType: string; bubbles: boolean; composed: boolean };

/** Click, Enter and Space. Returns the host `trailing` events and any adapter count. */
export const trailingActivation = async (page: Page, id: string): Promise<{ events: TrailingEvent[]; adapter: number }> => {
  await page.evaluate((id) => {
    const w = window as unknown as { __trailing: TrailingEvent[]; adapterEvents?: number };
    w.__trailing = [];
    w.adapterEvents = 0;
    const host = document.getElementById(id) as HTMLElement;
    host.addEventListener("trailing", (event) => {
      const detail = (event as CustomEvent<{ value?: unknown; event?: Event }>).detail;
      w.__trailing.push({
        value: detail?.value,
        eventType: detail?.event?.type ?? "",
        bubbles: event.bubbles,
        composed: event.composed,
      });
    });
  }, id);
  const button = page.getByRole("button", { name: "Show password", exact: true });
  await button.click();
  await button.press("Enter");
  await button.press("Space");
  return page.evaluate(() => {
    const w = window as unknown as { __trailing: TrailingEvent[]; adapterEvents?: number };
    return { events: w.__trailing, adapter: w.adapterEvents ?? 0 };
  });
};

export type TrailingFocus = {
  focusedBefore: boolean;
  sameButton: boolean;
  oldConnected: boolean;
  sameInput: boolean;
  focusedAfter: boolean;
  activeSame: boolean;
  documentActive: string;
  label: string | null;
  value: string;
};

/** Focus the button, rename it Show password → Hide password, and read what stayed. */
export const trailingFocus = async (page: Page, id: string): Promise<TrailingFocus> =>
  page.evaluate((id) => {
    const host = document.getElementById(id) as HTMLElement & { value: string };
    const root = host.shadowRoot as ShadowRoot;
    const old = root.querySelector("button") as HTMLButtonElement;
    const input = root.querySelector("input");
    old.focus();
    const activeBefore = document.activeElement;
    const focusedBefore = root.activeElement === old;
    host.setAttribute("trailing-icon-label", "Hide password");
    const now = root.querySelector("button");
    return {
      focusedBefore,
      sameButton: old === now,
      oldConnected: old.isConnected,
      sameInput: input === root.querySelector("input"),
      focusedAfter: root.activeElement === now,
      activeSame: document.activeElement === activeBefore,
      documentActive: document.activeElement?.tagName ?? "",
      label: now?.getAttribute("aria-label") ?? null,
      value: host.value,
    };
  }, id);

const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);

/**
 * Server-render the named field, upgrade or hydrate it, then check the event
 * and the focused label change. `check` records one passing line per path.
 */
export const checkTextFieldTrailing = async (browser: Browser, check: (name: string) => void): Promise<void> => {
  const failures: string[] = [];
  const report = (ok: boolean, line: string): void => {
    console.log(`${ok ? "PASS" : "FAIL"} ${line}`);
    if (!ok) failures.push(line);
  };

  const elementHtml = renderElement("m-text-field", {
    id: "named",
    label: "Password",
    value: "secret",
    type: "password",
    "trailing-icon": TRAILING_ICON,
    "trailing-icon-label": "Show password",
  });
  const pages = new Map<string, { html: string; js: string; head?: string; adapter: boolean }>();
  pages.set("element", {
    html: elementHtml,
    js: await bundle("scripts/fixtures/text-field-trailing/element-client.ts", "browser"),
    adapter: false,
  });

  await mkdir(new URL("./fixtures/text-field-trailing/.gen/", import.meta.url), { recursive: true });
  const written: URL[] = [];
  const loadServer = async (name: string): Promise<Record<string, unknown>> => {
    const source = await bundle(`scripts/fixtures/text-field-trailing/${name}-server.ts`, "bun");
    // Next to the source, not in /tmp: loading one adapter's server bridge makes
    // a later import from /tmp fail to resolve.
    const url = new URL(`./fixtures/text-field-trailing/.gen/${name}.mjs`, import.meta.url);
    await Bun.write(url, source);
    written.push(url);
    return import(url.href) as Promise<Record<string, unknown>>;
  };

  try {
    for (const adapter of ["react", "vue", "solid", "svelte"] as const) {
      const server = await loadServer(adapter);
      const rendered = await (server.render as () => string | Promise<string>)();
      pages.set(adapter, {
        html: rendered,
        js: await bundle(`scripts/fixtures/text-field-trailing/${adapter}-client.ts`, "browser"),
        head: typeof server.hydrationScript === "function" ? (server.hydrationScript as () => string)() : "",
        adapter: true,
      });
    }

    const http = Bun.serve({
      hostname: "127.0.0.1",
      port: 0,
      fetch(request) {
        const url = new URL(request.url);
        if (url.pathname === "/styles.css") return new Response(Bun.file("dist/styles.css"));
        const [name, asset] = url.pathname.slice(1).split("/");
        const row = pages.get(name ?? "");
        if (!row) return new Response("missing", { status: 404 });
        if (asset === "client.js") return new Response(row.js, { headers: { "Content-Type": "text/javascript" } });
        const head = row.head ?? "";
        return new Response(
          `<!doctype html><html data-theme="baseline"><head><link rel="stylesheet" href="/styles.css">${head}</head><body><div id="root">${row.html}</div></body></html>`,
          { headers: { "Content-Type": "text/html" } },
        );
      },
    });

    try {
      for (const [name, row] of pages) {
        const page = await browser.newPage();
        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));
        try {
          await page.goto(`http://127.0.0.1:${http.port}/${name}`);
          assert.equal(await page.getByRole("button", { name: "Show password", exact: true }).count(), 1, `${name}: the server render has the named button`);
          await page.addScriptTag({ url: `/${name}/client.js`, type: "module" });
          await page.waitForFunction(() => (window as unknown as { ready?: boolean }).ready === true, undefined, { timeout: 10_000 });
          const activation = await trailingActivation(page, "named");
          const eventsOk = same(activation.events, expectedEvents) && (!row.adapter || activation.adapter === 3);
          report(eventsOk, `${name} trailing click/Enter/Space ${JSON.stringify({ dom: activation.events, adapter: row.adapter ? activation.adapter : undefined })}`);
          const focus = await trailingFocus(page, "named");
          const focusOk = focus.focusedBefore && focus.sameButton && focus.oldConnected && focus.sameInput && focus.focusedAfter && focus.activeSame
            && focus.documentActive === "M-TEXT-FIELD" && focus.label === "Hide password" && focus.value === "secret";
          report(focusOk, `${name} Show password -> Hide password ${JSON.stringify(focus)}`);
          assert.deepEqual(errors, [], `${name} page errors`);
          if (eventsOk && focusOk && errors.length === 0) check(`text field trailing: ${name} dispatches trailing and keeps the focused button`);
        } finally {
          await page.close();
        }
      }
    } finally {
      http.stop(true);
    }
  } finally {
    await Promise.all(written.map((url) => Bun.file(url).delete()));
  }

  if (failures.length > 0) throw new Error(`trailing check failed (${failures.length})\n${failures.join("\n")}`);
};

if (import.meta.main) {
  const browser = await chromium.launch({ headless: true });
  let checks = 0;
  try {
    await checkTextFieldTrailing(browser, (name) => {
      checks++;
      console.log(`  ok ${name}`);
    });
    console.log(`RESULT PASS (${checks})`);
  } finally {
    await browser.close();
  }
}
