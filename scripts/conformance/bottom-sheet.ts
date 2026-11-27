import type { BottomSheetComponent, BottomSheetConfig } from "../../src/components/bottom-sheet/types";
import type { Case } from "./measure";
import { fieldProperties, interaction, part, runFieldFixture, type ReadState } from "./field-fixture";

type Config = {
  variant: "standard" | "modal";
  stage: "partial" | "expanded" | "full";
  direction: "ltr" | "rtl";
  top?: boolean;
  noHandle?: boolean;
};

const mount: Case["mount"] = (mtrl, host, data) => {
  const config = data as Config;
  const page = window as Window & { measuredBottomSheet?: BottomSheetComponent };
  page.measuredBottomSheet?.destroy();
  document.documentElement.dir = config.direction;
  const opener = document.createElement("button");
  opener.textContent = "Open sheet";
  const viewport = document.createElement("div");
  viewport.id = "sheet-viewport";
  viewport.style.cssText = "position:fixed;inset:0;pointer-events:none";
  host.append(opener, viewport);
  const content = document.createElement("div");
  content.style.height = config.stage === "full" ? "1500px" : "420px";
  const control = document.createElement("button");
  control.textContent = "Next";
  content.append(control);
  const create = mtrl.createBottomSheet as unknown as (settings: BottomSheetConfig) => BottomSheetComponent;
  const sheet = create({
    variant: config.variant, title: "Options", content, dragHandle: !config.noHandle,
    layer: config.top ? "top" : undefined,
  });
  page.measuredBottomSheet = sheet;
  opener.focus();
  sheet.open();
  if (config.stage !== "partial") sheet.expand();
};

const sheet = ".mtrl-bottom-sheet";
const surface = ".mtrl-bottom-sheet__container";
const handle = ".mtrl-bottom-sheet__handle";
const parts = [
  part("viewport", "#sheet-viewport"), part("surface", surface), part("root", sheet),
  part("handle", handle), part("handleInk", handle, "::before"),
  part("content", ".mtrl-bottom-sheet__content"), part("title", ".mtrl-bottom-sheet__title"),
  part("header", ".mtrl-bottom-sheet__header"), part("scrim", ".mtrl-bottom-sheet__scrim"),
  part("backdrop", `dialog${sheet}[open]`, "::backdrop"),
];
const properties = [...fieldProperties, "top", "right", "bottom", "left", "maxHeight", "transitionDuration", "transitionTimingFunction"];
const cases: Case[] = [];
for (const variant of ["standard","modal"] as const) {
  const config: Config = { variant, stage: "partial", direction: "ltr" };
  const add = (id: string, options: Config, scheme: "light" | "dark" = "light", density = 0, state: ReadState = "rest") => {
    cases.push({
      id: `${variant}/${id}`, mount, config: options, properties, scheme, density, state,
      before: 480, focusTarget: state === "focus" ? handle : undefined,
      parts: [part("stateTarget", handle), ...parts, ...interaction("verifiedState", handle, state)],
    });
  };
  for (const scheme of ["light","dark"] as const) {
    add(`partial/${scheme}`, config, scheme);
    add(`expanded/${scheme}`, { ...config, stage: "expanded" }, scheme);
    add(`full/${scheme}`, { ...config, stage: "full" }, scheme);
    if (variant === "modal") add(`top/${scheme}`, { ...config, top: true }, scheme);
  }
  add("wide-700", { ...config, stage: "full" });
  cases.at(-1)!.viewport = { width: 700, height: 600 };
  for (const state of ["focus","hover","pressed"] as const) add(state, config, "light", 0, state);
  for (const density of [-1,-2,-3]) add(`density/${density}`, config, "light", density);
  add("rtl", { ...config, direction: "rtl" });
  add("no-handle", { ...config, noHandle: true });
}

await runFieldFixture("bottom-sheet", cases, id => [
  "viewport", "surface", "header", "title", "content",
  ...(id.endsWith("no-handle") ? [] : ["handle"]),
  ...(id.startsWith("modal/") ? [id.includes("/top/") ? "backdrop" : "scrim"] : []),
]);
