/** Off-by-default controlLabelOnly: one semantic name, unchanged default HTML.
 * WAI-ARIA presentation conflict resolution, read 2026-11-07:
 * https://www.w3.org/TR/wai-aria-1.2/#conflict_resolution_presentation_none
 * https://www.w3.org/TR/html-aam-1.0/#accessible-name-and-description-computation
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import * as sass from "sass";

interface Component { element: HTMLElement; getValue(): unknown; setValue(value: string | number | boolean): unknown }
type Harness = Window & { ready: boolean; factories: Record<string, (config: object) => Component>; component: Component };
const bundle = await Bun.build({ entrypoints: ["src/index.ts"], target: "browser" });
assert(bundle.success, String(bundle.logs));
const js = await bundle.outputs[0].text();
const css = sass.compile("src/styles/main.scss", { logger: sass.Logger.silent }).css;
const server = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch(req) {
  if (new URL(req.url).pathname === "/app.js") return new Response(js, { headers: { "content-type": "text/javascript" } });
  return new Response(`<!doctype html><html data-theme="baseline" data-theme-mode="light"><head><style>${css}</style></head><body><form id="form"></form><script type="module">window.factories=await import('/app.js');window.ready=true;</script></body></html>`, { headers: { "content-type": "text/html" } });
} });
const fixture = "test/fixtures/a11y-wrapper-default-html.json";
const capture = process.env.A11Y_WRAPPER_CAPTURE;
const hashes: Record<string, string> = {};
const expected = capture ? {} : JSON.parse(await readFile(fixture, "utf8")) as Record<string, string>;
const cases = [
  { id: "checkbox", factory: "createCheckbox", role: "checkbox", label: "Accept", config: {} },
  { id: "switch", factory: "createSwitch", role: "switch", label: "Wi-Fi", config: {} },
  { id: "text-field", factory: "createTextField", role: "textbox", label: "Email", config: { value: "initial" } },
  { id: "slider", factory: "createSlider", role: "slider", label: "Volume", config: { value: 40 } },
  { id: "range", factory: "createSlider", role: "slider", label: "Volume", config: { range: true, value: 30, secondValue: 70 } },
];
const browser = await chromium.launch({ headless: true });
let passed = 0;
const failures: string[] = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const cdp = await page.context().newCDPSession(page);
  for (const spec of cases) for (const disabled of [false, true]) for (const flag of ["omitted", "false", "true"] as const) {
    const id = `${spec.id}-${disabled ? "disabled" : "enabled"}-${flag}`;
    try {
      await page.goto(server.url.href);
      await page.waitForFunction(() => (window as unknown as Harness).ready);
      const initial = await page.evaluate(({ spec, disabled, flag }) => {
        const w = window as unknown as Harness;
        const config = { ...spec.config, ariaLabel: spec.label, name: "choice", disabled, ...(flag === "omitted" ? {} : { controlLabelOnly: flag === "true" }) };
        const c = w.component = w.factories[spec.factory]!(config);
        document.getElementById("form")!.append(c.element);
        return { html: c.element.outerHTML, rootLabel: c.element.getAttribute("aria-label") };
      }, { spec, disabled, flag });
      const hash = createHash("sha256").update(initial.html).digest("hex");
      if (flag !== "true") {
        hashes[id] = hash;
        if (!capture) assert.equal(hash, expected[id], "default generated HTML is byte-identical to main");
      }
      const { nodes } = await cdp.send("Accessibility.getFullAXTree");
      const exposed = nodes.filter(node => !node.ignored);
      const names = spec.id === "range" ? ["Volume minimum", "Volume maximum"] : [spec.label];
      assert.deepEqual(exposed.filter(node => node.role?.value === spec.role).map(node => node.name?.value), names, "semantic control names stay intact");
      if (flag === "true") {
        assert.equal(exposed.filter(node => node.role?.value === "generic" && node.name?.value === spec.label).length, 0, "no named wrapper with the opt-in");
        assert.equal(initial.rootLabel, null, "only opt-in root aria-label is omitted");
      } else assert.equal(initial.rootLabel, spec.label, "legacy root label remains by default");
      const behavior = await page.evaluate(({ spec, disabled }) => {
        const c = (window as unknown as Harness).component;
        const control = c.element.querySelector<HTMLElement>(spec.role === "slider" ? '[role="slider"]' : "input")!;
        const before = c.getValue();
        if (!disabled) {
          control.focus();
          if (spec.role === "checkbox" || spec.role === "switch") (control as HTMLInputElement).click();
          else c.setValue(spec.role === "textbox" ? "edited" : 50);
        }
        const active = document.activeElement === control;
        const form = new FormData(document.getElementById("form") as HTMLFormElement);
        return { before, after: c.getValue(), active, form: form.getAll("choice"), label: control.getAttribute("aria-label"), native: control.getAttribute === Element.prototype.getAttribute };
      }, { spec, disabled });
      assert(behavior.native);
      if (disabled) { assert.deepEqual(behavior.after, behavior.before); assert.deepEqual(behavior.form, []); }
      else { assert(behavior.active, "focus stays on the real input/handle"); assert(behavior.form.length > 0, "the real control still submits"); }
      console.log(`PASS ${id}`); passed++;
    } catch (error) { failures.push(id); console.error(`FAIL ${id}: ${error instanceof Error ? error.message : String(error)}`); }
  }
  if (capture) await writeFile(capture, JSON.stringify(hashes, null, 2) + "\n");
  assert.deepEqual(errors, [], "no uncaught browser errors");
  console.log(`${passed}/30 wrapper opt-in scenarios passed`);
  assert.deepEqual(failures, []);
} finally { await browser.close(); server.stop(true); }
