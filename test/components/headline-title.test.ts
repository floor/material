// test/components/headline-title.test.ts
//
// FLO-347: on the dialog, the time picker and the sheets, `title` is the
// headline. createElementConfig passed it on as the element's `title`, the
// native tooltip, which then showed over the whole surface. The headline names
// the surface through aria-labelledby instead. The dialog's role follows the
// M3 site: "On web, basic dialogs should have the alert dialog role"; a
// full-screen dialog holds a task and is a plain dialog.
import { describe, expect, test } from "bun:test";
import createDialog from "../../src/components/dialog";
import createTimePicker from "../../src/components/timepicker";
import createSideSheet from "../../src/components/side-sheet";
import createBottomSheet from "../../src/components/bottom-sheet";
import { callbacksFixture } from "./callbacks.fixture";

const mount = callbacksFixture();

/**
 * The elements under a component's root that carry a `title` attribute, the
 * root included, as `tag.class="title"`: a failure prints them, where printing
 * the JSDOM elements themselves never finishes.
 */
const titled = (root: HTMLElement): string[] =>
  [root, ...Array.from(root.querySelectorAll("*"))]
    .filter((element) => element.hasAttribute("title"))
    .map((element) => `${element.localName}.${element.classList[0] ?? ""}="${element.getAttribute("title")}"`);

/** The text of what names the surface through aria-labelledby. */
const labelOf = (root: HTMLElement): string | null => {
  const surface = [root, ...Array.from(root.querySelectorAll<HTMLElement>("[aria-labelledby]"))].find((element) =>
    element.hasAttribute("aria-labelledby")
  );
  const id = surface?.getAttribute("aria-labelledby");
  return id ? document.getElementById(id)?.textContent ?? null : null;
};

describe("a headline is not a tooltip", () => {
  const surfaces = [
    ["dialog", () => createDialog({ title: "Delete draft?", content: "It cannot be undone." })],
    ["time picker", () => createTimePicker({ title: "Select time" })],
    ["side sheet", () => createSideSheet({ title: "Filters" })],
    ["bottom sheet", () => createBottomSheet({ title: "Share" })],
  ] as const;

  for (const [name, make] of surfaces) {
    test(`${name}: no title attribute; the headline names it`, () => {
      const component = mount(make());
      expect(titled(component.element)).toEqual([]);
      expect(labelOf(component.element)).toBeTruthy();
    });
  }
});

describe("dialog role", () => {
  test("a basic dialog is an alertdialog, named by its headline", () => {
    const dialog = mount(createDialog({ title: "Delete draft?" }));
    expect(dialog.element.getAttribute("role")).toBe("alertdialog");
    expect(labelOf(dialog.element)).toBe("Delete draft?");
  });

  test("a full-screen dialog is a dialog", () => {
    const dialog = mount(createDialog({ title: "New event", size: "fullscreen" }));
    expect(dialog.element.getAttribute("role")).toBe("dialog");
  });

  test("role overrides the default", () => {
    const dialog = mount(createDialog({ title: "Settings", role: "dialog" }));
    expect(dialog.element.getAttribute("role")).toBe("dialog");
  });
});
