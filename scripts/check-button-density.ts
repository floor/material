import assert from "node:assert/strict";
import { join } from "node:path";
import type { CaseResult } from "./conformance/measure";

const steps = [0, -1, -2, -3];
const engine = process.argv.includes("--webkit") ? "webkit" : "chromium";

async function measure(fixture: string, ids: string[]): Promise<Map<string, CaseResult>> {
  const args = [join(import.meta.dir, "conformance", `${fixture}.ts`), `--cases=${JSON.stringify(ids)}`];
  if (engine === "webkit") args.push("--webkit");
  const entry = Bun.spawn([process.execPath, ...args], { stdout: "pipe", stderr: "inherit" });
  const body = await new Response(entry.stdout).text();
  assert.equal(await entry.exited, 0, `${fixture} measurement`);
  const { rows } = JSON.parse(body) as { rows: CaseResult[] };
  return new Map(rows.map(row => [row.id, row]));
}

const selected = "filled/s/selected (square toggle)";
const buttonCases = steps.map(step => `filled/s/density ${step}`);
const buttons = await measure("button", [...buttonCases, selected]);
const groupCases = (kind: string) => steps.map(step => `${kind}/s/density ${step}`);
const groups = await measure("button-group", [...groupCases("standard"), ...groupCases("connected")]);
const geometry = (parts: Map<string, CaseResult>, ids: string[], name: string) => ids.map(id => {
  const row = parts.get(id);
  assert(row, `Missing ${id}`);
  const button = row.parts[name];
  assert(button, `Missing ${id} ${name}`);
  assert(button.rect.width >= 48, `${id} ${name} is narrower than its 48 px target`);
  const height = button.rect.height;
  return { height, target: button.style.centredHitHeight, ...(row.parts.group ? { groupHeight: row.parts.group.rect.height } : {}) };
});

const actual = {
  button: geometry(buttons, buttonCases, "root"),
  standard: geometry(groups, groupCases("standard"), "middle"),
  connected: geometry(groups, groupCases("connected"), "middle"),
  selectedCorner: buttons.get(selected)?.parts.root?.style.borderTopLeftRadius,
};
const heights = [40, 36, 32, 28];
const standalone = heights.map(height => ({ height, target: "48px" }));
const group = heights.map(height => ({ height, target: "48px", groupHeight: height }));
console.log(`${engine} small button and groups at density 0/-1/-2/-3: ${JSON.stringify(actual)}`);
assert.deepEqual(actual, { button: standalone, standard: group, connected: group, selectedCorner: "12px" });
console.log(`${engine}: 40/36/32/28 px, 48 px targets, 12 px selected square corner`);
