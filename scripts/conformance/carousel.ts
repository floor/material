import type { CarouselComponent, CarouselConfig, CarouselVariant } from "../../src/components/carousel/types";
import type { Case } from "./measure";
import { fieldProperties, interaction, part, runFieldFixture, type ReadState } from "./field-fixture";

type Config = {
  variant: CarouselVariant;
  direction: "ltr" | "rtl";
  atEnd?: boolean;
  middle?: boolean;
  square?: boolean;
  mixed?: boolean;
  disabled?: boolean;
};

const mount: Case["mount"] = (mtrl, host, data) => {
  const config = data as Config;
  const page = window as Window & { measuredCarousel?: CarouselComponent };
  page.measuredCarousel?.destroy();
  document.documentElement.dir = config.direction;
  host.style.cssText = "width:min(682px,calc(100vw - 48px));height:240px";
  const create = mtrl.createCarousel as unknown as (options: CarouselConfig) => CarouselComponent;
  const slides = Array.from({ length: 6 }, (_, i) => {
    const content = document.createElement("div");
    content.style.cssText = `width:100%;height:100%;background:hsl(${i * 55} 60% 70%)`;
    return {
      content, title: `Slide ${i + 1}`,
      ...(config.mixed ? { width: 140 + 25 * i, height: 100 + 16 * i } : {}),
      ...(config.disabled && i === 0 ? { disabled: true } : {}),
    };
  });
  const carousel = create({
    variant: config.variant, slides, ariaLabel: "Destinations",
    initialSlide: config.atEnd ? slides.length - 1 : config.middle ? 2 : 0,
    cornerRadius: config.square ? 0 : undefined,
  });
  host.append(carousel.element);
  page.measuredCarousel = carousel;
};

const root = ".mtrl-carousel";
const item = root+"__item";
const slide = (i: number) => `${item}[aria-label='Slide ${i}']`;
const parts = [
  part("disabled", `${slide(1)}[aria-disabled="true"]`),
  part("root", root), part("scroller", root+"__scroller"), part("layer", root+"__layer"), part("track", root+"__track"),
  part("first", slide(1)), part("second", slide(2)), part("third", slide(3)), part("fourth", slide(4)),
  part("fifth", slide(5)), part("last", slide(6)), part("firstLayer", slide(1), "::before"),
  part("focusRing", slide(1), "::after"),
  part("firstContent", slide(1)+" > div"), part("accessibleFirst", slide(1)+"[role=group][aria-roledescription=slide]"),
];
const properties = [...fieldProperties, "scrollSnapType", "scrollbarWidth", "borderBottomWidth", "overflowX",
  "overscrollBehaviorX", "overscrollBehaviorY", "pointerEvents", "transitionDuration", "clipPath", "scrollBehavior"];
const cases: Case[] = [];
for (const variant of ["multi-browse", "uncontained", "hero", "hero-center", "full-screen"] as const) {
  const add = (id: string, config: Partial<Config>, scheme: "light" | "dark" = "light", density = 0, state: ReadState = "rest") => {
    cases.push({
      id: `${variant}/${id}`, config: { variant, direction: "ltr", ...config } satisfies Config,
      mount, parts: [part("stateTarget",slide(1)),...parts,...interaction("verifiedState",slide(1),state)],
      properties, scheme, density, state, before: 200, focusTarget: state === "focus" ? slide(1) : undefined,
    });
  };
  for (const scheme of ["light","dark"] as const) add(`base/${scheme}`,{},scheme);
  for (const state of ["hover","focus","pressed"] as const) add(state,{},"light",0,state);
  add("rtl",{direction:"rtl"});
  add("end",{atEnd:true});
  add("end-rtl",{direction:"rtl",atEnd:true});
  if (variant === "uncontained") { add("mixed", { mixed: true }); add("disabled-item", { disabled: true }); }
  if (variant==="hero-center") add("middle",{middle:true});
  if (variant==="full-screen") add("square",{square:true});
  for (const density of [-1,-2,-3]) add(`density/${density}`,{},"light",density);
}
await runFieldFixture("carousel",cases,id=>[
  "root","track","scroller","first","second","last","firstContent","accessibleFirst",
  ...(id.startsWith("uncontained/") ? [] : ["layer"]),
]);
