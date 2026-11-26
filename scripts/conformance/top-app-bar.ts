import type { AppBarComponent, AppBarConfig, TopAppBarType } from "../../src/components/top-app-bar/types";
import type { IconButtonComponent, IconButtonConfig } from "../../src/components/icon-button/types";
import type { Case } from "./measure";
import { fieldProperties, part, runFieldFixture } from "./field-fixture";

type Config = {
  type: TopAppBarType;
  direction: "ltr" | "rtl";
  scrolled?: boolean;
  noLeading?: boolean;
  keepHeight?: boolean;
};

const mount: Case["mount"] = (mtrl, host, data) => {
  const { type, direction, scrolled, noLeading, keepHeight } = data as Config;
  const page = window as Window & { measuredAppBar?: AppBarComponent };
  page.measuredAppBar?.lifecycle.destroy();
  document.documentElement.dir = direction;
  host.style.width = "min(624px,calc(100vw - 48px))";
  const factory = mtrl.createAppBar as unknown as (config: AppBarConfig) => AppBarComponent;
  const iconButton = mtrl.createIconButton as unknown as (config: IconButtonConfig) => IconButtonComponent;
  const icon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 4h16v16H4z"/></svg>';
  const bar = factory({ title: "Trips", type, scrollable: true, compressible: !keepHeight });
  const place = (where: "leading" | "trailing", name: string) => {
    const button = iconButton({ ariaLabel: name, icon }).element;
    button.dataset.fixturePart = name;
    if (where === "leading") bar.addLeadingElement(button);
    else bar.addTrailingElement(button);
  };
  if (!noLeading) place("leading", "Back");
  place("trailing", "Search");
  place("trailing", "More");
  host.append(bar.element);
  if (scrolled) bar.setScrollState(true);
  page.measuredAppBar = bar;
};

const root = ".mtrl-top-app-bar";
const parts = [
  part("root", root), part("leadingWrap", root+"__leading"), part("title", root+"__headline"),
  part("trailingWrap", root+"__trailing"),
  part("leading", "[data-fixture-part='Back']"), part("leadingIcon", "[data-fixture-part='Back'] svg"),
  part("leadingTarget", "[data-fixture-part='Back']", "::after"),
  part("trailing", "[data-fixture-part='Search']"), part("trailingIcon", "[data-fixture-part='Search'] svg"),
  part("lastTrailing", "[data-fixture-part='More']"),
  part("firstRow", root+"__row:first-child"), part("lastRow", root+"__row:last-child"),
];
const properties = [...fieldProperties, "textAlign", "justifyContent", "transitionDuration"];
const cases: Case[] = [];
for (const type of ["small","center","medium","large"] as const) {
  const add = (
    id: string, config: Partial<Config>, scheme: "light" | "dark" = "light", density = 0,
  ) => cases.push({
    id: `${type}/${id}`, config: { type, direction: "ltr", ...config } satisfies Config,
    mount, scheme, density, parts, properties,
  });
  for (const scheme of ["light", "dark"] as const) {
    add(`rest/${scheme}`, {}, scheme);
    add(`scrolled/${scheme}`, { scrolled: true }, scheme);
  }
  add("rtl", { direction: "rtl" });
  add("no-leading", { noLeading: true });
  add("no-leading-rtl", { noLeading: true, direction: "rtl" });
  if (type === "medium" || type === "large") add("scrolled-keep-height", { scrolled: true, keepHeight: true });
  for (const density of [-1,-2,-3]) add(`density/${density}`, {}, "light", density);
}
await runFieldFixture("top-app-bar", cases, id => [
  "root", "title", "trailing", "trailingIcon", "lastTrailing",
  ...(id.includes("no-leading") ? [] : ["leading", "leadingIcon"]),
], true);
