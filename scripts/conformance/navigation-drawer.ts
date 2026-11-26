import type { DrawerConfig, DrawerComponent } from "../../src/components/drawer/types";
import type { Case, Part } from "./measure";
import { measureNavigation, type NavigationCase } from "./navigation-fixture";

type Config = NavigationCase & Pick<DrawerConfig, "variant" | "dense" | "position">;

const mount: Case["mount"] = (mtrl, host, data) => {
  const { variant, direction, selected, disabled, dense, position } = data as Config;
  const page = window as Window & { conformanceDrawer?: DrawerComponent };
  page.conformanceDrawer?.destroy();
  document.documentElement.dir = direction;
  host.style.height = "500px";
  const icon = '<svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z"/></svg>';
  const create = mtrl.createDrawer as unknown as (config: DrawerConfig) => DrawerComponent;
  const drawer = create({
    variant, open: true, position, dense, ripple: false, headline: "Navigation",
    items: [
      { id: "home", label: "Home", icon, badge: "3", active: selected, disabled },
      { id: "trips", label: "Trips", icon, active: !selected },
      { type: "divider" },
      { id: "more", label: "More", expanded: true, items: [{ id: "saved", label: "Saved", icon }] },
      { type: "section", label: "Categories" },
    ],
  });
  page.conformanceDrawer = drawer;
  host.append(drawer.element);
  const first = drawer.element.querySelector('[data-id="home"]');
  if (!first || first.hasAttribute("aria-current") !== selected || first.hasAttribute("aria-disabled") !== disabled) {
    throw new Error("Unexpected drawer selection or disabled state");
  }
};

const item = '.mtrl-drawer__item[data-id="home"]';
const indicator = `${item} .mtrl-drawer__active-indicator`;
const parts: Part[] = [
  { name: "container", selector: ".mtrl-drawer__sheet" },
  { name: "root", selector: ".mtrl-drawer" },
  { name: "items", selector: ".mtrl-drawer__items" },
  { name: "indicator", selector: indicator },
  { name: "indicatorFill", selector: indicator, pseudo: "::before" },
  { name: "layer", selector: indicator, pseudo: "::after" },
  { name: "target", selector: item, pseudo: "::after" },
  { name: "label", selector: `${item} .mtrl-drawer__item-label` },
  { name: "icon", selector: `${item} .mtrl-drawer__item-icon svg` },
  { name: "badge", selector: `${item} .mtrl-drawer__item-badge` },
  { name: "headline", selector: ".mtrl-drawer__headline" },
  { name: "section", selector: ".mtrl-drawer__section-label" },
  { name: "child", selector: ".mtrl-drawer__item--child" },
  { name: "chevron", selector: ".mtrl-drawer__item-chevron svg" },
  { name: "divider", selector: ".mtrl-drawer__divider" },
  { name: "backdrop", selector: ".mtrl-drawer__scrim" },
  { name: "second", selector: '.mtrl-drawer__item[data-id="trips"]' },
];

await measureNavigation({
  component: "drawer", mount, item,
  variants: {
    standard: { config: { variant: "standard" }, parts },
    modal: { config: { variant: "modal" }, parts },
    dense: { config: { variant: "standard", dense: true }, parts, geometryOnly: true },
    "modal-end": { config: { variant: "modal", position: "end" }, parts, geometryOnly: true },
  },
});
