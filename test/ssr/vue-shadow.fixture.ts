// test/ssr/vue-shadow.fixture.ts
// Spawned by vue-shadow.test.ts. No DOM shim: this process is the server.
import { expect, test } from "bun:test";
import { createSSRApp, h } from "vue";
import { renderToString } from "@vue/server-renderer";
import { buttonElement, carouselElement, tabsElement } from "../../src/elements";
import { createComponent } from "../../src/vue/create";
import type { ComponentSpec } from "../../src/elements/adapter";

const render = (spec: ComponentSpec, props: Record<string, unknown>, children?: () => unknown): Promise<string> => {
  const Component = createComponent(spec, () => "m-host", "MHost");
  return renderToString(createSSRApp({ render: () => h(Component, props, children) }));
};

test("an unregistered server returns no template; registration renders one and opt-outs render none", async () => {
  const buttonProps = { variant: "filled", disabled: true, onclick: () => undefined };
  const plain = await render(buttonElement.spec, buttonProps, () => "Save");
  expect(plain).not.toContain("shadowrootmode");
  expect(plain).toContain("disabled");
  expect(plain).toContain("Save");

  await import("../../scripts/fixtures/ssr-css");
  await import("../../src/ssr/vue");
  const bridge = (globalThis as unknown as Record<symbol, { shadow?: unknown; vue?: unknown }>)[Symbol.for("mtrl.ssr")];
  expect(typeof bridge.shadow).toBe("function");
  expect(typeof bridge.vue).toBe("function");

  const html = await render(buttonElement.spec, buttonProps, () => "Save");
  expect(html).toContain('<template shadowrootmode="open" shadowrootdelegatesfocus="">');
  expect(html).toMatch(/<m-button[^>]*>\s*<template shadowrootmode="open"/);
  expect(html).toContain("mtrl-button");
  expect(html).toContain("disabled");
  expect(html).toContain("Save");
  expect(html).not.toContain("onclick");

  const carousel = await render(carouselElement.spec, { ariaLabel: "Photos" }, () => "Light content");
  expect(carousel).not.toContain("shadowrootmode");
  expect(carousel).toContain("Light content");
  expect(carousel).toContain('aria-label="Photos"');

  const tabs = await render(tabsElement.spec, { value: "a" }, () => [
    h("m-tab", { value: "a" }, "Flights"),
    h("m-tab", { value: "b" }, "Trips"),
  ]);
  expect(tabs).toContain('<template shadowrootmode="open" shadowrootdelegatesfocus="">');
  expect(tabs).toContain("Flights");
  expect(tabs).toContain("Trips");
});
