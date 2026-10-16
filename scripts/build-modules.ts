import ts from "typescript";
import { dirname, join, relative, resolve } from "node:path";
import { readdir } from "node:fs/promises";

/** Emit the original module graph so consumers can tree-shake and code-split it. */
export function buildModules(outdir: string) {
  const config = ts.readConfigFile("tsconfig.json", ts.sys.readFile);
  if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, "\n"));
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, process.cwd(), {
    rootDir: resolve("src"),
    outDir: resolve(outdir),
    noEmit: false,
    noEmitOnError: true,
    declaration: true,
    sourceMap: false,
    declarationMap: false,
    // Preserve declaration documentation; JS comments are removed below.
    removeComments: false,
  });
  const program = ts.createProgram(parsed.fileNames, parsed.options);
  const diagnostics = [...parsed.errors, ...ts.getPreEmitDiagnostics(program)];
  if (diagnostics.length) {
    throw new Error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCanonicalFileName: (name) => name,
      getCurrentDirectory: ts.sys.getCurrentDirectory,
      getNewLine: () => "\n",
    }));
  }

  const result = program.emit(undefined, (filename, text) => {
    // SSR JavaScript is bundled separately with its dev-only dependencies.
    // Its public declaration has no imports; keep the internal helpers private.
    if (relative(resolve(outdir), filename).replace(/\\/g, "/").startsWith("ssr/")) {
      if (filename.endsWith("/ssr/render-element.d.ts")) {
        ts.sys.writeFile(join(outdir, "ssr/index.d.ts"), text);
      }
      if (filename.endsWith("/ssr/react.js") || filename.endsWith("/ssr/svelte.js") || filename.endsWith("/ssr/vue.js") || filename.endsWith("/ssr/solid.js")) {
        ts.sys.writeFile(filename, text.replace('"./index"', '"./index.js"'));
      }
      if (filename.endsWith("/ssr/react.d.ts") || filename.endsWith("/ssr/svelte.d.ts") || filename.endsWith("/ssr/vue.d.ts") || filename.endsWith("/ssr/solid.d.ts")) ts.sys.writeFile(filename, text);
      return;
    }
    // Node and browsers require explicit extensions and directory index paths.
    // Rewrite only module specifiers, including dynamic and declaration imports.
    const sourceName = join(resolve("src"), relative(resolve(outdir), filename))
      .replace(/\.js$|\.d\.ts$/, ".ts");
    const file = ts.createSourceFile(filename, text, ts.ScriptTarget.Latest, true);
    const edits: { start: number; end: number; value: string }[] = [];
    function visit(node: ts.Node) {
      if (ts.isStringLiteral(node) && node.text.startsWith(".")) {
        const parent = node.parent;
        const isModule =
          ((ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent)) && parent.moduleSpecifier === node) ||
          (ts.isCallExpression(parent) && parent.expression.kind === ts.SyntaxKind.ImportKeyword && parent.arguments[0] === node) ||
          (ts.isLiteralTypeNode(parent) && ts.isImportTypeNode(parent.parent));
        if (isModule) {
          const module = ts.resolveModuleName(node.text, sourceName, parsed.options, ts.sys).resolvedModule;
          if (!module) throw new Error(`Cannot resolve ${node.text} from ${sourceName}`);
          let specifier = relative(dirname(sourceName), module.resolvedFileName)
            .replace(/\\/g, "/").replace(/(?:\.d)?\.tsx?$/, ".js");
          if (!specifier.startsWith(".")) specifier = `./${specifier}`;
          edits.push({ start: node.getStart(file), end: node.getEnd(), value: JSON.stringify(specifier) });
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(file);
    for (const edit of edits.sort((a, b) => b.start - a.start)) {
      text = text.slice(0, edit.start) + edit.value + text.slice(edit.end);
    }
    // The printer drops every comment, `/*#__PURE__*/` too, and bundlers need
    // it to drop an unused adapter component: a module carrying one
    // keeps the compiler's output, which is only the generated header there.
    if (filename.endsWith(".js") && !text.includes("#__PURE__")) {
      // Avoid shipping API prose twice while keeping ESM readable for debugging.
      text = ts.createPrinter({ removeComments: true }).printFile(
        ts.createSourceFile(filename, text, ts.ScriptTarget.Latest, true),
      );
    }
    ts.sys.writeFile(filename, text);
  });
  if (result.emitSkipped || result.diagnostics.length) throw new Error("Module emission failed");
}

/** Bundle the server implementation and linkedom, sharing mtrl's existing modules. */
export async function buildSSR(outdir: string) {
  const src = resolve("src");
  const server = resolve(src, "ssr");
  const packages = new Set<string>();
  const result = await Bun.build({
    entrypoints: [join(server, "index.ts"), join(server, "browser.ts")],
    outdir: join(outdir, "ssr"),
    target: "node", format: "esm", minify: true,
    plugins: [{
      name: "shared-mtrl-modules",
      setup(build) {
        build.onLoad({ filter: /\/node_modules\// }, ({ path }) => {
          const root = path.match(/.*\/node_modules\/(?:@[^/]+\/)?[^/]+/)?.[0];
          if (root) packages.add(root);
          return undefined;
        });
        // SSR has no canvas rendering. Bundle linkedom's own fallback instead
        // of leaving its optional native canvas require in the published entry.
        build.onResolve({ filter: /\/canvas\.cjs$/ }, args => {
          if (!args.importer.includes("/linkedom/")) return;
          return { path: Bun.resolveSync(args.path.replace(/canvas\.cjs$/, "canvas-shim.cjs"), dirname(args.importer)) };
        });
        build.onResolve({ filter: /^\.\.?\// }, args => {
          if (!args.importer.startsWith(server + "/")) return;
          const dependency = Bun.resolveSync(args.path, dirname(args.importer));
          if (!dependency.startsWith(src + "/") || dependency.startsWith(server + "/")) return;
          // Keep the CSS registry, HTML policy and global defaults shared with
          // the public mtrl entries. Only SSR and its npm dependencies bundle.
          return { path: "../" + relative(src, dependency).replace(/\.ts$/, ".js"), external: true };
        });
      },
    }],
  });
  if (!result.success) throw new AggregateError(result.logs, "SSR bundle failed");
  // Minification must not drop the bundled dependencies' redistribution notices.
  const notices: string[] = [];
  for (const root of [...packages].sort()) {
    const license = (await readdir(root)).find(name => /^licen[cs]e(?:\..*)?$/i.test(name));
    if (!license) throw new Error(`Missing bundled dependency license: ${root}`);
    const { name, version } = await Bun.file(join(root, "package.json")).json();
    notices.push(`${name}@${version}\n${await Bun.file(join(root, license)).text()}`);
  }
  const entry = join(outdir, "ssr/index.js");
  // CSS modules are generated by buildStyles; importing them here populates
  // the same registry the renderer reads, without any consumer setup.
  ts.sys.writeFile(entry, `/*! Bundled dependency notices\n${notices.join("\n").replace(/\*\//g, "* /")}*/\n` +
    'import "../elements/css/index.js";\n' + await Bun.file(entry).text());
}
