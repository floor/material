import assert from "node:assert/strict";
import type { TooltipComponent, TooltipConfig } from "../../src/components/tooltip/types";
import { createConformanceHarness, type Case } from "./measure";
import { fieldProperties, interaction, part, runFieldFixture, type ReadState } from "./field-fixture";

type Config = {
  variant: "plain" | "rich";
  position: "top" | "bottom";
  direction: "ltr" | "rtl";
  state: ReadState;
  text?: string;
  top?: boolean;
};

const mount: Case["mount"] = (mtrl, host, data) => {
  const config = data as Config;
  const page = window as Window & { measuredTooltip?: TooltipComponent };
  page.measuredTooltip?.destroy();
  document.documentElement.dir = config.direction;
  const target = document.createElement("button");
  target.id = "tooltip-target";
  target.style.cssText = "position:fixed;top:260px;left:360px";
  target.textContent = "Item";
  host.append(target);
  const create = mtrl.createTooltip as unknown as (settings: TooltipConfig) => TooltipComponent;
  const tooltip = create({
    target, variant: config.variant, position: config.position, text: config.text ?? "Additional context",
    layer: config.top ? "top" : undefined,
  });
  page.measuredTooltip = tooltip;
  if (config.state === "rest") tooltip.show(true);
};

const target = "#tooltip-target";
const tooltip = ".mtrl-tooltip--visible";
const properties = [...fieldProperties,
  "textAlign", "position", "pointerEvents", "transitionDuration", "transitionTimingFunction", "borderTopWidth",
];
const parts = [
  part("target", target), part("surface", tooltip), part("arrow", `${tooltip} .mtrl-tooltip__arrow`),
  part("subhead", `${tooltip} h1,${tooltip} h2,${tooltip} h3,${tooltip} [role='heading']`),
  part("action", `${tooltip} button,${tooltip} a[href]`),
];
const cases: Case[] = [];
for (const variant of ["plain","rich"] as const) {
  const config: Config = { variant, position: "bottom", direction: "ltr", state: "rest" };
  const add = (id: string, options: Config, scheme: "light" | "dark" = "light", density = 0) => {
    cases.push({
      id: `${variant}/${id}`, mount, config: options, scheme, density, properties,
      state: options.state, focusTarget: options.state === "focus" ? target : undefined,
      parts: [...parts, ...interaction("verifiedState", target, options.state)],
    });
  };
  for (const scheme of ["light","dark"] as const) {
    add(`short/${scheme}`, config, scheme);
    add(`top-layer/${scheme}`, { ...config, position: "top", top: true }, scheme);
  }
  add("empty", { ...config, text: "" });
  add("long", { ...config, text: "Extra help about how this option affects your choices. ".repeat(6) });
  add("rtl", { ...config, direction: "rtl" });
  for (const state of ["hover","focus"] as const) add(state, { ...config, state });
  for (const density of [-1,-2,-3]) add(`density/${density}`, config, "light", density);
  if (variant === "rich") add("html-looking-text", { ...config, text: "<h3>Hint</h3><button>Learn more</button>" });
}

async function measureTooltipBehavior() {
  const engine = process.argv.includes("--webkit") ? "webkit" : "chromium";
  const harness = await createConformanceHarness({ component: "tooltip", engine });
  const { page } = harness;
  page.setDefaultTimeout(6500);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  try {
    const mounted = await page.evaluate(() => {
      const create = (window as unknown as {
        mtrl: { createTooltip: (config: TooltipConfig) => TooltipComponent };
      }).mtrl.createTooltip;
      const host = document.querySelector("#mount")!;
      const mountAnchor = (id: string, left: number) => {
        const anchor = document.createElement("button");
        anchor.id = id;
        anchor.textContent = id;
        anchor.style.cssText = `position:fixed;top:260px;left:${left}px`;
        host.append(anchor);
        return anchor;
      };
      const first = mountAnchor("first-anchor", 360);
      const second = mountAnchor("second-anchor", 600);
      const plain = create({ target: first, text: "Plain", variant: "plain" });
      const rich = create({ target: second, text: "Rich", variant: "rich" });
      plain.element.id ||= "first-tooltip";
      plain.element.classList.add("first-tooltip");
      rich.element.classList.add("second-tooltip");
      return {
        plainRole: plain.element.getAttribute("role"),
        richRole: rich.element.getAttribute("role"),
        referenced: first.getAttribute("aria-describedby") === plain.element.id,
      };
    });
    const selector = ".first-tooltip.mtrl-tooltip--visible";
    await page.locator("#first-anchor").hover();
    await page.waitForSelector(selector);
    await page.waitForFunction(() => getComputedStyle(document.querySelector(".first-tooltip")!).opacity === "1");
    const placement = await page.evaluate(() => {
      const a = document.querySelector("#first-anchor")!.getBoundingClientRect();
      const t = document.querySelector(".first-tooltip")!.getBoundingClientRect();
      return t.top >= a.bottom ? { side: "below", gap: t.top - a.bottom } : { side: "above", gap: a.top - t.bottom };
    });
    const hide = page.evaluate(() => new Promise<number>(resolve => {
      const tip = document.querySelector(".first-tooltip")!;
      const anchor = document.querySelector("#first-anchor")!;
      anchor.addEventListener("mouseleave", () => {
        const start = performance.now();
        const observer = new MutationObserver(() => {
          if (tip.classList.contains("mtrl-tooltip--visible")) return;
          observer.disconnect();
          resolve(performance.now() - start);
        });
        observer.observe(tip, { attributes: true, attributeFilter: ["class"] });
      }, { once: true });
    }));
    await page.mouse.move(0, 0);
    const hideDelay = await hide;
    await page.keyboard.press(engine === "webkit" ? "Alt+Tab" : "Tab");
    await page.waitForSelector(selector);
    await page.locator("#second-anchor").hover();
    await page.waitForSelector(".second-tooltip.mtrl-tooltip--visible");
    const visibleAfterOtherHover = await page.locator(".mtrl-tooltip--visible").count();
    await page.keyboard.press("Escape");
    await page.waitForSelector(".mtrl-tooltip--visible", { state: "detached" });
    const focusAfterEscape = await page.evaluate(() => document.activeElement?.id);
    assert.ok(Number.isFinite(hideDelay));
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ source: harness.source, engine, mounted, placement, hideDelay, visibleAfterOtherHover, focusAfterEscape }));
  } finally {
    await harness.close();
  }
}

if (process.argv.includes("--behavior")) await measureTooltipBehavior();
else await runFieldFixture("tooltip", cases, () => ["target", "surface", "arrow"]);
