// test/ssr/sheet-variant.fixture.ts
// Spawned so the server DOM scope is this process, not a browser's.
import { expect, test } from "bun:test";
import "./css.fixture";
import { renderElement } from "../../src/ssr";

const shadowOf = (tag: string, markup: string): string => {
  const bridge = (globalThis as unknown as Record<symbol, { shadow?: (tag: string, markup: string, prefix: string) => string }>)[Symbol.for("mtrl.ssr")];
  if (typeof bridge?.shadow !== "function") throw new Error("SSR shadow bridge is missing");
  return bridge.shadow(tag, markup, "m");
};

test("renderElement accepts variant=modal and emits a dialog", () => {
  const bottom = renderElement("m-bottom-sheet", { variant: "modal", headline: "Title" }, "Body");
  expect(bottom).toContain('variant="modal"');
  expect(bottom).toContain("<dialog");
  expect(bottom).toContain("mtrl-bottom-sheet--modal");
  expect(bottom).not.toContain('role="region"');

  const side = renderElement("m-side-sheet", { variant: "modal", headline: "Title" }, "Body");
  expect(side).toContain('variant="modal"');
  expect(side).toContain("<dialog");
  expect(side).toContain("mtrl-side-sheet--modal");
  expect(side).not.toContain('role="complementary"');
});

test("boolean modal still emits a dialog", () => {
  expect(renderElement("m-bottom-sheet", { modal: true, headline: "Title" }, "Body")).toContain("<dialog");
  expect(renderElement("m-side-sheet", { modal: true, headline: "Title" }, "Body")).toContain("<dialog");
});

test("a sheet without variant stays a region or a complementary", () => {
  expect(renderElement("m-bottom-sheet", { headline: "Title" }, "Body")).toContain('role="region"');
  expect(renderElement("m-side-sheet", { headline: "Title" }, "Body")).toContain('role="complementary"');
});

test("framework SSR keeps variant=modal and emits a dialog", () => {
  const bottom = shadowOf("m-bottom-sheet", `<m-bottom-sheet variant="modal" headline="Title">Body</m-bottom-sheet>`);
  expect(bottom).toContain("<dialog");
  expect(bottom).toContain("mtrl-bottom-sheet--modal");
  expect(bottom).not.toContain('role="region"');

  const side = shadowOf("m-side-sheet", `<m-side-sheet variant="modal" headline="Title">Body</m-side-sheet>`);
  expect(side).toContain("<dialog");
  expect(side).toContain("mtrl-side-sheet--modal");
  expect(side).not.toContain('role="complementary"');
});
