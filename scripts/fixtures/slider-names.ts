import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import type { Page } from "playwright";
import type { SliderConfig } from "../../src/components/slider/types";

/** Computed accessibility names, rather than ARIA attributes on a wrapper. */
export async function checkSliderNames(page: Page, artifacts: string): Promise<void> {
  const session = await page.context().newCDPSession(page);
  const reports = [];
  for (const range of [false, true]) {
    const scenarios: { name: string; config: SliderConfig; expected: string; renamed?: string }[] = [
      { name: "carousel-remote", config: { ariaLabel: "Slide" }, expected: "Slide" },
      { name: "explicit-over-visible", config: { ariaLabel: "Slide", label: "Visible label" }, expected: "Slide" },
      { name: "visible-fallback", config: { label: "Volume" }, expected: "Volume" },
      { name: "empty-aria-fallback", config: { ariaLabel: "", label: "Volume" }, expected: "Volume" },
      { name: "reference", config: { ariaLabelledBy: "slider-name" }, expected: "Volume", renamed: "Brightness" },
      { name: "multiple-references", config: { ariaLabelledBy: "slider-context slider-name" }, expected: "Media Volume" },
      { name: "reference-precedence", config: { ariaLabelledBy: "slider-name", ariaLabel: "Slide", label: "Visible label" }, expected: "Volume" },
      { name: "unnamed", config: {}, expected: "" },
    ];
    for (const scenario of scenarios) {
      await page.evaluate(({ config, range }) => {
        document.querySelectorAll("[data-slider-name]").forEach(node => node.remove());
        for (const [id, text] of [["slider-name", "Volume"], ["slider-context", "Media"]]) {
          const label = document.createElement("span");
          label.id = id;
          label.textContent = text;
          label.dataset.sliderName = "";
          document.body.append(label);
        }
        window.mount({ value: 20, ...(range ? { range, secondValue: 80 } : {}), ...JSON.parse(config) }, 320, "baseline", "light");
      }, { config: JSON.stringify(scenario.config), range });
      const expected = (name: string) => name ? range ? [`${name} minimum`, `${name} maximum`] : [name] : range ? ["", ""] : [""];
      const read = async () => {
        const tree = await session.send("Accessibility.getFullAXTree");
        return tree.nodes.filter(node => !node.ignored && node.role?.value === "slider")
          .map(node => ({ name: node.name?.value, value: node.value?.value, sources: node.name?.sources }));
      };
      const initial = await read();
      const labels = await page.locator("#host label").count();
      let renamed;
      if (scenario.renamed) {
        await page.locator("#slider-name").evaluate((label, name) => { label.textContent = name; }, scenario.renamed);
        renamed = await read();
      }
      reports.push({ scenario: scenario.name, range, expected: expected(scenario.expected), initial,
        ...(renamed ? { renamedExpected: expected(scenario.renamed!), renamed } : {}), labels });
    }
  }
  await session.detach();
  await page.evaluate(() => document.querySelectorAll("[data-slider-name]").forEach(node => node.remove()));
  await writeFile(`${artifacts}/accessible-names.json`, JSON.stringify(reports, null, 2));
  const failures = reports.flatMap(report => {
    const issues = [];
    if (JSON.stringify(report.initial.map(node => node.name)) !== JSON.stringify(report.expected)) issues.push(report);
    if (report.renamed && JSON.stringify(report.renamed.map(node => node.name)) !== JSON.stringify(report.renamedExpected)) issues.push(report);
    return issues;
  });
  console.log(JSON.stringify({ sliderNames: reports.length, failures }, null, 2));
  assert.deepEqual(failures, [], "slider handles must carry the computed accessible name");
  for (const report of reports.filter(report => report.scenario === "carousel-remote" || report.scenario === "reference")) {
    assert.equal(report.labels, 0, `${report.scenario}: no visible label is created`);
  }
}
