// scripts/release-tables.ts
/**
 * The three size tables a release commit carries, and the check that the CI
 * measurement matches them.
 *
 * `release:prepare` writes the tables from a local measurement; the release
 * run measures the same tree and fails when a committed value differs. The
 * `Measured at <commit> on <date>.` line is provenance, not a size, so the
 * comparison normalises it: the prepare commit and the CI run name different
 * revisions for the same numbers.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { FILES } from "./readme-blocks";
import { replaceReadmeSizes } from "./readme-sizes";
import { renderSizesMarkdown, type Result } from "./size";

/** The sizes `check-package-size` writes to `analysis/package-size.json`. */
export interface PackageSizes {
  sizes: Record<string, { gzip: number }>;
}

/** The one line a measurement owns and a comparison does not. */
const MEASURED_AT = /^Measured at \S+ on \d{4}-\d{2}-\d{2}\. Regenerate with$/m;
const NORMALISED = "Measured at <commit> on <date>. Regenerate with";

export const normalisedTable = (path: string, text: string): string =>
  path === "SIZES.md" ? text.replace(MEASURED_AT, NORMALISED) : text;

/** The three tables for a measured tree: SIZES.md, README.md and npm-readme.md. */
export async function buildReleaseTables(
  root: string,
  analysisDir: string,
  meta: { commit: string; date: string },
): Promise<Record<string, string>> {
  const measured = JSON.parse(await readFile(join(analysisDir, "component-size.json"), "utf8")) as { results?: Result[] };
  const packed = JSON.parse(await readFile(join(analysisDir, "package-size.json"), "utf8")) as PackageSizes;
  assert(measured.results?.length, `${join(analysisDir, "component-size.json")} has no measurements`);
  assert(packed.sizes, `${join(analysisDir, "package-size.json")} has no README sizes`);
  const tables: Record<string, string> = {
    "SIZES.md": renderSizesMarkdown(measured.results, meta),
  };
  for (const file of FILES) {
    tables[file] = replaceReadmeSizes(await readFile(join(root, file), "utf8"), packed.sizes);
  }
  return tables;
}

/** The first line that differs, as `line N: measured … / committed …`. */
const firstDifference = (path: string, measured: string, committed: string): string => {
  const left = normalisedTable(path, measured).split("\n");
  const right = normalisedTable(path, committed).split("\n");
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    if (left[index] !== right[index]) {
      return `line ${index + 1}: measured ${JSON.stringify(left[index] ?? "")}, committed ${JSON.stringify(right[index] ?? "")}`;
    }
  }
  return "the files differ";
};

/**
 * One message per table whose committed text differs from the measured one,
 * or that is missing. Empty when the committed tables are the measurement.
 */
export function tableDiffs(
  measured: Record<string, string>,
  committed: Record<string, string | undefined>,
): string[] {
  return Object.entries(measured).flatMap(([path, text]) => {
    const committedText = committed[path];
    if (committedText === undefined) return [`${path}: the tree has no table at this path`];
    return normalisedTable(path, text) === normalisedTable(path, committedText)
      ? []
      : [`${path}: ${firstDifference(path, text, committedText)}`];
  });
}
