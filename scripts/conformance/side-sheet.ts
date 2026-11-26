import type { SideSheetComponent, SideSheetConfig } from "../../src/components/side-sheet/types";
import type { Case } from "./measure";
import { fieldProperties, interaction, part, runFieldFixture, type ReadState } from "./field-fixture";

type Config = {
  variant: "standard" | "modal";
  position: "start" | "end";
  direction: "ltr" | "rtl";
  width?: number;
  top?: boolean;
  noClose?: boolean;
};

const mount: Case["mount"] = (mtrl, host, data) => {
  const { direction, top, noClose, ...options } = data as Config;
  const page = window as Window & { measuredSideSheet?: SideSheetComponent };
  page.measuredSideSheet?.destroy();
  document.documentElement.dir = direction;
  const viewport = document.createElement("div");
  viewport.id = "sheet-viewport";
  viewport.style.cssText = "position:fixed;inset:0;pointer-events:none";
  const opener = document.createElement("button");
  opener.textContent = "Open sheet";
  host.append(opener, viewport);
  const content = document.createElement("button");
  content.textContent = "Apply";
  const create = mtrl.createSideSheet as unknown as (settings: SideSheetConfig) => SideSheetComponent;
  const sheet = create({ ...options, title: "Filters", content, closeButton: !noClose, layer: top ? "top" : undefined });
  page.measuredSideSheet = sheet;
  opener.focus();
  sheet.open();
};

const sheet = ".mtrl-side-sheet";
const prefix = `${sheet}__`;
const close = `${prefix}close`;
const parts = [
  part("viewport", "#sheet-viewport"), part("surface", `${prefix}container`),
  part("header", `${prefix}header`), part("title", `${prefix}title`), part("content", `${prefix}content`),
  part("close", close), part("icon", `${close} svg`), part("layer", close, "::before"),
  part("target", close, "::after"), part("scrim", `${prefix}scrim`),
  part("backdrop", `dialog${sheet}[open]`, "::backdrop"),
];
const properties = [...fieldProperties,
  "borderInlineStartWidth", "borderInlineStartColor", "borderInlineEndWidth", "borderInlineEndColor",
  "transitionDuration", "transitionTimingFunction", "boxSizing",
];
const cases: Case[] = [];
for (const variant of ["standard", "modal"] as const) {
  const config: Config = { variant, position: "end", direction: "ltr" };
  const add = (id: string, options: Config, scheme: "light" | "dark" = "light", density = 0, state: ReadState = "rest") => {
    cases.push({
      id: `${variant}/${id}`, mount, config: options, properties, scheme, density, state,
      before: 480, focusTarget: state === "focus" ? close : undefined,
      parts: [part("stateTarget", close), ...parts, ...interaction("verifiedState", close, state)],
    });
  };
  for (const scheme of ["light", "dark"] as const) {
    for (const direction of ["ltr", "rtl"] as const) {
      for (const position of ["start", "end"] as const) add(`${direction}/${position}/${scheme}`, { ...config, position, direction }, scheme);
    }
    if (variant === "modal") add(`top/${scheme}`, { ...config, top: true }, scheme);
    for (const state of ["hover", "pressed", "focus"] as const) add(`${state}/${scheme}`, config, scheme, 0, state);
  }
  for (const density of [-1,-2,-3]) add(`density/${density}`, config, "light", density);
  add("max-width", { ...config, width: 600 });
  add("no-close", { ...config, noClose: true });
}

await runFieldFixture("side-sheet", cases, id => [
  "viewport", "surface", "header", "title", "content",
  ...(id.endsWith("no-close") ? [] : ["close", "icon"]),
  ...(id.startsWith("modal/") ? [id.includes("/top/") ? "backdrop" : "scrim"] : []),
]);
