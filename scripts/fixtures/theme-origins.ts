// scripts/fixtures/theme-origins.ts
//
// The browser side of check-theme-origins.ts: the packed core/theme namespace,
// its structured origin metadata rendered into the page, and theme-coloured
// probes. It imports no colour engine and no CSS; the check serves the theme
// stylesheets the package ships and reads what they compute.

import * as coreTheme from "../../src/core/theme";

type OriginRecord = { kind: string; seed: string | null; variant: string | null; contrast: number | null; secondary?: string };

/** One displayed row: the record's own words, authored nulls labelled honestly. */
const label = (record: OriginRecord): Record<string, string> => {
  const seed = record.seed === null ? "not recorded" : record.seed;
  const variant = record.variant === null ? "no verified recipe" : record.variant;
  const contrast = record.contrast === null ? "—" : String(record.contrast);
  return {
    kind: record.kind,
    seed,
    variant,
    contrast,
    ...(record.secondary ? { secondary: record.secondary } : {}),
  };
};

const rows: Record<string, string>[] = Object.entries(coreTheme.THEME_ORIGINS as Record<string, OriginRecord>).map(([name, record]) => ({
  name,
  ...label(record),
}));

const table = document.createElement("table");
table.id = "origins";
for (const [index, row] of rows.entries()) {
  const tr = document.createElement("tr");
  tr.dataset.themeName = row.name;
  for (const value of [row.name, row.kind, row.seed, row.variant, row.contrast, row.secondary ?? ""]) {
    const cell = document.createElement(index === 0 ? "th" : "td");
    cell.textContent = value;
    tr.append(cell);
  }
  table.append(tr);
}
document.body.append(table);

// Theme-coloured probes: the check flips their mode and contrast attributes
// and reads the tokens the shipped stylesheets compute.
for (const name of ["baseline", "desert", "highcontrast", "ocean"]) {
  const probe = document.createElement("div");
  probe.id = `probe-${name}`;
  probe.dataset.theme = name;
  probe.textContent = name;
  document.body.append(probe);
}

(window as unknown as { themeOrigins: unknown }).themeOrigins = {
  rows,
  baselineSeed: coreTheme.BASELINE_SEED,
  exports: Object.keys(coreTheme).sort(),
};
document.body.dataset.ready = "true";
