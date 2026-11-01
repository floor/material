// scripts/docs-imports.ts
/**
 * The imports of the package that this repository documents.
 *
 * Documentation is compiled from two places:
 *
 * - the fenced code of every tracked Markdown file, except CHANGELOG.md (one
 *   release's history: an import there is what that release said, and it is
 *   never rewritten) and the fixtures under test/ and scripts/ (test data, and
 *   a generated table, not documentation);
 * - every `@example` block of a tracked file under src/.
 *
 * Only the import statements come back, not the examples around them: an
 * example is usually a fragment (`items: [...]`), and what it demonstrates is
 * the subject of its own checks. check-docs-imports.ts compiles each statement
 * against the packed package.
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

/** Not documentation: a release's history, and the fixtures (test data and a generated table). */
const NOT_DOCUMENTATION = [/^CHANGELOG\.md$/, /^test\/fixtures\//, /^scripts\/fixtures\//];

/** A statement's specifier: `import … from "<specifier>"`, or a side-effect `import "<specifier>"`. */
const FROM = /from\s*['"]([^'"]+)['"]/;
const SIDE_EFFECT = /^\s*import\s*['"]([^'"]+)['"]/;

export interface DocImport {
  /** The repository-relative file the statement is documented in */
  file: string;
  /** 1-based line of the statement's first line */
  line: number;
  /** The specifier it imports: the package, or one of its subpaths */
  specifier: string;
  /** The statement, as written */
  statement: string;
}

/**
 * The import statements of a stretch of code, one per statement. An import may
 * continue on the lines below it — a name list across lines — so the statement
 * runs until its `from "<specifier>"` or the end of its `;`.
 */
export function importsIn(code: string, file: string, firstLine: number): DocImport[] {
  const lines = code.split("\n");
  const imports: DocImport[] = [];
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]!;
    if (!/^\s*import\b/.test(line)) continue;
    const start = index;
    let statement = line;
    let specifier = SIDE_EFFECT.exec(line)?.[1] ?? FROM.exec(statement)?.[1];
    while (specifier === undefined && index + 1 < lines.length && !/;\s*$/.test(lines[index]!) && index - start < 20) {
      index += 1;
      statement += `\n${lines[index]}`;
      specifier = FROM.exec(statement)?.[1];
    }
    if (specifier === undefined) continue;
    imports.push({ file, line: firstLine + start, specifier, statement: statement.trim() });
  }
  return imports;
}

/** The imports of the fenced code blocks of a Markdown document, in order. */
export function markdownImports(text: string, file: string): DocImport[] {
  const lines = text.split("\n");
  const imports: DocImport[] = [];
  for (let index = 0; index < lines.length; index++) {
    const open = /^```[^`]*$/.exec(lines[index]!);
    if (!open) continue;
    const start = index + 1;
    let end = start;
    while (end < lines.length && !/^```\s*$/.test(lines[end]!)) end += 1;
    imports.push(...importsIn(lines.slice(start, end).join("\n"), file, start + 1));
    index = end;
  }
  return imports;
}

/** The imports of every `@example` block of a TypeScript source, in order. */
export function jsdocImports(source: string, file: string): DocImport[] {
  const lines = source.split("\n");
  const imports: DocImport[] = [];
  for (let index = 0; index < lines.length; index++) {
    const tag = /@example\b/.exec(lines[index]!);
    if (!tag) continue;
    // The example starts on the tag's line (usually empty) and runs to the
    // comment's end or the next example. `* ` leads each line of a block
    // comment and is not code.
    const code = [lines[index]!.slice(tag.index + tag[0].length).split("*/")[0]!];
    for (let end = index + 1; end < lines.length; end++) {
      if (lines[end]!.includes("*/") || /@example\b/.test(lines[end]!)) break;
      code.push(lines[end]!.replace(/^\s*\* ?/, ""));
    }
    imports.push(...importsIn(code.join("\n"), file, index + 1));
  }
  return imports;
}

/** The imports that name the package or one of its subpaths. */
export const packageImports = (imports: DocImport[], name: string): DocImport[] =>
  imports.filter((item) => item.specifier === name || item.specifier.startsWith(`${name}/`));

/**
 * The file a side-effect import of an installed package resolves to, or
 * undefined when the package's exports name no such target.
 *
 * TypeScript leaves an unresolved side-effect import alone unless
 * noUncheckedSideEffectImports is on, and the stylesheet exports ship no
 * declarations for that option to accept, so check-docs-imports.ts resolves
 * these specifiers itself.
 */
export function sideEffectTarget(specifier: string, importer: string): string | undefined {
  try {
    const target = Bun.resolveSync(specifier, importer);
    return existsSync(target) ? target : undefined;
  } catch {
    return undefined;
  }
}

export interface DocumentedImports {
  /** Every documented import of the package, in file order */
  imports: DocImport[];
  /** The Markdown files read, repository-relative */
  documents: string[];
  /** The sources read, repository-relative */
  sources: string[];
}

/** Every documented import of `name` in the repository at `root`. */
export async function documentedImports(root: string, name: string): Promise<DocumentedImports> {
  // The repository is its tracked files: dist/, node_modules/ and analysis/
  // are not documentation.
  const tracked = execFileSync("git", ["-C", root, "ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
  const documents = tracked.filter((file) => file.endsWith(".md") && !NOT_DOCUMENTATION.some((pattern) => pattern.test(file)));
  const sources = tracked.filter((file) => file.startsWith("src/") && file.endsWith(".ts"));
  const imports: DocImport[] = [];
  for (const file of documents) {
    imports.push(...markdownImports(await Bun.file(`${root}/${file}`).text(), file));
  }
  for (const file of sources) {
    imports.push(...jsdocImports(await Bun.file(`${root}/${file}`).text(), file));
  }
  return { imports: packageImports(imports, name), documents, sources };
}
