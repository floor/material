// test/canonical-text-field.test.ts
//
// FLO-383 PR B: every exported identifier writes "text field" as two words.
// 0.10.5 exported both spellings (A2); 1.0 has only the canonical ones. String
// values stay: the <m-textfield> tag, CSS classes, event strings and the
// constants' values. Svelte's index is written by the build; svelte:check
// covers it. Read with the type checker, so nothing here needs a build.
import { expect, test } from "bun:test";
import ts from "typescript";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const CONSTANTS = ["VARIANTS", "STATES", "TYPES", "EVENTS", "DENSITY", "DEFAULTS", "CLASSES"];
const ENTRIES: Record<string, Array<[old: string, to: string]>> = {
  "src/index.ts": [["createTextfield", "createTextField"], ["TextfieldConfig", "TextFieldConfig"], ["TextfieldComponent", "TextFieldComponent"],
    ["CardSchema", "CardConfig"], ["TopAppBar", "TopAppBarComponent"], ["BottomAppBar", "BottomAppBarComponent"]],
  "src/components/textfield/index.ts": [["TextfieldConfig", "TextFieldConfig"], ["TextfieldComponent", "TextFieldComponent"],
    ["TextfieldDensity", "TextFieldDensity"], ["TextfieldEvents", "TextFieldEvents"], ["TextfieldValuePayload", "TextFieldValuePayload"],
    ["TextfieldFocusPayload", "TextFieldFocusPayload"], ["TextfieldTrailingPayload", "TextFieldTrailingPayload"]],
  "src/components/textfield/constants.ts": CONSTANTS.map((c) => [`TEXTFIELD_${c}`, `TEXT_FIELD_${c}`]),
  "src/components/card/index.ts": [["CardSchema", "CardConfig"]],
  "src/components/top-app-bar/index.ts": [["TopAppBar", "TopAppBarComponent"]],
  "src/components/bottom-app-bar/index.ts": [["BottomAppBar", "BottomAppBarComponent"]],
  "src/elements/index.ts": [["textfieldElement", "textFieldElement"], ["defineTextfield", "defineTextField"], ["TextfieldSpec", "TextFieldSpec"],
    ["TextfieldElement", "TextFieldElement"], ["TextfieldElementComponent", "TextFieldElementComponent"]],
  "src/react/index.ts": [["Textfield", "TextField"]],
  "src/solid/index.ts": [["Textfield", "TextField"]],
  "src/vue/index.ts": [["MTextfield", "MTextField"]],
};

test("1.0 exports only the canonical names: every old spelling is gone from its entry (FLO-383)", () => {
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
