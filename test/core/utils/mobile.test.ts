// test/core/utils/mobile.test.ts
//
// normalizeEvent is the conversion every touch-capable component reads a
// gesture through. It has three outcomes: a touch event with a point reads that
// point, a mouse-like event reads its own coordinates, and anything else
// reports zero. These cases pin each outcome, the branch order between them,
// and the event fields the normalized value carries.
import { describe, expect, test } from "bun:test";
import { JSDOM } from "jsdom";
import {
  normalizeEvent,
  type NormalizedEvent,
} from "../../../src/core/utils/mobile";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
const { window } = dom;
const { document } = window;

type Point = {
  clientX: number;
  clientY: number;
  pageX: number;
  pageY: number;
};

const point = (
  clientX: number,
  clientY: number,
  pageX: number,
  pageY: number,
): Point => ({ clientX, clientY, pageX, pageY });

const touchEvent = (
  type: string,
  touches: Point[],
  extra: Record<string, unknown> = {},
): Event => {
  const event = new window.Event(type, { bubbles: true });
  Object.defineProperty(event, "touches", {
    value: Object.assign({ length: touches.length }, touches),
  });
  for (const [key, value] of Object.entries(extra)) {
    Object.defineProperty(event, key, { value });
  }
  return event;
};

const coordinates = ({
  clientX,
  clientY,
  pageX,
  pageY,
}: NormalizedEvent): Point => ({ clientX, clientY, pageX, pageY });

const ZERO: Point = { clientX: 0, clientY: 0, pageX: 0, pageY: 0 };

const CASES: { name: string; event: Event; expected: Point }[] = [
  {
    name: "a mouse event reads its own coordinates",
    event: new window.MouseEvent("click", { clientX: 12, clientY: 34 }),
    expected: point(12, 34, 12, 34),
  },
  {
    name: "a mouse event at the origin reads zeros rather than falling back",
    event: new window.MouseEvent("click", { clientX: 0, clientY: 0 }),
    expected: ZERO,
  },
  {
    name: "a touch event reads its first point, including page coordinates",
    event: touchEvent("touchstart", [point(12, 34, 22, 44)]),
    expected: point(12, 34, 22, 44),
  },
  {
    name: "a touch event with several points reads the first",
    event: touchEvent("touchmove", [point(1, 2, 3, 4), point(5, 6, 7, 8)]),
    expected: point(1, 2, 3, 4),
  },
  {
    name: "a touch event with no point reports zeros",
    event: touchEvent("touchend", []),
    expected: ZERO,
  },
  {
    name: "a touch event with no point but mouse coordinates reads the coordinates",
    event: touchEvent("touchend", [], {
      clientX: 9,
      clientY: 8,
      pageX: 19,
      pageY: 18,
    }),
    expected: point(9, 8, 19, 18),
  },
  {
    name: "an event with no coordinates reports zeros",
    event: new window.Event("scroll", { bubbles: true }),
    expected: ZERO,
  },
  {
    name: "a keyboard event reports zeros",
    event: new window.KeyboardEvent("keydown", { key: "Enter" }),
    expected: ZERO,
  },
  {
    name: "an event with only clientX is not read as a mouse event",
    event: (() => {
      const event = new window.Event("click");
      Object.defineProperty(event, "clientX", { value: 5 });
      return event;
    })(),
    expected: ZERO,
  },
];

describe("normalizeEvent", () => {
  for (const { name, event, expected } of CASES) {
    test(name, () => {
      expect(coordinates(normalizeEvent(event))).toEqual(expected);
    });
  }

  test("target and type come from the event, and the call-throughs reach it", () => {
    const element = document.createElement("div");
    document.body.appendChild(element);
    const event = new window.MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      clientX: 5,
      clientY: 6,
    });
    const calls: string[] = [];
    event.preventDefault = () => {
      calls.push("preventDefault");
    };
    event.stopPropagation = () => {
      calls.push("stopPropagation");
    };

    let normalized: NormalizedEvent | undefined;
    element.addEventListener("click", (received) => {
      normalized = normalizeEvent(received);
    });
    element.dispatchEvent(event);

    expect(normalized?.target).toBe(element);
    expect(normalized?.type).toBe("click");
    normalized!.preventDefault();
    normalized!.stopPropagation();
    expect(calls).toEqual(["preventDefault", "stopPropagation"]);
  });
});
