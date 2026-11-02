import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Page } from "playwright";
import type * as Chips from "../src/components/chips";

type NameWindow = Window & {
  core: typeof Chips;
  nameSet: Chips.ChipsComponent;
};

interface NameReport {
  scenario: string;
  expectedName: string;
  expectedRole: string;
  selected?: boolean;
  dom: { inSet: boolean; tag: string; role: string | null; text: string | null; label: string | null; selected: string | null };
  focused: { role?: string; name?: string; sources?: unknown }[];
}

/** M3 names the focusable gridcell from the chip's content. */
export async function checkChipCellNames(page: Page, artifacts: string): Promise<void> {
  await page.evaluate(() => {
    const state = window as unknown as NameWindow;
    const before = document.createElement("button");
    before.id = "before-chip-names";
    before.textContent = "Before chip names";
    const icon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v16H4z"/></svg>';
    state.nameSet = state.core.createChips({ label: "Chip names", chips: [
      { type: "assist", label: "Assist", leadingIcon: icon },
      { type: "filter", label: "Filter", leadingIcon: icon },
      { type: "suggestion", label: "Suggestion", leadingIcon: icon },
      { type: "input", label: "Input", removeLabel: "Remove input" },
      { type: "filter", label: "Menu filter", trailingMenu: true, trailingLabel: "Filter options", onTrailingClick: () => {} },
    ] });
    document.body.append(before, state.nameSet.element);
    before.focus();
  });
  const session = await page.context().newCDPSession(page);
  const reports: NameReport[] = [];
  const observe = async (scenario: string, expectedName: string, expectedRole: string, selected?: boolean) => {
    const dom = await page.evaluate(() => {
      const active = document.activeElement as HTMLElement;
      const set = (window as unknown as NameWindow).nameSet;
      return { inSet: set.element.contains(active), tag: active.tagName, role: active.getAttribute("role"),
        text: active.textContent, label: active.getAttribute("aria-label"), selected: active.getAttribute("aria-selected") };
    });
    const tree = await session.send("Accessibility.getFullAXTree");
    const focused = tree.nodes.filter(node => !node.ignored && ["gridcell", "button", "checkbox"].includes(node.role?.value)
      && node.properties?.some(property => property.name === "focused" && property.value.value === true))
      .map(node => ({ role: node.role?.value, name: node.name?.value, sources: node.name?.sources }));
    reports.push({ scenario, expectedName, expectedRole, ...(selected !== undefined ? { selected } : {}), dom, focused });
  };
  await page.keyboard.press("Tab");
  for (const [index, type] of ["assist", "filter", "suggestion"].entries()) {
    const name = type[0].toUpperCase() + type.slice(1);
    await observe(`${type}-initial`, name, "gridcell");
    await page.evaluate(index => (window as unknown as NameWindow).nameSet.getChips()[index].setLabel("Renamed chip"), index);
    await observe(`${type}-setLabel`, "Renamed chip", "gridcell");
    await page.evaluate(index => (window as unknown as NameWindow).nameSet.getChips()[index].setText("Updated chip"), index);
    await observe(`${type}-setText`, "Updated chip", "gridcell");
    if (type === "filter") {
      await page.keyboard.press("Space");
      await observe("filter-selected", "Updated chip", "gridcell", true);
    }
    await page.keyboard.press("ArrowRight");
  }
  await observe("input-action", "Input", "checkbox");
  await page.keyboard.press("ArrowRight");
  await observe("input-remove", "Remove input", "button");
  await page.keyboard.press("ArrowRight");
  await observe("filter-action", "Menu filter", "checkbox");
  await page.keyboard.press("ArrowRight");
  await observe("filter-trailing", "Filter options", "button");
  await session.detach();
  await page.evaluate(() => {
    (window as unknown as NameWindow).nameSet.destroy();
    document.querySelector("#before-chip-names")!.remove();
  });
  await writeFile(join(artifacts, "chip-cell-names.json"), JSON.stringify(reports, null, 2));
  const failures = reports.filter(report => !report.dom.inSet
    || JSON.stringify(report.focused.map(node => [node.role, node.name])) !== JSON.stringify([[report.expectedRole, report.expectedName]])
    || (report.selected !== undefined && report.dom.selected !== String(report.selected)));
  console.log(JSON.stringify({ chipCellNames: reports.length, failures }, null, 2));
  assert.deepEqual(failures, [], "the focused chip target must be named from its content");
}
