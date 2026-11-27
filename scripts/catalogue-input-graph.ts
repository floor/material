import { createHash } from "node:crypto";
import { relative, resolve, sep } from "node:path";
import postcss from "postcss";
import ts from "typescript";

type MemberInputs = Map<string, Set<string>>;

export interface CatalogueInputGraph {
  members: MemberInputs;
  addedMembers: MemberInputs;
  sourceOutputs: Map<string, Map<string, string>>;
}

export interface CatalogueInputReceipt {
  members: Record<string, string[]>;
  addedMembers: Record<string, string[]>;
  sourceOutputs: Record<string, Record<string, string>>;
}

export function createCatalogueGraph(): CatalogueInputGraph {
  return { members: new Map(), addedMembers: new Map(), sourceOutputs: new Map() };
}

const sourcePath = (path: string): string =>
  relative(process.cwd(), resolve(path)).split(sep).join("/");

export function recordCatalogueInputs(graph: MemberInputs, member: string, inputs: Iterable<string>): void {
  const sources = graph.get(member) ?? new Set<string>();
  for (const input of inputs) {
    const source = sourcePath(input);
    if (source.startsWith("src/")) sources.add(source);
  }
  if (sources.size) graph.set(member, sources);
}

const printer = ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed });

/** Type-only import order has no effect on the declaration surface. */
function typeImport(node: ts.Statement): ts.ImportDeclaration | undefined {
  if (!ts.isImportDeclaration(node)) return;
  const clause = node.importClause;
  if (!clause) return;
  const bindings = clause.namedBindings;
  const named = bindings && ts.isNamedImports(bindings) ? bindings : undefined;
  if (!clause.isTypeOnly && (!named || clause.name || !named.elements.length || !named.elements.every(element => element.isTypeOnly))) return;
  if (!named) return node;
  const elements = [...named.elements].sort((a, b) => a.name.text.localeCompare(b.name.text));
  return ts.factory.updateImportDeclaration(node, node.modifiers,
    ts.factory.updateImportClause(clause, clause.isTypeOnly, clause.name, ts.factory.updateNamedImports(named, elements)),
    node.moduleSpecifier, node.attributes);
}

function normalizedOutput(member: string, text: string): string {
  if (member.endsWith(".css")) {
    const css = postcss.parse(text);
    css.walkComments(comment => { comment.remove(); });
    return css.toString();
  }
  const file = ts.createSourceFile(member, text, ts.ScriptTarget.Latest, true);
  const imports: string[] = [];
  const statements: string[] = [];
  for (const statement of file.statements) {
    const typeOnly = typeImport(statement);
    (typeOnly ? imports : statements).push(printer.printNode(ts.EmitHint.Unspecified, typeOnly ?? statement, file));
  }
  return JSON.stringify([imports.sort(), statements]);
}

/** Record each source's own emitted bytes before shared output is assembled. */
export function recordCatalogueSourceOutput(graph: CatalogueInputGraph, output: string, source: string, text: string): void {
  const path = sourcePath(source);
  if (!path.startsWith("src/")) return;
  const byOutput = graph.sourceOutputs.get(path) ?? new Map<string, string>();
  byOutput.set(output, createHash("sha256").update(normalizedOutput(output, text)).digest("hex"));
  graph.sourceOutputs.set(path, byOutput);
}

export function catalogueInputReceipt(graph: CatalogueInputGraph): CatalogueInputReceipt {
  const inputs = (map: MemberInputs) => Object.fromEntries([...map].map(([key, paths]) => [key, [...paths].sort()]));
  return {
    members: inputs(graph.members),
    addedMembers: inputs(graph.addedMembers),
    sourceOutputs: Object.fromEntries([...graph.sourceOutputs].map(([source, outputs]) =>
      [source, Object.fromEntries([...outputs].sort(([a], [b]) => a.localeCompare(b)))])),
  };
}
