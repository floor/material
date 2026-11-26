#!/usr/bin/env bun
/**
 * The keyboard focus ring, read from the conformance fixtures. Each row is
 * mounted by the component's factory. The harness tabs to it, and WebKit uses
 * Alt+Tab. m3.material.io/foundations/interaction/states/applying-states,
 * "Keyboard focus indicator", read 2026-11-26.
 *
 * On main the drifting rows are still 2px, or a different colour, so this
 * fails there. Chromium and WebKit:
 *
 *   bun run scripts/check-focus-ring-m3.ts
 */
export {};

type Colour = "secondary" | "inverse-on-surface" | "inverse-primary";

type Ring = {
  /** `scripts/conformance/<component>.ts` */
  component: string;
  /** Passed as `--case=`, matched against the fixture's row id. */
  filter: string;
  /** The part the fixture reads that paints the ring. */
  part: string;
  width: "3px" | "2px";
  offset: "2px" | "-3px";
  color: Colour;
};

// One fixture row per drifting paint, plus a matching row as a guard.
// The snackbar close is the documented inverse-surface exception.
const rings: Ring[] = [
  { component: "button", filter: "filled/m/focus", part: "root", width: "3px", offset: "2px", color: "secondary" },
  { component: "icon-button", filter: "filled/m/focus", part: "root", width: "3px", offset: "2px", color: "secondary" },
  { component: "fab", filter: "primary-container/default/focus", part: "root", width: "3px", offset: "2px", color: "secondary" },
  // The state row does not record an outline. The fixture's "focus ring" row does, on root.
  { component: "extended-fab", filter: "primary-container/small/focus", part: "root", width: "3px", offset: "2px", color: "secondary" },
  { component: "card", filter: "elevated/light/focus", part: "card", width: "3px", offset: "2px", color: "secondary" },
  { component: "card", filter: "elevated/dark/focus", part: "card", width: "3px", offset: "2px", color: "secondary" },
  { component: "checkbox", filter: "unselected/focus", part: "state layer", width: "3px", offset: "2px", color: "secondary" },
  { component: "list", filter: "standard/light/unselected/focus", part: "action", width: "3px", offset: "-3px", color: "secondary" },
  { component: "list", filter: "standard/listbox/focus", part: "action", width: "3px", offset: "-3px", color: "secondary" },
  { component: "slider", filter: "xs/focus/light", part: "handleInk", width: "3px", offset: "2px", color: "secondary" },
  { component: "text-field", filter: "filled/trailing-focus", part: "trailing", width: "3px", offset: "2px", color: "secondary" },
  { component: "text-field", filter: "outlined/trailing-focus", part: "trailing", width: "3px", offset: "2px", color: "secondary" },
  // The first footer button is not the one that holds focus. verifiedAction is :focus-visible.
  { component: "dialog", filter: "900/medium/light/focus", part: "verifiedAction", width: "3px", offset: "2px", color: "secondary" },
  { component: "dialog", filter: "900/medium/light/close-focus", part: "close", width: "3px", offset: "2px", color: "secondary" },
  { component: "snackbar", filter: "action/focus", part: "control", width: "3px", offset: "2px", color: "inverse-primary" },
  { component: "snackbar", filter: "close/focus", part: "control", width: "2px", offset: "2px", color: "inverse-on-surface" },
  { component: "search", filter: "contained/bar/light/focus", part: "header", width: "3px", offset: "2px", color: "secondary" },
  { component: "search", filter: "contained/docked/light/focus", part: "input", width: "3px", offset: "2px", color: "secondary" },
  { component: "search", filter: "contained/bar/light/avatar-focus", part: "avatar", width: "3px", offset: "2px", color: "secondary" },
  { component: "timepicker", filter: "input/hours/focus/light", part: "hours", width: "3px", offset: "-3px", color: "secondary" },
  { component: "timepicker", filter: "input/period-selected/focus/light", part: "selectedPeriod", width: "3px", offset: "-3px", color: "secondary" },
];

const COLOURS: Record<"light" | "dark", Record<Colour, string>> = {
  light: {
    secondary: "rgb(98, 91, 113)",
    "inverse-on-surface": "rgb(245, 239, 247)",
    "inverse-primary": "rgb(208, 188, 255)",
  },
  dark: {
    secondary: "rgb(204, 194, 220)",
    "inverse-on-surface": "rgb(50, 47, 53)",
    "inverse-primary": "rgb(103, 80, 164)",
  },
};

const canon = (color: string) => {
  const match = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/.exec(color);
  if (!match) return color.replace(/\s/g, "").toLowerCase();
  return `rgb(${Math.round(Number(match[1]))}, ${Math.round(Number(match[2]))}, ${Math.round(Number(match[3]))})`;
};

const schemeOf = (id: string): "light" | "dark" => (/(?:^|\/)dark(?:\/|$)/.test(id) ? "dark" : "light");

type Row = {
  id: string;
  parts: Record<string, { style: Record<string, string> } | null>;
};

const measure = async (component: string, filter: string, webkit: boolean): Promise<Row[]> => {
  const child = Bun.spawn([
    process.execPath,
    `scripts/conformance/${component}.ts`,
    `--case=${filter}`,
    ...(webkit ? ["--webkit"] : []),
  ], { stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);
  const code = await child.exited;
  if (code !== 0) {
    throw new Error(`${component} ${filter}${webkit ? " webkit" : ""} failed\n${stderr || stdout}`);
  }
  const parsed = JSON.parse(stdout) as { rows?: Row[] };
  if (!parsed.rows?.length) throw new Error(`${component} ${filter} returned no rows`);
  return parsed.rows;
};

const failures: string[] = [];

/** One row's miss is recorded and the rest still run, in both engines. */
const miss = (message: string) => {
  failures.push(message);
  console.error(message);
};

for (const engine of [false, true]) {
  const name = engine ? "webkit" : "chromium";
  for (const ring of rings) {
    let rows: Row[];
    try {
      rows = await measure(ring.component, ring.filter, engine);
    } catch (error) {
      miss(error instanceof Error ? error.message : String(error));
      continue;
    }
    // A filter can match a state row that never asked for the outline.
    // The ring is the row whose named part has one.
    const painted = rows.filter((row) => row.parts[ring.part]?.style.outlineWidth !== undefined);
    if (painted.length === 0) {
      miss(`${name} ${ring.component} ${rows.map((row) => row.id).join(", ")}: no measured outline on ${ring.part}`);
      continue;
    }
    for (const row of painted) {
      const style = row.parts[ring.part]!.style;
      const where = `${name} ${ring.component} ${row.id} ${ring.part}`;
      if (style.outlineWidth !== ring.width) miss(`${where} width ${style.outlineWidth}`);
      if (style.outlineStyle !== "solid") miss(`${where} style ${style.outlineStyle}`);
      if (style.outlineOffset !== ring.offset) miss(`${where} offset ${style.outlineOffset}`);
      const expected = COLOURS[schemeOf(row.id)][ring.color];
      const colour = canon(style.outlineColor);
      if (colour !== expected) miss(`${where} colour ${style.outlineColor}`);
    }
    console.log(`${name}: ${ring.component} ${ring.filter} (${painted.length})`);
  }
}

if (failures.length > 0) {
  throw new Error(`${failures.length} focus ring row(s)\n${failures.join("\n")}`);
}

console.log("Passed: the conformance focus rows use the M3 focus ring.");
