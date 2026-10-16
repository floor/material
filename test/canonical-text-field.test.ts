// test/canonical-text-field.test.ts
//
// Every exported identifier writes "text field" as two words.
// 0.10.5 exported both spellings; 3.0.0 has only the canonical ones. The strings
// follow: the tag, the classes and the constants' values are
// text-field too. The list below pins that the old identifier spellings are
// gone. The guard under it pins that the one-word spelling does not return.
import { expect, test } from "bun:test";
import ts from "typescript";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { changelogHistoryHeading, lineKept, oneWordHits } from "../scripts/text-field-rename-allowlist";

const ROOT = join(import.meta.dir, "..");
const CONSTANTS = ["VARIANTS", "STATES", "TYPES", "EVENTS", "DENSITY", "DEFAULTS", "CLASSES"];
const ENTRIES: Record<string, Array<[old: string, to: string]>> = {
  "src/index.ts": [["createTextfield", "createTextField"], ["TextfieldConfig", "TextFieldConfig"], ["TextfieldComponent", "TextFieldComponent"],
    ["CardSchema", "CardConfig"], ["TopAppBar", "TopAppBarComponent"], ["BottomAppBar", "BottomAppBarComponent"]],
  "src/components/text-field/index.ts": [["TextfieldConfig", "TextFieldConfig"], ["TextfieldComponent", "TextFieldComponent"],
    ["TextfieldDensity", "TextFieldDensity"], ["TextfieldEvents", "TextFieldEvents"], ["TextfieldValuePayload", "TextFieldValuePayload"],
    ["TextfieldFocusPayload", "TextFieldFocusPayload"], ["TextfieldTrailingPayload", "TextFieldTrailingPayload"]],
  "src/components/text-field/constants.ts": CONSTANTS.map((c) => [`TEXTFIELD_${c}`, `TEXT_FIELD_${c}`]),
  "src/components/card/index.ts": [["CardSchema", "CardConfig"]],
  "src/components/top-app-bar/index.ts": [["TopAppBar", "TopAppBarComponent"]],
  "src/components/bottom-app-bar/index.ts": [["BottomAppBar", "BottomAppBarComponent"]],
  "src/elements/index.ts": [["textfieldElement", "textFieldElement"], ["defineTextfield", "defineTextField"], ["TextfieldSpec", "TextFieldSpec"],
    ["TextfieldElement", "TextFieldElement"], ["TextfieldElementComponent", "TextFieldElementComponent"]],
  "src/react/index.ts": [["Textfield", "TextField"]],
  "src/solid/index.ts": [["Textfield", "TextField"]],
  "src/vue/index.ts": [["MTextfield", "MTextField"]],
};

test("3.0.0 exports only the canonical names: every old spelling is gone from its entry", () => {
  const files = Object.keys(ENTRIES).map((file) => join(ROOT, file));
  const program = ts.createProgram(files, {
    strict: true, skipLibCheck: true, noEmit: true, jsx: ts.JsxEmit.ReactJSX,
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
  });
  const checker = program.getTypeChecker();
  const problems: string[] = [];
  for (const [file, renames] of Object.entries(ENTRIES)) {
    const source = program.getSourceFile(join(ROOT, file))!;
    const names = new Set(checker.getExportsOfModule(checker.getSymbolAtLocation(source)!).map((s) => s.name));
    for (const [old, to] of renames) {
      if (names.has(old)) problems.push(`${file} still exports ${old}`);
      if (!names.has(to)) problems.push(`${file} lacks ${to}`);
    }
    // Nothing with the old spelling is left on the entry at all
    for (const name of names) if (/Textfield|textfield[A-Z]|TEXTFIELD/.test(name)) problems.push(`${file} exports ${name}`);
  }
  expect(problems).toEqual([]);
}, 60_000);

// The one-word spelling is the nine letters in any case except textField and
// TextField.
test("no tracked path or line keeps the one-word spelling outside the allowlist", () => {
  const listed = spawnSync("git", ["ls-files", "-z"], { cwd: ROOT, encoding: "utf8" });
  if (listed.status !== 0) throw new Error(listed.stderr || "git ls-files failed");
  const paths = listed.stdout.split("\0").filter((file) => file.length > 0);
  const found: string[] = [];
  for (const file of paths) {
    if (oneWordHits(file).length > 0) found.push(`path ${file}`);
    const raw = readFileSync(join(ROOT, file));
    if (raw.includes(0)) continue;
    let inHistory = false;
    const lines = raw.toString("utf8").split("\n");
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index] ?? "";
      if (file === "CHANGELOG.md" && line.startsWith(changelogHistoryHeading)) inHistory = true;
      if (oneWordHits(line).length === 0) continue;
      if (lineKept(file, line, inHistory)) continue;
      found.push(`${file}:${index + 1}`);
    }
  }
  expect({ count: found.length, first: found.slice(0, 15) }).toEqual({ count: 0, first: [] });
}, 60_000);
