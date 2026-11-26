import type { TabsConfig, TabsComponent } from "../../src/components/tabs/types";
import type { Case } from "./measure";
import { measureNavigation, type NavigationCase } from "./navigation-fixture";

type Config = NavigationCase & { variant: "primary" | "secondary"; layout: "stacked" | "text" | "icon"; scrollable?: boolean };

const mount: Case["mount"] = (mtrl, host, data) => {
  const { variant, selected, disabled, direction, layout, scrollable } = data as Config;
  document.documentElement.dir = direction;
  host.style.width = "360px";
  const icon = '<svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z"/></svg>';
  const create = mtrl.createTabs as unknown as (config: TabsConfig) => TabsComponent;
  const tabs = create({
    variant, scrollable: !!scrollable, showDivider: true,
    tabs: ["Home", "Trips", "Saved"].map((text, index) => ({
      text: layout === "icon" ? undefined : text,
      ariaLabel: text, icon: layout === "text" ? undefined : icon, value: String(index),
      badge: index === 0 ? 3 : undefined, ripple: false,
      state: index === (selected ? 0 : 1) ? "active" : undefined,
      disabled: disabled && index === 0,
    })),
  });
  host.append(tabs.element);
  const first = tabs.getTabs()[0]?.element;
  if (!first || (first.getAttribute("aria-selected") === "true") !== selected || first.matches(":disabled") !== disabled) {
    throw new Error(`Unexpected tab selection or disabled state: ${first?.outerHTML}`);
  }
  // The tablist starts from its selected tab. Put the unselected focus case
  // into roving order without selecting it so Tab can reach it naturally.
  if (!selected && !disabled) {
    for (const tab of tabs.getTabs()) tab.element.tabIndex = tab.element === first ? 0 : -1;
  }
};

const item = ".mtrl-tab:first-child";
const parts = [
  { name: "container", selector: ".mtrl-tabs" },
  { name: "indicator", selector: ".mtrl-tabs__indicator" },
  { name: "divider", selector: ".mtrl-tabs__divider" },
  { name: "scroll", selector: ".mtrl-tabs__scroll" },
  { name: "label", selector: `${item} .mtrl-button__text` },
  { name: "icon", selector: `${item} .mtrl-button__icon svg` },
  { name: "badge", selector: `${item} .mtrl-badge` },
  { name: "second", selector: ".mtrl-tab:nth-child(2)" },
];

await measureNavigation({
  component: "tabs", mount, item,
  variants: {
    "primary-stacked": { config: { variant: "primary", layout: "stacked" }, parts },
    "secondary-stacked": { config: { variant: "secondary", layout: "stacked" }, parts },
    "primary-text": { config: { variant: "primary", layout: "text" }, parts, geometryOnly: true },
    "secondary-text": { config: { variant: "secondary", layout: "text" }, parts, geometryOnly: true },
    "primary-icon": { config: { variant: "primary", layout: "icon" }, parts, geometryOnly: true },
    "primary-scroll": { config: { variant: "primary", layout: "stacked", scrollable: true }, parts, geometryOnly: true },
  },
});
