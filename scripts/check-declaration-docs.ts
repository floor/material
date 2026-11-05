#!/usr/bin/env bun
// scripts/check-declaration-docs.ts
/**
 * Build first (or pass `--dist <dir>`): what the published declarations carry
 * is checked on the packed package, through the package's own `exports`, not on
 * the sources.
 *
 * A typed consumer gets TypeScript's deprecation suggestion diagnostics for a
 * deprecated export or member it imports or reads (codes 6385 and 6387). That is
 * read from the shipped `.d.ts`: the build keeps each `@deprecated` JSDoc block
 * (scripts/build-modules.ts) precisely so it reaches this consumer.
 *
 * The deprecated names below are the FAB's physical-position aliases, the
 * deprecations the package ships. The adapter entries are read for a deprecated
 * value export and checked when one exists: an adapter that gains one is covered
 * without changing this file.
 *
 *   bun run declaration-docs:check
 *   bun run scripts/check-declaration-docs.ts --dist ./dist
 */
import ts from "typescript";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { deprecationOf } from "./export-deprecation";
import { createPackageFixture } from "./package-fixture";

const ROOT = join(import.meta.dir, "..");
const manifest = await Bun.file(join(ROOT, "package.json")).json() as { name: string };

const options: ts.CompilerOptions = {
  strict: true, skipLibCheck: true, noEmit: true,
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  lib: ["lib.es2022.d.ts", "lib.dom.d.ts"],
};

const distArgument = process.argv.indexOf("--dist");
const dist = distArgument === -1 ? undefined : resolve(process.argv[distArgument + 1]!);
if (distArgument !== -1 && !process.argv[distArgument + 1]) {
  console.error("Usage: check-declaration-docs.ts [--dist <directory>]");
  process.exit(2);
}

interface Consumer {
  /** The temporary file name, and what the report calls it. */
  file: string;
  source: string;
  /** The deprecated names its use of the packed package must report. */
  deprecated: string[];
  /** A documented name the consumer reads, and the documentation an editor shows for it. */
  hover?: { name: string; at: string; documentation: string };
}

const consumers: Consumer[] = [
  {
    file: "root-consumer.ts",
    source: `import { createFab, type FabComponent } from "${manifest.name}";

declare const fab: FabComponent;
fab.setPosition("top-left");
fab.getPosition();
const built = createFab({ icon: "<svg/>", ariaLabel: "Add", type: "button" });
export { built };
`,
    deprecated: ["setPosition", "getPosition"],
    hover: { name: "type", at: 'type: "button"', documentation: "Button type attribute" },
  },
  {
    file: "component-consumer.ts",
    source: `import { type FabComponent } from "${manifest.name}/components/fab";

declare const fab: FabComponent;
fab.setPosition("top-left");
export {};
`,
    deprecated: ["setPosition"],
  },
  {
    file: "element-consumer.ts",
    source: `import type { FabSpec } from "${manifest.name}/elements";

declare const attributes: FabSpec["attributes"];
attributes.position;
export {};
`,
    deprecated: ["position"],
  },
];

const adapters = ["react", "vue", "solid"] as const;

// With --dist the directory is the package root (the build's dist/ carries the
// relocated manifest); the fixture already installs the tarball as material.
const fixture = dist ? undefined : await createPackageFixture();
const directory = fixture?.directory ?? await mkdtemp(join(tmpdir(), "mtrl-declaration-docs-"));
const packageRoot = fixture?.installed ?? dist!;

const failures: string[] = [];
try {
  if (dist) {
    await mkdir(join(directory, "node_modules"), { recursive: true });
    await symlink(packageRoot, join(directory, "node_modules", manifest.name), "dir");
  }
  // What an adapter's declarations import, installed by the reader: the same
  // links docs-imports:check makes before its compile.
  await mkdir(join(directory, "node_modules/@types"), { recursive: true });
  for (const name of ["react", "react-dom", "@types/react", "@types/react-dom", "csstype", "vue", "svelte", "solid-js"]) {
    await symlink(resolve(ROOT, "node_modules", name), join(directory, "node_modules", name), "dir").catch(() => {});
  }

  // Each adapter entry as a consumer sees it. Its exports are read from the
  // packed declarations: the first deprecated value export is checked through
  // an import, exactly as a consumer would write it.
  const probes = adapters.map((_, index) => `adapter-${index}.ts`);
  for (const [index, adapter] of adapters.entries()) {
    await writeFile(join(directory, probes[index]!), `export * from "${manifest.name}/${adapter}";\n`);
  }
  const probeProgram = ts.createProgram(probes.map(file => join(directory, file)), options);
  const probeChecker = probeProgram.getTypeChecker();
  for (const [index, adapter] of adapters.entries()) {
    const source = probeProgram.getSourceFile(join(directory, probes[index]!));
    if (!source) continue;
    const moduleSymbol = probeChecker.getSymbolAtLocation(source);
    if (!moduleSymbol) continue;
    let found: { name: string } | undefined;
    for (const exported of probeChecker.getExportsOfModule(moduleSymbol)) {
      const target = exported.flags & ts.SymbolFlags.Alias ? probeChecker.getAliasedSymbol(exported) : exported;
      if (!(target.flags & ts.SymbolFlags.Value)) continue;
      if (!deprecationOf(probeChecker, exported)) continue;
      found = { name: exported.getName() };
      break;
    }
    if (!found) continue;
    const file = `adapter-${adapter}-consumer.ts`;
    consumers.push({
      file,
      source: `import { ${found.name} } from "${manifest.name}/${adapter}";\nconst value = ${found.name};\nexport { value };\n`,
      deprecated: [found.name],
    });
    break;
  }

  // The service resolves names against its host, not the working directory: the
  // roots go in absolute, or it reads none of them and reports the first one
  // missing at the first diagnostic request.
  const files = consumers.map(consumer => join(directory, consumer.file));
  for (const consumer of consumers) await writeFile(join(directory, consumer.file), consumer.source);

  const host: ts.LanguageServiceHost = {
    getScriptFileNames: () => files,
    getScriptVersion: () => "1",
    getScriptSnapshot: (file) => ts.sys.fileExists(file) ? ts.ScriptSnapshot.fromString(ts.sys.readFile(file)!) : undefined,
    getCurrentDirectory: () => directory,
    getCompilationSettings: () => options,
    getDefaultLibFileName: ts.getDefaultLibFilePath,
    fileExists: ts.sys.fileExists, readFile: ts.sys.readFile, readDirectory: ts.sys.readDirectory,
  };
  const service = ts.createLanguageService(host);

  const report = (diagnostic: ts.Diagnostic): string => {
    const file = diagnostic.file!;
    const { line, character } = file.getLineAndCharacterOfPosition(diagnostic.start!);
    return `${file.fileName.split("/").pop()}:${line + 1}:${character + 1} ${ts.flattenDiagnosticMessageText(diagnostic.messageText, " ")}`;
  };
  const deprecatedNamesOf = (file: string): string[] => service.getSuggestionDiagnostics(file)
    .filter(diagnostic => diagnostic.code === 6385 || diagnostic.code === 6387)
    .map(diagnostic => /'([^']+)' is deprecated/.exec(ts.flattenDiagnosticMessageText(diagnostic.messageText, " "))?.[1])
    .filter((name): name is string => name !== undefined);

  for (const consumer of consumers) {
    const file = join(directory, consumer.file);
    for (const diagnostic of service.getSemanticDiagnostics(file)) {
      failures.push(`${report(diagnostic)}: the consumer does not compile`);
    }
    const names = deprecatedNamesOf(file);
    for (const expected of consumer.deprecated) {
      if (!names.includes(expected)) {
        failures.push(`${consumer.file}: ${expected} is not reported as deprecated from the packed declarations`);
      }
    }
    // What the editor shows for a documented option, read from the same
    // declarations: the build ships the JSDoc's first sentence, so a hover on
    // the option is not empty.
    if (consumer.hover) {
      const at = consumer.source.indexOf(consumer.hover.at);
      const documentation = (at === -1 ? undefined : service.getQuickInfoAtPosition(file, at))
        ?.documentation?.map(part => part.text).join("") ?? "";
      if (!documentation.includes(consumer.hover.documentation)) {
        failures.push(`${consumer.file}: ${consumer.hover.name} shows no "${consumer.hover.documentation}" documentation from the packed declarations`);
      }
    }
  }
} finally {
  await fixture?.cleanup();
  if (!fixture) await rm(directory, { recursive: true, force: true });
}

if (failures.length) {
  console.error(`\n${failures.length} declaration ${failures.length === 1 ? "failure" : "failures"} in the packed package:\n`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
const deprecatedCount = consumers.reduce((count, consumer) => count + consumer.deprecated.length, 0);
console.log(
  `${manifest.name}: ${consumers.length} consumers read the packed declarations, ` +
  `${deprecatedCount} deprecated names reported` +
  `${consumers.length > 3 ? `, including ${consumers[3]!.file}` : ""}.`,
);
