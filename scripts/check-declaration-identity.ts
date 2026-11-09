/** A reference-aware identity proof for a declaration-only package rewrite. */
import ts from "typescript";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
function files(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(join(root, e.name)) : [join(root, e.name)]);
}
function load(root: string, dependencyRoot: string) {
  const options: ts.CompilerOptions = { strict: true, noEmit: true, skipLibCheck: false, types: [], module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, target: ts.ScriptTarget.ES2022 };
  const host = ts.createCompilerHost(options);
  host.resolveModuleNames = (names, containing) => names.map(name => ts.resolveModuleName(name, containing, options, host).resolvedModule ?? (!name.startsWith('.') ? ts.resolveModuleName(name, join(dependencyRoot, 'consumer.ts'), options, host).resolvedModule : undefined));
  const program = ts.createProgram(files(root).filter(f => f.endsWith('.d.ts')), options, host);
  const errors = program.getSyntacticDiagnostics();
  if (errors.length)
    throw Error(ts.flattenDiagnosticMessageText(errors[0].messageText, " "));
  return { root: resolve(root), program, checker: program.getTypeChecker() };
}
type World = ReturnType<typeof load>;
function symbol(w: World, s: ts.Symbol | undefined): ts.Symbol {
  if (!s)
    throw Error('Unresolved symbol');
  if (s.flags & ts.SymbolFlags.Alias)
    s = w.checker.getAliasedSymbol(s);
  if (!s.declarations?.length)
    throw Error(`Unresolved alias ${s.name}`);
  return s;
}
function endpoints(w: World) {
  const manifest = JSON.parse(readFileSync(join(w.root, 'package.json'), 'utf8'));
  const result = new Map<string, {
    names: Map<string, ts.Symbol>;
    values: string[];
  }>();
  const localfiles = files(w.root).map(f => relative(w.root, f));
  for (const [key, value] of Object.entries(manifest.exports) as [
    string,
    string | {
      types?: string;
      import?: string;
    }
  ][]) {
    const types = typeof value === 'string' ? value.endsWith('.d.ts') ? value : undefined : value.types;
    if (!types)
      continue;
    let entries: [
      string,
      string
    ][] = [];
    if (!key.includes('*'))
      entries = [[key, types.replace(/^\.\//, '')]];
    else {
      const pattern = types.includes('*') ? types : typeof value === 'string' ? value : value.import;
      if (!pattern?.includes('*'))
        throw Error(`Cannot enumerate wildcard ${key}`);
      const [prefix, suffix] = pattern.replace(/^\.\//, '').split('*');
      for (const file of localfiles)
        if (file.startsWith(prefix) && file.endsWith(suffix)) {
          const part = file.slice(prefix.length, file.length - suffix.length);
          entries.push([key.replace('*', part), types.replace(/^\.\//, '').replace('*', part)]);
        }
    }
    for (const [entry, file] of entries) {
      const source = w.program.getSourceFile(join(w.root, file));
      if (!source)
        throw Error(`Missing entry ${entry}`);
      const module = w.checker.getSymbolAtLocation(source);
      if (!module)
        throw Error(`Not a module: ${entry}`);
      result.set(entry, { names: new Map(w.checker.getExportsOfModule(module).map(s => [s.name, symbol(w, s)])), values: w.checker.getPropertiesOfType(w.checker.getTypeOfSymbolAtLocation(module, source)).map(s => s.name).sort() });
    }
  }
  return result;
}
class Proof {
  readonly forward = new Map<ts.Symbol, ts.Symbol>();
  readonly reverse = new Map<ts.Symbol, ts.Symbol>();
  refs = 0;
  pairs = 0;
  constructor(readonly before: World, readonly after: World) { }
  fail(path: string, why: string): never { throw Error(`${path}: ${why}`); }
  compare(a: ts.Symbol, b: ts.Symbol, path: string): void {
    a = symbol(this.before, a);
    b = symbol(this.after, b);
    this.refs++;
    const known = this.forward.get(a), rev = this.reverse.get(b);
    if (known || rev) {
      if (known !== b || rev !== a)
        this.fail(path, 'symbol identity is not one-to-one');
      return;
    }
    this.forward.set(a, b);
    this.reverse.set(b, a);
    this.pairs++;
    if ((a.flags & (ts.SymbolFlags.Type | ts.SymbolFlags.Value | ts.SymbolFlags.Namespace)) !== (b.flags & (ts.SymbolFlags.Type | ts.SymbolFlags.Value | ts.SymbolFlags.Namespace)))
      this.fail(path, 'symbol meaning changed');
    let ad = a.declarations!, bd = b.declarations!;
    const external = (w: World, d: ts.Declaration) => !d.getSourceFile().fileName.startsWith(w.root + '/');
    const ae = ad.filter(d => external(this.before, d)), be = bd.filter(d => external(this.after, d));
    const signature = (ds: readonly ts.Declaration[]) => ds.map(d => [resolve(d.getSourceFile().fileName), d.kind, d.pos, d.getText()]);
    if (JSON.stringify(signature(ae)) !== JSON.stringify(signature(be)))
      this.fail(path, 'external declaration identity changed');
    ad = ad.filter(d => !external(this.before, d));
    bd = bd.filter(d => !external(this.after, d));
    if (ad.length || bd.length) {
      const documentation = (w: World, s: ts.Symbol) => ({
        text: ts.displayPartsToString(s.getDocumentationComment(w.checker)),
        tags: s.getJsDocTags(w.checker).map(tag => ({ name: tag.name, text: ts.displayPartsToString(tag.text) })),
      });
      if (JSON.stringify(documentation(this.before, a)) !== JSON.stringify(documentation(this.after, b)))
        this.fail(path, "documentation or JSDoc tags changed");
    }
    if (ad.length !== bd.length)
      this.fail(path, `declaration count ${ad.length} -> ${bd.length}`);
    const sorted = (ds: readonly ts.Declaration[]) => {
      if (ds.length < 2 || !ds.every(ts.isInterfaceDeclaration))
        return [...ds];
      const keys = new Set<string>();
      for (const d of ds as ts.InterfaceDeclaration[])
        for (const member of d.members) {
          if (!ts.isPropertySignature(member) || !member.name || ts.isComputedPropertyName(member.name))
            this.fail(path, 'cannot reorder merged overloads or computed members');
          const k = member.name.getText();
          if (keys.has(k))
            this.fail(path, 'cannot reorder repeated interface member ' + k);
          keys.add(k);
        }
      return [...ds].sort((x, y) => { const key = (n: ts.Declaration) => (n as ts.InterfaceDeclaration).members.map(m => m.name!.getText()).join('\0'); return key(x).localeCompare(key(y)); });
    };
    ad = sorted(ad);
    bd = sorted(bd);
    for (let i = 0; i < ad.length; i++) {
      if (ts.isVariableDeclaration(ad[i]) && ts.isVariableDeclaration(bd[i]) && ad[i].parent.flags !== bd[i].parent.flags)
        this.fail(path, 'variable binding flags changed');
      this.node(ad[i], bd[i], path + `/declaration[${i}]`, ad[i], bd[i]);
    }
  }
  node(a: ts.Node, b: ts.Node, path: string, ar: ts.Node, br: ts.Node): void {
    const reference = (w: World, n: ts.Node): {
      s: ts.Symbol;
      args: readonly ts.TypeNode[];
      kind: string;
    } | undefined => {
      if (ts.isTypeReferenceNode(n))
        return { s: symbol(w, w.checker.getSymbolAtLocation(n.typeName)), args: n.typeArguments ?? [], kind: 'type' };
      if (ts.isExpressionWithTypeArguments(n))
        return { s: symbol(w, w.checker.getSymbolAtLocation(n.expression)), args: n.typeArguments ?? [], kind: 'heritage' };
      if (ts.isTypeQueryNode(n))
        return { s: symbol(w, w.checker.getSymbolAtLocation(n.exprName)), args: n.typeArguments ?? [], kind: 'typeof' };
      if (ts.isImportTypeNode(n)) {
        if (!n.qualifier)
          throw Error(path + ': unqualified import type is unsupported');
        if (n.attributes)
          throw Error(path + ': import attributes are unsupported');
        return { s: symbol(w, w.checker.getSymbolAtLocation(n.qualifier)), args: n.typeArguments ?? [], kind: n.isTypeOf ? 'typeof' : 'type' };
      }
    };
    let ra, rb;
    try {
      ra = reference(this.before, a);
      rb = reference(this.after, b);
    }
    catch (e) {
      this.fail(path, String(e));
    }
    if (ra || rb) {
      if (!ra || !rb || ra.kind !== rb.kind || ra.args.length !== rb.args.length)
        this.fail(path, 'reference shape changed');
      this.compare(ra.s, rb.s, path + '/reference');
      for (let i = 0; i < ra.args.length; i++)
        this.node(ra.args[i], rb.args[i], path + `/arg[${i}]`, ar, br);
      return;
    }
    if (a.kind !== b.kind)
      this.fail(path, `${ts.SyntaxKind[a.kind]} -> ${ts.SyntaxKind[b.kind]}`);
    // Only the binding of the paired declaration can be alpha-renamed. Property,
    // parameter and type-parameter spellings elsewhere stay exact.
    const isName = (n: ts.Node, r: ts.Node) => 'name' in r && (r as ts.NamedDeclaration).name === n;
    if (isName(a, ar) && isName(b, br))
      return;
    const children = (n: ts.Node, root: ts.Node) => n.getChildren().filter(c => c.parent !== root || ![ts.SyntaxKind.ExportKeyword, ts.SyntaxKind.DeclareKeyword, ts.SyntaxKind.DefaultKeyword].includes(c.kind));
    const ac = children(a, ar), bc = children(b, br);
    if (!ac.length && !bc.length) {
      if (a.getText() !== b.getText())
        this.fail(path, `token ${a.getText()} -> ${b.getText()}`);
      return;
    }
    // A modifier SyntaxList left empty by stripping export/declare is insignificant.
    const trim = (xs: ts.Node[], root: ts.Node) => xs.filter(c => c.kind !== ts.SyntaxKind.SyntaxList || children(c, root).length > 0);
    const ax = trim(ac, ar), bx = trim(bc, br);
    if (ax.length !== bx.length)
      this.fail(path, `child count ${ax.length} -> ${bx.length} at ${ts.SyntaxKind[a.kind]}`);
    for (let i = 0; i < ax.length; i++)
      this.node(ax[i], bx[i], path + '/' + ts.SyntaxKind[ax[i].kind] + `[${i}]`, ar, br);
  }
}
/**
 * Prove the declaration graph reachable through every concrete public entry.
 * References resolve with the TypeScript checker, then pair one-to-one and
 * recursively compare declaration ASTs. Private binding names may change, and
 * qualified import types may become local references to the same paired symbol.
 * Merged interfaces may reorder only disjoint, noncomputed property signatures;
 * overload order and every member's tokens remain exact. External declarations
 * keep their actual source identity; package augmentations are checked separately.
 * Type-only exports, type/value meanings, generic arguments, optional/readonly
 * tokens, documentation/JSDoc tags and private/nominal symbol distinctions are retained. Unsupported or
 * unresolved references fail closed rather than being treated as equal text.
 */
export function compareDeclarationIdentity(beforeRoot: string, afterRoot: string, dependencyRoot = resolve(import.meta.dir, "..")): {
  entries: number;
  exports: number;
  pairs: number;
  references: number;
} {
  const before = load(resolve(beforeRoot), dependencyRoot), after = load(resolve(afterRoot), dependencyRoot);
  const a = endpoints(before), b = endpoints(after), proof = new Proof(before, after);
  let exports = 0;
  if (JSON.stringify([...a.keys()].sort()) !== JSON.stringify([...b.keys()].sort()))
    throw Error('Entry set changed');
  for (const [entry, { names, values }] of a) {
    const next = b.get(entry)!;
    if (JSON.stringify([...names.keys()].sort()) !== JSON.stringify([...next.names.keys()].sort()))
      throw Error(entry + ' export set changed');
    if (JSON.stringify(values) !== JSON.stringify(next.values))
      throw Error(entry + ' value export set changed');
    for (const [name, s] of names) {
      exports++;
      proof.compare(s, next.names.get(name)!, entry + ' ' + name);
    }
  }
  return { entries: a.size, exports, pairs: proof.pairs, references: proof.refs };
}
if (import.meta.main) {
  const [before, after] = process.argv.slice(2);
  if (!before || !after)
    throw Error('Usage: bun scripts/check-declaration-identity.ts <before-package> <after-package>');
  console.log(JSON.stringify(compareDeclarationIdentity(before, after), null, 2));
}
