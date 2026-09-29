// test/components/icon-button/change.test.ts
//
// A toggle icon button reports its state with `change` through its emitter
// (FLO-295), as a switch or checkbox does. The DOM `toggle` it dispatched
// shares its name with the native ToggleEvent; it is kept, deprecated, for one
// release.

import { expect, test } from "bun:test";
import createIconButton from "../../../src/components/icon-button";
import { callbacksFixture } from "../callbacks.fixture";

const mount = callbacksFixture();

test("a click emits change with { selected }, each way", () => {
  const button = mount(createIconButton({ toggle: true, icon: "<svg></svg>", ariaLabel: "Favorite" }));
  const seen: unknown[] = [];
  button.on("change", payload => seen.push(payload));
  button.element.click();
  button.element.click();
  expect(seen).toEqual([{ selected: true }, { selected: false }]);
});

test("the deprecated DOM toggle is still dispatched, once per click", () => {
  const button = mount(createIconButton({ toggle: true, icon: "<svg></svg>", ariaLabel: "Favorite" }));
  const details: unknown[] = [];
  button.element.addEventListener("toggle", event => details.push((event as CustomEvent).detail));
  button.element.click();
  expect(details).toEqual([{ selected: true }]);
});

test("off() stops change; a plain icon button emits none", () => {
  const toggle = mount(createIconButton({ toggle: true, icon: "<svg></svg>", ariaLabel: "Favorite" }));
  const plain = mount(createIconButton({ icon: "<svg></svg>", ariaLabel: "Share" }));
  const seen: unknown[] = [];
  const handler = (payload: { selected: boolean }) => seen.push(payload);
  toggle.on("change", handler).off("change", handler);
  plain.on("change", handler);
  toggle.element.click();
  plain.element.click();
  expect(seen).toEqual([]);
});
