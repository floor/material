// test/core/dom/direction.test.ts
//
// The direction a root carries as a class (core/dom/direction): what is read,
// when, and at what cost. A DOM change costs what changed and nothing more:
// an insertion elsewhere reads no direction, a destroyed component's element
// is never read again, and nothing is kept for a component that was dropped.
import { describe, test, expect, beforeEach, afterAll } from "bun:test";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", { url: "http://localhost/", pretendToBeVisual: true });
const g = globalThis as any;
for (const key of ["window", "document", "HTMLElement", "Element", "Node", "Event", "CustomEvent", "MutationObserver", "navigator"]) {
  g[key] = (dom.window as any)[key];
}

/** The computed direction, which jsdom does not inherit: the nearest inline style, through shadow hosts. */
const computedDirection = (element: Element): string => {
  for (let node: Node | null = element; node; node = (node as ShadowRoot).host ?? node.parentNode) {
    const own = (node as HTMLElement).style?.direction;
    if (own) return own;
  }
  return "ltr";
};
let styleReads = 0;
g.getComputedStyle = (element: Element) => {
  styleReads++;
  return { direction: computedDirection(element) };
};

import { createBase, withElement } from "../../../src/core/compose/component";
import { onDirectionChange, trackDirection, trackFactoryDirection } from "../../../src/core/dom/direction";

// Every direction read of a factory root starts with one closest("[dir]").
let reads = 0;
const closest = dom.window.Element.prototype.closest;
dom.window.Element.prototype.closest = function (this: Element, selector: string) {
  if (selector === "[dir]") reads++;
  return closest.call(this, selector);
} as typeof closest;

/** After the observer's callback, which runs as a microtask. */
const settled = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

const create = (parent?: HTMLElement) =>
  withElement({ tag: "div" })(createBase({ componentName: "probe", prefix: "mtrl", parent }));

const el = (html: string): HTMLElement => {
  const host = document.createElement("div");
  host.innerHTML = html;
  return host.firstElementChild as HTMLElement;
};

const marks = (element: Element): string =>
  ["mtrl-rtl", "mtrl-ltr"].filter((name) => element.classList.contains(name)).join(" ");

beforeEach(async () => {
  document.documentElement.removeAttribute("dir");
  document.body.innerHTML = "";
  await settled();
  reads = 0;
  styleReads = 0;
});

afterAll(() => {
  dom.window.Element.prototype.closest = closest;
  dom.window.close();
});

describe("what a DOM change costs", () => {
  test("an insertion beside mounted components reads no direction", async () => {
    const components = Array.from({ length: 100 }, () => create(document.body));
    await settled();
    reads = 0;

    document.body.append(document.createElement("div"), "text");
    document.body.lastElementChild!.setAttribute("class", "changed");
    await settled();

    expect(reads).toBe(0);
    components.forEach((component) => component.destroy());
  });

  test("an inserted subtree is read once for each root in it, and no other root", async () => {
    const before = Array.from({ length: 20 }, () => create(document.body));
    await settled();
    reads = 0;

    const tree = el(`<section dir="rtl"><div></div></section>`);
    const inside = [create(), create(), create()];
    inside.forEach((component) => tree.firstElementChild!.append(component.element));
    document.body.append(tree);
    await settled();

    expect(reads).toBe(3);
    expect(inside.map((component) => marks(component.element))).toEqual(["mtrl-rtl", "mtrl-rtl", "mtrl-rtl"]);
    expect(before.every((component) => marks(component.element) === "")).toBe(true);
  });

  test("a tree built in place, level by level, is read once for each root", async () => {
    const levels = [el(`<div dir="rtl"></div>`), el(`<div></div>`), el(`<div></div>`)];
    document.body.append(levels[0]);
    levels[0].append(levels[1]);
    levels[1].append(levels[2]);
    const components = [create(), create(), create()];
    levels[1].append(components[0].element);
    levels[2].append(components[1].element, components[2].element);
    // Appended, taken out and put back in the same task: read where it ends.
    const moved = create();
    levels[0].append(moved.element);
    document.body.append(moved.element);
    await settled();

    // Seven insertions are reported, three of them nested in the first.
    expect(reads).toBe(4);
    expect(components.map((component) => marks(component.element))).toEqual(["mtrl-rtl", "mtrl-rtl", "mtrl-rtl"]);
    expect(marks(moved.element)).toBe("");
  });

  test("a dir change reads the roots under it and not the roots beside it", async () => {
    const left = el(`<div></div>`);
    const right = el(`<div></div>`);
    document.body.append(left, right);
    const under = [create(left), create(left)];
    const beside = Array.from({ length: 30 }, () => create(right));
    await settled();
    reads = 0;

    left.dir = "rtl";
    await settled();

    expect(reads).toBe(2);
    expect(under.map((component) => marks(component.element))).toEqual(["mtrl-rtl", "mtrl-rtl"]);
    expect(beside.every((component) => marks(component.element) === "")).toBe(true);
  });

  test("components created and destroyed in one task are not read again, attached or not", async () => {
    const elements: HTMLElement[] = [];
    for (let i = 0; i < 1000; i++) {
      const component = create(i % 2 ? document.body : undefined);
      elements.push(component.element);
      component.destroy();
    }
    await settled();
    reads = 0;

    // Anything left behind would be read here: by the insertion, by the flip.
    const rtl = el(`<div dir="rtl"></div>`);
    document.body.append(rtl);
    rtl.append(...elements.slice(0, 10));
    document.documentElement.dir = "rtl";
    await settled();

    expect(reads).toBe(0);
    expect(elements.slice(0, 10).every((element) => marks(element) === "")).toBe(true);
  });

  test("a component that is dropped without being destroyed is collected", async () => {
    const dropped: WeakRef<HTMLElement>[] = [];
    const fill = (): void => {
      for (let i = 0; i < 200; i++) dropped.push(new WeakRef(create().element));
    };
    fill();
    // The observer's next callbacks drop the entries of the collected roots.
    for (let round = 0; round < 5; round++) {
      await settled();
      Bun.gc(true);
      document.body.append(document.createElement("i"));
    }
    await settled();

    const alive = dropped.filter((entry) => entry.deref()).length;
    expect(alive).toBeLessThan(20);
  });
});

describe("the direction a factory root resolves", () => {
  test("the nearest dir wins: nested overrides in both orders", () => {
    const page = el(`<div dir="rtl"><div id="a"></div><div dir="ltr"><div id="b"></div><div dir="rtl"><div id="c"></div></div></div></div>`);
    document.body.append(page);

    const a = create(page.querySelector<HTMLElement>("#a")!);
    const b = create(page.querySelector<HTMLElement>("#b")!);
    const c = create(page.querySelector<HTMLElement>("#c")!);
    const plain = create(document.body);

    expect(marks(a.element)).toBe("mtrl-rtl");
    // Left-to-right under a right-to-left ancestor: the island's own mark.
    expect(marks(b.element)).toBe("mtrl-ltr");
    expect(marks(c.element)).toBe("mtrl-rtl");
    // An ordinary left-to-right root keeps its class attribute as authored.
    expect(marks(plain.element)).toBe("");
  });

  test("a root created detached is read by the mutation that mounts it", async () => {
    const page = el(`<div dir="rtl"></div>`);
    document.body.append(page);
    const component = create();
    expect(marks(component.element)).toBe("");
    expect(reads).toBe(0);

    page.append(component.element);
    await settled();

    expect(marks(component.element)).toBe("mtrl-rtl");
    expect(reads).toBe(1);
  });

  test("a root moved under another direction is read again, both ways", async () => {
    const rtl = el(`<div dir="rtl"></div>`);
    const ltr = el(`<div></div>`);
    document.body.append(rtl, ltr);
    const component = create(rtl);
    expect(marks(component.element)).toBe("mtrl-rtl");

    ltr.append(component.element);
    await settled();
    expect(marks(component.element)).toBe("");

    component.element.remove();
    await settled();
    rtl.append(component.element);
    await settled();
    expect(marks(component.element)).toBe("mtrl-rtl");
  });

  test("a subtree moved with its roots is read where it lands", async () => {
    const rtl = el(`<div dir="rtl"></div>`);
    const group = el(`<div><p></p></div>`);
    document.body.append(rtl, group);
    const component = create(group.querySelector("p")!);
    expect(marks(component.element)).toBe("");

    rtl.append(group);
    await settled();
    expect(marks(component.element)).toBe("mtrl-rtl");
  });

  test("a component destroyed before its first mount never takes a direction", async () => {
    const page = el(`<div dir="rtl"></div>`);
    document.body.append(page);
    const component = create();
    const element = component.element;
    component.destroy();

    page.append(element);
    await settled();

    expect(marks(element)).toBe("");
    expect(reads).toBe(0);
  });

  test("a flip at the document root reaches every mounted root, and back", async () => {
    const island = el(`<div dir="ltr"></div>`);
    document.body.append(island);
    const component = create(document.body);
    const inIsland = create(island);
    const detached = create();

    document.documentElement.dir = "rtl";
    await settled();
    expect(marks(component.element)).toBe("mtrl-rtl");
    expect(marks(inIsland.element)).toBe("mtrl-ltr");
    expect(marks(detached.element)).toBe("");

    document.documentElement.dir = "ltr";
    await settled();
    expect(marks(component.element)).toBe("");
    expect(marks(inIsland.element)).toBe("");
  });

  test("a direction on the root itself, set and changed at runtime", async () => {
    const component = create(document.body);
    component.element.dir = "rtl";
    await settled();
    expect(marks(component.element)).toBe("mtrl-rtl");

    document.documentElement.dir = "rtl";
    component.element.dir = "ltr";
    await settled();
    expect(marks(component.element)).toBe("mtrl-ltr");
  });

  test("a second document has its own observer", async () => {
    const other = document.implementation.createHTMLDocument("other");
    const page = other.createElement("div");
    page.dir = "rtl";
    other.body.append(page);
    const element = other.createElement("div");
    const release = trackFactoryDirection(element);

    page.append(element);
    await settled();
    expect(marks(element)).toBe("mtrl-rtl");

    page.dir = "ltr";
    await settled();
    expect(marks(element)).toBe("");
    release();
  });
});

describe("a factory root inside a shadow tree", () => {
  const shadowed = (): { host: HTMLElement; root: ShadowRoot; inner: HTMLElement } => {
    const host = document.createElement("div");
    const root = host.attachShadow({ mode: "closed" });
    root.innerHTML = `<div dir="rtl"></div>`;
    document.body.append(host);
    return { host, root, inner: root.firstElementChild as HTMLElement };
  };

  test("is read in the task that creates and mounts it, with no record", async () => {
    const { inner } = shadowed();
    await settled();
    const component = create();
    // No record reports this insertion: the document observer sees no shadow tree.
    inner.append(component.element);
    await settled();
    expect(marks(component.element)).toBe("mtrl-rtl");
  });

  test("mounted in a later task, is read on the observer's next callback", async () => {
    const { inner } = shadowed();
    const component = create();
    await settled();
    inner.append(component.element);
    await settled();
    expect(marks(component.element)).toBe("");

    document.body.append(document.createElement("i"));
    await settled();
    expect(marks(component.element)).toBe("mtrl-rtl");
  });

  test("destroyed while it waits, is not read when its element is mounted", async () => {
    const { inner } = shadowed();
    const component = create();
    await settled();
    component.destroy();
    inner.append(component.element);
    document.body.append(document.createElement("i"));
    await settled();
    expect(marks(component.element)).toBe("");
    expect(reads).toBe(0);
  });

  test("is followed inside that tree from then on", async () => {
    const { root, inner } = shadowed();
    const component = create(inner);
    expect(marks(component.element)).toBe("mtrl-rtl");

    inner.dir = "ltr";
    await settled();
    expect(marks(component.element)).toBe("");

    const rtl = el(`<div dir="rtl"></div>`);
    root.append(rtl);
    rtl.append(component.element);
    await settled();
    expect(marks(component.element)).toBe("mtrl-rtl");

    // A second root mounted in the watched tree is reported like any other.
    const second = create();
    rtl.append(second.element);
    await settled();
    expect(marks(second.element)).toBe("mtrl-rtl");
  });

  test("a root moved from the page into a shadow tree is read there", async () => {
    const { inner } = shadowed();
    const component = create(document.body);
    await settled();
    expect(marks(component.element)).toBe("");

    inner.append(component.element);
    await settled();
    expect(marks(component.element)).toBe("mtrl-rtl");
  });
});

describe("an element host", () => {
  const host = (parent: HTMLElement = document.body): HTMLElement => {
    const element = document.createElement("div");
    parent.append(element);
    return element;
  };

  test("is read when it is followed, by its computed direction", () => {
    const rtl = el(`<div dir="rtl" style="direction: rtl"></div>`);
    document.body.append(rtl);
    const inside = host(rtl);
    const island = host(rtl);
    island.style.direction = "ltr";
    const plain = host();

    const releases = [inside, island, plain].map(trackDirection);

    expect(marks(inside)).toBe("mtrl-rtl");
    expect(marks(island)).toBe("mtrl-ltr");
    expect(marks(plain)).toBe("");
    releases.forEach((release) => release());
  });

  test("is read again on a dir change, through a shadow boundary, until it is released", async () => {
    const outer = document.createElement("div");
    const root = outer.attachShadow({ mode: "open" });
    document.body.append(outer);
    const inner = document.createElement("div");
    root.append(inner);
    const release = trackDirection(inner);
    expect(marks(inner)).toBe("");

    outer.style.direction = "rtl";
    outer.dir = "rtl";
    await settled();
    expect(marks(inner)).toBe("mtrl-rtl");

    release();
    outer.style.direction = "";
    outer.removeAttribute("dir");
    await settled();
    expect(marks(inner)).toBe("mtrl-rtl");
  });

  test("costs no style read on a change that is not a dir change", async () => {
    const element = host();
    const release = trackDirection(element);
    styleReads = 0;

    document.body.append(document.createElement("div"));
    element.setAttribute("class", "changed");
    await settled();

    expect(styleReads).toBe(0);
    release();
  });

  test("a host that is not connected is not followed", async () => {
    const element = document.createElement("div");
    element.style.direction = "rtl";
    trackDirection(element);
    document.body.append(element);
    document.documentElement.dir = "rtl";
    await settled();
    expect(marks(element)).toBe("");
  });

  test("a factory root in a host's own shadow tree adds no observer to it", async () => {
    const element = host();
    const root = element.attachShadow({ mode: "open" });
    const release = trackDirection(element);
    const component = create();
    root.append(component.element);
    document.body.append(document.createElement("i"));
    await settled();
    reads = 0;

    // Watched, a change in that tree would read the root again.
    component.element.append(document.createElement("i"));
    root.append(component.element);
    await settled();
    expect(reads).toBe(0);
    release();
  });
});

describe("onDirectionChange", () => {
  test("reports each change of a root's direction, and stops when removed", async () => {
    const component = create(document.body);
    const seen: boolean[] = [];
    const remove = onDirectionChange(component.element, (rtl) => seen.push(rtl));

    document.documentElement.dir = "rtl";
    await settled();
    // The same direction read again reports nothing.
    document.body.append(document.createElement("i"));
    document.body.dir = "rtl";
    await settled();
    document.documentElement.dir = "ltr";
    document.body.removeAttribute("dir");
    await settled();
    expect(seen).toEqual([true, false]);

    remove();
    document.documentElement.dir = "rtl";
    await settled();
    expect(seen).toEqual([true, false]);
  });

  test("reports the direction a detached root finds when it is mounted", async () => {
    const page = el(`<div dir="rtl"></div>`);
    document.body.append(page);
    const component = create();
    const seen: boolean[] = [];
    onDirectionChange(component.element, (rtl) => seen.push(rtl));

    page.append(component.element);
    await settled();
    expect(seen).toEqual([true]);
  });
});
