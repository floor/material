/**
 * Resolving an export's deprecation through its declaration.
 *
 * An index re-exports names declared elsewhere. TypeScript's JSDoc lookup on
 * the alias symbol sees only the export statement; a consumer reading the
 * declaration sees the tag written there. The pins record what a consumer
 * sees, so both places are read, the export statement first: a root name
 * leaving for a subpath writes its path on the statement, and that note has to
 * keep precedence over anything on the declaration.
 */
import ts from "typescript";

export type Deprecation = {
  /** The @deprecated text, empty for a bare tag */
  note: string;
  /** export: on the re-export statement; declaration: on the declaration it aliases */
  where: "export" | "declaration";
};

/** The @deprecated notes on a symbol's own declarations, in declaration order */
const notesOn = (symbol: ts.Symbol): string[] =>
  (symbol.declarations ?? [])
    .flatMap((declaration) => ts.getJSDocTags(declaration))
    .filter((tag) => tag.tagName.text === "deprecated")
    .map((tag) => ts.getTextOfJSDocComment(tag.comment) ?? "");

/** An export's deprecation: the export statement's tag, else the aliased declaration's */
export function deprecationOf(checker: ts.TypeChecker, symbol: ts.Symbol): Deprecation | undefined {
  const own = notesOn(symbol)[0];
  if (own !== undefined) return { note: own, where: "export" };
  const target = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
  if (target === symbol) return undefined;
  const declared = notesOn(target)[0];
  return declared === undefined ? undefined : { note: declared, where: "declaration" };
}
