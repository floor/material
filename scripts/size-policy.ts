import { COMPONENT_GZIP_GROWTH, PACKED_GROWTH } from "./budgets";

export interface SizeRow {
  name: string;
  bytes: number;
  gate?: "packed" | "component-gzip";
}

export function sizeFailures(base: readonly SizeRow[], head: readonly SizeRow[], body: string): string[] {
  if (/^Size:[ \t]*[^\s]/m.test(body)) return [];
  const baseByName = new Map(base.map(row => [row.name, row.bytes]));
  return head.flatMap(({ name, gate, bytes }) => {
    const before = baseByName.get(name) ?? 0;
    const threshold = gate === "packed" ? PACKED_GROWTH : gate === "component-gzip" ? COMPONENT_GZIP_GROWTH : undefined;
    if (threshold === undefined || bytes - before <= threshold) return [];
    return [`${name} grew by ${bytes - before} B (threshold ${threshold} B). Add a Size: line to the PR body explaining the increase.`];
  });
}

export function renderSizeDeltas(base: readonly SizeRow[], head: readonly SizeRow[]): string {
  const before = new Map(base.map(row => [row.name, row.bytes]));
  const after = new Map(head.map(row => [row.name, row.bytes]));
  const rows = ["| Measurement | Base | Head | Delta |", "| --- | ---: | ---: | ---: | ---: |"];
  const format = (bytes: number) => `${bytes.toLocaleString("en-US")} B`;
  for (const name of new Set([...after.keys(), ...before.keys()])) {
    const from = before.get(name) ?? 0;
    const to = after.get(name) ?? 0;
    const delta = to - from;
    rows.push(`| ${name} | ${format(from)} | ${format(to)} | ${delta > 0 ? "+" : ""}${format(delta)} |`);
  }
  return rows.join("\n");
}
