// test/components/search/variant.test.ts
//
// Search's two M3 styles (FLO-287): contained, M3 Expressive's recommendation
// and the default, and divided, the baseline mtrl drew until now.

import { expect, test } from "bun:test";
import createSearch from "../../../src/components/search";
import { callbacksFixture } from "../callbacks.fixture";

const mount = callbacksFixture();
const classes = (element: HTMLElement) => ["contained", "divided"].filter(name => element.classList.contains(`mtrl-search--${name}`));

test("contained is the default", () => {
  const search = mount(createSearch());
  expect(search.getVariant()).toBe("contained");
  expect(classes(search.element)).toEqual(["contained"]);
});

test("divided on request", () => {
  const search = mount(createSearch({ variant: "divided" }));
  expect(search.getVariant()).toBe("divided");
  expect(classes(search.element)).toEqual(["divided"]);
});

test("setVariant switches in place and chains", () => {
  const search = mount(createSearch());
  expect(search.setVariant("divided")).toBe(search);
  expect(classes(search.element)).toEqual(["divided"]);
  search.setVariant("contained");
  expect([search.getVariant(), ...classes(search.element)]).toEqual(["contained", "contained"]);
});

test("the variant is not the element's inline style", () => {
  const search = mount(createSearch({ variant: "divided" }));
  expect(search.element.getAttribute("style") ?? "").not.toContain("divided");
});

// FLO-290: minWidth and maxWidth were accepted and never applied.
test("minWidth and maxWidth reach the root, for the stylesheet", () => {
  const search = mount(createSearch({ minWidth: 240, maxWidth: 480 }));
  expect(search.element.style.getPropertyValue("--mtrl-search-min-width")).toBe("240px");
  expect(search.element.style.getPropertyValue("--mtrl-search-max-width")).toBe("480px");
});
