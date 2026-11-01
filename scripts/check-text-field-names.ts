import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Page } from "playwright";
import type createTextField from "../src/components/text-field";

type NameWindow = Window & {
  inputs: { createTextField: typeof createTextField };
  nameField: ReturnType<typeof createTextField>;
};

/** Read the name of the native control that actually takes focus. */
export async function checkTextFieldNames(page: Page): Promise<void> {
  const session = await page.context().newCDPSession(page);
  const reports = [];
  const scenarios = [
    { name: "aria-only", config: { ariaLabel: "Email address" }, expected: "Email address" },
    { name: "explicit-over-label", config: { ariaLabel: "Email address", label: "Email" }, expected: "Email address", renamed: "Email address" },
    { name: "visible-label", config: { label: "Email" }, expected: "Email", renamed: "Updated email" },
    { name: "matching-label", config: { ariaLabel: "Email", label: "Email" }, expected: "Email", renamed: "Updated email" },
    { name: "empty-aria", config: { ariaLabel: "", label: "Email" }, expected: "Email", renamed: "Updated email" },
  ];
  for (const variant of ["filled", "outlined"]) for (const type of ["text", "multiline"]) {
    for (const scenario of scenarios) {
      const dom = await page.evaluate(config => {
        const state = window as unknown as NameWindow;
        const field = state.nameField = state.inputs.createTextField(JSON.parse(config));
        document.body.append(field.element);
        field.input.focus();
        return {
          tag: field.input.tagName,
          focused: document.activeElement === field.input,
          inputLabel: field.input.getAttribute("aria-label"),
          wrapperLabel: field.element.getAttribute("aria-label"),
          visibleLabels: field.element.querySelectorAll("label").length,
        };
      }, JSON.stringify({ variant, type, ...scenario.config }));
      const read = async () => {
        const tree = await session.send("Accessibility.getFullAXTree");
        return tree.nodes.filter(node => !node.ignored && node.role?.value === "textbox"
          && node.properties?.some(property => property.name === "focused" && property.value.value === true))
          .map(node => ({ name: node.name?.value, sources: node.name?.sources }));
      };
      const initial = await read();
      let renamed;
      if (scenario.renamed) {
        await page.evaluate(() => (window as unknown as NameWindow).nameField.setLabel("Updated email"));
        renamed = await read();
      }
      reports.push({ variant, type, scenario: scenario.name, expected: scenario.expected, dom, initial,
        ...(renamed ? { renamedExpected: scenario.renamed, renamed } : {}) });
      await page.evaluate(() => (window as unknown as NameWindow).nameField.destroy());
    }
  }
  await session.detach();
  const directory = resolve("analysis/core");
  await mkdir(directory, { recursive: true });
  await writeFile(resolve(directory, "text-field-names.json"), JSON.stringify(reports, null, 2));
  const failures = reports.filter(report => !report.dom.focused
    || JSON.stringify(report.initial.map(node => node.name)) !== JSON.stringify([report.expected])
    || (report.renamed && JSON.stringify(report.renamed.map(node => node.name)) !== JSON.stringify([report.renamedExpected])));
  console.log(JSON.stringify({ textFieldNames: reports.length, failures }, null, 2));
  assert.deepEqual(failures, [], "the focused text-field control must carry its accessible name");
  for (const report of reports.filter(report => report.scenario === "aria-only")) {
    assert.equal(report.dom.visibleLabels, 0, "an accessible name creates no visible label");
  }
}
