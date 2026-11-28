import assert from "node:assert/strict";
import type { SideSheetComponent, SideSheetConfig } from "../src/components/side-sheet/types";
import { createConformanceHarness, fixtureEngine } from "./conformance/measure";

type Fixture = {
  mtrl: { createSideSheet(config: SideSheetConfig): SideSheetComponent };
  measuredSheet?: SideSheetComponent;
};

const engine = fixtureEngine();
const harness = await createConformanceHarness({ component: "side-sheet", engine });
const { page } = harness;
const failures: string[] = [];
try {
  for (const mode of ["light", "dark"] as const) {
    for (const variant of ["standard", "modal"] as const) {
      await page.evaluate(({ mode, variant }) => {
        document.documentElement.dataset.themeMode = mode;
        const fixture = window as unknown as Fixture;
        fixture.measuredSheet?.destroy();
        fixture.measuredSheet = fixture.mtrl.createSideSheet({ variant, title: "Filters" });
        fixture.measuredSheet.open();
      }, { mode, variant });
      const { actual, expected } = await page.locator(".mtrl-side-sheet__title").evaluate(title => {
        const swatch = document.createElement("span");
        swatch.style.color = "var(--mtrl-sys-color-on-surface-variant)";
        document.body.append(swatch);
        const expected = getComputedStyle(swatch).color;
        swatch.remove();
        return { actual: getComputedStyle(title).color, expected };
      });
      if (actual !== expected) failures.push(`${mode} ${variant} headline measured ${actual}, expected ${expected}`);
    }
  }
} finally {
  await harness.close();
}
assert.equal(failures.length, 0, failures.join("\n"));
console.log(`Standard and modal side sheet headline colours passed in ${engine}.`);
