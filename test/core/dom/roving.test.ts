// test/core/dom/roving.test.ts
//
// The roving tab index of core/dom: one tab stop over a composite's targets,
// moved by the arrow keys along the layout (Left and Right following the
// reading direction), Home and End, skipping disabled targets, clamped at the
// ends, and leaving the keys to a text input.
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", { url: "http://localhost/", pretendToBeVisual: true });
const g = globalThis as any;
g.window = dom.window;
g.document = dom.window.document;
g.HTMLElement = dom.window.HTMLElement;
g.Element = dom.window.Element;
g.Node = dom.window.Node;
g.Event = dom.window.Event;
g.KeyboardEvent = dom.window.KeyboardEvent;
g.FocusEvent = dom.window.FocusEvent;

import { createRoving, isTextEditable, type Roving } from "../../../src/core/dom/roving";

let container: HTMLElement;
let roving: Roving;

const make = (html: string, vertical = false) => {
  container = document.createElement("div");
  container.innerHTML = html;
  document.body.appendChild(container);
  roving = createRoving({
    container,
    vertical: () => vertical,
    targets: () => Array.from(container.querySelectorAll<HTMLElement>("button, input")),
  });
};

const press = (key: string, target: Element = document.activeElement!) => {
  const event = new dom.window.KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
};

const buttons = () => Array.from(container.querySelectorAll("button"));
const stops = () => Array.from(container.querySelectorAll<HTMLElement>("[tabindex='0']")).map((el) => el.id);

afterEach(() => {
  roving.destroy();
  container.remove();
  document.documentElement.removeAttribute("dir");
});

describe("createRoving", () => {
  beforeEach(() => make('<button id="a"></button><button id="b"></button><button id="c"></button>'));

  test("gives the first target the one tab stop", () => {
    expect(stops()).toEqual(["a"]);
    expect(buttons().map((b) => b.tabIndex)).toEqual([0, -1, -1]);
  });

  test("moves with Left and Right, clamped at the ends", () => {
    buttons()[0].focus();
    press("ArrowRight");
    expect(document.activeElement?.id).toBe("b");
    press("ArrowRight");
    press("ArrowRight");
    expect(document.activeElement?.id).toBe("c");
    expect(stops()).toEqual(["c"]);
    press("ArrowLeft");
    press("ArrowLeft");
    press("ArrowLeft");
    expect(document.activeElement?.id).toBe("a");
  });

  test("Home and End go to the ends", () => {
    buttons()[1].focus();
    press("End");
    expect(document.activeElement?.id).toBe("c");
    press("Home");
    expect(document.activeElement?.id).toBe("a");
  });

  test("the keys it takes are prevented, the others are not", () => {
    buttons()[0].focus();
    expect(press("ArrowRight").defaultPrevented).toBe(true);
    expect(press("Enter").defaultPrevented).toBe(false);
    expect(press("ArrowDown").defaultPrevented).toBe(false);
  });

  test("Left and Right follow a right-to-left reading direction", () => {
    document.documentElement.setAttribute("dir", "rtl");
    buttons()[0].focus();
    press("ArrowLeft");
    expect(document.activeElement?.id).toBe("b");
    press("ArrowRight");
    expect(document.activeElement?.id).toBe("a");
  });

  test("a focus reached otherwise takes the tab stop", () => {
    buttons()[2].focus();
    expect(stops()).toEqual(["c"]);
  });

  test("disabled targets are skipped, natively or by aria-disabled", () => {
    buttons()[1].disabled = true;
    buttons()[2].setAttribute("aria-disabled", "true");
    container.insertAdjacentHTML("beforeend", '<button id="d"></button>');
    roving.sync();
    buttons()[0].focus();
    press("ArrowRight");
    expect(document.activeElement?.id).toBe("d");
  });

  test("sync moves the tab stop off a target that became disabled", () => {
    buttons()[0].disabled = true;
    roving.sync();
    expect(stops()).toEqual(["b"]);
  });

  test("destroy removes the listeners", () => {
    buttons()[0].focus();
    roving.destroy();
    press("ArrowRight");
    expect(document.activeElement?.id).toBe("a");
  });
});

describe("createRoving vertical", () => {
  beforeEach(() => make('<button id="a"></button><button id="b"></button>', true));

  test("Up and Down move, Left and Right do not", () => {
    buttons()[0].focus();
    press("ArrowRight");
    expect(document.activeElement?.id).toBe("a");
    press("ArrowDown");
    expect(document.activeElement?.id).toBe("b");
    press("ArrowUp");
    expect(document.activeElement?.id).toBe("a");
  });
});

describe("createRoving with a text input", () => {
  beforeEach(() => make('<button id="a"></button><input id="t" type="text"><button id="c"></button>'));

  test("the arrows, Home and End stay with the caret", () => {
    const input = container.querySelector("input")!;
    input.focus();
    for (const key of ["ArrowLeft", "ArrowRight", "Home", "End"]) {
      expect(press(key).defaultPrevented).toBe(false);
      expect(document.activeElement).toBe(input);
    }
  });

  test("the arrows reach the input from its neighbours", () => {
    buttons()[0].focus();
    press("ArrowRight");
    expect(document.activeElement?.id).toBe("t");
  });
});

describe("isTextEditable", () => {
  test("text inputs, textareas and editable content", () => {
    const el = (html: string) => {
      const host = document.createElement("div");
      host.innerHTML = html;
      return host.firstElementChild;
    };
    expect(isTextEditable(el("<input>"))).toBe(true);
    expect(isTextEditable(el('<input type="search">'))).toBe(true);
    expect(isTextEditable(el("<textarea></textarea>"))).toBe(true);
    expect(isTextEditable(el('<input type="checkbox">'))).toBe(false);
    expect(isTextEditable(el("<button></button>"))).toBe(false);
    expect(isTextEditable(null)).toBe(false);
  });
});
