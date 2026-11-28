import assert from "node:assert/strict";
import type { Page } from "playwright";

import type createSelect from "../src/components/select";
import { settle } from "./browser-settle";
import { createConformanceHarness, fixtureEngine } from "./conformance/measure";

type Select = ReturnType<typeof createSelect>;
type Config = Pick<Parameters<typeof createSelect>[0], "variant" | "layer" | "error">;
type Fixture = Window & { mtrl: { createSelect: typeof createSelect }; measuredSelect?: Select };

async function mount(page: Page, options: Config) {
  await page.mouse.move(0, 0);
  await page.evaluate(config => {
    const fixture = window as unknown as Fixture;
    fixture.measuredSelect?.destroy();
    const select = fixture.mtrl.createSelect({
      label: "Fruit",
      options: [{ id: "apple", text: "Apple" }, { id: "pear", text: "Pear" }],
      ...config,
    });
    fixture.measuredSelect = select;
    document.querySelector("#mount")!.replaceChildren(select.element);
  }, options);
}

async function readColour(page: Page, selector: string, role: string) {
  return page.locator(selector).evaluate((element, role) => {
    const reference = document.createElement("span");
    reference.style.color = `var(--mtrl-sys-color-${role})`;
    document.body.append(reference);
    const expected = getComputedStyle(reference).color;
    reference.remove();
    return { actual: getComputedStyle(element).color, expected };
  }, role);
}

const engine = fixtureEngine();
const failures: string[] = [];
async function checkSelect() {
  const harness = await createConformanceHarness({ component: "select", engine });
  const { page } = harness;
  page.setDefaultTimeout(6500);
  try {
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const theme of ["light", "dark"] as const) {
      await page.evaluate(mode => document.documentElement.setAttribute("data-theme-mode", mode), theme);
      const compare = (state: string, actual: number | string, expected: number | string) => {
        if (actual !== expected) failures.push(`${engine} ${theme} ${state} measured ${actual}, expected ${expected}`);
      };
      for (const variant of ["filled", "outlined"] as const) {
        for (const layer of ["inline", "top"] as const) {
          await mount(page, { variant, layer: layer === "top" ? "top" : undefined });
          await page.evaluate(() => (window as unknown as Fixture).measuredSelect!.open("keyboard"));
          const menu = page.locator(".mtrl-select__menu");
          await menu.waitFor({ state: "visible" });
          await settle(page, { target: ".mtrl-select__menu" });
          const height = await menu.locator("[role='option']").first().evaluate(item => item.getBoundingClientRect().height);
          compare(`${variant} ${layer} option height`, height, 48);
        }
        for (const error of [false, true]) {
          await mount(page, { variant, error });
          await page.locator("input").focus();
          await settle(page, { target: ".mtrl-select" });
          const colour = await readColour(page, ".mtrl-text-field__trailing-icon svg", error ? "error" : "on-surface-variant");
          compare(`${variant} ${error ? "error focus" : "focus"} arrow`, colour.actual, colour.expected);
        }
      }
      await mount(page, { variant: "outlined" });
      await page.locator(".mtrl-text-field__field").hover();
      await settle(page, { target: ".mtrl-select" });
      const label = await readColour(page, ".mtrl-text-field__label", "on-surface-variant");
      compare("outlined hover label", label.actual, label.expected);
    }
  } finally {
    await harness.close();
  }
}

await checkSelect();
assert.equal(failures.length, 0, failures.join("\n"));
console.log(`Select conformance passed in ${engine}.`);
