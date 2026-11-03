import ts from "typescript";
import { dirname, join, relative, resolve } from "node:path";
import { readFile, readdir, writeFile } from "node:fs/promises";

/** Drop runtime prose without losing the annotations consumers need for tree shaking, or a licence banner. */
export function printRuntimeModule(filename: string, text: string): string {
  const file = ts.createSourceFile(filename, text, ts.ScriptTarget.Latest, true);
  const comments = new Map<number, number>();
  function visit(node: ts.Node): void {
    for (const position of [node.pos, node.end]) {
      for (const range of [...ts.getLeadingCommentRanges(text, position) ?? [], ...ts.getTrailingCommentRanges(text, position) ?? []]) {
        const comment = text.slice(range.pos, range.end);
        if (!/[@#]__PURE__/.test(comment) && !comment.startsWith("/*!")) comments.set(range.pos, range.end);
      }
    }
    node.getChildren(file).forEach(visit);
  }
  visit(file);
  for (const [start, end] of [...comments].sort(([a], [b]) => b - a)) {
    text = text.slice(0, start) + text.slice(start, end).replace(/[^\r\n]/g, " ") + text.slice(end);
  }
  return ts.createPrinter().printFile(ts.createSourceFile(filename, text, ts.ScriptTarget.Latest, true));
}

/** What every shipped runtime module goes through: prose out, PURE annotations and licence banners in. */
export function stripRuntimeComments(filename: string, text: string): string {
  return text.includes("__PURE__") ? printRuntimeModule(filename, text)
    : ts.createPrinter({ removeComments: true }).printFile(
      ts.createSourceFile(filename, text, ts.ScriptTarget.Latest, true),
    );
}

/**
 * Drop declaration prose: signatures, not documentation, are the shipped
 * contract. The published API docs build from src (typedoc reads
 * `./src/index.ts`), and editors still resolve the same types.
 */
export function printDeclarationModule(filename: string, text: string): string {
  const file = ts.createSourceFile(filename, text, ts.ScriptTarget.Latest, true);
  const comments = new Map<number, number>();
  function visit(node: ts.Node): void {
    for (const position of [node.pos, node.end]) {
      for (const range of [...ts.getLeadingCommentRanges(text, position) ?? [], ...ts.getTrailingCommentRanges(text, position) ?? []]) {
        comments.set(range.pos, range.end);
      }
    }
    node.getChildren(file).forEach(visit);
  }
  visit(file);
  for (const [start, end] of [...comments].sort(([a], [b]) => b - a)) {
    text = text.slice(0, start) + text.slice(start, end).replace(/[^\r\n]/g, " ") + text.slice(end);
  }
  return ts.createPrinter().printFile(ts.createSourceFile(filename, text, ts.ScriptTarget.Latest, true));
}

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
    // The write pass below strips prose per file kind (runtime JS and
    // declarations alike); the emit keeps comments so PURE annotations
    // and import specifiers reach it intact.
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
        ts.sys.writeFile(join(outdir, "ssr/index.d.ts"), printDeclarationModule(filename, text));
      }
      if (filename.endsWith("/ssr/react.js") || filename.endsWith("/ssr/svelte.js") || filename.endsWith("/ssr/vue.js") || filename.endsWith("/ssr/solid.js")) {
        // The adapters ship in the package like every other runtime module, so
        // they get the same strip after the specifier rewrite.
        ts.sys.writeFile(filename, stripRuntimeComments(filename, text.replace('"./index"', '"./index.js"')));
      }
      if (filename.endsWith("/ssr/react.d.ts") || filename.endsWith("/ssr/svelte.d.ts") || filename.endsWith("/ssr/vue.d.ts") || filename.endsWith("/ssr/solid.d.ts")) ts.sys.writeFile(filename, printDeclarationModule(filename, text));
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
    if (filename.endsWith(".js")) {
      // Avoid shipping API prose twice. Identifiers, pure annotations and licence
      // banners stay: `stripShippedModules` removes indentation and blank lines
      // afterwards and never reprints, so stack traces still name the code.
      text = stripRuntimeComments(filename, text);
    }
    if (filename.endsWith(".d.ts")) {
      // Shipped declarations carry signatures, not prose: hovers and the
      // published docs read src, which the tarball does not carry.
      text = printDeclarationModule(filename, text);
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

/** A comment the shipped file keeps: a pure annotation, a licence banner or an @license/@preserve block. */
function keepComment(comment: string): boolean {
  return /[@#]__PURE__/.test(comment) || comment.startsWith("/*!") || /@license|@preserve/.test(comment);
}

/** The leaf nodes of the parse: every token, trivia and JSDoc excluded. */
function tokenNodes(file: ts.SourceFile): ts.Node[] {
  const tokens: ts.Node[] = [];
  const visit = (node: ts.Node): void => {
    // A JSDoc comment is an AST node, not a token: the strip removes it as prose.
    if (node.kind >= ts.SyntaxKind.FirstJSDocNode && node.kind <= ts.SyntaxKind.LastJSDocNode) return;
    const children = node.getChildren(file);
    if (children.length === 0) {
      tokens.push(node);
      return;
    }
    for (const child of children) visit(child);
  };
  visit(file);
  return tokens;
}

/** The tokens of a parsed module: JSDoc and zero-length tokens excluded. */
function tokensOf(file: ts.SourceFile): string[] {
  return tokenNodes(file).map((node) => node.getText(file)).filter((token) => token.length > 0);
}

/**
 * Refuse two texts whose token streams differ: a fold (`process.env.NODE_ENV`
 * turned into a literal), a rewritten literal or two joined tokens fails here,
 * before the difference can reach a consumer.
 */
function assertTokenStreams(filename: string, before: string[], after: string[]): void {
  const shared = Math.min(before.length, after.length);
  for (let i = 0; i < shared; i += 1) {
    if (before[i] !== after[i]) {
      throw new Error(`${filename}: the strip changed token ${i + 1}: ${JSON.stringify(before[i])} -> ${JSON.stringify(after[i])}`);
    }
  }
  if (before.length !== after.length) {
    throw new Error(`${filename}: the strip changed the token count, ${before.length} -> ${after.length}`);
  }
}

/** The strip's own guard, callable on any pair: the token stream must match token for token. */
export function assertMatchingTokens(filename: string, before: string, after: string): void {
  const parse = (text: string): ts.SourceFile => ts.createSourceFile(filename, text, ts.ScriptTarget.Latest, true);
  assertTokenStreams(filename, tokensOf(parse(before)), tokensOf(parse(after)));
}

/**
 * Remove comments (except the ones a consumer's bundler and the licence need),
 * blank lines and indentation, and nothing else: no reprint, no constant fold,
 * no redefine. Every token, every line and every identifier stays as emitted.
 * `process.env.NODE_ENV` is a runtime read in the package and stays one.
 *
 * The function checks its own work: the stripped text is parsed again and its
 * token stream must equal the original's, every line that carried a token must
 * still carry one, no line may grow, and every kept comment must survive.
 */
export function stripModuleText(filename: string, text: string): string {
  const file = ts.createSourceFile(filename, text, ts.ScriptTarget.Latest, true);

  const removals = new Map<number, number>();
  const protectedRanges: Array<[number, number]> = [];
  function visitComments(node: ts.Node): void {
    for (const position of [node.pos, node.end]) {
      for (const range of [...ts.getLeadingCommentRanges(text, position) ?? [], ...ts.getTrailingCommentRanges(text, position) ?? []]) {
        const comment = text.slice(range.pos, range.end);
        if (keepComment(comment)) protectedRanges.push([range.pos, range.end]);
        else removals.set(range.pos, range.end);
      }
    }
    node.getChildren(file).forEach(visitComments);
  }
  visitComments(file);

  // Literal text is content, not formatting: whitespace inside a string, a
  // template or a regex literal is part of what the program says, and a kept
  // comment must reach the consumer exactly as written.
  function visitLiterals(node: ts.Node): void {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateExpression(node) || ts.isRegularExpressionLiteral(node)) {
      protectedRanges.push([node.getStart(file), node.getEnd()]);
      return;
    }
    node.getChildren(file).forEach(visitLiterals);
  }
  visitLiterals(file);
  protectedRanges.sort(([a], [b]) => a - b);
  let protectedIndex = 0;
  const protectedAt = (position: number): boolean => {
    while (protectedIndex < protectedRanges.length && protectedRanges[protectedIndex][1] <= position) protectedIndex += 1;
    return protectedIndex < protectedRanges.length && protectedRanges[protectedIndex][0] <= position;
  };

  // Comments out. A space stands in where the comment separated two tokens, so
  // a deletion can never join them; the offset map keeps every kept byte
  // attributable to its source position.
  let withoutComments = "";
  const sourceOffset: number[] = [];
  for (let i = 0; i < text.length; ) {
    const end = removals.get(i);
    if (end !== undefined) {
      const before = withoutComments.length > 0 ? withoutComments[withoutComments.length - 1] : "";
      const after = text[end] ?? "";
      if (before !== "" && after !== "" && !/\s/.test(before) && !/\s/.test(after)) {
        withoutComments += " ";
        sourceOffset.push(i);
      }
      i = end;
      continue;
    }
    withoutComments += text[i];
    sourceOffset.push(i);
    i += 1;
  }

  // Indentation and blank lines out, one newline per line break, so every
  // statement keeps its own line and the file stays readable. Whitespace that
  // belongs to a literal or a kept comment is left alone.
  const lines: string[] = [];
  let lineStart = 0;
  for (const line of withoutComments.split("\n")) {
    const start = lineStart;
    lineStart += line.length + 1;
    let first = 0;
    while (first < line.length && (line[first] === " " || line[first] === "\t")) first += 1;
    let last = line.length;
    while (last > first && (line[last - 1] === " " || line[last - 1] === "\t")) last -= 1;
    if (first === last) continue;
    const from = first > 0 && !protectedAt(sourceOffset[start]) ? first : 0;
    const to = last < line.length && !protectedAt(sourceOffset[start + line.length - 1]) ? last : line.length;
    lines.push(line.slice(from, to));
  }
  const stripped = lines.length > 0 ? `${lines.join("\n")}\n` : "";

  const tokenPositions = tokenNodes(file).filter((node) => node.getText(file).length > 0);
  const afterFile = ts.createSourceFile(filename, stripped, ts.ScriptTarget.Latest, true);
  assertTokenStreams(filename, tokenPositions.map((node) => node.getText(file)), tokensOf(afterFile));
  const keptComments = (value: string): number => (value.match(/[@#]__PURE__|\/\*!|@license|@preserve/g) ?? []).length;
  if (keptComments(text) !== keptComments(stripped)) throw new Error(`${filename}: the strip dropped a kept comment`);
  const codeLines = new Set(tokenPositions.map((node) => file.getLineAndCharacterOfPosition(node.getStart(file)).line));
  const strippedLines = stripped.split("\n").filter((line) => line !== "");
  if (strippedLines.length < codeLines.size) {
    throw new Error(`${filename}: the strip joined lines, ${codeLines.size} code lines became ${strippedLines.length}`);
  }
  const longest = Math.max(0, ...text.split("\n").map((line) => line.length));
  if (strippedLines.some((line) => line.length > longest)) throw new Error(`${filename}: the strip grew a line past ${longest} chars`);
  return stripped;
}

/**
 * The shipped modules keep their identifiers, their tokens, their pure
 * annotations and their licence banners; indentation, blank lines and prose
 * comments go. A consumer's bundler minifies what it keeps, so the formatting
 * costs the tarball and buys nothing at runtime, while `node_modules/material`
 * still debugs by name and still reads `process.env.NODE_ENV` at runtime.
 *
 * Four sets are left exactly as emitted:
 * - `ssr/`: the index is already minified, and the four adapter entries have
 *   their own minification change;
 * - `elements/css/`: `check-elements-css` compares the CSS text these modules
 *   register with the shipped stylesheets, byte for byte;
 * - `styles/`: the same check compares each style module with the import block
 *   `elementStyleModule` generates, byte for byte;
 * - `svelte/`: `check-svelte` matches the generated barrel's export text
 *   (`export { default as TextField } from "./TextField.svelte";`).
 *
 * Runs after the prunes, so both parsers keep reading the emitted formatting.
 */
export async function stripShippedModules(outdir: string): Promise<{ files: number; bytes: number }> {
  let files = 0;
  let bytes = 0;
  const walk = async (directory: string): Promise<void> => {
    for (const entry of await readdir(join(outdir, directory), { withFileTypes: true })) {
      const path = directory === "" ? entry.name : `${directory}/${entry.name}`;
      if (entry.isDirectory()) {
        if (path === "ssr" || path === "elements/css" || path === "styles" || path === "svelte") continue;
        await walk(path);
        continue;
      }
      if (!entry.name.endsWith(".js")) continue;
      const file = join(outdir, path);
      const text = await readFile(file, "utf8");
      const stripped = stripModuleText(file, text);
      if (stripped === text) continue;
      await writeFile(file, stripped);
      files += 1;
      bytes += text.length - stripped.length;
    }
  };
  await walk("");
  return { files, bytes };
}
