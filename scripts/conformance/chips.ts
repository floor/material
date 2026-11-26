#!/usr/bin/env bun
// scripts/conformance/chips.ts
/**
 * The "ours" column of the chips conformance table: the harness runs these
 * cases on main and prints the JSON the table is written from. The four
 * creators each mount a single chip of their kind.
 *
 *   bun run scripts/conformance/chips.ts            # every case
 *   bun run scripts/conformance/chips.ts filter     # rows whose id matches
 *
 * Compose is the other column:
 *   COMPOSE_TOKENS_DIR=<pin> bun run scripts/conformance/compose-tokens.ts --only AssistChipTokens,FilterChipTokens,InputChipTokens,SuggestionChipTokens
 */
import { createConformanceHarness, type Case } from "./measure";

// The chip element is first: the harness aims hover/press at parts[0].
const parts = [
  { name: "chip", selector: ".mtrl-chip" },
  { name: "label", selector: ".mtrl-chip__label" },
  { name: "leading icon", selector: ".mtrl-chip__leading-icon" },
  { name: "checkmark", selector: ".mtrl-chip__checkmark" },
];

type MountOptions = { kind?: string; selected?: boolean; disabled?: boolean };

const mount = (mtrl: Record<string, (...args: never[]) => unknown>, host: HTMLElement, config?: unknown) => {
  const { kind = "assist", selected, disabled } = (config ?? {}) as MountOptions;
  const creators: Record<string, string> = {
    assist: "createAssistChip",
    filter: "createFilterChip",
    input: "createInputChip",
    suggestion: "createSuggestionChip",
  };
  const create = mtrl[creators[kind] ?? creators.assist!] as unknown as (settings: Record<string, unknown>) => { element: HTMLElement };
  const chip = create({
    label: kind === "input" ? "Input" : kind.charAt(0).toUpperCase() + kind.slice(1),
    ariaLabel: kind,
    ...(selected ? { selected: true } : {}),
    ...(disabled ? { disabled: true } : {}),
  });
  host.append(chip.element);
};

const cases: Case[] = [];

for (const kind of ["assist", "filter", "input", "suggestion"] as const) {
  cases.push({ id: `${kind}/rest`, mount, config: { kind }, parts });
  for (const state of ["hover", "focus", "pressed"] as const) {
    cases.push({ id: `${kind}/${state}`, state, mount, config: { kind }, parts });
  }
  cases.push({ id: `${kind}/disabled`, state: "disabled", mount, config: { kind, disabled: true }, parts });
  cases.push({ id: `${kind}/rest/dark`, scheme: "dark", mount, config: { kind }, parts });
}
// Selected applies to filter and input chips.
for (const kind of ["filter", "input"] as const) {
  cases.push({ id: `${kind}/selected/rest`, mount, config: { kind, selected: true }, parts });
  cases.push({ id: `${kind}/selected/disabled`, state: "disabled", mount, config: { kind, selected: true, disabled: true }, parts });
  cases.push({ id: `${kind}/selected/rest/dark`, scheme: "dark", mount, config: { kind, selected: true }, parts });
}

const filter = process.argv[2];
const chosen = filter ? cases.filter((testCase) => testCase.id.includes(filter)) : cases;

const harness = await createConformanceHarness({ component: "chips", engines: ["chromium"] });
try {
  const rows = await harness.measure(chosen);
  // The fixture asserts itself: the four creators mounted, and a selected
  // filter chip carries its selected marker.
  const verify = await harness.page.evaluate(`
    (() => {
      const host = document.querySelector("#mount") ?? document.body;
      const results = [];
      const w = window;
      for (const [kind, creator] of [["assist", "createAssistChip"], ["filter", "createFilterChip"], ["input", "createInputChip"], ["suggestion", "createSuggestionChip"]]) {
        host.replaceChildren();
        const chip = w.mtrl[creator]({ label: "V", ariaLabel: "verify", ...(kind === "filter" ? { selected: true } : {}) });
        host.append(chip.element);
        const element = document.querySelector(".mtrl-chip");
        results.push({ kind, mounted: !!element, selectedClass: element?.className.includes("selected") ?? null });
      }
      host.replaceChildren();
      return results;
    })()
  `) as Array<{ kind: string; mounted: boolean; selectedClass: boolean | null }>;
  for (const entry of verify) {
    if (!entry.mounted) throw new Error(`fixture: the ${entry.kind} chip did not mount`);
    if (entry.kind === "filter" && entry.selectedClass !== true) throw new Error("fixture: the selected filter chip carries no selected marker");
  }
  console.log(JSON.stringify({ component: "chips", source: harness.source, rows }, null, 2));
} finally {
  await harness.close();
}
