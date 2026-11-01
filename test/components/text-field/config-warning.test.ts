import { afterEach, beforeEach, expect, test } from "bun:test";
import createTextField from "../../../src/components/text-field";
import type { TextFieldConfig } from "../../../src/components/text-field/types";
import { callbacksFixture } from "../callbacks.fixture";

const mount = callbacksFixture();
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

// The keys a consumer might mistype are the point of the diagnostic, so the
// typo spellings arrive deliberately untyped.
const unknown = (config: Record<string, unknown>) => () =>
  mount(createTextField(config as unknown as TextFieldConfig));

test("an unknown config key warns in development and is left ignored", () => {
  const field = unknown({ maxlength: 10, inputmode: "numeric" })();
  expect(messages).toHaveLength(2);
  expect(messages[0]).toContain('unknown config key "maxlength"');
  expect(messages[0]).toContain('"maxLength"');
  // no supported spelling for the second key: the diagnostic names it alone
  expect(messages[1]).toContain('unknown config key "inputmode"');
  expect(messages[1]).not.toContain("did you mean");
  // the diagnostic changes nothing: the keys stay ignored, as measured
  expect(field.input.getAttribute("maxlength")).toBe(null);
  expect(field.input.maxLength).toBe(-1);
  expect(field.input.getAttribute("inputmode")).toBe(null);
});

test("every supported key stays quiet, on the factory and the element path", () => {
  const field = mount(createTextField({
    type: "text", variant: "outlined", density: "compact", name: "n", label: "l",
    value: "v", placeholder: "p", required: true, noAsterisk: true, disabled: false,
    readonly: false, maxLength: 20, pattern: ".*", autocomplete: "off",
    leadingIcon: "<svg></svg>", trailingIcon: "<svg></svg>", trailingIconLabel: "Clear",
    onTrailingClick: () => {}, supportingText: "s", error: false, prefixText: "pre",
    suffixText: "suf", class: "c", prefix: "mtrl", componentName: "text-field",
    className: "cc", id: "i", title: "t", tabIndex: 0, style: {}, data: {},
    role: "textbox", ariaLabel: "al", ariaDescribedBy: "adb", ariaLabelledBy: "alb",
    ariaHidden: false, multiline: true,
  }));
  expect(field.input.maxLength).toBe(20);
  expect(messages).toEqual([]);
});

test("a known-but-ignored key stays quiet: the prefix is fixed at build time", () => {
  unknown({ prefix: "other" })();
  expect(messages).toEqual([]);
});

test("production is silent for unknown config keys", () => {
  process.env.NODE_ENV = "production";
  unknown({ maxlength: 10 })();
  expect(messages).toEqual([]);
});
