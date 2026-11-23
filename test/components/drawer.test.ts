import { expect, test } from "bun:test";
import createDrawer, { createNavigationDrawer, type DrawerSectionEvent } from "../../src/components/drawer";
import { setIcons } from "../../src/core/icons";
import { callbacksFixture } from "./callbacks.fixture";

const mount = callbacksFixture();

test("drawer links use native anchors and preserve modified activation", () => {
  const changes: string[] = [];
  const drawer = mount(createDrawer({
    onSelect: ({ value, originalEvent }) => { changes.push(value); originalEvent.preventDefault(); },
    items: [
      { id: "plain", label: "Plain", active: true },
      { id: "leaf", label: "Leaf", href: "/leaf", icon: "<svg data-normal></svg>", activeIcon: "<svg data-active></svg>" },
      { id: "blocked", label: "Blocked", href: "/blocked", disabled: true },
      { id: "url", label: "Unsupported URL", href: "invalid:destination" },
    ],
  }));
  const row = (id: string) => drawer.element.querySelector<HTMLElement>(`[data-id="${id}"]`)!;
  expect(row("plain").localName).toBe("button");
  expect(row("leaf").localName).toBe("a");
  expect(row("leaf").getAttribute("href")).toBe("/leaf");
  expect(row("blocked").getAttribute("role")).toBe("link");
  expect(row("blocked").hasAttribute("href")).toBe(false);
  expect(row("blocked").getAttribute("aria-disabled")).toBe("true");
  expect(row("blocked").tabIndex).toBe(-1);
  expect(row("url").getAttribute("href")).toBe("about:blank");
  drawer.setActive("blocked");
  expect(drawer.getActive()).toBe("plain");

  for (const options of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }]) {
    const event = new MouseEvent("click", { bubbles: true, cancelable: true, ...options });
    // Inspect the component before suppressing JSDOM's native navigation.
    let defaultPrevented: boolean | undefined;
    const preventNavigation = (click: Event) => {
      defaultPrevented = click.defaultPrevented;
      click.preventDefault();
    };
    row("leaf").addEventListener("click", preventNavigation, { once: true });
    row("leaf").dispatchEvent(event);
    expect(defaultPrevented).toBe(false);
  }
  row("blocked").click();
  expect(changes).toEqual([]);
  expect(drawer.getActive()).toBe("plain");
  row("leaf").click();
  expect(changes).toEqual(["leaf"]);
  expect(drawer.getActive()).toBe("leaf");
  expect(row("leaf").getAttribute("aria-current")).toBe("page");
  expect(row("leaf").querySelector("[data-active]")).not.toBeNull();
  drawer.setActive("plain");
  expect(row("leaf").hasAttribute("aria-current")).toBe(false);
  expect(row("leaf").querySelector("[data-normal]")).not.toBeNull();
});

test("drawer section state, focus, events, section ids and nested badges", () => {
  const changes: DrawerSectionEvent[] = [];
  const selected: string[] = [];
  const drawer = mount(createDrawer({
    open: true,
    onExpand: event => changes.push(event),
    onCollapse: event => changes.push(event),
    onSelect: event => selected.push(event.id),
    items: [
      { id: "auto", label: "Automatic", items: [{ id: "active", label: "Active", active: true }] },
      { id: "closed", label: "Explicitly closed", expanded: false, items: [{ id: "nested", href: "#nested", label: "Nested" }] },
      { id: "open", label: "Explicitly open", expanded: true, items: [{ id: "child", label: "Child" }, { type: "divider" }] },
      { type: "section", label: "Static" },
    ],
  }));
  const row = (id: string) => drawer.element.querySelector<HTMLElement>(`[data-id="${id}"]`)!;
  expect(drawer.getExpandedSections()).toEqual(["auto", "open"]);
  expect(row("auto").getAttribute("aria-expanded")).toBe("true");
  expect(row("auto").classList.contains("mtrl-drawer__item--has-active")).toBe(true);
  expect(drawer.element.querySelector(".mtrl-drawer__section-label")?.textContent).toBe("Static");
  const button = row("closed");
  const panel = drawer.element.querySelector<HTMLElement>(`#${button.getAttribute("aria-controls")}`)!;
  expect(panel.getAttribute("aria-labelledby")).toBe(button.id);
  expect(panel.getAttribute("role")).toBe("group");
  expect(panel.hasAttribute("inert")).toBe(true);

  expect(drawer.getItems()[1].expanded).toBe(false);
  drawer.setActive("nested");
  expect(drawer.getItems()[1].expanded).toBe(true);
  expect(drawer.isSectionExpanded("closed")).toBe(true);
  expect(changes).toEqual([]);
  expect(row("nested").getAttribute("aria-current")).toBe("page");
  row("nested").focus();
  expect(drawer.collapseSection("closed")).toBe(drawer);
  expect(document.activeElement).toBe(button);
  expect(panel.hasAttribute("inert")).toBe(true);
  expect(button.classList.contains("mtrl-drawer__item--has-active")).toBe(true);
  expect(drawer.getActive()).toBe("nested");
  expect(changes).toEqual([{ id: "closed", value: "closed", label: "Explicitly closed", expanded: false }]);
  drawer.collapseSection("closed").expandSection("missing");
  button.click();
  expect(drawer.getExpandedSections()).toEqual(["auto", "closed", "open"]);
  expect(changes).toHaveLength(2);
  expect(changes[1].originalEvent).toBeInstanceOf(MouseEvent);
  expect(selected).toEqual([]);
  drawer.setBadge("nested", "2").setBadge("closed", "3");
  expect(row("nested").querySelector(".mtrl-drawer__item-badge")?.textContent).toBe("2");
  expect(button.querySelector(".mtrl-drawer__item-badge")?.nextElementSibling?.className).toBe("mtrl-drawer__item-chevron");
  expect(drawer.getItems()[1].items?.[0].badge).toBe("2");
  drawer.toggleSection("closed");
  expect(drawer.getItems()[1].expanded).toBe(false);

  const other = mount(createDrawer({ items: [{ id: "closed", items: [{ id: "one", active: true }], expanded: false }] }));
  expect(other.isSectionExpanded("closed")).toBe(false);
  expect(other.element.querySelector("[aria-controls]")?.getAttribute("aria-controls")).not.toBe(panel.id);
  other.setActive("one");
  expect(other.isSectionExpanded("closed")).toBe(true);
});

test("drawer sections use the registered chevron and keep the default fallback", () => {
  const items = [{ id: "group", items: [{ id: "child" }] }];
  try {
    setIcons({ "expand-more": "<svg data-custom-chevron></svg>" });
    const custom = mount(createDrawer({ items }));
    expect(custom.element.querySelector(".mtrl-drawer__item-chevron [data-custom-chevron]")).not.toBeNull();
  } finally {
    setIcons({ "expand-more": null });
  }
  const fallback = mount(createDrawer({ items }));
  expect(fallback.element.querySelector('.mtrl-drawer__item-chevron svg[width="24"] path')).not.toBeNull();
});

test("createNavigationDrawer and createDrawer build the same element", () => {
  const config = { items: [{ id: "home", label: "Home", icon: "<svg></svg>", active: true }], headline: "Components" };
  const navigationDrawer = createNavigationDrawer(config);
  const drawer = createDrawer(config);
  expect(navigationDrawer.element.outerHTML).toBe(drawer.element.outerHTML);
  expect(navigationDrawer.element.className).toBe(drawer.element.className);
  navigationDrawer.destroy();
  drawer.destroy();
});
