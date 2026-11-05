import ts from "typescript";
import { existsSync } from "node:fs";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { printDeclarationModule } from "./build-modules";

/**
 * Keep JSDoc comments on every declaration a consumer can reach from the
 * package's `exports` map — directly, through re-exports, or through heritage
 * clauses (`extends` / `implements`) and public-signature type references —
 * and strip non-`@deprecated` JSDoc comments on declarations that are strictly
 * internal.
 */

export interface DeclarationEntry {
  /** The package specifier a consumer writes (e.g. `material/components/fab`). */
  specifier: string;
  /** The declaration file the entry's `types` target names, relative to `packageRoot`. */
  types: string;
}

export interface ImportableDeclarationInfo {
  /** Path of the `.d.ts` file relative to `packageRoot`. */
  file: string;
  /** Top-level declaration name. */
  name: string;
  /** AST statement node in the `.d.ts` file. */
  statement: ts.Statement;
  /** First `exports` specifier through which this declaration was reached. */
  viaSpecifier: string;
}

export interface StripInternalDocsResult {
  /** Number of `.d.ts` files modified. */
  files: number;
  /** Number of internal top-level declarations whose non-`@deprecated` JSDoc was stripped. */
  declarations: number;
  /** Total bytes removed across all `.d.ts` files. */
  bytes: number;
}

const COMPILER_OPTIONS: ts.CompilerOptions = {
  strict: true,
  skipLibCheck: true,
  noEmit: true,
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  lib: ["lib.es2022.d.ts", "lib.dom.d.ts"],
};

function typesTarget(value: unknown): string | undefined {
  if (typeof value === "string") return value.endsWith(".d.ts") ? value : undefined;
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const types = (value as { types?: unknown }).types;
    if (typeof types === "string") return types;
  }
  return undefined;
}

async function filesUnder(directory: string, rel = ""): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(join(directory, rel), { withFileTypes: true })) {
    const path = rel === "" ? entry.name : `${rel}/${entry.name}`;
    if (entry.isDirectory()) files.push(...await filesUnder(directory, path));
    else files.push(path);
  }
  return files;
}

/**
 * Expand every concrete and wildcard `types` target in `exports` against the
 * files under `packageRoot`. Handles both packed manifests (`./dist/...`) and
 * relocated build manifests (`./...`).
 */
export async function declarationEntriesOf(
  exportsMap: unknown,
  packageRoot: string,
  packageName = "material",
): Promise<DeclarationEntry[]> {
  if (!exportsMap || typeof exportsMap !== "object" || Array.isArray(exportsMap)) {
    throw new Error("the package manifest has no exports map");
  }
  const files = await filesUnder(packageRoot);
  const fileSet = new Set(files);
  const hasDistPrefix = files.some(file => file.startsWith("dist/"));
  const entries: DeclarationEntry[] = [];

  for (const [key, value] of Object.entries(exportsMap as Record<string, unknown>)) {
    const rawTypes = typesTarget(value)?.replace(/^\.\//, "");
    if (!rawTypes) continue;
    const types = !hasDistPrefix && rawTypes.startsWith("dist/")
      ? rawTypes.slice("dist/".length)
      : rawTypes;
    const specifier = `${packageName}${key.slice(1)}`;
    const star = types.indexOf("*");
    if (star === -1) {
      if (fileSet.has(types)) entries.push({ specifier, types });
      continue;
    }
    const prefix = types.slice(0, star);
    const suffix = types.slice(star + 1);
    for (const file of files) {
      if (!file.startsWith(prefix) || !file.endsWith(suffix)) continue;
      const wildcard = file.slice(prefix.length, file.length - suffix.length);
      entries.push({ specifier: specifier.replace("*", wildcard), types: file });
    }
  }
  return entries.sort((a, b) => a.specifier.localeCompare(b.specifier));
}

function statementNameOf(stmt: ts.Statement): string | undefined {
  if (
    ts.isInterfaceDeclaration(stmt) ||
    ts.isTypeAliasDeclaration(stmt) ||
    ts.isFunctionDeclaration(stmt) ||
    ts.isClassDeclaration(stmt) ||
    ts.isEnumDeclaration(stmt) ||
    ts.isModuleDeclaration(stmt)
  ) {
    return stmt.name?.text;
  }
  if (ts.isVariableStatement(stmt)) {
    const decl = stmt.declarationList.declarations[0];
    return decl && ts.isIdentifier(decl.name) ? decl.name.text : undefined;
  }
  return undefined;
}

/**
 * Walk every `exports`-map `types` entry, resolve its re-exports, and follow
 * heritage clauses (`extends` / `implements`) and public-signature type
 * references (`TypeReferenceNode`, `TypeQueryNode`, `ImportTypeNode`) across
 * the `.d.ts` tree in `packageRoot` (Variant 1B).
 */
export async function collectImportableDeclarations(
  packageRoot: string,
  exportsMap: unknown,
  packageName = "material",
): Promise<{
  entries: DeclarationEntry[];
  program: ts.Program;
  checker: ts.TypeChecker;
  importableStatements: Set<ts.Statement>;
  declarations: ImportableDeclarationInfo[];
}> {
  const root = resolve(packageRoot);
  const entries = await declarationEntriesOf(exportsMap, root, packageName);
  const allFiles = await filesUnder(root);
  const dtsFiles = allFiles.filter(file => file.endsWith(".d.ts")).sort();
  const rootNames = [...new Set([
    ...entries.map(entry => join(root, entry.types)),
    ...dtsFiles.map(file => join(root, file)),
  ])];

  const program = ts.createProgram(rootNames, COMPILER_OPTIONS);
  const checker = program.getTypeChecker();

  const importableStatements = new Set<ts.Statement>();
  const specifierByStatement = new Map<ts.Statement, string>();
  const visitedSymbols = new Set<ts.Symbol>();
  const queue: Array<{ stmt: ts.Statement; specifier: string }> = [];

  const enclosingPackageStatement = (node: ts.Node): ts.Statement | undefined => {
    let cur: ts.Node | undefined = node;
    while (cur && (!cur.parent || !ts.isSourceFile(cur.parent))) {
      cur = cur.parent;
    }
    if (!cur || !ts.isStatement(cur)) return undefined;
    if (ts.isImportDeclaration(cur) || ts.isExportDeclaration(cur) || ts.isExportAssignment(cur)) {
      return undefined;
    }
    const sf = cur.getSourceFile();
    if (!resolve(sf.fileName).startsWith(`${root}/`)) return undefined;
    return cur;
  };

  const enqueueStatement = (stmt: ts.Statement, specifier: string): void => {
    if (importableStatements.has(stmt)) return;
    importableStatements.add(stmt);
    specifierByStatement.set(stmt, specifier);
    queue.push({ stmt, specifier });
  };

  const markSymbol = (sym: ts.Symbol | undefined, specifier: string): void => {
    if (!sym || visitedSymbols.has(sym)) return;
    visitedSymbols.add(sym);

    let target = sym;
    if (target.flags & ts.SymbolFlags.Alias) {
      try {
        target = checker.getAliasedSymbol(target);
      } catch {
        // Unresolvable external peer alias; keep original symbol.
      }
    }
    visitedSymbols.add(target);

    for (const decl of [...(sym.getDeclarations() ?? []), ...(target.getDeclarations() ?? [])]) {
      const stmt = enclosingPackageStatement(decl);
      if (stmt) enqueueStatement(stmt, specifier);
    }

    if (target.flags & (ts.SymbolFlags.ValueModule | ts.SymbolFlags.NamespaceModule)) {
      try {
        for (const member of checker.getExportsOfModule(target)) {
          markSymbol(member, specifier);
        }
      } catch {
        // Ignore external ambient module resolution errors.
      }
    }
  };

  const markEntityName = (name: ts.EntityName, specifier: string): void => {
    markSymbol(checker.getSymbolAtLocation(name), specifier);
    if (ts.isQualifiedName(name)) {
      markEntityName(name.left, specifier);
      markSymbol(checker.getSymbolAtLocation(name.right), specifier);
    }
  };

  for (const entry of entries) {
    const sf = program.getSourceFile(join(root, entry.types));
    if (!sf) continue;
    const modSym = checker.getSymbolAtLocation(sf);
    if (!modSym) continue;
    for (const exported of checker.getExportsOfModule(modSym)) {
      markSymbol(exported, entry.specifier);
    }
  }

  while (queue.length > 0) {
    const { stmt, specifier } = queue.shift()!;
    const visitRef = (node: ts.Node): void => {
      if (ts.isExpressionWithTypeArguments(node)) {
        markSymbol(checker.getSymbolAtLocation(node.expression), specifier);
      } else if (ts.isTypeReferenceNode(node)) {
        markEntityName(node.typeName, specifier);
      } else if (ts.isTypeQueryNode(node)) {
        markEntityName(node.exprName, specifier);
      } else if (ts.isImportTypeNode(node) && node.qualifier) {
        markEntityName(node.qualifier, specifier);
      }
      ts.forEachChild(node, visitRef);
    };
    visitRef(stmt);
  }

  const declarations: ImportableDeclarationInfo[] = [];
  for (const stmt of importableStatements) {
    const name = statementNameOf(stmt);
    if (!name) continue;
    const file = relative(root, resolve(stmt.getSourceFile().fileName)).replace(/\\/g, "/");
    declarations.push({
      file,
      name,
      statement: stmt,
      viaSpecifier: specifierByStatement.get(stmt) ?? packageName,
    });
  }
  declarations.sort((a, b) => a.file.localeCompare(b.file) || a.name.localeCompare(b.name));

  return { entries, program, checker, importableStatements, declarations };
}

function isDeprecatedJsDoc(comment: string): boolean {
  return /^\/\*\*(?!\/)/.test(comment) && /@deprecated\b/.test(comment);
}

function isJsDocComment(comment: string): boolean {
  return /^\/\*\*(?!\/)/.test(comment);
}

/**
 * Strip non-`@deprecated` JSDoc comments on declarations in `outdir` that are
 * not reachable from `exports` (nor referenced by the heritage clauses or
 * public signatures of any importable declaration).
 */
export async function stripInternalDeclarationDocs(
  outdir: string,
  exportsMap: unknown,
): Promise<StripInternalDocsResult> {
  const root = resolve(outdir);
  const { program, importableStatements } = await collectImportableDeclarations(root, exportsMap);
  const allFiles = await filesUnder(root);
  const dtsFiles = allFiles.filter(file => file.endsWith(".d.ts")).sort();

  let files = 0;
  let declarations = 0;
  let bytes = 0;

  for (const relPath of dtsFiles) {
    const absPath = join(root, relPath);
    const sf = program.getSourceFile(absPath);
    if (!sf) continue;

    const text = sf.getFullText();
    const toStrip = new Map<number, number>();
    let strippedInFile = 0;

    for (const stmt of sf.statements) {
      if (importableStatements.has(stmt)) continue;
      if (ts.isImportDeclaration(stmt) || ts.isExportDeclaration(stmt) || ts.isExportAssignment(stmt)) continue;

      let stmtHadStrippedJsDoc = false;
      const collectComments = (node: ts.Node): void => {
        for (const range of ts.getLeadingCommentRanges(text, node.pos) ?? []) {
          const comment = text.slice(range.pos, range.end);
          if (isJsDocComment(comment) && !isDeprecatedJsDoc(comment)) {
            toStrip.set(range.pos, range.end);
            stmtHadStrippedJsDoc = true;
          }
        }
        node.getChildren(sf).forEach(collectComments);
      };
      collectComments(stmt);
      if (stmtHadStrippedJsDoc) strippedInFile += 1;
    }

    if (toStrip.size === 0) continue;

    let updated = text;
    for (const [start, end] of [...toStrip.entries()].sort(([a], [b]) => b - a)) {
      updated = updated.slice(0, start) + updated.slice(start, end).replace(/[^\r\n]/g, " ") + updated.slice(end);
    }
    const printed = ts.createPrinter().printFile(
      ts.createSourceFile(absPath, updated, ts.ScriptTarget.Latest, true),
    );
    if (printed === text) continue;

    await writeFile(absPath, printed);
    files += 1;
    declarations += strippedInFile;
    bytes += Buffer.byteLength(text, "utf8") - Buffer.byteLength(printed, "utf8");
  }

  return { files, declarations, bytes };
}

interface ExtractedStatementDocs {
  summaries: Set<string>;
  members: Map<string, Set<string>>;
}

function normalizeJsDoc(comment: string): string {
  return comment.replace(/\r\n/g, "\n").replace(/\s+/g, " ").trim();
}

function shippedJsDocFor(rawComment: string, isSourceTs: boolean): string {
  if (!isJsDocComment(rawComment)) return "";
  if (!isSourceTs) return rawComment;
  const probed = printDeclarationModule("probe.d.ts", `${rawComment}\nexport type Probe = unknown;\n`);
  const match = /^\/\*\*[\s\S]*?\*\//.exec(probed.trim());
  return match ? match[0] : "";
}

function leadingJsDocsOf(node: ts.Node, text: string, isSourceTs: boolean): string[] {
  const docs: string[] = [];
  for (const range of ts.getLeadingCommentRanges(text, node.pos) ?? []) {
    const shipped = shippedJsDocFor(text.slice(range.pos, range.end), isSourceTs);
    if (shipped) docs.push(shipped);
  }
  return docs;
}

function memberNameOf(node: ts.Node): string | undefined {
  if (
    ts.isPropertySignature(node) ||
    ts.isMethodSignature(node) ||
    ts.isPropertyDeclaration(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node) ||
    ts.isEnumMember(node) ||
    ts.isPropertyAssignment(node)
  ) {
    const name = node.name;
    if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
      return name.text;
    }
  }
  return undefined;
}

function hasPrivateModifier(node: ts.Node): boolean {
  if (!ts.canHaveModifiers(node)) return false;
  return (ts.getModifiers(node) ?? []).some(
    mod => mod.kind === ts.SyntaxKind.PrivateKeyword,
  );
}

function extractDocsInStatement(
  stmt: ts.Statement,
  sf: ts.SourceFile,
  text: string,
  isSourceTs: boolean,
  target: ExtractedStatementDocs,
): void {
  // Skip implementation signature of overloaded functions in .ts source files.
  if (isSourceTs && ts.isFunctionDeclaration(stmt) && stmt.body) {
    const name = stmt.name?.text;
    const hasOverloads = name !== undefined && sf.statements.some(
      other => other !== stmt && ts.isFunctionDeclaration(other) && other.name?.text === name && !other.body,
    );
    if (hasOverloads) return;
  }

  for (const doc of leadingJsDocsOf(stmt, text, isSourceTs)) {
    target.summaries.add(normalizeJsDoc(doc));
  }

  const visitMembers = (node: ts.Node): void => {
    if (hasPrivateModifier(node)) return;
    const memberName = memberNameOf(node);
    if (memberName) {
      for (const doc of leadingJsDocsOf(node, text, isSourceTs)) {
        let set = target.members.get(memberName);
        if (!set) {
          set = new Set<string>();
          target.members.set(memberName, set);
        }
        set.add(normalizeJsDoc(doc));
      }
    }
    // Do not descend into runtime function/method bodies in .ts source files.
    if (ts.isFunctionLike(node) && "body" in node && node.body) {
      for (const child of node.getChildren(sf)) {
        if (child !== node.body) visitMembers(child);
      }
      return;
    }
    // When a VariableDeclaration in .ts has an explicit type annotation, tsc
    // emits the type annotation rather than the initializer literal.
    if (isSourceTs && ts.isVariableDeclaration(node) && node.type && node.initializer) {
      visitMembers(node.name);
      visitMembers(node.type);
      return;
    }
    for (const child of node.getChildren(sf)) {
      visitMembers(child);
    }
  };

  for (const child of stmt.getChildren(sf)) {
    visitMembers(child);
  }
}

function extractFileDocs(filePath: string, text: string): Map<string, ExtractedStatementDocs> {
  const isSourceTs = !filePath.endsWith(".d.ts");
  const sf = ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true);
  const byName = new Map<string, ExtractedStatementDocs>();

  for (const stmt of sf.statements) {
    const name = statementNameOf(stmt);
    if (!name) continue;
    let entry = byName.get(name);
    if (!entry) {
      entry = { summaries: new Set<string>(), members: new Map<string, Set<string>>() };
      byName.set(name, entry);
    }
    extractDocsInStatement(stmt, sf, text, isSourceTs, entry);
  }
  return byName;
}

function resolveReferenceFile(declFile: string, referenceRoot: string): string | undefined {
  const relInsideDist = declFile.replace(/^dist\//, "");
  const candidates = [
    join(referenceRoot, declFile),
    join(referenceRoot, relInsideDist),
    join(referenceRoot, relInsideDist.replace(/\.d\.ts$/, ".ts")),
    ...(relInsideDist === "ssr/index.d.ts" ? [join(referenceRoot, "ssr/render-element.ts")] : []),
  ];
  return candidates.find(candidate => existsSync(candidate));
}

/**
 * Verify that every declaration reachable from `package.json` `exports`
 * (including barrel re-exports, heritage base interfaces, and signature-referenced
 * option types) preserves all JSDoc comments emitted from its reference source.
 */
export async function assertImportableDeclarationDocs(
  packageRoot: string,
  referenceRoot: string,
  exportsMap?: unknown,
): Promise<string[]> {
  const root = resolve(packageRoot);
  const refRoot = resolve(referenceRoot);
  const manifest = exportsMap
    ? { name: "material", exports: exportsMap }
    : await Bun.file(join(root, "package.json")).json() as { name?: string; exports?: unknown };

  const { declarations } = await collectImportableDeclarations(
    root,
    manifest.exports,
    manifest.name ?? "material",
  );

  const refDocsCache = new Map<string, Map<string, ExtractedStatementDocs>>();
  const packedDocsCache = new Map<string, Map<string, ExtractedStatementDocs>>();
  const failures: string[] = [];

  for (const decl of declarations) {
    const refFile = resolveReferenceFile(decl.file, refRoot);
    if (!refFile) continue;

    let refFileDocs = refDocsCache.get(refFile);
    if (!refFileDocs) {
      refFileDocs = extractFileDocs(refFile, await readFile(refFile, "utf8"));
      refDocsCache.set(refFile, refFileDocs);
    }
    const expected = refFileDocs.get(decl.name);
    if (!expected) continue;

    const packedFile = join(root, decl.file);
    let packedFileDocs = packedDocsCache.get(packedFile);
    if (!packedFileDocs) {
      packedFileDocs = extractFileDocs(packedFile, await readFile(packedFile, "utf8"));
      packedDocsCache.set(packedFile, packedFileDocs);
    }
    const actual = packedFileDocs.get(decl.name);

    for (const expectedSummary of expected.summaries) {
      if (!actual || !actual.summaries.has(expectedSummary)) {
        failures.push(
          `${decl.file}#${decl.name} (reachable from ${decl.viaSpecifier}): ` +
            `importable declaration lost its JSDoc ${JSON.stringify(expectedSummary)}`,
        );
      }
    }

    for (const [memberName, expectedMemberDocs] of expected.members) {
      const actualMemberDocs = actual?.members.get(memberName);
      for (const expectedDoc of expectedMemberDocs) {
        if (!actualMemberDocs || !actualMemberDocs.has(expectedDoc)) {
          failures.push(
            `${decl.file}#${decl.name}.${memberName} (reachable from ${decl.viaSpecifier}): ` +
              `importable member lost its JSDoc ${JSON.stringify(expectedDoc)}`,
          );
        }
      }
    }
  }

  return failures;
}
