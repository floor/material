#!/usr/bin/env bun
/**
 * A closed dialog and a closed snackbar are out of the accessibility tree and
 * out of the Tab order — before the first open included, when the caller
 * mounts the public element itself.
 *
 * Six fixtures, each sampled the way the audit sampled them: before the first
 * open, while open, immediately after close, and once the exit has settled
 * (650ms). Chromium's Accessibility.getFullAXTree is what a screen reader
 * receives; a real Tab from the button before the surface is what the keyboard
 * does.
 *
 * Material asks for the closed state to be out of the way: a dialog is modal
 * only while open, and a snackbar's status is announced when it is shown
 * (m3.material.io/components/dialogs/accessibility, /snackbars/guidelines).
 */
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { chromium, type Page } from "playwright";
import * as sass from "sass";

const repoRoot = resolve(process.argv[2] ?? resolve(import.meta.dir, ".."));
const compile = (source: string): string => sass.compileString(`@use "${source}";`, {
  loadPaths: [resolve(repoRoot, "src/styles"), repoRoot],
  style: "compressed",
  logger: sass.Logger.silent,
}).css;

const entrySource = `
import { createDialog, createSnackbar } from ${JSON.stringify(resolve(repoRoot, "src/index.ts"))};
import { defineAll, registerStyles } from ${JSON.stringify(resolve(repoRoot, "src/elements/index.ts"))};
registerStyles({ dialog: ${JSON.stringify(compile("components/dialog"))}, snackbar: ${JSON.stringify(compile("components/snackbar"))} });
defineAll();
window.api = { createDialog, createSnackbar };
`;
const bundleBuild = await Bun.build({
  entrypoints: ["closed-surface-entry.ts"],
  target: "browser",
  format: "iife",
  plugins: [{
    name: "virtual-entry",
    setup(build) {
      build.onResolve({ filter: /^closed-surface-entry\.ts$/ }, () => ({ path: resolve(repoRoot, "closed-surface-entry.ts") }));
      build.onLoad({ filter: /closed-surface-entry\.ts$/ }, () => ({ contents: entrySource, loader: "ts" }));
    },
  }],
});
assert(bundleBuild.success, String(bundleBuild.logs));

const browser = await chromium.launch({ headless: true });
try {
  const page: Page = await browser.newPage({ viewport: { width: 900, height: 620 } });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setContent(`<!DOCTYPE html><html lang="en" data-theme="baseline"><head><meta charset="utf-8"></head><body></body></html>`);
  await page.addStyleTag({ content: compile("main") });
  await page.addScriptTag({ content: await bundleBuild.outputs[0]!.text() });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Accessibility.enable");

  /** Every non-ignored AX node's role and name. */
  const ax = async (): Promise<string[]> => {
    const { nodes } = (await cdp.send("Accessibility.getFullAXTree")) as {
      nodes: Array<{ ignored?: boolean; role?: { value?: unknown }; name?: { value?: unknown } }>;
    };
    return nodes.filter((node) => !node.ignored)
      .map((node) => `${String(node.role?.value ?? "")}:${String(node.name?.value ?? "")}`);
  };
  /** A label is exposed when an AX node's name carries it, outside the probe button. */
  const exposed = async (label: string): Promise<string | null> =>
    (await ax()).find((entry) => entry.includes(`:${label}`) || entry === `:${label}`) ?? null;
  /** The deepest focused element, through shadow roots. */
  const focused = (): Promise<string> => page.evaluate(() => {
    let active: Element | null = document.activeElement;
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
    if (!active || active === document.body) return "body";
    return `${active.tagName.toLowerCase()}:${(active.textContent ?? "").trim()}`;
  });
  /** A real Tab from the button that precedes the surface. */
  const tabReaches = async (label: string): Promise<boolean> => {
    await page.evaluate(() => (document.getElementById("before") as HTMLElement).focus());
    await page.keyboard.press("Tab");
    return (await focused()).includes(label);
  };
  const settle = (): Promise<void> => page.waitForTimeout(700);

  const failures: string[] = [];
  const row = async (name: string, body: () => Promise<void>): Promise<void> => {
    try {
      await body();
      console.log(`  ok ${name}`);
    } catch (error) {
      failures.push(`${name}: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`);
    }
  };

  // Each fixture: a fresh document with one button before the surface.
  const mount = (kind: "dialog" | "snackbar", callerAppends: boolean): Promise<Record<string, unknown>> =>
    page.evaluate(async ({ kind, callerAppends }) => {
      document.body.replaceChildren();
      const before = document.createElement("button");
      before.id = "before";
      before.textContent = "Before";
      document.body.append(before);
      const api = (window as unknown as { api: Record<string, (config: Record<string, unknown>) => Record<string, unknown>> }).api;
      const surface = kind === "dialog"
        ? api.createDialog!({ title: "Rest dialog", content: "Take a break?", buttons: [{ text: "Close", action: "close" }] }) as unknown as { element: HTMLElement; open: () => void; close: () => void }
        : api.createSnackbar!({ message: "Saved", action: "Undo", duration: "indefinite" }) as unknown as { element: HTMLElement; show: () => void; hide: () => void };
      // The factory leaves its element to mount itself; this is the report's
      // caller-appends case.
      if (callerAppends) document.body.append(surface.element);
      (window as unknown as { surface?: unknown }).surface = surface;
      return { appended: callerAppends };
    }, { kind, callerAppends });
  const act = (action: "open" | "close" | "show" | "hide"): Promise<void> =>
    page.evaluate((action) => {
      const surface = (window as unknown as { surface: Record<string, unknown> }).surface as Record<string, () => void>;
      surface[action]!();
    }, action);

  for (const [kind, openName, closeName, label] of [
    ["dialog", "open", "close", "Rest dialog"],
    ["snackbar", "show", "hide", "Saved"],
  ] as const) {
    for (const callerAppends of [false, true]) {
      const suffix = callerAppends ? "caller appends the element" : "default mount";
      await row(`${kind}, ${suffix}: closed state is absent from the AX tree`, async () => {
        await mount(kind, callerAppends);
        assert.equal(await exposed(label), null, `${label} is exposed before the first ${openName}`);
        await act(openName);
        await page.waitForTimeout(150);
        assert.ok(await exposed(label), `${label} is not exposed once ${openName}n`);
        await act(closeName as "close" | "hide");
        assert.equal(await exposed(label), null, `${label} is still exposed just after ${closeName}`);
        await settle();
        assert.equal(await exposed(label), null, `${label} is still exposed once closed`);
      });
      if (kind === "snackbar") {
        await row(`${kind}, ${suffix}: a closed surface takes no Tab`, async () => {
          await mount(kind, true);
          assert.equal(await tabReaches("Undo"), false, "Tab reaches the closed snackbar's Undo");
          await act(openName);
          assert.equal(await tabReaches("Undo"), true, "Tab does not reach the open snackbar's Undo");
          await act("hide");
          await settle();
          assert.equal(await tabReaches("Undo"), false, "Tab reaches the hidden snackbar's Undo");
        });
      }
    }
  }

  // The elements, which mount themselves into their shadow roots.
  for (const [tag, label, openName, closeName] of [
    ["m-dialog", "Rest dialog", "show", "close"],
    ["m-snackbar", "Saved", "show", "hide"],
  ] as const) {
    await row(`<${tag}>: closed state is absent from the AX tree`, async () => {
      await page.evaluate(({ tag, label }) => {
        document.body.replaceChildren();
        const before = document.createElement("button");
        before.id = "before";
        before.textContent = "Before";
        document.body.append(before);
        const host = document.createElement(tag);
        if (tag === "m-dialog") {
          host.setAttribute("headline", label);
          host.innerHTML = '<p>Take a break?</p><m-dialog-actions><button>Close</button></m-dialog-actions>';
        } else {
          host.setAttribute("message", label);
          host.setAttribute("action", "Undo");
          host.setAttribute("duration", "indefinite");
        }
        document.body.append(host);
      }, { tag, label });
      await page.waitForTimeout(80);
      assert.equal(await exposed(label), null, `${label} is exposed before the first ${openName}`);
      await page.evaluate(({ tag, openName }) => {
        const host = document.querySelector(tag) as unknown as Record<string, () => void>;
        host[openName]!();
      }, { tag, openName });
      await page.waitForTimeout(120);
      assert.ok(await exposed(label), `${label} is not exposed once ${openName}n`);
      await page.evaluate(({ tag, closeName }) => {
        const host = document.querySelector(tag) as unknown as Record<string, () => void>;
        host[closeName]!();
      }, { tag, closeName });
      assert.equal(await exposed(label), null, `${label} is still exposed just after ${closeName}`);
      await settle();
      assert.equal(await exposed(label), null, `${label} is still exposed once closed`);
      if (tag === "m-snackbar") {
        assert.equal(await tabReaches("Undo"), false, "Tab reaches the closed <m-snackbar>'s Undo");
      }
    });
  }

  assert.deepEqual(errors, []);
  assert.deepEqual(failures, [], `closed surfaces:\n  ${failures.join("\n  ")}`);
  console.log("Passed closed surfaces: both factories and both elements keep a closed dialog and snackbar out of the AX tree and the Tab order, before the first open and after the exit settles.");
} finally {
  await browser.close();
}
