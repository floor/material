// test/ssr/solid-shadow.fixture.ts
// Spawned by solid-shadow.test.ts. No DOM shim: this process is the server.
import { expect, test } from "bun:test";
import { createComponent as createSolid } from "solid-js";
import { renderToString } from "solid-js/web";
import { buttonElement, carouselElement, tabsElement } from "../../src/elements";
import { createComponent } from "../../src/solid/create";

const render = (spec: Parameters<typeof createComponent>[0], props: Record<string, unknown>): string => {
  const Component = createComponent(spec, () => "m-host");
  return renderToString(() => createSolid(Component, props));
};

test("an unregistered server returns no template; registration renders one and opt-outs render none", async () => {
  const buttonProps = { variant: "filled", disabled: true, children: "Save", onClick: () => undefined };
  const plain = render(buttonElement.spec, buttonProps);
  expect(plain).not.toContain("shadowrootmode");
  expect(plain).toContain("disabled");
  expect(plain).toContain("Save");

  await import("../../scripts/fixtures/ssr-css");
  await import("../../src/ssr/solid");
  const bridge = (globalThis as unknown as Record<symbol, { shadow?: unknown; solid?: unknown }>)[Symbol.for("mtrl.ssr")];
  expect(typeof bridge.shadow).toBe("function");
  expect(typeof bridge.solid).toBe("function");

  const html = render(buttonElement.spec, buttonProps);
  expect(html).toContain('<template shadowrootmode="open" shadowrootdelegatesfocus="">');
  expect(html).toMatch(/<m-button[^>]*>\s*<template shadowrootmode="open"/);
  expect(html).toContain("mtrl-button");
  expect(html).toContain("disabled");
  expect(html).toContain("Save");
  expect(html).not.toContain("onClick");

  const carousel = render(carouselElement.spec, { ariaLabel: "Photos", children: "Light content" });
  expect(carousel).not.toContain("shadowrootmode");
  expect(carousel).toContain("Light content");
  expect(carousel).toContain("aria-label=\"Photos\"");

  const tabs = render(tabsElement.spec, {
    value: "a",
    children: '<m-tab value="a">Flights</m-tab><m-tab value="b">Trips</m-tab>',
  });
  expect(tabs).toContain('<template shadowrootmode="open" shadowrootdelegatesfocus="">');
  expect(tabs).toContain("Flights");
  expect(tabs).toContain("Trips");
});
