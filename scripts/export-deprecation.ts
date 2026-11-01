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

/** The @deprecated tag on a symbol's own declarations, and the kind of declaration it sits on */
const tagOn = (symbol: ts.Symbol): Deprecation | undefined => {
  for (const declaration of symbol.declarations ?? []) {
    const tag = ts.getJSDocTags(declaration).find((t) => t.tagName.text === "deprecated");
    if (!tag) continue;
    // An export statement's specifier says why this export goes; anywhere else it is the declaration itself
    return { note: ts.getTextOfJSDocComment(tag.comment) ?? "", where: ts.isExportSpecifier(declaration) ? "export" : "declaration" };
  }
  return undefined;
};

/** An export's deprecation: the export statement's tag, else the declaration's */
export function deprecationOf(checker: ts.TypeChecker, symbol: ts.Symbol): Deprecation | undefined {
  const own = tagOn(symbol);
  if (own) return own;
  // An `export *` chain hands back the declaration's own symbol, with no alias to follow
  const target = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
  if (target === symbol) return undefined;
  return tagOn(target);
}
