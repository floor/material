// test/components/dialog/escape-inside.test.ts
//
// Family 6: Escape belongs to the innermost thing that is open. A menu
// open inside a dialog closes on Escape and the dialog stays; the next Escape
// closes the dialog. The dialog's Escape listener is on the window, after the
// menu's on the document, and leaves a key the menu has used.
import { beforeEach, describe, expect, test } from "bun:test";
import createDialog from "../../../src/components/dialog";
import createMenu from "../../../src/components/menu";
import { callbacksFixture, wait } from "../callbacks.fixture";

const mount = callbacksFixture();

// JSDOM has no showModal(), and without it `layer: "top"` falls back to the
// default layer: stubbed on each test's window, as in modal-layer.test.ts.
beforeEach(() => {
  (globalThis as unknown as Record<string, unknown>).HTMLDialogElement = window.HTMLDialogElement;
  const proto = window.HTMLDialogElement.prototype as unknown as Record<string, unknown>;
  proto.showModal = function (this: HTMLDialogElement) { this.setAttribute("open", ""); };
  proto.close = function (this: HTMLDialogElement) {
    if (!this.hasAttribute("open")) return;
    this.removeAttribute("open");
    setTimeout(() => this.dispatchEvent(new Event("close")), 0);
  };
});

const escape = (target: EventTarget): KeyboardEvent => {
  const event = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
};

for (const layer of [undefined, "top"] as const) {
  describe(`a menu open inside a dialog, ${layer ? "top layer" : "default layer"}`, () => {
    test("Escape closes the menu and leaves the dialog; the next Escape closes the dialog", async () => {
      const dialog = mount(createDialog({ title: "Share", content: '<button id="more" type="button">More</button>', layer, animationDuration: 20 }));
      dialog.open();
      await wait(80);
      const opener = dialog.element.querySelector<HTMLElement>("#more")!;
      const menu = mount(createMenu({ opener, items: [{ id: "copy", text: "Copy" }] }));
      await wait();
      menu.open();
      await wait(160);
      expect([dialog.isOpen(), menu.isOpen()]).toEqual([true, true]);

      escape(opener);
      expect([dialog.isOpen(), menu.isOpen()]).toEqual([true, false]);
      await wait(60);
      escape(opener);
      expect([dialog.isOpen(), menu.isOpen()]).toEqual([false, false]);
    });
  });
}
