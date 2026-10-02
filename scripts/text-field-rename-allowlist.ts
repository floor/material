// What the text-field rename must not change, and what may still say the
// one-word spelling after it. scripts/rename-text-field.ts and
// test/canonical-text-field.test.ts both read this file.
//
// "One word" is the nine letters of textfield in any case, except the two-word
// forms textField and TextField, which stay. A case-insensitive search cannot
// tell those apart from Textfield, so the check looks at the matched letters.

export const exemptFiles = [
  "scripts/rename-text-field.ts",
  "scripts/text-field-rename-allowlist.ts",
  "scripts/text-field-rename-entries.ts",
];

/** Edited by hand after the script, so a later tree can cherry-pick that commit. */
export const handEdited = ["CHANGELOG.md", "README.md"];

/** Rewritten by a generator the script runs. The script does not edit them. */
export const generatedPrefixes = ["src/react/", "src/solid/", "src/vue/"];

export const generatedFiles = [
  "scripts/fixtures/component-exports.json",
  "scripts/fixtures/token-render.json",
];

export const untouched = ["bun.lock"];

/**
 * A pattern match that overlaps one of these snippets is left as it is.
 * Paths are not moved by the rename.
 */
export const patternProtections: Array<{ file: string; snippet: string; reason: string }> = [
  {
    file: "test/components/select/select.test.ts",
    snippet: "'textfield'",
    reason: "pins that the removed property name is absent on the select",
  },
  {
    file: "test/styles/text-field-sass.test.ts",
    snippet: "/textfield/",
    reason: "the Sass error for the removed $textfield name still says the old word",
  },
];

/** A line may keep a one-word hit only when every hit sits inside one of these snippets. */
export const keeps: Array<{ file: string; snippets: string[]; reason: string }> = [
  {
    file: "src/styles/components/_timepicker.scss",
    snippets: ["-moz-appearance: textfield"],
    reason: "CSS keyword, not the component name",
  },
  {
    file: "src/styles/abstract/_variables.scss",
    snippets: ["$textfield", "`textfield()`"],
    reason: "names the 0.10 Sass spellings this comment says were removed",
  },
  {
    file: "test/canonical-text-field.test.ts",
    snippets: ["Textfield", "TEXTFIELD", "textfieldElement", "textfield[A-Z]"],
    reason: "pins that the removed 0.10 identifier spellings are gone",
  },
  {
    file: "test/component-exports.test.ts",
    snippets: ["Textfield", "TEXTFIELD"],
    reason: "pins that the removed 0.10 identifier spellings are gone",
  },
  {
    file: "test/root-exports.test.ts",
    snippets: ["Textfield"],
    reason: "pins that the removed 0.10 identifier spellings are gone",
  },
  {
    file: "test/types/canonical-names.fixture.ts",
    snippets: ["Textfield", "TEXTFIELD", "select.textfield"],
    reason: "pins that the removed 0.10 identifier spellings are gone",
  },
  {
    file: "scripts/check-svelte.ts",
    snippets: ["/Textfield/"],
    reason: "pins that the generated Svelte index has no Textfield spelling",
  },
  {
    file: "test/styles/text-field-sass.test.ts",
    snippets: ["$textfield", "textfield(", "/textfield/"],
    reason: "pins that the 0.10 Sass names $textfield and textfield() are gone",
  },
  {
    file: "test/components/select/select.test.ts",
    snippets: ["textfield alias", ".textfield", "'textfield'"],
    reason: "pins that select.textfield reads undefined and is not a key",
  },
];

/** History from this heading down is what shipped. It is not rewritten. */
export const changelogHistoryHeading = "## [0.10.5]";

/**
 * An unreleased CHANGELOG line that is not a migration-table row may keep the
 * one-word spelling only where it names what the rename replaces.
 */
export const changelogAnchors = [
  "select.textfield",
  "textfield/features",
  "m-textfield",
  "mtrl-textfield",
  "::part(textfield)",
  "part(textfield)",
  "$textfield",
  "textfield()",
  "/textfield",
  "TEXTFIELD",
  "Textfield",
  "'textfield'",
  "\"textfield\"",
  "`textfield`",
];

const oneWord = "text" + "field";
const twoWordForms = new Set(["textField", "TextField"]);

export interface WordHit {
  index: number;
  text: string;
}

/** One-word hits in text. textField and TextField are not hits. */
export const oneWordHits = (text: string): WordHit[] => {
  const hits: WordHit[] = [];
  const pattern = new RegExp(oneWord, "gi");
  for (const match of text.matchAll(pattern)) {
    const found = match[0];
    if (twoWordForms.has(found)) continue;
    hits.push({ index: match.index ?? 0, text: found });
  }
  return hits;
};

const covered = (line: string, hits: WordHit[], snippets: string[]): boolean =>
  hits.every((hit) => snippets.some((snippet) => {
    let from = 0;
    while (from <= line.length) {
      const at = line.indexOf(snippet, from);
      if (at < 0) return false;
      if (hit.index >= at && hit.index + hit.text.length <= at + snippet.length) return true;
      from = at + 1;
    }
    return false;
  }));

const changelogLineKept = (line: string, inHistory: boolean): boolean => {
  if (inHistory) return true;
  if (line.includes("|")) return true;
  return covered(line, oneWordHits(line), changelogAnchors);
};

/** True when this line is allowed to contain the one-word spelling. */
export const lineKept = (file: string, line: string, inChangelogHistory: boolean): boolean => {
  if (exemptFiles.includes(file)) return true;
  if (file === "CHANGELOG.md") return changelogLineKept(line, inChangelogHistory);
  const rule = keeps.find((entry) => entry.file === file);
  if (!rule) return false;
  return covered(line, oneWordHits(line), rule.snippets);
};
