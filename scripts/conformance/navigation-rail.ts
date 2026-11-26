import type { NavigationRailConfig, NavigationRailComponent } from "../../src/components/navigation-rail/types";
import type { Case, Part } from "./measure";
import { measureNavigation, type NavigationCase } from "./navigation-fixture";

type Config = NavigationCase & Pick<NavigationRailConfig, "expanded" | "layout" | "expandedWidth">;

const mount: Case["mount"] = (mtrl, host, data) => {
  const { expanded, layout, expandedWidth, direction, selected, disabled, state } = data as Config;
  document.documentElement.dir = direction;
  host.style.height = "500px";
  const icon = '<svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z"/></svg>';
  const create = mtrl.createNavigationRail as unknown as (config: NavigationRailConfig) => NavigationRailComponent;
  const rail = create({
    expanded, layout, expandedWidth, showToggle: state !== "focus", ripple: false,
    items: ["Home", "Trips", "Saved"].map((label, index) => ({
      id: String(index), label, icon, active: index === (selected ? 0 : 1),
      badge: index === 0 ? 3 : index === 1 ? true : undefined,
      disabled: disabled && index === 0,
    })),
  });
  host.append(rail.element);
  const first = rail.element.querySelector<HTMLElement>(".mtrl-navigation-rail__item");
  if (!first || first.hasAttribute("aria-current") !== selected || first.hasAttribute("aria-disabled") !== disabled) {
    throw new Error("Unexpected rail selection or disabled state");
  }
  if (!selected && !disabled) {
    for (const child of rail.element.querySelectorAll<HTMLElement>(".mtrl-navigation-rail__item")) child.tabIndex = child === first ? 0 : -1;
  }
};

const item = ".mtrl-navigation-rail__item:first-child";
const indicator = `${item} .mtrl-navigation-rail__indicator`;
const parts: Part[] = [
  { name: "container", selector: ".mtrl-navigation-rail" },
  { name: "items", selector: ".mtrl-navigation-rail__items" },
  { name: "header", selector: ".mtrl-navigation-rail__header" },
  { name: "toggle", selector: ".mtrl-navigation-rail__toggle" },
  { name: "indicator", selector: indicator },
  { name: "indicatorFill", selector: indicator, pseudo: "::before" },
  { name: "layer", selector: indicator, pseudo: "::after" },
  { name: "label", selector: `${item} .mtrl-navigation-rail__label` },
  { name: "icon", selector: `${item} .mtrl-navigation-rail__icon svg` },
  { name: "badge", selector: `${item} .mtrl-navigation-rail__badge` },
  { name: "dot", selector: ".mtrl-navigation-rail__badge--dot" },
  { name: "second", selector: ".mtrl-navigation-rail__item:nth-child(2)" },
];

await measureNavigation({
  component: "navigation-rail", mount, item,
  variants: {
    collapsed: { config: { expanded: false }, parts },
    expanded: { config: { expanded: true }, parts },
    modal: { config: { expanded: true, layout: "modal" }, parts, geometryOnly: true },
    minimum: { config: { expanded: true, expandedWidth: 10 }, parts, geometryOnly: true },
    maximum: { config: { expanded: true, expandedWidth: 500 }, parts, geometryOnly: true },
  },
});
