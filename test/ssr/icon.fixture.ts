// test/ssr/icon.fixture.ts
// Public renderElement scope only. css.fixture registers styles and does not
// install linkedom constructors. HTMLImageElement stays absent.
import { expect, test } from "bun:test";
import "./css.fixture";
import { renderElement } from "../../src/ssr";

const ICON = '<svg viewBox="0 0 24 24"><title>Save</title></svg>';

const iconTag = (html: string): string => html.match(/<span\b[^>]*\bmtrl-icon\b[^>]*>/)?.[0] ?? "";

test("a button icon renders through public renderElement", () => {
  expect(Reflect.get(globalThis, "HTMLImageElement")).toBeUndefined();

  const named = renderElement("m-button", { icon: ICON }, "Text");
  expect(named.includes("shadowrootmode")).toBe(true);
  expect(iconTag(named)).toContain('aria-hidden="true"');
  expect(named).toContain("<title>Save</title>");
  expect(named.match(/<svg\b[^>]*>/)?.[0] ?? "").not.toContain("aria-hidden");

  const fallback = renderElement("m-button", { icon: ICON, label: "Text" }, "");
  expect(fallback.includes("shadowrootmode")).toBe(true);
  expect(iconTag(fallback)).toContain('aria-hidden="true"');
  expect(fallback).toContain("<slot>Text</slot>");
  expect(fallback).toContain("<title>Save</title>");
  expect(fallback.match(/<svg\b[^>]*>/)?.[0] ?? "").not.toContain("aria-hidden");

  const only = renderElement("m-button", { icon: ICON }, "");
  expect(only.includes("shadowrootmode")).toBe(true);
  expect(iconTag(only)).not.toBe("");
  expect(iconTag(only)).not.toContain("aria-hidden");
  expect(only).toContain("<title>Save</title>");
});
