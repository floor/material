// test/components/a11y-series-c.test.ts
//
// Accessibility name and role coverage for Patch (c):
// - A9: Menu & <m-menu> (no aria-selected="false" on unselected role="menuitem",
//       preserved on listbox role="option" and selected items; menu list and
//       submenu accessible names)
// - A10: Search & <m-search> (fullscreen <dialog.mtrl-search__surface> named at
//        creation and kept in sync across placeholder / aria-label updates)
// - A17: BottomSheet & SideSheet (single dialog role in top layer, ariaLabel on
//        semantic surface across modal/standard, and <m-bottom-sheet> /
//        <m-side-sheet> naming from headline, slot, aria-label, or title)

import { describe, test, expect, beforeEach } from "bun:test";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
  url: "http://localhost/",
  pretendToBeVisual: true,
});
const g = globalThis as unknown as Record<string, unknown>;
g.window = dom.window;
g.document = dom.window.document;
g.navigator = dom.window.navigator;
g.HTMLElement = dom.window.HTMLElement;
g.HTMLDialogElement = dom.window.HTMLDialogElement;
g.HTMLInputElement = dom.window.HTMLInputElement;
g.HTMLButtonElement = dom.window.HTMLButtonElement;
g.Element = dom.window.Element;
g.Node = dom.window.Node;
g.Event = dom.window.Event;
g.MouseEvent = dom.window.MouseEvent;
g.FocusEvent = dom.window.FocusEvent;
g.KeyboardEvent = dom.window.KeyboardEvent;
g.CustomEvent = dom.window.CustomEvent;
g.MutationObserver = dom.window.MutationObserver;
g.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
g.requestAnimationFrame = (cb: FrameRequestCallback) =>
  setTimeout(() => cb(Date.now()), 0);
g.cancelAnimationFrame = (id: number) => clearTimeout(id);

const dialogProto = dom.window.HTMLDialogElement.prototype as unknown as Record<
  string,
  unknown
>;
dialogProto.showModal = function (this: HTMLDialogElement) {
  this.setAttribute("open", "");
};
dialogProto.close = function (this: HTMLDialogElement) {
  this.removeAttribute("open");
};

import createMenu from "../../src/components/menu";
import createSearch from "../../src/components/search";
import createBottomSheet from "../../src/components/bottom-sheet";
import createSideSheet from "../../src/components/side-sheet";

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("A9: menu item selection semantics and menu naming", () => {
  const items = [
    { id: "edit", text: "Edit" },
    { id: "del", text: "Delete" },
  ];

  test("unselected role='menuitem' items do not carry aria-selected='false'", () => {
    const opener = document.body.appendChild(document.createElement("button"));
    const menu = createMenu({ opener, ariaLabel: "Actions", items });
    const rendered = Array.from(
      menu.element.querySelectorAll<HTMLElement>('[role="menuitem"]')
    );
    expect(rendered).toHaveLength(2);
    expect(rendered.every((el) => !el.hasAttribute("aria-selected"))).toBe(
      true
    );
    expect(
      menu.element.querySelector(".mtrl-menu__list")?.getAttribute("aria-label")
    ).toBe("Actions");
    menu.destroy();
  });

  test("setSelected marks only the chosen menuitem and removes aria-selected from others", () => {
    const opener = document.body.appendChild(document.createElement("button"));
    const menu = createMenu({ opener, items });
    menu.setSelected("edit");
    const [edit, del] = Array.from(
      menu.element.querySelectorAll<HTMLElement>('[role="menuitem"]')
    );
    expect(edit!.getAttribute("aria-selected")).toBe("true");
    expect(del!.hasAttribute("aria-selected")).toBe(false);

    menu.setSelected("del");
    expect(edit!.hasAttribute("aria-selected")).toBe(false);
    expect(del!.getAttribute("aria-selected")).toBe("true");
    menu.destroy();
  });

  test("listbox mode preserves aria-selected='false' on unselected role='option' items", () => {
    const opener = document.body.appendChild(document.createElement("button"));
    const menu = createMenu({
      opener,
      items,
      listbox: true,
      manualOpen: true,
    });
    const options = Array.from(
      menu.element.querySelectorAll<HTMLElement>('[role="option"]')
    );
    expect(options.map((o) => o.getAttribute("aria-selected"))).toEqual([
      "false",
      "false",
    ]);
    menu.setSelected("edit");
    expect(options.map((o) => o.getAttribute("aria-selected"))).toEqual([
      "true",
      "false",
    ]);
    menu.destroy();
  });
});

describe("A10: search fullscreen dialog naming", () => {
  test("fullscreen search starting in view state names its dialog surface immediately and keeps it synced", () => {
    const search = createSearch({
      initialState: "view",
      viewMode: "fullscreen",
      placeholder: "Search docs",
    });
    document.body.appendChild(search.element);
    const surface = search.element.querySelector<HTMLElement>(
      ".mtrl-search__surface"
    )!;
    expect(surface.hasAttribute("role")).toBe(false);
    expect(surface.getAttribute("aria-label")).toBe("Search docs");

    search.setPlaceholder("Find articles");
    expect(surface.getAttribute("aria-label")).toBe("Find articles");
    search.destroy();
  });
});

describe("A17: bottom sheet and side sheet dialog roles and accessible names", () => {
  test("top-layer modal sheets expose a single dialog role on <dialog> and name it via title or ariaLabel", () => {
    const bsTitled = createBottomSheet({
      variant: "modal",
      layer: "top",
      title: "Sort by",
    });
    const bsContainer = bsTitled.element.querySelector<HTMLElement>(
      ".mtrl-bottom-sheet__container"
    )!;
    const bsTitle = bsTitled.element.querySelector<HTMLElement>(
      ".mtrl-bottom-sheet__title"
    )!;
    expect(bsTitled.element.localName).toBe("dialog");
    expect(bsTitled.element.getAttribute("aria-labelledby")).toBe(bsTitle.id);
    expect(bsContainer.hasAttribute("role")).toBe(false);
    expect(bsContainer.hasAttribute("aria-modal")).toBe(false);
    bsTitled.destroy();

    const bsLabelled = createBottomSheet({
      variant: "modal",
      layer: "top",
      ariaLabel: "Sort options",
    });
    expect(bsLabelled.element.getAttribute("aria-label")).toBe("Sort options");
    expect(
      bsLabelled.element
        .querySelector(".mtrl-bottom-sheet__container")
        ?.hasAttribute("role")
    ).toBe(false);
    bsLabelled.setTitle("New sort title");
    expect(bsLabelled.element.hasAttribute("aria-label")).toBe(false);
    expect(bsLabelled.element.hasAttribute("aria-labelledby")).toBe(true);
    bsLabelled.destroy();

    const ssTitled = createSideSheet({
      variant: "modal",
      layer: "top",
      title: "Details",
    });
    const ssContainer = ssTitled.element.querySelector<HTMLElement>(
      ".mtrl-side-sheet__container"
    )!;
    const ssTitle = ssTitled.element.querySelector<HTMLElement>(
      ".mtrl-side-sheet__title"
    )!;
    expect(ssTitled.element.localName).toBe("dialog");
    expect(ssTitled.element.getAttribute("aria-labelledby")).toBe(ssTitle.id);
    expect(ssContainer.hasAttribute("role")).toBe(false);
    expect(ssContainer.hasAttribute("aria-modal")).toBe(false);
    ssTitled.destroy();

    const ssLabelled = createSideSheet({
      variant: "modal",
      layer: "top",
      ariaLabel: "Filter options",
    });
    expect(ssLabelled.element.getAttribute("aria-label")).toBe(
      "Filter options"
    );
    expect(
      ssLabelled.element
        .querySelector(".mtrl-side-sheet__container")
        ?.hasAttribute("role")
    ).toBe(false);
    ssLabelled.setTitle("New details");
    expect(ssLabelled.element.hasAttribute("aria-label")).toBe(false);
    expect(ssLabelled.element.hasAttribute("aria-labelledby")).toBe(true);
    ssLabelled.destroy();
  });

  test("non-top-layer modal and standard sheets place ariaLabel on the semantic container, not the outer wrapper", () => {
    const bsModal = createBottomSheet({
      variant: "modal",
      ariaLabel: "Sort options",
    });
    expect(bsModal.element.hasAttribute("aria-label")).toBe(false);
    const bsModalContainer = bsModal.element.querySelector<HTMLElement>(
      ".mtrl-bottom-sheet__container"
    )!;
    expect(bsModalContainer.getAttribute("role")).toBe("dialog");
    expect(bsModalContainer.getAttribute("aria-label")).toBe("Sort options");
    bsModal.destroy();

    const bsStandard = createBottomSheet({
      variant: "standard",
      ariaLabel: "Music player",
    });
    expect(bsStandard.element.hasAttribute("aria-label")).toBe(false);
    const bsStdContainer = bsStandard.element.querySelector<HTMLElement>(
      ".mtrl-bottom-sheet__container"
    )!;
    expect(bsStdContainer.getAttribute("role")).toBe("region");
    expect(bsStdContainer.getAttribute("aria-label")).toBe("Music player");
    bsStandard.destroy();

    const ssModal = createSideSheet({
      variant: "modal",
      ariaLabel: "Filter options",
    });
    expect(ssModal.element.hasAttribute("aria-label")).toBe(false);
    const ssModalContainer = ssModal.element.querySelector<HTMLElement>(
      ".mtrl-side-sheet__container"
    )!;
    expect(ssModalContainer.getAttribute("role")).toBe("dialog");
    expect(ssModalContainer.getAttribute("aria-label")).toBe("Filter options");
    ssModal.destroy();

    const ssStandard = createSideSheet({
      variant: "standard",
      ariaLabel: "Details",
    });
    expect(ssStandard.element.hasAttribute("aria-label")).toBe(false);
    const ssStdContainer = ssStandard.element.querySelector<HTMLElement>(
      ".mtrl-side-sheet__container"
    )!;
    expect(ssStdContainer.getAttribute("role")).toBe("complementary");
    expect(ssStdContainer.getAttribute("aria-label")).toBe("Details");
    ssStandard.destroy();
  });
});
