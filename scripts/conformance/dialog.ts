import assert from "node:assert/strict";
import { CONFORMANCE_PROPERTIES, createConformanceHarness, fixtureEngine, selectFixtureCases, type Case, type Part } from "./measure";
import type { DialogComponent, DialogConfig } from "../../src/components/dialog/types";

type Fixture = { size: "small" | "medium" | "large" | "fullscreen"; wrap: boolean };

const mount: Case["mount"] = (mtrl, host, data) => {
  const { size, wrap } = data as Fixture;
  const win = window as Window & { conformanceDialog?: DialogComponent };
  win.conformanceDialog?.destroy();
  Object.assign(host.style, { display: "block", width: "100vw", height: "100vh" });
  document.body.style.padding = "0";
  const create = mtrl.createDialog as unknown as (config: DialogConfig) => DialogComponent;
  const dialog = create({
    size, title: "Discard changes?",
    content: wrap ? "The changes on this page will be discarded. ".repeat(18) : "The changes on this page will be discarded.",
    divider: true,
    buttons: [{ text: "Cancel", variant: "text" }, { text: "Discard", variant: "text" }],
  });
  win.conformanceDialog = dialog;
  const opener = document.createElement("button");
  opener.dataset.conformanceOpener = "";
  opener.textContent = "Open dialog";
  host.append(opener);
  opener.focus();
  dialog.open();
  if (!dialog.isOpen() || !dialog.element.isConnected || dialog.element.inert) throw new Error("Dialog fixture did not open in the document");
};

const parts = [
  { name: "action", selector: ".mtrl-dialog__footer button" },
  { name: "action2", selector: ".mtrl-dialog__footer button:nth-of-type(2)" },
  { name: "dialog", selector: ".mtrl-dialog" },
  { name: "header", selector: ".mtrl-dialog__header" },
  { name: "title", selector: ".mtrl-dialog__header-title" },
  { name: "body", selector: ".mtrl-dialog__content" },
  { name: "footer", selector: ".mtrl-dialog__footer" },
  { name: "divider", selector: ".mtrl-dialog__footer-divider" },
  { name: "close", selector: ".mtrl-dialog__header button" },
  { name: "closeIcon", selector: ".mtrl-dialog__header button svg" },
  { name: "overlay", selector: ".mtrl-dialog__overlay" },
].map(part => ({ ...part, document: true })) satisfies Part[];

const action = parts[0]!.selector;
const widths = [900, 360];
const closeFocus = {
  width: 900,
  id: "900/medium/light/close-focus",
  mount, scheme: "light" as const, state: "focus" as const, before: 600,
  config: { size: "medium", wrap: false },
  focusTarget: ".mtrl-dialog__header button",
  properties: [...CONFORMANCE_PROPERTIES, "maxHeight", "minWidth", "textAlign", "overflowY", "transitionDuration"],
  parts: [...parts, { name: "verifiedClose", document: true, selector: ".mtrl-dialog__header button:focus-visible" }],
};
const cases = selectFixtureCases([closeFocus, ...widths.flatMap(width => {
  const sizes = width === 360
    ? (["small", "large", "fullscreen", "medium"] as const)
    : (["small", "medium", "large", "fullscreen"] as const);
  return sizes.flatMap(size =>
    (["light", "dark"] as const).flatMap(scheme =>
      (width === 900 && size === "medium" ? ["rest", "hover", "focus", "pressed"] as const : ["rest"] as const)
        .map(state => ({
          width,
          id: `${width}/${size}/${scheme}/${state}`,
          mount, scheme, state, before: 600, config: { size, wrap: width === 360 },
          focusTarget: action,
          properties: [...CONFORMANCE_PROPERTIES, "maxHeight", "minWidth", "textAlign", "overflowY", "transitionDuration"],
          parts: [...parts, ...(state !== "rest"
            ? [{ name: "verifiedAction", document: true, selector: `${action}:${state === "pressed" ? "active" : state === "focus" ? "focus-visible" : "hover"}` }]
            : [])],
        })),
    ),
  );
})]);

const engine = fixtureEngine();
const harness = await createConformanceHarness({ component: "dialog", engine });
try {
  const rows = [];
  for (const width of widths) {
    const measured = cases.filter(testCase => testCase.width === width);
    if (measured.length === 0) continue;
    await harness.page.setViewportSize({ width, height: 600 });
    rows.push(...await harness.measure(measured));
  }
  for (const row of rows) {
    assert.ok(row.parts.dialog && row.parts.title && row.parts.body && row.parts.action, `${row.id}: ${Object.entries(row.parts).filter(([, part]) => !part).map(([name]) => name).join(", ")}`);
    if (row.state !== "rest") assert.ok(row.parts.verifiedAction || row.parts.verifiedClose, row.id);
  }
  await harness.page.setViewportSize({ width: 360, height: 600 });
  await harness.measure([{ id: "overflow", mount, config: { size: "medium", wrap: true }, parts }]);
  const overflow = await harness.page.evaluate(() => {
    const overlay = document.querySelector<HTMLElement>(".mtrl-dialog__overlay")!;
    const title = document.querySelector<HTMLElement>(".mtrl-dialog__header-title")!;
    const footer = document.querySelector<HTMLElement>(".mtrl-dialog__footer")!;
    overlay.scrollTop = 0;
    const titleTop = title.getBoundingClientRect().top;
    overlay.scrollTop = overlay.scrollHeight;
    return {
      scrollHeight: overlay.scrollHeight, clientHeight: overlay.clientHeight,
      titleTop, footerBottom: footer.getBoundingClientRect().bottom,
    };
  });
  await harness.page.setViewportSize({ width: 320, height: 600 });
  const minimum = await harness.page.locator(".mtrl-dialog").evaluate(element => ({
    width: element.getBoundingClientRect().width,
    minWidth: getComputedStyle(element).minWidth,
  }));
  await harness.page.keyboard.press("Escape");
  const closed = await harness.page.evaluate(() => ({
    closed: !(window as Window & { conformanceDialog?: DialogComponent }).conformanceDialog?.isOpen(),
    focusRestored: document.activeElement?.hasAttribute("data-conformance-opener"),
  }));
  assert.ok(closed.closed, "Escape did not close the dialog fixture");
  console.log(JSON.stringify({ source: harness.source, engine, rows, overflow, minimum, closed }, null, 2));
} finally {
  await harness.close();
}
