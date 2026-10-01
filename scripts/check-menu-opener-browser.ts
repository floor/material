/**
 * A menu's opener while the menu is open (FLO-386). The menu used to give any
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
