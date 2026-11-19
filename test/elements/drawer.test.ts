import { expect, test } from "bun:test";
import createDrawer, { type DrawerConfig } from "../../src/components/drawer";
import { drawerElement } from "../../src/elements/drawer";
import { callbacksFixture } from "../components/callbacks.fixture";

const mount = callbacksFixture();

test("drawer declarations read nested links, initial state and only the parent label", () => {
  const host = document.createElement("m-drawer");
  host.setAttribute("value", "child");
  host.innerHTML = `
    <m-drawer-item value="section" type="section">Section
      <m-drawer-item value="child" href="/child">Child</m-drawer-item>
    </m-drawer-item>
    <m-drawer-item type="section">Static heading</m-drawer-item>
    <m-drawer-item value="open" expanded label="Open">
      <m-drawer-item value="other" href="/other">Other</m-drawer-item>
    </m-drawer-item>`;
  const drawer = mount(createDrawer(drawerElement.spec.config!(host) as DrawerConfig));
  const section = host.querySelector('m-drawer-item[value="section"]')!;
  expect(drawer.getExpandedSections()).toEqual(["section", "open"]);
  expect(drawer.getItems()[0].label).toBe("Section");
  expect(drawer.getItems()[0].items?.[0]).toMatchObject({ id: "child", label: "Child", href: "/child", active: true });
  expect(drawer.getItems()[1]).toEqual({ type: "section", label: "Static heading" });
  expect(section.hasAttribute("expanded")).toBe(false);
  drawer.collapseSection("section");
  expect(drawerElement.spec.config!(host)).toMatchObject({ items: [{ id: "section", expanded: false }, {}, {}] });
  drawer.expandSection("section");
  expect(section.hasAttribute("expanded")).toBe(true);
});
