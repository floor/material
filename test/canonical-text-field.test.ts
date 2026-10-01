// test/canonical-text-field.test.ts
//
// FLO-383 A2: "two words everywhere in the API". Each entry exports the text
// field under its canonical name, the same binding as the old spelling, and the
// old spelling is flagged where it is imported (deprecated until 1.0). Tags,
// element names, CSS classes, folders and event strings keep "textfield".
// Svelte's index is written by the build; svelte:check covers it.
import { describe, expect, test } from "bun:test";
import ts from "typescript";
import { join } from "node:path";
import * as elements from "../src/elements";
import * as react from "../src/react";
import * as solid from "../src/solid";
import * as vue from "../src/vue";

const ROOT = join(import.meta.dir, "..");

const RENAMES: Array<[entry: string, old: string, to: string]> = [
  ["../src/elements/index", "defineTextfield", "defineTextField"],
  ["../src/elements/index", "TextfieldSpec", "TextFieldSpec"],
  ["../src/elements/index", "TextfieldElement", "TextFieldElement"],
  ["../src/elements/index", "TextfieldElementComponent", "TextFieldElementComponent"],
  ["../src/react/index", "Textfield", "TextField"],
  ["../src/solid/index", "Textfield", "TextField"],
  ["../src/vue/index", "MTextfield", "MTextField"],
  ["../src/components/textfield/index", "TextfieldDensity", "TextFieldDensity"],
  ["../src/components/textfield/index", "TextfieldEvents", "TextFieldEvents"],
  ["../src/components/textfield/index", "TextfieldValuePayload", "TextFieldValuePayload"],
  ["../src/components/textfield/index", "TextfieldFocusPayload", "TextFieldFocusPayload"],
  ["../src/components/textfield/index", "TextfieldTrailingPayload", "TextFieldTrailingPayload"],
];

describe("the text field's canonical names (FLO-383)", () => {
  test("each value is the same binding under both names", () => {
    expect(elements.defineTextField).toBe(elements.defineTextfield);
    expect(react.TextField).toBe(react.Textfield);
    expect(solid.TextField).toBe(solid.Textfield);
    expect(vue.MTextField).toBe(vue.MTextfield);
  });

  test("imported from its entry, each old name is flagged and its new name is not; the types are the same", () => {
    const CONSUMER = join(ROOT, "test/__canonical-text-field-consumer.ts");
    const imports = RENAMES.map(([entry, old, to], i) => `import { ${old} as old${i}, ${to} as new${i} } from "${entry}";`);
    // Equal types: the type names (values are compared at run time above)
    const checks = RENAMES.flatMap(([, old], i) =>
      /Spec$|Element$|ElementComponent$|Density$|Events$|Payload$/.test(old) ? [`export const same${i}: Equals<old${i}, new${i}> = true;`] : []);
    const source = [
      ...imports,
      "type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;",
      ...checks,
    ].join("\n");
    const options: ts.CompilerOptions = {
      strict: true, skipLibCheck: true, noEmit: true, jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
      lib: ["lib.es2022.d.ts", "lib.dom.d.ts", "lib.dom.iterable.d.ts"],
    };
    const host: ts.LanguageServiceHost = {
      getScriptFileNames: () => [CONSUMER],
      getScriptVersion: () => "1",
      getScriptSnapshot: (file) => file === CONSUMER ? ts.ScriptSnapshot.fromString(source)
        : ts.sys.fileExists(file) ? ts.ScriptSnapshot.fromString(ts.sys.readFile(file)!) : undefined,
      getCurrentDirectory: () => ROOT,
      getCompilationSettings: () => options,
      getDefaultLibFileName: ts.getDefaultLibFilePath,
      fileExists: (file) => file === CONSUMER || ts.sys.fileExists(file),
      readFile: (file) => file === CONSUMER ? source : ts.sys.readFile(file),
    };
    const service = ts.createLanguageService(host);
    const errors = service.getSemanticDiagnostics(CONSUMER).map((d) => ts.flattenDiagnosticMessageText(d.messageText, " "));
    expect(errors).toEqual([]);
    const flagged = service.getSuggestionDiagnostics(CONSUMER)
      .filter((d) => d.code === 6385 || d.code === 6387)
      .map((d) => source.slice(d.start!, d.start! + d.length!).split(" as ")[0]!);
    expect(RENAMES.filter(([, old]) => !flagged.includes(old)).map(([, old]) => old)).toEqual([]);
    expect(RENAMES.filter(([, , to]) => flagged.includes(to)).map(([, , to]) => to)).toEqual([]);
  }, 60_000);
});
