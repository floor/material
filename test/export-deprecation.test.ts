// test/export-deprecation.test.ts
//
// A consumer sees an export's @deprecated tag wherever it is written: on the
// declaration itself, or on the re-export statement an index uses. The pins
// must see the same thing, or a name deprecated at its declaration is pinned
// as plain public and its later removal reads as unannounced.
import { describe, expect, test } from "bun:test";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ts from "typescript";
import { deprecationOf } from "../scripts/export-deprecation";

const DECLARATION = [
  "/** @deprecated The whole symbol is deprecated. */",
  "export const moved = 1;",
  "export const plain = 2;",
  "/** @deprecated */",
  "export const bare = 3;",
  "/** @deprecated The declaration's note loses to the export site's. */",
  "export const tagged = 4;",
  "",
].join("\n");

const INDEX = [
  "export {",
  "  moved,",
  "  plain,",
  "  bare,",
  "  /** @deprecated The export site says so. */",
  "  tagged,",
  '} from "./declaration";',
  "",
].join("\n");

describe("an export's deprecation, resolved through its declaration", () => {
  const read = async () => {
    const directory = await mkdtemp(join(tmpdir(), "export-deprecation-"));
    await writeFile(join(directory, "declaration.ts"), DECLARATION);
    await writeFile(join(directory, "index.ts"), INDEX);
    const program = ts.createProgram([join(directory, "index.ts")], {
      strict: true, skipLibCheck: true, noEmit: true,
      target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
    });
    const checker = program.getTypeChecker();
    const source = program.getSourceFile(join(directory, "index.ts"));
    if (!source) throw new Error("the index is not in the program");
    const exports = checker.getExportsOfModule(checker.getSymbolAtLocation(source)!);
    return Object.fromEntries(exports.map((symbol) => [symbol.name, deprecationOf(checker, symbol)]));
  };

  test("a tag on the declaration counts, with its note", async () => {
    expect((await read()).moved).toEqual({ note: "The whole symbol is deprecated.", where: "declaration" });
  });

  test("an untagged export of an untagged declaration has no deprecation", async () => {
    expect((await read()).plain).toBeUndefined();
  });

  test("a bare @deprecated is a deprecation with an empty note", async () => {
    expect((await read()).bare).toEqual({ note: "", where: "declaration" });
  });

  test("the export site's tag wins over the declaration's, so a move keeps its path note", async () => {
    expect((await read()).tagged).toEqual({ note: "The export site says so.", where: "export" });
  });
});
