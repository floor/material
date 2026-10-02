// test/components/modal-escape-pickers.test.ts
//
// FLO-548 family 6, part C: the time picker, the modal date picker and the
// full-screen search on the Escape stack of core/dom/layer. Escape is a key
// press, prevented, answered by the topmost modal only, and never the key
// press that opened it. The docked date picker's outside click is told from
// the click that opened it by the marker, not by the task. And the time
// picker's `open` option is applied when the factory returns.
import { beforeEach, describe, expect, test } from "bun:test";
import createTimePicker from "../../src/components/timepicker";
import createDatePicker from "../../src/components/datepicker";
import createSearch from "../../src/components/search";
import createDialog from "../../src/components/dialog";
import { callbacksFixture, wait } from "./callbacks.fixture";

const mount = callbacksFixture();

// JSDOM has no showModal(): stubbed on each test's window, the open attribute
// and a queued close event, as in modal-layer.test.ts.
beforeEach(() => {
  (globalThis as unknown as Record<string, unknown>).HTMLDialogElement = window.HTMLDialogElement;
  const proto = window.HTMLDialogElement.prototype as unknown as Record<string, unknown>;
  const show = function (this: HTMLDialogElement) { this.setAttribute("open", ""); };
  proto.showModal = show;
  proto.show = show;
  proto.close = function (this: HTMLDialogElement) {
    if (!this.hasAttribute("open")) return;
    this.removeAttribute("open");
    setTimeout(() => this.dispatchEvent(new Event("close")), 0);
  };
});

const escape = (target: EventTarget = document.body): KeyboardEvent => {
  const event = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
};
/** Escape as the browser reports a close request to a modal <dialog>. */
const cancel = (dialog: Element): Event => {
  const event = new Event("cancel", { cancelable: true });
  dialog.dispatchEvent(event);
  return event;
};
/** A button of the page whose Escape keydown calls `open`. */
const opensOnEscape = (open: () => unknown): HTMLElement => {
  const button = document.body.appendChild(document.createElement("button"));
  button.addEventListener("keydown", (event) => { if (event.key === "Escape") open(); }, { once: true });
  return button;
};

interface Modal {
  element: HTMLElement;
  open: () => unknown;
  isOpen: () => boolean;
  destroy: () => void;
}
const kinds: Array<[string, () => Modal]> = [
  ["time picker", () => mount(createTimePicker({ value: "09:30" })) as unknown as Modal],
  ["date picker, modal", () => mount(createDatePicker({ label: "Date", variant: "modal" })) as unknown as Modal],
  ["search, full screen", () => {
    const search = mount(createSearch({ viewMode: "fullscreen" }));
    return { element: search.element, open: () => search.expand(), isOpen: () => search.isExpanded(), destroy: () => search.destroy() };
  }],
];

for (const [name, create] of kinds) {
  describe(`${name}: Escape is a key press`, () => {
    test("Escape with focus on the body closes it and is prevented", async () => {
      const modal = create();
      await wait();
      modal.open();
      expect(modal.isOpen()).toBe(true);
      expect(escape().defaultPrevented).toBe(true);
      expect(modal.isOpen()).toBe(false);
    });

    test("the Escape that opened it is prevented and does not close it; one in the same task does", async () => {
      const modal = create();
      await wait();
      const opener = opensOnEscape(() => modal.open());
      expect(escape(opener).defaultPrevented).toBe(true);
      expect(modal.isOpen()).toBe(true);
      escape();
      expect(modal.isOpen()).toBe(false);
    });

    test("the browser's cancel in the task it opened in is the opening key's; a later one closes it", async () => {
      const modal = create();
      await wait();
      modal.open();
      const dialog = modal.element.querySelector("dialog") ?? modal.element;
      expect(cancel(dialog).defaultPrevented).toBe(true);
      expect(modal.isOpen()).toBe(true);
      await wait(0);
      cancel(dialog);
      expect(modal.isOpen()).toBe(false);
    });

    test("opened above a dialog, it takes Escape first", async () => {
      const dialog = mount(createDialog({ title: "Schedule", layer: "top", animationDuration: 0 }));
      dialog.open();
      const modal = create();
      await wait();
      modal.open();
      escape();
      expect([dialog.isOpen(), modal.isOpen()]).toEqual([true, false]);
      escape();
      expect([dialog.isOpen(), modal.isOpen()]).toEqual([false, false]);
    });

    test("closed, it has left the stack: Escape is the page's again", async () => {
      const modal = create();
      await wait();
      modal.open();
      escape();
      expect(escape().defaultPrevented).toBe(false);
    });
  });
}

describe("time picker: Escape cancels", () => {
  test("the key press emits cancel and close, once each", async () => {
    const picker = mount(createTimePicker({ value: "09:30" }));
    const seen: string[] = [];
    for (const name of ["cancel", "close"] as const) picker.on(name, () => { seen.push(name); });
    await wait();
    picker.open();
    escape();
    expect(seen).toEqual(["cancel", "close"]);
  });
});

describe("time picker: the open option", () => {
  test("open: true is open when the factory returns, and open has been emitted", () => {
    const seen: string[] = [];
    const picker = mount(createTimePicker({ value: "09:30", open: true, onOpen: () => { seen.push("open"); } }));
    expect(picker.isOpen()).toBe(true);
    expect(seen).toEqual(["open"]);
  });

  test("its surface is shown where the caller put the picker, a task later", async () => {
    const picker = createTimePicker({ value: "09:30", open: true });
    const dialog = picker.element.querySelector("dialog")!;
    // Not on the page yet: nothing is shown, and the picker has not put itself there
    expect(picker.element.isConnected).toBe(false);
    expect(dialog.hasAttribute("open")).toBe(false);
    const place = document.body.appendChild(document.createElement("section"));
    place.append(picker.element);
    await wait();
    expect(picker.element.parentElement).toBe(place);
    expect(dialog.hasAttribute("open")).toBe(true);
    expect(picker.isOpen()).toBe(true);
    picker.destroy();
  });

  test("closed before that task, it is never shown", async () => {
    const picker = mount(createTimePicker({ value: "09:30", open: true }));
    picker.close();
    await wait();
    expect(picker.isOpen()).toBe(false);
    expect(picker.element.querySelector("dialog")!.hasAttribute("open")).toBe(false);
  });
});

describe("date picker, docked: the click that opened it", () => {
  const click = (target: EventTarget): MouseEvent => {
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    target.dispatchEvent(event);
    return event;
  };

  test("does not close it; a click outside in the same task does", async () => {
    const picker = mount(createDatePicker({ label: "Date" }));
    await wait();
    const outside = document.body.appendChild(document.createElement("button"));
    outside.addEventListener("click", () => { picker.open(); }, { once: true });
    click(outside);
    expect(picker.isOpen()).toBe(true);
    // No task has passed, no timer has run
    click(outside);
    expect(picker.isOpen()).toBe(false);
  });

  test("opened by code outside any event, the first click outside closes it", async () => {
    const picker = mount(createDatePicker({ label: "Date" }));
    await wait();
    picker.open();
    click(document.body);
    expect(picker.isOpen()).toBe(false);
  });
});
