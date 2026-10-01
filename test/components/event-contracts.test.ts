// test/components/event-contracts.test.ts
import { expect, test } from "bun:test";
import { callbacksFixture } from "./callbacks.fixture";
import createButton from "../../src/components/button";
import createList from "../../src/components/list";
import createCard from "../../src/components/card";
import { withExpandable } from "../../src/components/card/features";
import createCheckbox from "../../src/components/checkbox";
import createSwitch from "../../src/components/switch";
import createIconButton from "../../src/components/icon-button";
import createFab from "../../src/components/fab";
import createExtendedFab from "../../src/components/extended-fab";
import createSlider from "../../src/components/slider";
import createDatePicker from "../../src/components/datepicker";
import createTimePicker from "../../src/components/timepicker";
const mount = callbacksFixture();

test("button toggle keeps its selected-only payload", () => {
  const c = mount(createButton({ toggle: true }));
  const seen: unknown[] = [];
  c.on("change", payload => seen.push(payload));
  c.element.click();
  expect(seen).toEqual([{ selected: true }]);
});
test("card expandedChanged keeps presentation state", () => {
  const c = mount(createCard());
  const enhanced = withExpandable()(c);
  const seen: unknown[] = [];
  c.on("expandedChanged", payload => seen.push([payload, enhanced.expandable.isExpanded()]));
  enhanced.expandable.setExpanded(true);
  expect(seen).toEqual([[{ expanded: true }, true]]);
});
test("list forwards the actual native keyboard and scroll events", () => {
  const c = mount(createList({ items: [] }));
  for (const type of ["keydown", "scroll"] as const) {
    const seen: unknown[] = [];
    const event = type === "keydown" ? new KeyboardEvent(type, { key: "Escape" }) : new Event(type);
    const handler = (payload: unknown) => seen.push(payload);
    c.on(type, handler);
    c.element.dispatchEvent(event);
    expect(seen).toEqual([{ event, element: c.element, originalEvent: event }]);
    c.off(type, handler);
    c.element.dispatchEvent(event);
    expect(seen).toHaveLength(1);
  }
});
for (const [name, create] of Object.entries({ checkbox: createCheckbox, switch: createSwitch, iconButton: createIconButton, fab: createFab, extendedFab: createExtendedFab, card: () => createCard({ interactive: true }), slider: createSlider, datepicker: createDatePicker, timepicker: createTimePicker })) {
  test(`${name} interactive gestures retain normalized and swipe payloads`, () => {
    const c: {
      element: HTMLElement;
      on(event: "tap", handler: (payload: import("../../src/core/utils/mobile").NormalizedEvent) => void): unknown;
      on(event: "swipe", handler: (payload: import("../../src/core/utils/mobile").SwipePayload) => void): unknown;
    } = mount(create({ ariaLabel: "Gesture test" }));
    const taps: unknown[] = [], swipes: unknown[] = [];
    c.on("tap", payload => taps.push(payload));
    c.on("swipe", payload => swipes.push(payload));
    for (const [type, x] of [["touchstart", 0], ["touchmove", 80], ["touchend", 80]] as const) {
      const event = new Event(type, { bubbles: true });
      Object.defineProperty(event, "touches", { value: [{ clientX: x, clientY: 0, pageX: x, pageY: 0 }] });
      c.element.dispatchEvent(event);
    }
    expect(swipes).toEqual([{ direction: "right", deltaX: 80, deltaY: 0 }]);
    expect(taps).toHaveLength(1);
    expect(taps[0]).toMatchObject({ clientX: 80, type: "touchend", target: c.element });
  });
}

test("slider retains both forwarded and normalized touch notifications", () => {
  const c = mount(createSlider());
  const seen: Record<string, unknown[]> = { touchstart: [], touchmove: [], touchend: [] };
  for (const type of ["touchstart", "touchmove", "touchend"] as const) c.on(type, payload => seen[type].push(payload));
  for (const [type, x] of [["touchstart", 0], ["touchmove", 80], ["touchend", 80]] as const) {
    const event = new Event(type, { bubbles: true });
    Object.defineProperty(event, "touches", { value: [{ clientX: x, clientY: 0, pageX: x, pageY: 0 }] });
    c.element.dispatchEvent(event);
    expect(seen[type]).toHaveLength(2);
    expect(seen[type]).toContainEqual({ event, element: c.element, originalEvent: event });
    expect(seen[type].some(payload => typeof payload === "object" && payload !== null && "clientX" in payload)).toBe(true);
  }
  expect(seen.touchmove.some(payload => typeof payload === "object" && payload !== null && "deltaX" in payload && payload.deltaX === 80)).toBe(true);
});
