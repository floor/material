import { expect, test } from "bun:test";
import { JSDOM } from "jsdom";

// FLO-334: material/react/jsx types a bare tag's events as React 19 delivers them
// on a custom element: `onchange` (lower case) gets the element's own
// CustomEvent, with its detail; `onChange` stays React's synthetic event,
// which has none. If React changes this, the typing must follow.
test("React 19: onchange on a custom element gets the CustomEvent, onChange a synthetic event without detail", async () => {
  const dom = new JSDOM("<!doctype html><div id=root></div>");
  Object.assign(globalThis, {
    window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement, Node: dom.window.Node, Event: dom.window.Event,
  });
  const React = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { flushSync } = await import("react-dom");
  expect(React.version.startsWith("19.")).toBe(true);
  const seen: Record<string, unknown> = {};
  const root = createRoot(dom.window.document.getElementById("root")!);
  flushSync(() => root.render(React.createElement("m-probe", {
    id: "probe",
    onchange: (event: CustomEvent) => void (seen.lower = event.detail),
    onChange: (event: { detail?: unknown }) => void (seen.camel = event.detail),
  })));
  dom.window.document.getElementById("probe")!.dispatchEvent(
    new dom.window.CustomEvent("change", { bubbles: true, detail: { checked: true } }),
  );
  expect(seen).toEqual({ lower: { checked: true }, camel: undefined });
  root.unmount();
});
