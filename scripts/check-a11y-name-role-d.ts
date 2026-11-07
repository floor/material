/** Picker names and date-grid semantics, measured in Chromium's accessibility tree.
 * M3 date/time picker accessibility and WAI-ARIA APG date picker grid, read 2026-11-07:
 * https://m3.material.io/components/date-pickers/accessibility
 * https://m3.material.io/components/time-pickers/accessibility
 * https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/
 * No built package needed: compile the production factories, elements and Sass.
 */
import assert from "node:assert/strict";
import { chromium } from "playwright";
import * as sass from "sass";
import { componentStyles } from "./style-manifest";

const css = sass.compile("src/styles/main.scss", { logger: sass.Logger.silent }).css;
const sheets = Object.fromEntries(["datepicker", "timepicker"].map(name => [name,
  sass.compileString(`@use "${componentStyles[name].source}";`, { loadPaths: ["src/styles"], logger: sass.Logger.silent }).css,
]));
const compile = async (path: string) => {
  const build = await Bun.build({ entrypoints: [path], target: "browser" });
  assert(build.success, String(build.logs));
  return build.outputs[0].text();
};
const [factories, elements] = await Promise.all([compile("src/index.ts"), compile("src/elements/index.ts")]);
const server = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch(req) {
  const path = new URL(req.url).pathname;
  if (path === "/factories.js" || path === "/elements.js") return new Response(path === "/factories.js" ? factories : elements, { headers: { "content-type": "text/javascript" } });
  if (path === "/styles.css") return new Response(css, { headers: { "content-type": "text/css" } });
  if (path === "/sheets") return Response.json(sheets);
  return new Response(`<!doctype html><html data-theme="baseline" data-theme-mode="light"><head><link rel="stylesheet" href="/styles.css"></head><body><main id="stage"></main><script type="module">window.m=await import('/factories.js');window.e=await import('/elements.js');window.e.registerStyles(await(await fetch('/sheets')).json());window.e.defineAll();window.ready=true;</script></body></html>`, { headers: { "content-type": "text/html" } });
} });
interface Picker {
  element: HTMLElement;
  open(): unknown;
  getValue(): unknown;
  setTitle(title: string): unknown;
}
interface PickerHost extends HTMLElement { component: Picker; show(): void }
type PickerWindow = Window & {
  ready: boolean;
  m: Record<string, (config?: Record<string, unknown>) => Picker>;
  picker: Picker;
  host?: PickerHost;
  before: { dialog: Element; active: Element | null; value: unknown };
};
interface Case { id: string; kind: "date" | "time"; config?: Record<string, unknown>; html?: string; name: string; action?: "title" | "label"; next?: string | null }
const cases: Case[] = [
  ...["docked", "modal", "fullscreen"].flatMap(variant => [
    { id: `date-${variant}-single`, kind: "date" as const, config: { variant, value: "2026-05-15" }, name: "Select date" },
    { id: `date-${variant}-range`, kind: "date" as const, config: { variant, selectionMode: "range", value: ["2026-05-15", "2026-05-18"] }, name: "Select date" },
  ]),
  { id: "date-explicit", kind: "date", config: { variant: "modal", label: "Departure", ariaLabel: "Travel date", value: "2026-05-15" }, name: "Travel date" },
  ...["dial", "input"].flatMap(type => [
    { id: `time-${type}-omitted`, kind: "time" as const, config: { type, value: "09:30", showSeconds: true }, name: "Select time" },
    { id: `time-${type}-empty`, kind: "time" as const, config: { type, title: "", value: "09:30" }, name: "Select time" },
    { id: `time-${type}-title`, kind: "time" as const, config: { type, title: "Departure", value: "09:30" }, name: "Departure" },
    { id: `time-${type}-explicit`, kind: "time" as const, config: { type, title: "Departure", ariaLabel: "Alarm time", value: "09:30" }, name: "Alarm time" },
  ]),
  ...["date", "time"].flatMap(kind => [
    { id: `${kind}-element-explicit`, kind: kind as "date" | "time", html: `<m-${kind}picker id="target" variant="modal" type="input" label="" aria-label="Purpose" value="${kind === "date" ? "2026-05-15" : "09:30"}"></m-${kind}picker>`, name: "Purpose" },
    { id: `${kind}-element-rename`, kind: kind as "date" | "time", html: `<m-${kind}picker id="target" variant="modal" type="input" label="Departure" aria-label="Purpose" value="${kind === "date" ? "2026-05-15" : "09:30"}"></m-${kind}picker>`, action: "label" as const, next: "New purpose", name: "New purpose" },
    { id: `${kind}-element-remove-label`, kind: kind as "date" | "time", html: `<m-${kind}picker id="target" variant="modal" type="input" label="Departure" aria-label="Purpose" value="${kind === "date" ? "2026-05-15" : "09:30"}"></m-${kind}picker>`, action: "label" as const, next: null, name: "Departure" },
  ]),
  ...[{ title: "Departure", next: "", name: "Select time" }, { title: "", next: "Arrival", name: "Arrival" }].map(c => ({ id: `time-title-${c.name}`, kind: "time" as const, config: { title: c.title, type: "input", value: "09:30" }, action: "title" as const, next: c.next, name: c.name })),
];
const browser = await chromium.launch({ headless: true });
const failures: string[] = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
  const cdp = await page.context().newCDPSession(page);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await cdp.send("Accessibility.enable");
  for (const spec of cases) {
    try {
      await page.goto(`http://127.0.0.1:${server.port}`);
      await page.waitForFunction(() => (window as unknown as PickerWindow).ready);
      await page.evaluate(spec => {
        const w = window as unknown as PickerWindow, stage = document.getElementById("stage")!;
        if (spec.html) { stage.innerHTML = spec.html; w.host = document.getElementById("target") as PickerHost; w.host.show(); w.picker = w.host.component; }
        else { w.picker = w.m[spec.kind === "date" ? "createDatePicker" : "createTimePicker"](spec.config); stage.append(w.picker.element); w.picker.open(); }
      }, spec);
      const settle = () => page.evaluate(async () => {
        await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
        await Promise.all(document.getAnimations().filter(a => Number.isFinite(a.effect?.getComputedTiming().iterations ?? 0)).map(a => a.finished.catch(() => {})));
      });
      await settle();
      const retention = await page.evaluate(spec => {
        const w = window as unknown as PickerWindow, root = w.host?.shadowRoot ?? w.picker.element;
        const dialog = root.querySelector("dialog")!, active = w.host?.shadowRoot?.activeElement ?? document.activeElement;
        w.before = { dialog, active, value: w.picker.getValue() };
        if (spec.action === "title") w.picker.setTitle(spec.next ?? "");
        if (spec.action === "label") {
          if (spec.next === null) w.host!.removeAttribute("aria-label"); else w.host!.setAttribute("aria-label", spec.next!);
        }
        return !!spec.action;
      }, spec);
      await settle();
      if (process.env.PICKER_VISUAL_DIR && spec.kind === "date" && spec.id.startsWith("date-modal")) await page.locator("dialog").screenshot({ path: `${process.env.PICKER_VISUAL_DIR}/${spec.id}.png`, animations: "disabled" });
      const { nodes } = await cdp.send("Accessibility.getFullAXTree");
      const exposed = nodes.filter(n => !n.ignored);
      assert.deepEqual(exposed.filter(n => n.role?.value === "dialog").map(n => n.name?.value), [spec.name], "one correctly named dialog");
      const dom = await page.evaluate(spec => {
        const w = window as unknown as PickerWindow, root = w.host?.shadowRoot ?? w.picker.element, dialog = root.querySelector("dialog")!;
        const ids = (dialog.getAttribute("aria-labelledby") ?? "").split(/\s+/).filter(Boolean);
        return {
          validRefs: ids.every((id: string) => root.querySelector("#" + CSS.escape(id))?.textContent?.trim()),
          sameDialog: w.before.dialog === dialog,
          sameFocus: w.before.active === (w.host?.shadowRoot?.activeElement ?? document.activeElement),
          sameValue: JSON.stringify(w.before.value) === JSON.stringify(w.picker.getValue()),
          author: w.host ? { value: w.host.getAttribute("aria-label"), property: w.host.ariaLabel, selector: w.host.matches(spec.next === null && spec.action === "label" ? ":not([aria-label])" : "[aria-label]"), native: w.host.getAttribute === Element.prototype.getAttribute, serialized: w.host.outerHTML.includes("aria-label=") } : null,
          days: [...dialog.querySelectorAll("[data-date]")].map((el: Element) => ({ role: el.getAttribute("role"), selected: el.getAttribute("aria-selected"), pressed: el.hasAttribute("aria-pressed"), parentRole: el.parentElement!.getAttribute("role") })),
        };
      }, spec);
      assert(dom.validRefs, "no dangling or empty dialog name reference");
      if (retention) { assert(dom.sameDialog, "label mutation retains dialog"); assert(dom.sameFocus, "label mutation retains focus"); assert(dom.sameValue, "label mutation retains value"); }
      if (dom.author) {
        const value = spec.action === "label" ? spec.next : "Purpose";
        assert.equal(dom.author.value, value); assert.equal(dom.author.property, value); assert(dom.author.selector); assert(dom.author.native); assert.equal(dom.author.serialized, value !== null);
      }
      if (spec.kind === "date") {
        assert(dom.days.length > 0);
        assert(dom.days.every(d => d.role === "gridcell" && d.selected !== null && !d.pressed && d.parentRole !== "gridcell"), "day owns the only gridcell role and selection state");
        assert.equal(exposed.filter(n => ["button", "gridcell"].includes(n.role?.value ?? "") && n.name?.value === "Friday, May 15, 2026").length, 1, "full date exposed once");
        assert(exposed.some(n => n.role?.value === "gridcell" && n.name?.value === "Friday, May 15, 2026" && n.properties?.some(p => p.name === "selected" && p.value.value === true)), "selected date exposed as selected gridcell");
      } else if (spec.config?.type === "input" || spec.html) {
        assert.deepEqual(exposed.filter(n => n.role?.value === "spinbutton").map(n => n.name?.value), spec.config?.showSeconds ? ["Hour", "Minute", "Second"] : ["Hour", "Minute"], "input names stay single and specific");
      }
      console.log(`PASS ${spec.id}`);
    } catch (error) { failures.push(spec.id); console.error(`FAIL ${spec.id}: ${error instanceof Error ? error.message : String(error)}`); }
  }
  assert.deepEqual(errors, [], "no uncaught browser errors");
  console.log(`${cases.length - failures.length}/${cases.length} picker name/role scenarios passed`);
  assert.deepEqual(failures, [], "picker name/role failures");
} finally { await browser.close(); server.stop(true); }
