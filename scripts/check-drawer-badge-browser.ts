/** A drawer badge of "" or "0" is no badge: no count renders, factory and element. */
import assert from "node:assert/strict";
import type { Page } from "playwright";
import type createDrawer from "../src/components/drawer";

/** The badge an item holds, as layout sees it: no span means no badge. */
type BadgeBox = { exists: boolean; display: string; w: number; h: number; text: string };

/** A count is rendered when its span is displayed and occupies layout space. */
const rendered = (box: BadgeBox): boolean => box.exists && box.display !== "none" && box.w > 0 && box.h > 0;

/**
 * The M3 rule every badged surface in this library follows: a count of nothing
 * is not news. The badge spec's configuration gallery (m3.material.io/components/
 * badges/specs) has no empty or zero large badge, and the guidelines say a
 * badge label communicates item count — the drawer's own spec calls the element
 * "Badge label text" (m3.material.io/components/navigation-drawer/specs). So
 * `""` and `"0"` leave no badge on the item, a real count shows again, and the
 * count is part of the item's announced name, read after the destination
 * (m3.material.io/components/badges/accessibility).
 */
export async function checkDrawerBadge(page: Page, check: (name: string) => void): Promise<void> {
  type AxNode = { role?: { value?: string }; name?: { value?: string } };
  const namesOf = async (): Promise<string[]> => {
    const cdp = await page.context().newCDPSession(page);
    const tree = (await cdp.send("Accessibility.getFullAXTree")) as { nodes: AxNode[] };
    await cdp.detach();
    return tree.nodes
      .filter((n) => n.role?.value === "button" && /^(Correspondence|Ledger|Archive)/.test(n.name?.value ?? ""))
      .map((n) => n.name?.value ?? "");
  };

  // The factory: one drawer driven through setBadge, ones created with an
  // empty and a zero badge, and the out-of-contract falsy values a plain JS
  // caller can pass. Left mounted with 5, none and 1000 for the name read.
  const factory = await page.evaluate(() => {
    type Drawer = { element: HTMLElement; setBadge: (id: string, badge: string) => unknown };
    const boxOf = (root: ParentNode, id: string): BadgeBox => {
      const item = root.querySelector(`[data-id="${id}"]`);
      const badge = item?.querySelector(".mtrl-drawer__item-badge") as HTMLElement | null;
      if (!badge) return { exists: false, display: "none", w: 0, h: 0, text: "" };
      const box = badge.getBoundingClientRect();
      return {
        exists: true,
        display: getComputedStyle(badge).display,
        w: box.width,
        h: box.height,
        text: badge.textContent ?? "",
      };
    };

    const w = window as unknown as { mtrl: { createDrawer: typeof createDrawer } };
    const host = document.getElementById("host")!;
    const boxes: Record<string, BadgeBox> = {};

    const drawer = w.mtrl.createDrawer({
      open: true,
      items: [
        { id: "correspondence", label: "Correspondence", badge: "5" },
        { id: "ledger", label: "Ledger" },
        { id: "archive", label: "Archive", badge: "1000" },
      ],
    }) as Drawer;
    host.replaceChildren(drawer.element);
    boxes["5"] = boxOf(host, "correspondence");
    boxes["1000"] = boxOf(host, "archive");
    drawer.setBadge("correspondence", "");
    boxes['""'] = boxOf(host, "correspondence");
    drawer.setBadge("correspondence", "0");
    boxes['"0"'] = boxOf(host, "correspondence");
    drawer.setBadge("correspondence", "12");
    boxes["12"] = boxOf(host, "correspondence");

    // Created empty and created zero: creation hides what the sequence above
    // must hide too.
    const empty = w.mtrl.createDrawer({ open: true, items: [{ id: "drafts", label: "Drafts", badge: "" }] }) as Drawer;
    host.append(empty.element);
    boxes['created ""'] = boxOf(host, "drafts");
    const zero = w.mtrl.createDrawer({ open: true, items: [{ id: "sent", label: "Sent", badge: "0" }] }) as Drawer;
    host.append(zero.element);
    boxes['created "0"'] = boxOf(host, "sent");

    // Out of contract for the string API, but a plain JS caller can pass them:
    // every falsy value must leave the item clear, and a count after them shows.
    for (const [name, value] of [
      ["0 number", 0],
      ["null", null],
      ["undefined", undefined],
      ["false", false],
    ] as Array<[string, unknown]>) {
      drawer.setBadge("ledger", value as string);
      boxes[`falsy ${name}`] = boxOf(host, "ledger");
    }
    drawer.setBadge("ledger", "3");
    boxes["falsy then 3"] = boxOf(host, "ledger");

    // Back to the counts the name read expects.
    drawer.setBadge("correspondence", "5");
    drawer.setBadge("ledger", "");

    // What the item's badge label text measures on the rendered item: size,
    // type and trailing placement inside the row, for the spec's answer.
    const item = host.querySelector('[data-id="archive"]') as HTMLElement;
    const badge = item.querySelector(".mtrl-drawer__item-badge") as HTMLElement;
    const label = item.querySelector(".mtrl-drawer__item-label") as HTMLElement;
    const itemBox = item.getBoundingClientRect();
    const badgeBox = badge.getBoundingClientRect();
    const labelBox = label.getBoundingClientRect();
    const style = getComputedStyle(badge);
    const spec = {
      badgeW: badgeBox.width,
      badgeH: badgeBox.height,
      badgeText: badge.textContent,
      fontSize: style.fontSize,
      trailingGap: itemBox.right - badgeBox.right,
      afterLabel: badgeBox.left - labelBox.right,
      insideItem: badgeBox.left >= itemBox.left && badgeBox.right <= itemBox.right,
    };

    return { boxes, spec };
  });

  // A count shows, with its number in it — including a count past every max,
  // which the drawer shows as the text it was given.
  assert.ok(rendered(factory.boxes["5"]!), `setBadge("5"): the badge renders, got ${JSON.stringify(factory.boxes["5"])}`);
  assert.equal(factory.boxes["5"]!.text, "5");
  assert.ok(rendered(factory.boxes["1000"]!), `badge "1000": the badge renders, got ${JSON.stringify(factory.boxes["1000"])}`);
  assert.equal(factory.boxes["1000"]!.text, "1000");
  // The two empty values leave no badge: no span on the item.
  assert.ok(!rendered(factory.boxes['""']!), `setBadge(""): no badge renders, got ${JSON.stringify(factory.boxes['""'])}`);
  assert.ok(!rendered(factory.boxes['"0"']!), `setBadge("0"): no badge renders, got ${JSON.stringify(factory.boxes['"0"'])}`);
  // A real count shows again, with its number in it.
  assert.ok(rendered(factory.boxes["12"]!), `setBadge("12") after the empty values: the badge renders, got ${JSON.stringify(factory.boxes["12"])}`);
  assert.equal(factory.boxes["12"]!.text, "12");
  // Creation agrees with the setter.
  assert.ok(!rendered(factory.boxes['created ""']!), `badge: "": no badge renders, got ${JSON.stringify(factory.boxes['created ""'])}`);
  assert.ok(!rendered(factory.boxes['created "0"']!), `badge: "0": no badge renders, got ${JSON.stringify(factory.boxes['created "0"'])}`);
  // The out-of-contract falsy values clear, and a count after them shows.
  for (const name of ["0 number", "null", "undefined", "false"]) {
    assert.ok(!rendered(factory.boxes[`falsy ${name}`]!), `setBadge(${name}): no badge renders, got ${JSON.stringify(factory.boxes[`falsy ${name}`])}`);
  }
  assert.ok(rendered(factory.boxes["falsy then 3"]!), `a count after the falsy values renders, got ${JSON.stringify(factory.boxes["falsy then 3"])}`);
  check("drawer: setBadge of an empty or zero badge renders no count, and a value after it shows again, factory and element");

  // The count is announced with the item, read after the destination: m3's
  // badge accessibility page — "The accessibility label for a badge item will
  // be read after its navigation destination. Any numerical badges will have
  // their number read." The badge is plain text in the item's button, so the
  // computed name carries it; read through Chromium's own tree, not a
  // recomputation of our own. The factory first, in light DOM.
  const factoryNames = await namesOf();
  assert.deepEqual(factoryNames, ["Correspondence 5", "Ledger", "Archive 1000"],
    `the factory route: an item's name carries its count after the destination, got ${JSON.stringify(factoryNames)}`);

  // The element route: the items live in the host's shadow root and the name
  // must be computed through it. Mounted with the same counts, then driven
  // through its badge attribute for the same empty and zero values.
  const elementMounted = await page.evaluate(async () => {
    const settled = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()));
    const host = document.getElementById("host")!;
    const element = document.createElement("m-drawer");
    element.setAttribute("open", "");
    element.innerHTML =
      '<m-drawer-item value="correspondence" badge="5">Correspondence</m-drawer-item>' +
      '<m-drawer-item value="ledger">Ledger</m-drawer-item>' +
      '<m-drawer-item value="archive" badge="1000">Archive</m-drawer-item>';
    host.replaceChildren(element);
    await settled();
    return true;
  });
  assert.ok(elementMounted);

  const elementNames = await namesOf();
  assert.deepEqual(elementNames, ["Correspondence 5", "Ledger", "Archive 1000"],
    `the element route: a shadow-root item carries its count in the name, got ${JSON.stringify(elementNames)}`);
  check("drawer: a badged item's name carries its count after the destination, factory and element");

  // The element's badge attribute in place, through the same values, including
  // the same empty value twice so the update re-renders.
  const element = await page.evaluate(async () => {
    const boxOf = (root: ParentNode, id: string): BadgeBox => {
      const item = root.querySelector(`[data-id="${id}"]`);
      const badge = item?.querySelector(".mtrl-drawer__item-badge") as HTMLElement | null;
      if (!badge) return { exists: false, display: "none", w: 0, h: 0, text: "" };
      const box = badge.getBoundingClientRect();
      return { exists: true, display: getComputedStyle(badge).display, w: box.width, h: box.height, text: badge.textContent ?? "" };
    };
    const settled = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()));
    const host = document.getElementById("host")!;
    const element = host.querySelector("m-drawer") as HTMLElement & { shadowRoot: ShadowRoot };
    const boxes: Record<string, BadgeBox> = {};
    boxes["element 5"] = boxOf(element.shadowRoot, "correspondence");
    (element.children[0] as HTMLElement).setAttribute("badge", "");
    await settled();
    boxes['element ""'] = boxOf(element.shadowRoot, "correspondence");
    (element.children[0] as HTMLElement).setAttribute("badge", "0");
    await settled();
    boxes['element "0"'] = boxOf(element.shadowRoot, "correspondence");
    (element.children[0] as HTMLElement).setAttribute("badge", "");
    await settled();
    boxes['element "" again'] = boxOf(element.shadowRoot, "correspondence");
    (element.children[0] as HTMLElement).setAttribute("badge", "7");
    await settled();
    boxes["element 7"] = boxOf(element.shadowRoot, "correspondence");
    return boxes;
  });
  assert.ok(rendered(element["element 5"]!), `badge="5": the badge renders, got ${JSON.stringify(element["element 5"])}`);
  assert.ok(!rendered(element['element ""']!), `badge="": no badge renders, got ${JSON.stringify(element['element "'])}`);
  assert.ok(!rendered(element['element "0"']!), `badge="0": no badge renders, got ${JSON.stringify(element['element "0"'])}`);
  assert.ok(!rendered(element['element "" again']!), `badge="" again: no badge renders, got ${JSON.stringify(element['element "" again'])}`);
  assert.ok(rendered(element["element 7"]!), `badge="7": the badge renders, got ${JSON.stringify(element["element 7"])}`);
  assert.equal(element["element 7"]!.text, "7");
  check("drawer: the element's badge attribute clears the same empty and zero values");

  // What the badge label text measures on the rendered item, for the spec's
  // answer: trailing, inside the row, at label-large size.
  const spec = factory.spec;
  console.log(
    `  drawer badge label text: ${spec.badgeW}x${spec.badgeH}px "${spec.badgeText}", ` +
      `${spec.fontSize} type, ${spec.trailingGap}px from the row's end, ${spec.afterLabel}px after the label`
  );
  assert.ok(spec.insideItem, "the badge sits inside its item row");
  assert.ok(spec.badgeW > 0 && spec.badgeH > 0, "the badge occupies layout");
  check("drawer: the badge label text sits trailing inside the item row");
}
