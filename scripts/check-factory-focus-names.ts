/** Computed names on the packed factories' actual keyboard focus targets. */
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Page } from "playwright";
import type { ChipComponent, ChipType, ChipsComponent, createAssistChip, createFilterChip, createInputChip, createSuggestionChip } from "../src/components/chips";
import type createChips from "../src/components/chips";
import type createSelect from "../src/components/select";
import type createSearch from "../src/components/search";

type NameCase = {
  id: string; family: "chip" | "set" | "select" | "search";
  type?: ChipType; ariaLabel?: string; label?: string; placeholder?: string;
  trailing?: boolean; outlined?: boolean; initialState?: "bar" | "view"; viewMode?: "docked" | "fullscreen";
  expectedName: string; expectedRole: string;
};
type NameWindow = Window & {
  core: { createAssistChip: typeof createAssistChip; createFilterChip: typeof createFilterChip;
    createInputChip: typeof createInputChip; createSuggestionChip: typeof createSuggestionChip; createChips: typeof createChips };
  createSelect: typeof createSelect; createSearch: typeof createSearch;
  nameTarget: { element: HTMLElement; focus: () => void; mutate: (step: number) => void; destroy: () => void; secondary?: HTMLElement };
};
interface NameReport {
  scenario: string; expectedName: string; expectedRole: string;
  dom: { focused: boolean; tag: string; role: string | null; label: string | null; text: string | null };
  focused: { role: string; name: string; sources: unknown }[];
}

export async function checkFactoryFocusNames(page: Page, artifacts: string): Promise<void> {
  const cases: NameCase[] = [];
  for (const type of ["assist", "filter", "input", "suggestion"] as const) {
    const expectedRole = type === "filter" || type === "input" ? "checkbox" : "button";
    cases.push({ id: `chip-${type}`, family: "chip", type, ariaLabel: "Visible chip details", label: "Visible chip", expectedName: "Visible chip details", expectedRole });
    cases.push({ id: `set-${type}`, family: "set", type, ariaLabel: "Visible chip details", label: "Visible chip", expectedName: "Visible chip details", expectedRole: type === "input" ? "checkbox" : "gridcell" });
    cases.push({ id: `fallback-${type}`, family: "chip", type, ariaLabel: "", label: "Visible chip", expectedName: "Visible chip", expectedRole });
  }
  for (const family of ["chip", "set"] as const) cases.push({ id: `${family}-filter-trailing`, family, type: "filter", trailing: true, label: "Visible chip", ariaLabel: "Visible chip details", expectedName: "Visible chip details", expectedRole: "checkbox" });
  for (const outlined of [false, true]) {
    for (const [suffix, label, ariaLabel, expectedName] of [
      ["unlabelled", undefined, "Choose size", "Choose size"],
      ["labelled", "Size", "Size in centimetres", "Size in centimetres"],
      ["same", "Size", "Size", "Size"],
      ["fallback", "Size", "", "Size"],
    ] as const) cases.push({ id: `select-${outlined ? "outlined" : "filled"}-${suffix}`, family: "select", outlined, label, ariaLabel, expectedName, expectedRole: "combobox" });
  }
  for (const [initialState, viewMode] of [["bar", "docked"], ["view", "docked"], ["view", "fullscreen"]] as const) {
    cases.push({ id: `search-${initialState}-${viewMode}`, family: "search", initialState, viewMode, placeholder: "Search people", ariaLabel: "Search people by name", expectedName: "Search people by name", expectedRole: "combobox" });
    cases.push({ id: `search-${initialState}-${viewMode}-fallback`, family: "search", initialState, viewMode, placeholder: "Search people", ariaLabel: "", expectedName: "Search people", expectedRole: "combobox" });
  }
  cases.push({ id: "search-default-hint", family: "search", ariaLabel: "Search catalogue", expectedName: "Search catalogue", expectedRole: "combobox" });
  const session = await page.context().newCDPSession(page);
  const reports: NameReport[] = [];
  const observe = async (scenario: string, expectedName: string, expectedRole: string) => {
    const dom = await page.evaluate(() => {
      const state = (window as unknown as NameWindow).nameTarget;
      const active = document.activeElement as HTMLElement;
      return { focused: state.element.contains(active), tag: active.tagName, role: active.getAttribute("role"), label: active.getAttribute("aria-label"), text: active.textContent };
    });
    const tree = await session.send("Accessibility.getFullAXTree");
    const focused = tree.nodes.filter(node => !node.ignored && ["gridcell", "button", "checkbox", "combobox"].includes(node.role?.value)
      && node.properties?.some(property => property.name === "focused" && property.value.value === true))
      .map(node => ({ role: node.role?.value, name: node.name?.value, sources: node.name?.sources }));
    reports.push({ scenario, expectedName, expectedRole, dom, focused });
  };
  for (const item of cases) {
    await page.evaluate(item => {
      const state = window as unknown as NameWindow;
      document.body.replaceChildren();
      const before = document.createElement("button"); before.textContent = "Before names";
      if (item.family === "chip" || item.family === "set") {
        const config = { type: item.type, label: item.label!, ariaLabel: item.ariaLabel,
          leadingIcon: '<svg aria-hidden="true"><path d="M0 0h1v1H0z"/></svg>',
          removeLabel: "Remove chip", ...(item.trailing ? { onTrailingClick: () => {}, trailingLabel: "Chip options", trailingMenu: true } : {}) };
        let chip: ChipComponent; let set: ChipsComponent | undefined;
        if (item.family === "set") { set = state.core.createChips({ chips: [config] }); chip = set.getChips()[0]; }
        else {
          const factories = { assist: state.core.createAssistChip, filter: state.core.createFilterChip, input: state.core.createInputChip, suggestion: state.core.createSuggestionChip };
          chip = factories[item.type!](config);
        }
        state.nameTarget = { element: set?.element ?? chip.element, focus: () => chip.focus(),
          mutate: step => { if (step === 1) chip.setLabel("Renamed chip"); else chip.setText("Updated chip").setSelected(true); },
          destroy: () => set ? set.destroy() : chip.destroy(),
          secondary: chip.trailingAction ?? chip.element.querySelector<HTMLElement>(".mtrl-chip__remove") ?? undefined };
      } else if (item.family === "select") {
        const config = { label: item.label, ariaLabel: item.ariaLabel, variant: item.outlined ? "outlined" : "filled", options: [{ id: "s", text: "Small" }, { id: "l", text: "Large" }] };
        const select = state.createSelect(config);
        const input = select.element.querySelector<HTMLInputElement>("input")!;
        state.nameTarget = { element: select.element, focus: () => input.focus(), mutate: () => select.setValue("l"), destroy: () => select.destroy() };
      } else {
        const config = { placeholder: item.placeholder, ariaLabel: item.ariaLabel, initialState: item.initialState, viewMode: item.viewMode, expandOnFocus: false, collapseOnBlur: false };
        const search = state.createSearch(config);
        state.nameTarget = { element: search.element, focus: () => search.focus(),
          mutate: step => { if (step === 1) search.setPlaceholder("Find contacts"); else search.setValue("Ada"); }, destroy: () => search.destroy() };
      }
      document.body.append(before, state.nameTarget.element);
      before.focus();
      state.nameTarget.focus();
    }, item);
    await observe(`${item.id}-initial`, item.expectedName, item.expectedRole);
    const steps = item.family === "select" ? 1 : 2;
    for (let step = 1; step <= steps; step++) {
      await page.evaluate(step => (window as unknown as NameWindow).nameTarget.mutate(step), step);
      const fallback = !item.ariaLabel;
      const expectedName = fallback && item.family === "chip" ? step === 1 ? "Renamed chip" : "Updated chip"
        : fallback && item.family === "search" ? "Find contacts" : item.expectedName;
      await observe(`${item.id}-edit-${step}`, expectedName, item.expectedRole);
    }
    const secondary = await page.evaluate(() => {
      const target = (window as unknown as NameWindow).nameTarget.secondary;
      target?.focus(); return !!target;
    });
    if (secondary) await observe(`${item.id}-secondary`, item.trailing ? "Chip options" : "Remove chip", "button");
    await page.evaluate(() => (window as unknown as NameWindow).nameTarget.destroy());
  }
  await session.detach();
  await writeFile(join(artifacts, "factory-focus-names.json"), JSON.stringify(reports, null, 2));
  const failures = reports.filter(report => !report.dom.focused || JSON.stringify(report.focused.map(node => [node.role, node.name])) !== JSON.stringify([[report.expectedRole, report.expectedName]]));
  console.log(JSON.stringify({ factoryFocusNames: reports.length, failures }, null, 2));
  assert.deepEqual(failures, [], "the factory's explicit accessible name must reach its focus target and survive content edits");
}
