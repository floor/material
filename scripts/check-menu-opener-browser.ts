/**
 * A menu's opener while the menu is open. The menu used to give any
 * <button> opener the button's `--active` class, whose pressed rule reshaped a
 * FAB (16 to 8px corners, no shadow) and an icon button. Only an mtrl button
 * keeps its pressed shape now; a FAB or an icon button opening a menu looks as
 * it did before it opened.
 */
import assert from "node:assert/strict";
import type { Page } from "playwright";

type Factory = (config: Record<string, unknown>) => { element: HTMLElement; destroy: () => void; open?: (event?: Event) => unknown };
type OpenerWindow = Window & {
  openers: { createFabMenu: Factory; createIconButton: Factory; createMenu: Factory; createSplitButton: Factory };
};

export async function checkMenuOpeners(page: Page): Promise<void> {
  const icon = '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M11 5h2v14h-2zM5 11h14v2H5z"/></svg>';
  const measured = await page.evaluate(async (icon) => {
    const { createFabMenu, createIconButton, createMenu, createSplitButton } = (window as unknown as OpenerWindow).openers;
    const settle = () => new Promise((resolve) => setTimeout(resolve, 400));
    const look = (el: HTMLElement) => {
      const style = getComputedStyle(el);
      return { radius: style.borderTopLeftRadius, shadow: style.boxShadow };
    };
    const host = document.createElement("div");
    host.style.cssText = "position: fixed; left: 40px; top: 40px";
    document.body.append(host);

    // The FAB menu's menu presentation: "the FAB stays" while its menu opens
    const fabMenu = createFabMenu({ icon, ariaLabel: "Create", presentation: "menu", items: [{ id: "a", text: "Alpha" }, { id: "b", text: "Beta" }] });
    host.append(fabMenu.element);
    await settle();
    const fab = fabMenu.element.querySelector("button") as HTMLElement;
    const fabClosed = look(fab);
    fabMenu.open?.();
    await settle();
    const fabOpen = { ...look(fab), expanded: fab.getAttribute("aria-expanded"), classes: [...fab.classList].filter((c) => c.endsWith("--active")) };
    fabMenu.destroy();

    // An icon button opening a menu
    const iconButton = createIconButton({ icon, ariaLabel: "More" });
    host.append(iconButton.element);
    const menu = createMenu({ opener: iconButton.element, items: [{ id: "a", text: "Alpha" }] });
    await settle();
    const iconClosed = look(iconButton.element);
    menu.open?.(new MouseEvent("click"));
    await settle();
    const iconOpen = { ...look(iconButton.element), expanded: iconButton.element.getAttribute("aria-expanded"), classes: [...iconButton.element.classList].filter((c) => c.endsWith("--active")) };
    menu.destroy();
    iconButton.destroy();

    // The split button's trailing button is an mtrl button: it keeps the pressed shape
    const split = createSplitButton({ text: "Save", items: [{ id: "a", text: "Alpha" }] }) as ReturnType<Factory> & { trailingElement: HTMLElement };
    host.append(split.element);
    await settle();
    const trailingClosed = look(split.trailingElement);
    split.trailingElement.click();
    await settle();
    const trailingOpen = { ...look(split.trailingElement), classes: [...split.trailingElement.classList].filter((c) => c.endsWith("--active")) };
    split.destroy();
    host.remove();

    return { fabClosed, fabOpen, iconClosed, iconOpen, trailingClosed, trailingOpen };
  }, icon);

  assert.equal(measured.fabOpen.expanded, "true", "the FAB says its menu is open");
  assert.deepEqual(measured.fabOpen.classes, ["mtrl-menu__opener--active"], "the FAB is not given the button's --active");
  assert.deepEqual([measured.fabOpen.radius, measured.fabOpen.shadow], [measured.fabClosed.radius, measured.fabClosed.shadow], "the FAB keeps its corners and shadow while its menu is open");
  assert.notEqual(measured.fabClosed.shadow, "none", "the FAB has a shadow to keep");

  assert.equal(measured.iconOpen.expanded, "true");
  assert.deepEqual(measured.iconOpen.classes, ["mtrl-menu__opener--active"]);
  assert.deepEqual([measured.iconOpen.radius, measured.iconOpen.shadow], [measured.iconClosed.radius, measured.iconClosed.shadow], "the icon button keeps its shape while its menu is open");

  assert.ok(measured.trailingOpen.classes.includes("mtrl-button--active"), "the split button's trailing button is still an active button");
  assert.notEqual(measured.trailingOpen.radius, measured.trailingClosed.radius, "and keeps its pressed shape while its menu is open");
  console.log(`Passed menu openers: a FAB (${measured.fabClosed.radius}, shadow kept) and an icon button keep their shape while their menu is open; the split button's trailing button takes its pressed shape (${measured.trailingClosed.radius} to ${measured.trailingOpen.radius}).`);
}

type MenuFactory = (config: Record<string, unknown>) => {
  element: HTMLElement;
  destroy: () => void;
  open: (event?: Event) => unknown;
  close: (event?: Event, restoreFocus?: boolean) => unknown;
  setOpener: (opener: HTMLElement | string) => unknown;
};
type PlacementWindow = Window & { openers: { createMenu: MenuFactory } };

/**
 * The menu is placed against the opener it has now. The controller used to
 * resolve the opener itself, and a component that exposes its element only
 * through getElement() or input came back as the component: the placement read
 * getBoundingClientRect() off it, threw, and the menu opened unplaced. For the
 * same reason setOpener() kept placing against the first anchor. Every
 * supported opener shape and a replacement given later are measured in the
 * browser, in both directions, against the opener's own rectangle.
 */
export async function checkMenuOpenerPlacement(page: Page): Promise<void> {
  const exceptions: string[] = [];
  const onPageError = (error: Error) => exceptions.push(error.message);
  page.on("pageerror", onPageError);
  try {
    for (const direction of ["ltr", "rtl"] as const) {
      const measured = await page.evaluate(async (side) => {
        const state = window as unknown as PlacementWindow;
        document.documentElement.dir = side;
        document.body.replaceChildren();
        const settle = () => new Promise((resolve) => setTimeout(resolve, 450));
        const box = (element: HTMLElement) => {
          const rect = element.getBoundingClientRect();
          return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width };
        };
        const openerAt = (id: string, left: number, top: number) => {
          const button = document.createElement("button");
          button.id = id;
          button.textContent = "Open";
          button.style.cssText = `position:fixed;left:${left}px;top:${top}px;width:120px;height:40px`;
          document.body.append(button);
          return button;
        };
        const items = [{ id: "one", text: "One" }, { id: "two", text: "Two" }];
        const observe = (name: string, opener: HTMLElement, menu: { element: HTMLElement }) => ({
          name,
          opener: box(opener),
          menu: box(menu.element),
          placed: { top: menu.element.style.top, left: menu.element.style.left },
          hidden: menu.element.getAttribute("aria-hidden"),
        });
        const results: ReturnType<typeof observe>[] = [];

        const shapes: [string, (button: HTMLElement) => unknown][] = [
          ["selector", (button) => `#${button.id}`],
          ["element", (button) => button],
          ["element property", (button) => ({ element: button })],
          ["getElement()", (button) => ({ getElement: () => button })],
          ["input", (button) => ({ input: button })],
        ];
        for (const [name, target] of shapes) {
          document.body.replaceChildren();
          const opener = openerAt("opener-shape", 220, 120);
          const menu = state.openers.createMenu({ opener: target(opener) as never, items });
          menu.open(new MouseEvent("click"));
          await settle();
          results.push(observe(name, opener, menu));
          menu.destroy();
        }

        // A replacement given to setOpener() is where the menu opens next.
        document.body.replaceChildren();
        const first = openerAt("opener-first", 40, 40);
        const second = openerAt("opener-second", 220, 120);
        const menu = state.openers.createMenu({ opener: first, items });
        menu.open(new MouseEvent("click"));
        await settle();
        menu.close();
        await settle();
        menu.setOpener(second);
        menu.open(new MouseEvent("click"));
        await settle();
        results.push(observe("setOpener replacement", second, menu));
        menu.destroy();

        document.body.replaceChildren();
        document.documentElement.dir = "ltr";
        return results;
      }, direction);

      for (const case_ of measured) {
        const label = `${direction} ${case_.name}`;
        assert.notEqual(case_.placed.top, "", `${label}: the menu has no vertical placement`);
        assert.notEqual(case_.placed.left, "", `${label}: the menu has no horizontal placement`);
        assert.equal(case_.hidden, "false", `${label}: the menu is open`);
        const top = parseFloat(case_.placed.top);
        assert.ok(Math.abs(top - case_.opener.bottom) <= 1, `${label}: top ${top} is not the opener bottom ${case_.opener.bottom}`);
        // The default placement is bottom-start, offset 0. Right to left, a
        // menu wider than its opener aligns their right edges (position.ts).
        const left = case_.placed.left === "auto" ? case_.menu.right - case_.menu.width : parseFloat(case_.placed.left);
        const start = direction === "rtl" && case_.menu.width > case_.opener.width
          ? case_.opener.right - case_.menu.width
          : case_.opener.left;
        assert.ok(Math.abs(left - start) <= 1, `${label}: left ${left} is not the opener start ${start}`);
      }
    }
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 100)));
    assert.deepEqual(exceptions, [], "the menu placed every opener without a browser exception");
  } finally {
    page.off("pageerror", onPageError);
  }
  console.log("Passed menu opener placement: selector, element, element property, getElement() and input openers, and a setOpener() replacement, each below the current opener on its start edge in LTR and RTL.");
}
