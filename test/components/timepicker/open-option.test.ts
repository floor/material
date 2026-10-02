// The time picker's config option that opens it at creation is `open`, as on
// the dialog and the drawer. It was `isOpen`, the name of the method that
// reads the state (FLO-548).
import { expect, test } from "bun:test";
import createTimePicker from "../../../src/components/timepicker";
import type { TimePickerConfig } from "../../../src/components/timepicker/types";
import { callbacksFixture, wait } from "../callbacks.fixture";

const mount = callbacksFixture();

test("open: true opens the picker once it is created, and emits open", async () => {
  const seen: string[] = [];
  const picker = mount(createTimePicker({ value: "09:30", open: true, on: { open: () => { seen.push("open"); } } }));
  await wait();
  expect(picker.isOpen()).toBe(true);
  expect(seen).toEqual(["open"]);
});

test("without it the picker starts closed", async () => {
  const picker = mount(createTimePicker({ value: "09:30" }));
  await wait();
  expect(picker.isOpen()).toBe(false);
});

test("a leftover isOpen: true is ignored: the picker stays closed", async () => {
  const picker = mount(createTimePicker({ value: "09:30", isOpen: true } as TimePickerConfig));
  await wait();
  expect(picker.isOpen()).toBe(false);
});
