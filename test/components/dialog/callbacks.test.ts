import { expect, jest, test } from "bun:test";
import createDialog from "../../../src/components/dialog";
import type { DialogComponent, DialogEvent } from "../../../src/components/dialog/types";
import { callbacksFixture, wait } from "../callbacks.fixture";

const mount = callbacksFixture();

// On the test's own clock (FLO-569): `afteropen` is on a timer that starts when
// the 10ms show timer runs, so a real 30ms wait could end before it on a busy
// runner. The fixture's own waits, after the test, stay on the real clock.
test("all six dialog lifecycle events carry the finished dialog", () => {
  const events: DialogEvent[] = [];
  const dialog = mount(createDialog({ title: "Settings", animationDuration: 0, on: { beforeopen: event => { events.push(event); } } }));
  for (const name of ["open", "afteropen", "beforeclose", "close", "afterclose"] as const) dialog.on(name, event => { events.push(event); });
  jest.useFakeTimers();
  try {
    dialog.open();
    jest.advanceTimersByTime(30);
    dialog.close();
    jest.advanceTimersByTime(30);
  } finally {
    jest.useRealTimers();
  }
  expect(events).toHaveLength(6);
  for (const event of events) expect(event.dialog === dialog).toBe(true);
  expect(events[0].dialog.getTitle()).toBe("Settings");
});

test("dialog cancellation and off still operate on the original handler", async () => {
  const events: DialogEvent[] = [];
  const dialog = mount(createDialog({ animationDuration: 0 }));
  const prevent = (event: DialogEvent): void => { events.push(event); event.preventDefault(); };
  dialog.on("beforeopen", prevent);
  dialog.open();
  await wait();
  expect(dialog.isOpen()).toBe(false);
  expect(events[0].dialog === dialog).toBe(true);
  dialog.off("beforeopen", prevent);
  dialog.open();
  await wait();
  expect(dialog.isOpen()).toBe(true);
  expect(events).toHaveLength(1);
  dialog.close();
  await wait();
});

for (const addedLater of [false, true]) {
  test(`dialog button ${addedLater ? "added later" : "from config"} can call dialog.close()`, async () => {
    const calls: DialogComponent[] = [];
    const button = { text: "Save", closeDialog: false, onClick: (_event: MouseEvent, dialog: DialogComponent): void => {
      calls.push(dialog);
      dialog.setTitle("Saved").close();
    } };
    const dialog = mount(createDialog({ title: "Edit", animationDuration: 0, buttons: addedLater ? [] : [button] }));
    if (addedLater) dialog.addButton(button);
    dialog.open();
    await wait();
    dialog.element.querySelector<HTMLButtonElement>(".mtrl-dialog__footer button")!.click();
    await wait();
    expect(calls).toHaveLength(1);
    expect(calls[0] === dialog).toBe(true);
    expect(dialog.getTitle()).toBe("Saved");
    expect(dialog.isOpen()).toBe(false);
  });
}

test("a dialog button returning false keeps the dialog open", async () => {
  const calls: DialogComponent[] = [];
  const dialog = mount(createDialog({ animationDuration: 0, buttons: [{ text: "Keep editing", onClick: (_event, component) => { calls.push(component); return false; } }] }));
  dialog.open();
  await wait();
  dialog.element.querySelector<HTMLButtonElement>(".mtrl-dialog__footer button")!.click();
  expect(calls[0] === dialog).toBe(true);
  expect(dialog.isOpen()).toBe(true);
  dialog.close();
  await wait();
});
