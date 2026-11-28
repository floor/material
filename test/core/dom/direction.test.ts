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

// The roots that wait for a connection are one list for the module, and every
// test file in the process shares the module: what other files left waiting
// decides how soon a root here is reached. The tests that count callbacks use
// a copy of the module and a document of their own. A variable, because the
// type checker does not resolve a specifier that carries a query.
const ownCopy = "../../../src/core/dom/direction?waiting";
const own = await import(ownCopy) as typeof import("../../../src/core/dom/direction");

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

    // Held by the module, all 200 would be alive. The collector is
    // conservative, so a few of the last ones may still be.
    const alive = dropped.filter((entry) => entry.deref()).length;
    expect(alive).toBeLessThan(100);
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

  /** A document of its own, with a closed shadow tree that holds a right-to-left section. */
  const ownPage = (): { other: Document; inner: HTMLElement; root(): HTMLElement } => {
    const other = document.implementation.createHTMLDocument("own");
    const host = other.createElement("div");
    const shadow = host.attachShadow({ mode: "closed" });
    shadow.innerHTML = `<div dir="rtl"></div>`;
    other.body.append(host);
    return { other, inner: shadow.firstElementChild as HTMLElement, root: () => other.createElement("div") };
  };

  test("mounted in a later task, is read on the observer's next callback", async () => {
    const { other, inner, root } = ownPage();
    const element = root();
    const release = own.trackFactoryDirection(element);
    await settled();
    inner.append(element);
    await settled();
    expect(marks(element)).toBe("");

    other.body.append(other.createElement("i"));
    await settled();
    expect(marks(element)).toBe("mtrl-rtl");
    release();
  });

  test("where scheduling is inert, the next callback sorts the task's roots out", async () => {
    const { inner } = shadowed();
    await settled();
    // A server render and a fake clock both hand the library a queueMicrotask
    // that never calls back.
    const real = globalThis.queueMicrotask;
    globalThis.queueMicrotask = () => {};
    let component: ReturnType<typeof create>;
    try {
      component = create();
    } finally {
      globalThis.queueMicrotask = real;
    }
    inner.append(component.element);
    await settled();
    expect(marks(component.element)).toBe("");

    document.body.append(document.createElement("i"));
    await settled();
    expect(marks(component.element)).toBe("mtrl-rtl");

    // Nothing was left stuck: the next root is sorted out by its own microtask.
    const next = create();
    inner.append(next.element);
    await settled();
    expect(marks(next.element)).toBe("mtrl-rtl");
  });

  test("a document that is dropped takes its unsorted roots with it", async () => {
    const dropped: WeakRef<HTMLElement>[] = [];
    const real = globalThis.queueMicrotask;
    globalThis.queueMicrotask = () => {};
    try {
      for (let render = 0; render < 20; render++) {
        const other = document.implementation.createHTMLDocument("render");
        for (let i = 0; i < 10; i++) {
          const element = other.createElement("div");
          trackFactoryDirection(element);
          dropped.push(new WeakRef(element));
        }
      }
    } finally {
      globalThis.queueMicrotask = real;
    }
    for (let round = 0; round < 5; round++) {
      await settled();
      Bun.gc(true);
    }
    // Held by the module, all 200 would be alive; the last documents may still be.
    expect(dropped.filter((entry) => entry.deref()).length).toBeLessThan(100);
  });

  /** 300 roots kept detached past their task, and one more, the last in line, to mount late. */
  const pooled = async (): Promise<{ other: Document; inner: HTMLElement; pool: HTMLElement[]; late: HTMLElement; release(): void }> => {
    const { other, inner, root } = ownPage();
    const pool = Array.from({ length: 300 }, root);
    const late = root();
    const releases = [...pool, late].map((element) => own.trackFactoryDirection(element));
    await settled();
    return { other, inner, pool, late, release: () => releases.forEach((release) => release()) };
  };

  test("beside a pool kept detached, is read after one change on a page that then goes idle", async () => {
    const { other, inner, late, release } = await pooled();
    inner.append(late);
    other.body.append(other.createElement("i"));
    // No further change to any document: the pass has to finish by itself.
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(marks(late)).toBe("mtrl-rtl");
    release();
  });

  test("beside a pool kept detached, a callback checks sixteen and the rest follows between tasks", async () => {
    const { other, inner, pool, late, release } = await pooled();

    // Count the checks by their isConnected reads, which nothing else makes on
    // a detached root, and hold the channel's messages to see what the
    // callback did alone.
    let checked = 0;
    const watched = new Set<Node>([...pool, late]);
    const isConnected = Object.getOwnPropertyDescriptor(dom.window.Node.prototype, "isConnected")!;
    Object.defineProperty(dom.window.Node.prototype, "isConnected", {
      configurable: true,
      get(this: Node) {
        if (watched.has(this)) checked++;
        return isConnected.get!.call(this);
      },
    });
    const realChannel = globalThis.MessageChannel;
    const held: Array<() => void> = [];
    let open = 0;
    globalThis.MessageChannel = class {
      port1: { onmessage: (() => void) | null; close(): void } = { onmessage: null, close: () => { open--; } };
      port2 = { postMessage: () => { held.push(() => this.port1.onmessage?.()); }, close: () => {} };
      constructor() { open++; }
    } as unknown as typeof MessageChannel;
    const turn = settled;
    try {
      inner.append(late);
      other.body.append(other.createElement("i"));
      await turn();
      expect(checked).toBe(16);
      expect(marks(late)).toBe("");
      expect(held.length).toBe(1);

      // A second change while the pass is under way checks sixteen more and
      // starts no second chain.
      other.body.append(other.createElement("i"));
      await turn();
      expect(checked).toBe(32);
      expect(held.length).toBe(1);

      // The steps between tasks finish it: each root checked once, and the
      // channel is closed behind the last one.
      let steps = 0;
      while (held.length) {
        held.shift()!();
        steps++;
      }
      expect(marks(late)).toBe("mtrl-rtl");
      expect(checked).toBe(301);
      expect(steps).toBe(2);
      expect(open).toBe(0);

      // The pass is over: the pool is checked again only from the next change.
      await turn();
      expect(checked).toBe(301);
    } finally {
      globalThis.MessageChannel = realChannel;
      Object.defineProperty(dom.window.Node.prototype, "isConnected", isConnected);
    }
    release();
  });

  test("the pass that finishes by itself leaves no timer pending", async () => {
    const { other, inner, late, release } = await pooled();
    const realSetTimeout = globalThis.setTimeout;
    let timers = 0;
    globalThis.setTimeout = ((...args: Parameters<typeof setTimeout>) => {
      timers++;
      return realSetTimeout(...args);
    }) as typeof setTimeout;
    try {
      inner.append(late);
      other.body.append(other.createElement("i"));
      // Wait on a promise the count does not see.
      await new Promise<void>((resolve) => realSetTimeout(resolve, 80));
      expect(marks(late)).toBe("mtrl-rtl");
      expect(timers).toBe(0);
    } finally {
      globalThis.setTimeout = realSetTimeout;
    }
    release();
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

  // Under dir="auto" the browser resolves the direction from the content. The
  // stand-in for that here is the section's inline direction, set with the
  // text that would decide it.
  const autoSection = (): { section: HTMLElement; write(text: string, direction: string): void } => {
    const section = document.createElement("section");
    section.setAttribute("dir", "auto");
    section.append("English");
    document.body.append(section);
    return {
      section,
      write(text, direction) {
        section.style.direction = direction;
        section.firstChild!.replaceWith(document.createTextNode(text));
      },
    };
  };

  test("under dir=auto, follows the content that resolves the direction", async () => {
    const { section, write } = autoSection();
    const element = host(section);
    const release = trackDirection(element);
    expect(marks(element)).toBe("");

    write("\u05e2\u05d1\u05e8\u05d9\u05ea", "rtl");
    await settled();
    expect(marks(element)).toBe("mtrl-rtl");

    write("English", "ltr");
    await settled();
    expect(marks(element)).toBe("");

    // Deeper in the section, and through a shadow boundary.
    const wrap = document.createElement("div");
    const inner = document.createElement("div");
    wrap.attachShadow({ mode: "open" }).append(inner);
    section.append(wrap);
    const releaseInner = trackDirection(inner);
    write("\u05e2\u05d1\u05e8\u05d9\u05ea", "rtl");
    await settled();
    expect(marks(inner)).toBe("mtrl-rtl");
    expect(marks(element)).toBe("mtrl-rtl");

    release();
    releaseInner();
  });

  test("a change of content reads no host unless one stands under dir=auto", async () => {
    const { section, write } = autoSection();
    const outside = host();
    const releaseOutside = trackDirection(outside);
    styleReads = 0;

    // No followed host is under the section: its content is nobody's direction.
    write("\u05e2\u05d1\u05e8\u05d9\u05ea", "rtl");
    await settled();
    expect(styleReads).toBe(0);

    // With one under it, that host is read, and the one outside is not.
    const inside = host(section);
    const releaseInside = trackDirection(inside);
    styleReads = 0;
    write("English", "ltr");
    await settled();
    expect(styleReads).toBe(1);
    expect(marks(inside)).toBe("");

    // Content changing elsewhere reads nothing, even now.
    styleReads = 0;
    document.body.append(document.createElement("p"));
    await settled();
    expect(styleReads).toBe(0);

    // Released, the host under the section no longer counts.
    releaseInside();
    write("\u05e2\u05d1\u05e8\u05d9\u05ea", "rtl");
    await settled();
    expect(styleReads).toBe(0);
    releaseOutside();
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
