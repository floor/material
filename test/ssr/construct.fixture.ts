// test/ssr/construct.fixture.ts
import { expect, test } from "bun:test";
import * as linkedom from "linkedom";
import { cases } from "../../scripts/fixtures/preupgrade-cases";

const view = linkedom.parseHTML("<!doctype html><html><head></head><body></body></html>");
// Install only linkedom's DOM, without layout, animation or observer shims.
for (const [name, value] of Object.entries(linkedom)) {
  if (typeof value === "function" && /^[A-Z]/.test(name)) {
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  }
}
Object.assign(globalThis, {
  window: view,
  self: view,
  document: view.document,
  customElements: view.customElements,
  MutationObserver: view.MutationObserver,
});

// Import after installing the DOM: element classes extend its HTMLElement.
const { defineAll, elements } = await import("../../src/elements");
const { setHTML } = await import("../../src/core/dom/html");
defineAll();

test("the server DOM has no browser-only APIs", () => {
  for (const name of ["getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame", "ResizeObserver", "matchMedia"]) {
    expect(Reflect.get(globalThis, name), name).toBeUndefined();
    expect(Reflect.get(view, name), name).toBeUndefined();
  }
  expect(view.HTMLElement.prototype.attachInternals).toBeUndefined();
});

test("default fixtures cover all 36 registered elements", () => {
  expect(Object.keys(elements)).toHaveLength(36);
  expect(cases.filter(({ variant }) => variant === "default").map(({ element }) => element).sort())
    .toEqual(Object.values(elements).map(({ spec }) => spec.name).sort());
});

for (const { spec } of Object.values(elements)) {
  test(`${spec.name} constructs and cleans up without browser-only APIs`, async () => {
    const fixture = cases.find(({ element, variant }) => element === spec.name && variant === "default");
    expect(fixture).toBeDefined();
    const container = document.createElement("div");
    try {
      setHTML(container, fixture!.html);
      document.body.append(container); // connectedCallback builds the real factory.
      const host = container.firstElementChild as HTMLElement & { component: unknown };
      expect(host.component).toBeTruthy();
      expect(host.shadowRoot?.childElementCount).toBeGreaterThan(0);
      // Include construction's deferred work (notably tabs' 50 ms timer).
      await new Promise((resolve) => setTimeout(resolve, 60));
    } finally {
      container.remove();
      // Element teardown runs in a microtask after disconnection.
      await Promise.resolve();
    }
  });
}
