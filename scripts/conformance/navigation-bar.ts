import type { NavigationBarConfig, NavigationBarComponent } from "../../src/components/navigation-bar/types";
import type { Case, Part } from "./measure";
import { measureNavigation, type NavigationCase } from "./navigation-fixture";

type Config = NavigationCase & { itemLayout: NavigationBarConfig["itemLayout"]; width: number };

const mount: Case["mount"] = (mtrl, host, data) => {
  const { itemLayout, width, direction, selected, disabled } = data as Config;
  document.documentElement.dir = direction;
  host.style.width = `${width}px`;
  const icon = '<svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z"/></svg>';
  const create = mtrl.createNavigationBar as unknown as (config: NavigationBarConfig) => NavigationBarComponent;
  const labels = ["Home", "Trips", "Saved"];
  if (itemLayout === "horizontal") labels.push("Profile", "Settings");
  const bar = create({
    itemLayout, ripple: false,
    items: labels.map((label, index) => ({
      id: String(index), label, icon, active: index === (selected ? 0 : 1),
      badge: index === 0 ? 3 : index === 1 ? true : undefined,
      disabled: disabled && index === 0,
    })),
  });
  host.append(bar.element);
  const first = bar.element.querySelector<HTMLElement>(".mtrl-navigation-bar__item");
  if (!first || first.hasAttribute("aria-current") !== selected || first.hasAttribute("aria-disabled") !== disabled) {
    throw new Error("Unexpected bar selection or disabled state");
  }
  if (!selected && !disabled) {
    for (const child of bar.element.querySelectorAll<HTMLElement>(".mtrl-navigation-bar__item")) child.tabIndex = child === first ? 0 : -1;
  }
};

const item = ".mtrl-navigation-bar__item:first-child";
const indicator = `${item} .mtrl-navigation-bar__indicator`;
const parts: Part[] = [
  { name: "container", selector: ".mtrl-navigation-bar" },
  { name: "items", selector: ".mtrl-navigation-bar__items" },
  { name: "indicator", selector: indicator },
  { name: "indicatorFill", selector: indicator, pseudo: "::before" },
  { name: "layer", selector: indicator, pseudo: "::after" },
  { name: "content", selector: `${item} .mtrl-navigation-bar__content` },
  { name: "label", selector: `${item} .mtrl-navigation-bar__label` },
  { name: "icon", selector: `${item} .mtrl-navigation-bar__icon svg` },
  { name: "badge", selector: `${item} .mtrl-navigation-bar__badge` },
  { name: "dot", selector: ".mtrl-navigation-bar__badge--dot" },
  { name: "second", selector: ".mtrl-navigation-bar__item:nth-child(2)" },
];

await measureNavigation({
  component: "navigation-bar", mount, item,
  variants: {
    vertical: { config: { itemLayout: "vertical", width: 360 }, parts },
    horizontal: { config: { itemLayout: "horizontal", width: 660 }, parts },
    "horizontal-wide": { config: { itemLayout: "horizontal", width: 840 }, parts, geometryOnly: true },
    "auto-599": { config: { itemLayout: "auto", width: 599 }, parts, geometryOnly: true },
    "auto-600": { config: { itemLayout: "auto", width: 600 }, parts, geometryOnly: true },
  },
});
