import { describe, expect, test } from "bun:test";
import { renderSizeDeltas, sizeFailures, type SizeRow } from "../../scripts/size-policy";
import { replaceReadmeSizes, README_SIZE_ROWS } from "../../scripts/readme-sizes";

const baseline: SizeRow[] = [
  { name: "Tarball compressed", gate: "packed", bytes: 923_516 },
  { name: "Package unpacked", bytes: 5_264_682 },
  { name: "Component search gzip", gate: "component-gzip", bytes: 11_205 },
];

const candidate = (packed: number, unpacked = 0, gzip = 0): SizeRow[] =>
  baseline.map((row, index) => ({ ...row, bytes: row.bytes + [packed, unpacked, gzip][index] }));

describe("growth since the previous release", () => {
  test("passes #508's supplied +213 B packed and +834 B unpacked without a Size line", () => {
    const head = candidate(213, 834);
    expect(sizeFailures(baseline, head, "")).toEqual([]);
    expect(renderSizeDeltas(baseline, head)).toContain("| Tarball compressed | 923,516 B | 923,729 B | +213 B |");
    expect(renderSizeDeltas(baseline, head)).toContain("| Package unpacked | 5,264,682 B | 5,265,516 B | +834 B |");
  });

  test("passes both thresholds exactly; unpacked growth is informational", () => {
    expect(sizeFailures(baseline, candidate(2_048, 30_000, 1_024), "")).toEqual([]);
  });

  test("fails +2,100 B packed when the Size line is missing or empty", () => {
    for (const body of ["", "Size: \nThis is a separate line", "Quote Size: an explanation", "> Size: quoted text"]) {
      expect(sizeFailures(baseline, candidate(2_100), body)).toEqual([
        "Tarball compressed grew by 2100 B (threshold 2048 B). Add a Size: line to the PR body explaining the increase.",
      ]);
    }
  });

  test("passes +2,100 B packed with a Size line", () => {
    expect(sizeFailures(baseline, candidate(2_100), "Changes since the release.\r\n\r\nSize: cumulative CSS growth.")).toEqual([]);
  });

  test("names every gated row over its threshold", () => {
    expect(sizeFailures(baseline, candidate(2_100, 834, 1_025), "")).toEqual([
      expect.stringContaining("Tarball compressed grew by 2100 B"),
      expect.stringContaining("Component search gzip grew by 1025 B"),
    ]);
  });

  test("treats a new gzip row as growth from zero", () => {
    const added: SizeRow = { name: "Component chip gzip", gate: "component-gzip", bytes: 1_025 };
    expect(sizeFailures(baseline, [...baseline, added], "")).toEqual([
      expect.stringContaining("Component chip gzip grew by 1025 B"),
    ]);
    expect(renderSizeDeltas(baseline, [...baseline, added])).toContain("| Component chip gzip | 0 B | 1,025 B | +1,025 B |");
  });
});

test("release README output updates only the sizes in the marked rows", () => {
  const table = README_SIZE_ROWS.map(key => `| ${key} | 0.0 kB |`).join("\n");
  const doc = `| untouched | 0.0 kB |\n<!-- sizes -->\n${table}\n<!-- /sizes -->\n`;
  const sizes = Object.fromEntries(README_SIZE_ROWS.map((key, index) => [key, { gzip: 1_234 + index * 1_000 }]));
  const refreshed = replaceReadmeSizes(doc, sizes);
  expect(refreshed).toStartWith("| untouched | 0.0 kB |");
  expect(refreshed).toContain("| button-initial | 1.2 kB |");
  expect(refreshed).toContain("| full-css | 8.2 kB |");
});
