import type { SliderComponent, SliderConfig } from "../../src/components/slider/types";
import type { Case } from "./measure";
import { fieldProperties, interaction, part, runFieldFixture, type ReadState } from "./field-fixture";

type Config = {
  size: NonNullable<SliderConfig["size"]>;
  variant: "standard" | "centered" | "range" | "discrete" | "vertical";
  state: ReadState;
  direction: "ltr" | "rtl";
  value: number;
  topToBottom?: boolean;
};

const mount: Case["mount"] = (mtrl, host, data) => {
  const config = data as Config;
  const page = window as Window & { measuredSlider?: SliderComponent };
  page.measuredSlider?.destroy();
  document.documentElement.dir = config.direction;
  host.style.cssText = "position:relative;padding-top:88px;width:min(390px,calc(100vw - 48px))";
  const create = mtrl.createSlider as unknown as (options: SliderConfig) => SliderComponent;
  const slider = create({
    size: config.size, value: config.value,
    range: config.variant === "range", secondValue: config.variant === "range" ? 76 : undefined,
    centered: config.variant === "centered", disabled: config.state === "disabled",
    min: config.variant === "centered" ? -100 : undefined,
    orientation: config.variant === "vertical" ? "vertical" : "horizontal",
    topToBottom: config.topToBottom,
    ticks: config.variant === "discrete", step: config.variant === "discrete" ? 10 : 1,
    insetIcon: '<svg aria-hidden="true" viewBox="0 0 24 24"><path fill="currentColor" d="M4 4h16v16H4z"/></svg>',
    ariaLabel: "Volume", showValue: true,
  });
  if (config.variant === "vertical") slider.element.style.height = "280px";
  host.append(slider.element);
  page.measuredSlider = slider;
};

const root = ".mtrl-slider";
const track = root+"__track";
const handle = root+"__handle[data-handle-index='0']";
const active = root+"__segment--active";
const rest = `${root}__segment:nth-child(3)`;
const parts = [
  part("root", root), part("container", root+"__container"), part("track", track),
  part("active", active), part("rest", rest), part("inactive2", root+"__segment:first-child"),
  part("handle", handle), part("handleInk", handle, "::before"),
  part("secondHandle", root+"__handle[data-handle-index='1']"),
  part("dot", root+"__dot:not([hidden])"), part("ticks", root+"__ticks:not([hidden],.mtrl-slider__ticks--active)"),
  part("activeTicks", root+"__ticks--active:not([hidden])"), part("insetIcon", root+"__inset-icon svg"),
  part("insetWrapper", root+"__inset-icon"), part("bubble", root+"__value--visible"),
  part("hiddenBubble", `${root}__value:not(${root}__value--visible)`),
  part("sliderRole", `${handle}[role='slider'][aria-valuenow]`),
];
const properties = [...fieldProperties, "backgroundImage", "backgroundSize", "backgroundPosition", "maskImage",
  "maskSize", "top", "left", "right", "bottom", "scale", "transitionDuration", "transitionProperty", "clipPath",
];
const cases: Case[] = [];
for (const size of ["XS","S","M","L","XL"] as const) {
  const add = (id:string, change:Partial<Config>, scheme:"light"|"dark"="light", density=0) => {
    const config:Config={size,variant:"standard",direction:"ltr",value:40,state:"rest",...change};
    const check = config.state === "disabled" ? [part("verifiedState",`${handle}[aria-disabled='true']`)]
      : interaction("verifiedState",handle,config.state);
    const modifier = size === "XS" ? root : `${root}--${size.toLowerCase()}`;
    cases.push({id:`${size.toLowerCase()}/${id}`,mount,config,scheme,density,properties,
      parts:[part("stateTarget",handle),part("sizeVariant",modifier),...parts,...check],before:120,
      state:config.state,focusTarget:config.state==="focus"?handle:undefined,
    });
  };
  for (const scheme of ["light","dark"] as const) {
    for (const state of ["rest","hover","focus","pressed","disabled"] as const) add(`${state}/${scheme}`,{state},scheme);
    if (size==="XS") {
      add(`discrete/${scheme}`,{variant:"discrete"},scheme);
      add(`discrete-disabled/${scheme}`,{variant:"discrete",state:"disabled"},scheme);
    }
  }
  add("min",{value:0});
  add("max",{value:100});
  add("rtl",{direction:"rtl"});
  if (size==="XS" || size==="M") {
    add("centered",{variant:"centered",value:25});
    add("range",{variant:"range",value:24});
    add("vertical",{variant:"vertical"});
    add("vertical-top",{variant:"vertical",topToBottom:true});
  }
  for (const density of [-1,-2,-3]) add(`density/${density}`,{},"light",density);
}
await runFieldFixture("slider",cases,id=>[
  "root","sizeVariant","container","track","handle","handleInk","sliderRole",
  ...(id.endsWith("/min") || id.endsWith("/max") ? [] : ["active","rest"]),
  ...(id.endsWith("/range") ? ["secondHandle"] : []),
]);
