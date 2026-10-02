// test/root-exports.test.ts
//
// FLO-351: every root export is public API. The list is pinned, so a name added
// to or dropped from `mtrl` fails here until the fixture is regenerated
// (`bun run root-exports:update`) and the diff reviewed. 1.0.0 removed the
// internals from the root; the migration table 0.10.4 published is frozen, and
// every name it lists must import from the path it gives, and not from `mtrl`.
import { describe, expect, test } from "bun:test";
import ts from "typescript";
import { join } from "node:path";
import { diffRootExports, readMigrationTable, readPinned, readRootExports, verifyMigrationTable } from "../scripts/root-exports";

const ROOT = join(import.meta.dir, "..");
const now = readRootExports();
const table = readMigrationTable(await Bun.file(join(ROOT, "scripts/fixtures/root-exports.md")).text());

describe("the root exports (FLO-351)", () => {
  test("match the pinned list: an added or removed name fails until the fixture is regenerated", async () => {
    const changes = diffRootExports(await readPinned(), now);
    expect(changes, `Run \`bun run root-exports:update\` if intended:\n${changes.join("\n")}`).toEqual([]);
  });

  test("nothing on the root is deprecated any more: what was is gone", () => {
    expect(now.filter((e) => e.status !== "public").map((e) => e.name)).toEqual([]);
  });

  test("the root keeps the components and the app-level helpers; the composition core is gone", () => {
    const names = new Set(now.map((e) => e.name));
    for (const name of ["createButton", "createTextField", "clearSnackbars", "configureHTML", "schemeToTokens", "THEME_ROLES", "setComponentDefaults", "ComponentConfigMap"]) {
      expect(names.has(name)).toBe(true);
    }
    for (const name of ["pipe", "createBase", "withEvents", "throttle", "loggingMiddleware", "CleanupManager", "addClass"]) {
      expect(names.has(name)).toBe(false);
    }
  });

  test("the migration table, frozen as 0.10.4 published it, still holds: each name is gone from the root and at its path", () => {
    expect(table.length).toBe(137);
    expect(verifyMigrationTable(table, now)).toEqual([]);
  });

  test("only the canonical names: the old spellings 0.10.5 renamed are gone (FLO-383)", () => {
    const names = new Set(now.map((e) => e.name));
    const renames = [["createTextfield", "createTextField"], ["TextfieldConfig", "TextFieldConfig"],
      ["TextfieldComponent", "TextFieldComponent"], ["CardSchema", "CardConfig"],
      ["TopAppBar", "TopAppBarComponent"], ["BottomAppBar", "BottomAppBarComponent"]];
    expect(renames.filter(([old, to]) => names.has(old!) || !names.has(to!))).toEqual([]);
  });
});

describe("the migration compiles (FLO-351)", () => {
  const CONSUMER = join(ROOT, "test/__root-exports-consumer.ts");
  const fromRoot = "../src/index";
  const fromPath = (path: string) => (path === "mtrl/core" ? "../src/core/index" : `../src/core/${path.slice("mtrl/core/".length)}/index`);

  const importsOf = (from: (path: string) => string): string => {
    const byModule = new Map<string, string[]>();
    for (const { name, path } of table) byModule.set(from(path), [...(byModule.get(from(path)) ?? []), name]);
    return [...byModule].map(([module, names], i) => `import { ${names.map((n) => `${n} as m${i}_${n}`).join(", ")} } from "${module}";`).join("\n");
  };

  /** The language service's errors for a consumer file */
  const errorsOf = (source: string): ts.Diagnostic[] => {
    const options: ts.CompilerOptions = {
      strict: true, skipLibCheck: true, noEmit: true, noUnusedLocals: false,
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
    return ts.createLanguageService(host).getSemanticDiagnostics(CONSUMER);
  };

  test("every name imports from the path the table gives, a class in every position", () => {
    const classUse = `import { CleanupManager } from "${fromPath("mtrl/core/canvas")}";
const manager: CleanupManager = new CleanupManager();
export const isManager = manager instanceof CleanupManager;`;
    const errors = errorsOf(`${importsOf(fromPath)}\n${classUse}`).map((d) => ts.flattenDiagnosticMessageText(d.messageText, " "));
    expect(errors).toEqual([]);
  }, 60_000);

  test("imported from mtrl, every one of them is a compile error naming it", () => {
    const missing = errorsOf(importsOf(() => fromRoot))
      .map((d) => ts.flattenDiagnosticMessageText(d.messageText, " ").match(/has no exported member (?:named )?'([^']+)'/)?.[1])
      .filter((name): name is string => !!name);
    expect(new Set(missing)).toEqual(new Set(table.map((row) => row.name)));
  }, 60_000);
});
