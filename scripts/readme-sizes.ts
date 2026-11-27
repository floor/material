import assert from "node:assert/strict";

export const README_SIZE_ROWS = ["button-initial", "button", "form", "all-js", "base-css", "base-lite-css", "button-css", "full-css"] as const;

/** The marked public table, including the whitespace between its markers. */
export const readmeSizeTable = (text: string): string | undefined =>
  /<!-- sizes -->([\s\S]*?)<!-- \/sizes -->/.exec(text)?.[1];

export const formatReadmeSize = (bytes: number): string => (bytes / 1000).toFixed(1);

export function replaceReadmeSizes(text: string, sizes: Record<string, { gzip: number }>): string {
  const table = readmeSizeTable(text);
  assert(table !== undefined, "Missing README size table");
  let index = 0;
  const fresh = table.replace(/\| [\d.]+ kB \|$/gm, () => {
    const key = README_SIZE_ROWS[index++];
    assert(key && Number.isSafeInteger(sizes[key]?.gzip), "Missing README size measurement or unexpected extra row");
    return `| ${formatReadmeSize(sizes[key].gzip)} kB |`;
  });
  assert.equal(index, README_SIZE_ROWS.length, "Missing README size row");
  return text.replace(`<!-- sizes -->${table}<!-- /sizes -->`, () => `<!-- sizes -->${fresh}<!-- /sizes -->`);
}
