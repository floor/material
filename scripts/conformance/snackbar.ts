import assert from "node:assert/strict";
import { createConformanceHarness, type Case, type Part, type State } from "./measure";
import type { SnackbarComponent, SnackbarConfig } from "../../src/components/snackbar/types";

type Fixture = { action: boolean; close: boolean; wrap: boolean };

const mount: Case["mount"] = (mtrl, host, data) => {
  const { action, close, wrap } = data as Fixture;
  const win = window as Window & { conformanceSnackbar?: SnackbarComponent };
  win.conformanceSnackbar?.destroy();
  const create = mtrl.createSnackbar as unknown as (config: SnackbarConfig) => SnackbarComponent;
  const snackbar = create({
    message: wrap ? "Item stored successfully. Your changes are ready for the rest of the team." : "Item stored successfully.",
    ...(action ? { action: "Undo" } : {}),
    dismissible: close, duration: "indefinite",
  });
  host.append(snackbar.element);
  if (wrap) snackbar.element.style.width = "280px";
  snackbar.show();
  win.conformanceSnackbar = snackbar;
  if (!snackbar.isOpen() || !snackbar.element.isConnected || snackbar.element.inert) throw new Error("Snackbar did not become visible");
  if (!!snackbar.actionButton !== action || !!snackbar.closeButton !== close) throw new Error("Snackbar action configuration did not mount");
};

const parts = [
  { name: "container", selector: ".mtrl-snackbar" },
  { name: "message", selector: ".mtrl-snackbar__text" },
  { name: "action", selector: ".mtrl-snackbar__action" },
  { name: "close", selector: ".mtrl-snackbar__close" },
  { name: "icon", selector: ".mtrl-snackbar__close svg" },
].map(part => ({ ...part, document: true })) satisfies Part[];

const engine = process.argv.includes("--webkit") ? "webkit" : "chromium";
const cases: Case[] = (["light", "dark"] as const).flatMap(scheme => {
  const layouts: Case[] = [
    { id: `${scheme}/message`, mount, scheme, parts, config: { action: false, close: false, wrap: false } },
    { id: `${scheme}/wrapped`, mount, scheme, parts, config: { action: false, close: false, wrap: true } },
    { id: `${scheme}/single/action-close`, mount, scheme, parts, config: { action: true, close: true, wrap: false } },
    { id: `${scheme}/wrapped/action-close`, mount, scheme, parts, config: { action: true, close: true, wrap: true } },
  ];
  for (const control of ["action", "close"] as const) {
    for (const state of ["rest", "hover", "focus", "pressed"] as const) {
      const selector = `.mtrl-snackbar__${control}`;
      layouts.push({
        id: `${scheme}/${control}/${state}`, mount, scheme, state: state as State,
        config: { action: control === "action", close: control === "close", wrap: false },
        parts: [
          { name: "control", selector, document: true }, ...parts,
          ...(state !== "rest" ? [{ name: "verifiedControl", document: true, selector: `${selector}:${state === "pressed" ? "active" : state === "focus" ? "focus-visible" : "hover"}` }] : []),
        ],
      });
    }
  }
  return layouts;
});

const harness = await createConformanceHarness({ component: "snackbar", engine });
try {
  const rows = await harness.measure(cases);
  for (const row of rows) {
    assert.ok(row.parts.container && row.parts.message, row.id);
    if (row.state !== "rest") assert.ok(row.parts.verifiedControl, row.id);
  }
  const behavior = await harness.page.evaluate(async () => {
    const win = window as Window & {
      conformanceSnackbar?: SnackbarComponent;
      mtrl?: { createSnackbar: (config: SnackbarConfig) => SnackbarComponent };
    };
    win.conformanceSnackbar?.destroy();
    const create = win.mtrl!.createSnackbar;
    const first = create({ message: "First", action: "Undo" });
    const second = create({ message: "Second" });
    const long = create({ message: "Long", duration: "long" });
    const durations = [first, second, long].map(snackbar => snackbar.getDuration());
    first.show();
    second.show();
    const queued = first.isOpen() && second.state === "queued";
    const shown = new Promise<boolean>(resolve => {
      const timer = setTimeout(() => resolve(false), 1500);
      second.on("open", () => { clearTimeout(timer); resolve(true); });
    });
    first.hide();
    const nextShown = await shown;
    first.destroy();
    second.destroy();
    long.destroy();
    return { durations, queued, nextShown };
  });
  assert.ok(behavior.queued && behavior.nextShown, "Snackbar queue fixture did not advance");
  console.log(JSON.stringify({ source: harness.source, engine, rows, behavior }, null, 2));
} finally {
  await harness.close();
}
