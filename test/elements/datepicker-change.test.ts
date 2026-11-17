import { describe, expect, test } from "bun:test";
import { datepickerElement } from "../../src/elements/datepicker";

// The element's `change` carries `date`, the Date form of its
// `value`, in the same shape whichever way the factory reported the range.
const detail = (payload: unknown): unknown => datepickerElement.spec.events.change.detail(payload);
const start = new Date(2026, 8, 14);
const end = new Date(2026, 8, 16);

describe("<m-datepicker> change detail", () => {
  test("a range as a pair gives the pair", () => {
    expect(detail({ value: [start, end], rangeEndDate: end })).toEqual({ value: "2026-09-14/2026-09-16", date: [start, end] });
  });

  test("a range as a start and a separate end gives the pair too", () => {
    expect(detail({ value: start, rangeEndDate: end })).toEqual({ value: "2026-09-14/2026-09-16", date: [start, end] });
  });

  test("a single date gives the Date, and empty gives null", () => {
    expect(detail({ value: start, rangeEndDate: null })).toEqual({ value: "2026-09-14", date: start });
    expect(detail({ value: null, rangeEndDate: null })).toEqual({ value: "", date: null });
  });
});


test("early years keep four digits in single and range change values", () => {
  const date = new Date(0); date.setFullYear(99, 0, 2); date.setHours(0, 0, 0, 0);
  expect(detail({ value: date, rangeEndDate: null })).toEqual({ value: "0099-01-02", date });
  expect(detail({ value: [date, date], rangeEndDate: date })).toEqual({ value: "0099-01-02/0099-01-02", date: [date, date] });
});
