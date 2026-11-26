import type { FabComponent, FabConfig } from "../../src/components/fab/types";
import type { ToolbarComponent, ToolbarConfig, ToolbarItem } from "../../src/components/toolbar/types";
import type { Case } from "./measure";
import { fieldProperties, interaction, part, runFieldFixture, type ReadState } from "./field-fixture";

type Config = {
  mode: "floating" | "docked";
  color: "standard" | "vibrant";
  direction: "ltr" | "rtl";
  state?: ReadState;
  target?: "icon" | "label";
  selected?: boolean;
  center?: boolean;
  vertical?: boolean;
  iconsOnly?: boolean;
  hidden?: boolean;
  collapse?: boolean;
  elevated?: boolean;
  fab?: "default" | "medium";
};

const mount: Case["mount"] = (mtrl, host, data) => {
  const config = data as Config;
  const page = window as Window & { measuredToolbar?: ToolbarComponent };
  page.measuredToolbar?.destroy();
  document.documentElement.dir = config.direction;
  host.style.cssText = "height:360px;position:relative;width:min(624px,calc(100vw - 48px))";
  const create = mtrl.createToolbar as unknown as (options: ToolbarConfig) => ToolbarComponent;
  const createFab = mtrl.createFab as unknown as (options: FabConfig) => FabComponent;
  const icon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 4h16v16H4z"/></svg>';
  const disabled = config.state === "disabled";
  const items: ToolbarItem[] = [];
  const iconItem: ToolbarItem = {
    icon, ariaLabel: "Action icon", toggle: true, toggleOnClick: false,
    variant: config.selected ? "tonal" : "standard", selected: config.selected, disabled: disabled && config.target === "icon",
  };
  const labelItem: ToolbarItem = {
    text: "Edit", variant: config.selected ? "tonal" : "text", selected: config.selected, toggle: !!config.selected,
    toggleOnClick: false, disabled: disabled && config.target === "label",
  };
  if (config.iconsOnly) items.push(iconItem);
  else if (config.target === "label") items.push(labelItem, iconItem);
  else items.push(iconItem, labelItem);
  items.push({ icon, ariaLabel: "Third action" });
  const fab = config.fab ? createFab({
    ariaLabel: "New", icon, size: config.fab, variant: config.color === "standard" ? "secondary-container" : "tertiary-container",
  }) : undefined;
  const bar = create({
    items, fab, color: config.color, variant: config.mode, elevated: config.elevated,
    orientation: config.vertical ? "vertical" : "horizontal",
    placement: config.vertical ? "end" : "bottom",
    arrangement: config.center ? "center" : "spread",
    scrollBehavior: config.collapse ? "collapse" : "none",
    scrollTarget: host, scrollThreshold: 16,
  });
  host.append(bar.element);
  if (config.hidden) bar.hide();
  if (config.collapse) {
    host.style.overflowY = "auto";
    const content = document.createElement("div");
    content.style.height = "1000px";
    host.append(content);
    host.scrollTop = 0;
    requestAnimationFrame(() => { host.scrollTop = 80; });
  }
  page.measuredToolbar = bar;
};

const root = ".mtrl-toolbar";
const icon = `${root} [aria-label='Action icon']`;
const label = `${root} .mtrl-button`;
const parts = [
  part("stage", "#mount"), part("root", root), part("bar", root+"__bar"), part("fabWrap", root+"__fab"),
  part("icon", icon), part("iconGlyph", icon+" svg"), part("iconLayer", icon, "::before"),
  part("iconTarget", icon, "::after"), part("label", label), part("labelLayer", label, "::before"),
  part("labelText", label+" .mtrl-button__text"), part("third", `${root} [aria-label='Third action']`),
  part("fab", `${root} .mtrl-fab`), part("fabIcon", `${root} .mtrl-fab svg`),
  part("hiddenInert", root+"--hidden[inert]"), part("collapsed", root+"--collapsed"),
];
const properties = [...fieldProperties, "transitionDuration", "justifyContent", "flexDirection"];
const cases: Case[] = [];
for (const mode of ["floating","docked"] as const) {
  for (const color of ["standard","vibrant"] as const) {
    const add = (id: string, options: Partial<Config>, scheme: "light" | "dark" = "light", density = 0) => {
      const target = options.target === "label" ? label : icon;
      const state = options.state ?? "rest";
      cases.push({
        id: `${mode}/${color}/${id}`, config: { mode, color, direction: "ltr", ...options } satisfies Config,
        mount, parts: [part("stateTarget",target),...parts,...interaction("verifiedState",target,state)],
        properties, scheme, density, state, focusTarget: state === "focus" ? target : undefined,
      });
    };
    for (const scheme of ["light","dark"] as const) {
      add(`base/${scheme}`,{},scheme);
      if (mode==="floating") {
        for (const target of ["icon","label"] as const) {
          for (const selected of [true,false]) {
            for (const state of ["rest","hover","focus","pressed","disabled"] as const) {
              if (selected && state==="disabled") continue;
              add(`${target}/${selected ? "selected" : "unselected"}/${state}/${scheme}`,{target,selected,state},scheme);
            }
          }
        }
        add(`fab-default/${scheme}`,{fab:"default"},scheme);
        add(`fab-medium/${scheme}`,{fab:"medium"},scheme);
        add(`vertical/${scheme}`,{vertical:true},scheme);
        add(`vertical-icons/${scheme}`,{vertical:true,iconsOnly:true},scheme);
      }
    }
    if (mode==="floating") {
      add("vertical-rtl",{direction:"rtl",vertical:true});
      add("flat",{elevated:false});
    } else {
      add("center",{center:true});
      add("collapsed",{collapse:true});
    }
    add("rtl",{direction:"rtl"});
    add("hidden",{hidden:true});
    for (const density of [-1,-2,-3]) add(`density/${density}`,{},"light",density);
  }
}
await runFieldFixture("toolbar", cases, id => [
  "stage", "root", "bar", "icon", "iconGlyph",
  ...(id.includes("/vertical-icons/") ? [] : ["label"]),
  ...(id.endsWith("/collapsed") ? ["collapsed"] : []),
  ...(id.includes("/fab-") ? ["fab", "fabIcon", "fabWrap"] : []),
], true);
