import { afterEach, beforeEach, expect, test } from "bun:test";
import createTextField from "../../../src/components/text-field";
import { callbacksFixture } from "../callbacks.fixture";

const mount = callbacksFixture();
const icon = "<svg></svg>";
let messages: string[];
let previousMode: string | undefined;
let originalWarn: typeof console.warn;
beforeEach(() => {
  previousMode = process.env.NODE_ENV;
  process.env.NODE_ENV = "development";
  originalWarn = console.warn;
  messages = [];
  console.warn = (...args: unknown[]) => { messages.push(args.map(String).join(" ")); };
});
afterEach(() => {
  console.warn = originalWarn;
  if (previousMode === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = previousMode;
});

test("a trailing listener on an unlabeled icon warns once per field and leaves it decorative", () => {
  const field = mount(createTextField({ trailingIcon: icon, value: "secret" }));
  const slot = field.trailingIcon;
  let calls = 0;
  const handler = () => { calls++; };
  expect(field.on("trailing", handler)).toBe(field);
  field.on("trailing", () => {});
  field.off("trailing", handler).on("trailing", handler);
  slot!.click();
  expect(messages).toHaveLength(1);
  expect(messages[0]).toContain("trailingIconLabel");
  expect(messages[0]).toContain("trailing-icon-label");
  expect(field.trailingIcon).toBe(slot);
  expect(slot!.tagName).toBe("SPAN");
  expect(slot!.getAttribute("aria-hidden")).toBe("true");
  expect(calls).toBe(0);
  expect(field.getValue()).toBe("secret");
  const other = mount(createTextField({ trailingIcon: icon }));
  other.on("trailing", handler);
  expect(messages).toHaveLength(2);
});

test("onTrailingClick receives the same missing-label diagnostic", () => {
  mount(createTextField({ trailingIcon: icon, onTrailingClick: () => {} }));
  expect(messages).toHaveLength(1);
});

test("a decorative icon, other events, and a field without an icon stay quiet", () => {
  mount(createTextField({ trailingIcon: icon })).on("input", () => {});
  mount(createTextField()).on("trailing", () => {});
  expect(messages).toEqual([]);
});

test("a label supplied at creation or before subscribing stays quiet and keeps the action", () => {
  for (const field of [
    mount(createTextField({ trailingIcon: icon, trailingIconLabel: "Reveal" })),
    mount(createTextField({ trailingIcon: icon })).setTrailingIcon(icon, "Reveal"),
  ]) {
    let calls = 0;
    field.on("trailing", () => { calls++; });
    field.trailingIcon!.click();
    expect(calls).toBe(1);
  }
  expect(messages).toEqual([]);
});

test("production is silent for an unlabeled trailing listener", () => {
  process.env.NODE_ENV = "production";
  mount(createTextField({ trailingIcon: icon })).on("trailing", () => {});
  expect(messages).toEqual([]);
});
