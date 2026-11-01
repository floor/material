// scripts/fixtures/shadow-styles.ts
import { defineAll, elements } from "../../dist/elements/index.js";
import "../../dist/elements/css/index.js";
import { applyStyles } from "../../dist/elements/styles.js";
import { setComponentDefaults, clearGlobalDefaults } from "../../dist/core/config/global.js";
import { PREFIX } from "../../dist/core/config.js";
import { setHTML } from "../../dist/core/dom/html.js";
import { componentStyles } from "../style-manifest";

defineAll();
const owners = Object.keys(componentStyles).sort((a, b) => b.length - a.length);
const aliases: Record<string, string> = { chip: "chips", radio: "radios" };
const ownerOf = (name: string): string | undefined => {
  if (!name.startsWith(`${PREFIX}-`)) return;
  const block = name.slice(PREFIX.length + 1).split(/__|--/)[0];
  return owners.find(owner => owner === block) ?? aliases[block];
};
const sheetText = (sheet: CSSStyleSheet) => Array.from(sheet.cssRules, rule => rule.cssText).join("\n");
// A registered component sheet, as a shadow root adopts it
const sheetOf = (name: string): CSSStyleSheet => {
  const root = document.createElement("div").attachShadow({ mode: "open" });
  applyStyles(root, [name]);
  return root.adoptedStyleSheets[0] ?? new CSSStyleSheet();
};
const sheets = new Map(owners.map(name => [name, sheetOf(name)] as const));
const staticStyles = new CSSStyleSheet();
staticStyles.replaceSync("*{transition:none!important;animation:none!important}");
const computed = (node: Element) => {
  const style = getComputedStyle(node);
  return Object.fromEntries(Array.from(style, property => [property, style.getPropertyValue(property)]));
};
// Settle on the work the fixture set off instead of sleeping a fixed 100 ms for
// it: yield to the microtasks a build, a slot assignment and an observer
// callback queue, await the fonts and images the fixture inserts, let two
// frames pass so frame-queued layout runs, then await the finite transitions
// that started. An infinite decorative animation (a progress indicator) never
// settles, and is not awaited.
const settle = async (): Promise<void> => {
  await document.fonts.ready;
  await Promise.all(Array.from(document.images, image => image.decode().catch(() => {})));
  for (;;) {
    for (let frame = 0; frame < 2; frame++) await new Promise(resolve => requestAnimationFrame(resolve));
    const animations = document.getAnimations().filter(animation =>
      (animation.playState === "running" || animation.pending) &&
      animation.effect?.getComputedTiming().endTime !== Infinity);
    if (!animations.length) return;
    await Promise.all(animations.map(animation => animation.finished.catch(() => {})));
  }
};

const api = {
  /**
   * The settle's own guard: a 60 ms transition in a shadow tree, longer than
   * the two frames a settle that only waits on the document returns after. If
   * the settle reaches the shadow roots, the transition ends before it returns
   * and `ended` is true; if it does not, the transition is still running.
   */
  async settleGuard(): Promise<{ ended: boolean; elapsed: number }> {
    const host = document.createElement("div");
    const root = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = ".guard{width:60px;transition:width 60ms linear}.guard-go{width:120px}";
    const node = document.createElement("div");
    node.className = "guard";
    root.append(style, node);
    document.body.append(host);
    void getComputedStyle(node).width; // commit the 60px width, so the change transitions
    let ended = false;
    node.addEventListener("transitionend", () => { ended = true; }, { once: true });
    node.classList.add("guard-go");
    const started = performance.now();
    await settle();
    const result = { ended, elapsed: Math.round(performance.now() - started) };
    host.remove();
    return result;
  },
  async probe(html: string, defaults?: "dialog" | "card") {
    if (defaults === "dialog") setComponentDefaults("dialog", { buttons: [{ text: "Save" }] });
    if (defaults === "card") setComponentDefaults("card", { buttons: [{ text: "Save" }] });
    const container = document.createElement("main");
    setHTML(container, html);
    document.body.append(container);
    // Include asynchronous factory setup, slot assignment and observer work.
    await settle();
    const rows: Array<{
      element: string; className: string; sheet: string; adopted: boolean;
      changes: Record<string, { before: string; after: string }>;
    }> = [];
    const roots: string[] = [];
    const walk = (host: Element): void => {
      for (const child of Array.from(host.children)) walk(child);
      const root = host.shadowRoot;
      if (!root) return;
      const spec = Object.values(elements).find(entry => `m-${entry.spec.name}` === host.localName)?.spec;
      if (!spec) return;
      roots.push(spec.name);
      const adopted = new Set(root.adoptedStyleSheets.map(sheetText));
      const originalSheets = [...root.adoptedStyleSheets];
      root.adoptedStyleSheets = [...originalSheets, staticStyles];
      try {
        for (const node of Array.from(root.querySelectorAll("[class]"))) {
          for (const className of Array.from(node.classList)) {
            const owner = ownerOf(className);
            if (!owner || owner === spec.name) continue;
            const sheet = sheets.get(owner)!;
            const present = adopted.has(sheetText(sheet));
            const changes: Record<string, { before: string; after: string }> = {};
            // Diagnose in place, then restore; no spec or production CSS changes.
            // Only a missing sheet is diagnosed: an adopted one reports `changes`
            // empty, and reading its computed style read every property of every
            // class in the page for nothing.
            if (!present) {
              const original = [...root.adoptedStyleSheets];
              try {
                const before = computed(node);
                root.adoptedStyleSheets = [...original, sheet];
                const after = computed(node);
                for (const property of Object.keys(before)) {
                  if (before[property] !== after[property]) changes[property] = { before: before[property], after: after[property] };
                }
              } finally { root.adoptedStyleSheets = original; }
            }
            rows.push({ element: spec.name, className, sheet: owner, adopted: present, changes });
          }
        }
      } finally { root.adoptedStyleSheets = originalSheets; }
      for (const child of Array.from(root.children)) walk(child);
    };
    try { for (const host of Array.from(container.children)) walk(host); }
    finally { container.remove(); clearGlobalDefaults(); }
    return { roots, rows };
  },
};
Object.assign(window, { shadowStyles: api });
export type ShadowStylesAPI = typeof api;
