/** A badge label of "" or 0 is no badge: no capsule renders, factory and element. */
import assert from "node:assert/strict";
import type { Page } from "playwright";
import type createTabs from "../src/components/tabs";

type TabsWindow = Window & {
  mtrl: {
    createTabs: typeof createTabs;
  };
};

/** The badge a tab holds, as layout sees it: `display: none` leaves no box. */
type BadgeBox = { exists: boolean; display: string; w: number; h: number; text: string };

/** A capsule is rendered when it is displayed and occupies layout space. */
const rendered = (box: BadgeBox): boolean => box.exists && box.display !== "none" && box.w > 0 && box.h > 0;

/**
 * `setBadge("")` and `setBadge(0)` must clear the badge: the M3 specs have no
 * empty large badge (a large badge exists to carry a one-to-four character
 * label, m3.material.io/components/badges/specs), which is the rule the
 * standalone badge already applies to `""` and `0` ("a count of nothing is
 * not news"). A real value afterwards shows again, and the small dot — shape
 * only, no label — is never cleared by an empty one.
 */
export async function checkTabBadge(page: Page, check: (name: string) => void): Promise<void> {
  // The factory: one tab driven through setBadge, and ones created with an
  // empty and a zero label. The element: the badge attribute of an <m-tab>
  // through "", "0", "" again (the showBadge branch of the in-place update)
  // and "7".
  const result = await page.evaluate(async () => {
    type TabWithBadge = {
      setBadge: (content: string | number) => unknown;
      getBadgeComponent: () => { element: HTMLElement; getContent: () => string } | undefined;
    };
    const boxOf = (tab: TabWithBadge): BadgeBox => {
      const badge = tab.getBadgeComponent();
      if (!badge) return { exists: false, display: "none", w: 0, h: 0, text: "" };
      const box = badge.element.getBoundingClientRect();
      return {
        exists: true,
        display: getComputedStyle(badge.element).display,
        w: box.width,
        h: box.height,
        text: badge.getContent(),
      };
    };
    // The MutationObserver's update runs in a later task than the attribute write.
    const settled = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()));

    const w = window as unknown as TabsWindow;
    const host = document.getElementById("host")!;
    const boxes: Record<string, BadgeBox> = {};

    // The factory flavour, a live sequence on one tab.
    const tabs = w.mtrl.createTabs({ tabs: [{ text: "Inbox", value: "inbox", badge: 5 }] });
    host.append(tabs.element);
    const tab = tabs.getTabs()[0] as unknown as TabWithBadge;
    boxes["5"] = boxOf(tab);
    tab.setBadge("");
    boxes['""'] = boxOf(tab);
    tab.setBadge(0);
    boxes["0"] = boxOf(tab);
    tab.setBadge(12);
    boxes["12"] = boxOf(tab);

    // The factory flavour, created empty and created zero: creation hides
    // what the sequence above must hide too.
    const empty = w.mtrl.createTabs({ tabs: [{ text: "Drafts", value: "drafts", badge: "" }] });
    host.append(empty.element);
    boxes['created ""'] = boxOf(empty.getTabs()[0] as unknown as TabWithBadge);
    const zero = w.mtrl.createTabs({ tabs: [{ text: "Sent", value: "sent", badge: 0 }] });
    host.append(zero.element);
    boxes["created 0"] = boxOf(zero.getTabs()[0] as unknown as TabWithBadge);

    // A small badge is a dot: shape only, so an empty label clears nothing.
    const dot = w.mtrl.createTabs({
      tabs: [{ text: "Starred", value: "starred", badge: 1, badgeConfig: { variant: "small" } }],
    });
    host.append(dot.element);
    const dotTab = dot.getTabs()[0] as unknown as TabWithBadge;
    boxes["dot 1"] = boxOf(dotTab);
    dotTab.setBadge("");
    boxes['dot ""'] = boxOf(dotTab);

    // The element flavour: the badge attribute in place, through the same
    // values, including the same empty value twice so the update takes its
    // showBadge branch.
    const element = document.createElement("m-tabs");
    element.id = "badge-tabs";
    element.innerHTML = '<m-tab value="a" badge="5">Inbox</m-tab><m-tab value="b">Done</m-tab>';
    host.append(element);
    await settled();
    const hostTabs = (element as HTMLElement & { component: { getTabs: () => TabWithBadge[] } }).component;
    boxes["element 5"] = boxOf(hostTabs.getTabs()[0]);
    (element.children[0] as HTMLElement).setAttribute("badge", "");
    await settled();
    boxes['element ""'] = boxOf(hostTabs.getTabs()[0]);
    (element.children[0] as HTMLElement).setAttribute("badge", "0");
    await settled();
    boxes["element 0"] = boxOf(hostTabs.getTabs()[0]);
    (element.children[0] as HTMLElement).setAttribute("badge", "");
    await settled();
    boxes['element "" again'] = boxOf(hostTabs.getTabs()[0]);
    (element.children[0] as HTMLElement).setAttribute("badge", "7");
    await settled();
    boxes["element 7"] = boxOf(hostTabs.getTabs()[0]);

    return boxes;
  });

  // The capsule shows while a label is worth showing, with its label in it.
  assert.ok(rendered(result["5"]!), `setBadge(5): the badge renders, got ${JSON.stringify(result["5"])}`);
  assert.equal(result["5"]!.text, "5");
  // The two empty values leave no capsule: not displayed, no box.
  assert.ok(!rendered(result['""']!), `setBadge(""): no badge renders, got ${JSON.stringify(result['""'])}`);
  assert.ok(!rendered(result["0"]!), `setBadge(0): no badge renders, got ${JSON.stringify(result["0"])}`);
  // A real value shows again, with its label in it.
  assert.ok(rendered(result["12"]!), `setBadge(12) after the empty values: the badge renders, got ${JSON.stringify(result["12"])}`);
  assert.equal(result["12"]!.text, "12");
  // Creation agrees with the setter.
  assert.ok(!rendered(result['created ""']!), `badge: "": no badge renders, got ${JSON.stringify(result['created ""'])}`);
  assert.ok(!rendered(result["created 0"]!), `badge: 0: no badge renders, got ${JSON.stringify(result["created 0"])}`);
  // The dot has no label to empty.
  assert.ok(rendered(result["dot 1"]!), `a small badge renders its dot, got ${JSON.stringify(result["dot 1"])}`);
  assert.ok(rendered(result['dot ""']!), `setBadge("") keeps the dot: it carries no label, got ${JSON.stringify(result['dot ""'])}`);
  // The element, through its attribute.
  assert.ok(rendered(result["element 5"]!), `badge="5": the badge renders, got ${JSON.stringify(result["element 5"])}`);
  assert.ok(!rendered(result['element ""']!), `badge="": no badge renders, got ${JSON.stringify(result['element ""'])}`);
  assert.ok(!rendered(result["element 0"]!), `badge="0": no badge renders, got ${JSON.stringify(result["element 0"])}`);
  assert.ok(!rendered(result['element "" again']!), `badge="" again, the update's showBadge branch: no badge renders, got ${JSON.stringify(result['element "" again'])}`);
  assert.ok(rendered(result["element 7"]!), `badge="7": the badge renders, got ${JSON.stringify(result["element 7"])}`);
  assert.equal(result["element 7"]!.text, "7");
  check("tabs: setBadge of an empty or zero label renders no capsule, and a value after it shows again, factory and element");
}
