import type { BottomAppBarComponent, BottomAppBarConfig } from "../../src/components/bottom-app-bar/types";
import type { FabComponent, FabConfig } from "../../src/components/fab/types";
import type { IconButtonComponent, IconButtonConfig } from "../../src/components/icon-button/types";
import type { Case } from "./measure";
import { fieldProperties, part, runFieldFixture } from "./field-fixture";

type Config = { direction: "ltr" | "rtl"; fab?: "end" | "center"; hidden?: boolean };

const mount: Case["mount"] = (mtrl, host, data) => {
  const config = data as Config;
  const page = window as Window & { measuredBar?: BottomAppBarComponent };
  page.measuredBar?.lifecycle.destroy();
  document.documentElement.dir = config.direction;
  host.style.cssText = "height:320px;position:relative;width:min(624px,calc(100vw - 48px))";
  const factory = mtrl.createBottomAppBar as unknown as (config: BottomAppBarConfig) => BottomAppBarComponent;
  const fab = mtrl.createFab as unknown as (config: FabConfig) => FabComponent;
  const iconButton = mtrl.createIconButton as unknown as (config: IconButtonConfig) => IconButtonComponent;
  const icon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 4h16v16H4z"/></svg>';
  const bar = factory({ hasFab: !!config.fab, fabPosition: config.fab });
  for (const label of ["Search", "Settings", "More"]) {
    const action = iconButton({ ariaLabel: label, icon }).element;
    action.dataset.fixturePart = label;
    bar.addAction(action);
  }
  if (config.fab) bar.addFab(fab({ ariaLabel: "Add", icon }).element);
  host.append(bar.element);
  if (config.hidden) bar.hide();
  page.measuredBar = bar;
};

const root = ".mtrl-bottom-app-bar";
const parts = [
  part("stage", "#mount"), part("root", root), part("actions", root+"__actions"), part("fabWrap", root+"__fab-container"),
  part("action", "[data-fixture-part='Search']"), part("second", "[data-fixture-part='Settings']"),
  part("last", "[data-fixture-part='More']"), part("icon", "[data-fixture-part='Search'] svg"),
  part("actionTarget", "[data-fixture-part='Search']", "::after"),
  part("fab", root+" .mtrl-fab"), part("fabIcon", root+" .mtrl-fab svg"),
  part("hiddenInert", root+"--hidden[inert]"),
  part("hiddenFocus", root+"--hidden :focus"),
];
const properties = [...fieldProperties, "transitionDuration", "pointerEvents", "borderTopWidth"];
const cases: Case[] = [];
const tabKey = process.argv.includes("--webkit") ? "Alt+Tab" : "Tab";
for (const [label,fab] of [["plain",undefined],["end","end"],["center","center"]] as const) {
  const add = (id: string, options: Partial<Config>, scheme: "light" | "dark" = "light", density = 0) => {
    cases.push({ id: `${label}/${id}`, config: { direction: "ltr", fab, ...options } satisfies Config,
      mount, parts, properties, scheme, density, keys: options.hidden ? [tabKey] : undefined });
  };
  for (const scheme of ["light", "dark"] as const) add(`base/${scheme}`, {}, scheme);
  add("rtl", { direction: "rtl" });
  add("hidden", { hidden: true });
  for (const density of [-1,-2,-3]) add(`density/${density}`, {}, "light", density);
}

await runFieldFixture("bottom-app-bar", cases, id => [
  "stage", "root", "actions", "action", "second", "last", "icon",
  ...(id.startsWith("plain/") ? [] : ["fabWrap", "fab", "fabIcon"]),
], true);
