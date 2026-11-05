import ts from "typescript";
import { readdir, readFile, rmdir, stat, unlink, writeFile } from "node:fs/promises";
import { join, posix, resolve } from "node:path";
import { exportTargets } from "./prune-declarations";

/**
 * Fold the internal declaration modules into the exported barrels.
 *
 * The compiler emits a declaration per source module and the package ships
 * every one an exported declaration reaches, so a consumer's editor loads and
 * the tarball carries hundreds of small `.d.ts` files. The `exports` map is the
 * module boundary: a consumer can only import an entry, and an entry's types
 * target is a barrel (`index.d.ts`) or one named declaration. Everything a
 * barrel reaches and nothing else imports is therefore private to that barrel
 * and can live inside it.
 *
 * This pass replaces each such private module with its declarations appended to
 * the deepest exported barrel whose directory contains it, rewrites the
 * references that crossed a barrel, and deletes the folded files. A declaration
 * keeps its name unless another declaration in the same barrel already uses it;
 * a barrel keeps exactly the exported names it had. When another barrel needs a
 * declaration no barrel exports, the declaring module keeps its own file
 * instead of the barrel gaining a name, so the public surface is unchanged. The
 * pass verifies that against the TypeScript checker before the build moves on.
 */

const DTS = ".d.ts";

interface DeclaredName {
  name: string;
  kind: "type" | "value";
  statement: ts.Statement;
  nameNode: ts.Node;
}

interface ImportBinding {
  /** The name the file uses. */
  local: string;
  /** The name the target module exports; `*` for a namespace import. */
  imported: string;
  /** The specifier as written. */
  specifier: string;
  /** The shipped declaration file the specifier names, when it is relative. */
  target?: string;
  typeOnly: boolean;
}

interface ModuleFile {
  path: string;
  text: string;
  source: ts.SourceFile;
  imports: ImportBinding[];
  /** Top-level declarations by name; a name repeats for an overload set. */
  declared: Map<string, DeclaredName[]>;
}

/** Where a public name comes from: a declaration in the barrel, or another module. */
interface ExportItem {
  name: string;
  local?: { file: string; name: string };
  reexport?: { importer: string; specifier: string; target?: string; imported: string };
  typeOnly: boolean;
}

/** An `export *` a barrel keeps, or a member star that resolves inside the barrel. */
interface StarRef {
  importer: string;
  specifier: string;
  target?: string;
}

interface ExportsOf {
  items: Map<string, ExportItem>;
  /** Star targets outside the barrel, in the order written. */
  stars: StarRef[];
}

/** An import the merged barrel must keep. */
interface KeptImport {
  local: string;
  imported: string;
  specifier: string;
  typeOnly: boolean;
  namespace: boolean;
}

export interface ConsolidateResult {
  /** Barrels that absorbed at least one private module. */
  groups: number;
  /** Private declaration files folded into their barrel. */
  merged: number;
  /** Package-relative paths removed, sorted. */
  removed: string[];
  /** Their total size in bytes. */
  bytes: number;
  /** Private modules kept on disk so no barrel gains an export, sorted. */
  kept: string[];
}

class Consolidation {
  private readonly modules = new Map<string, ModuleFile>();
  private readonly targets = new Set<string>();
  private readonly barrelDirs: string[] = [];
  private readonly groups = new Map<string, string[]>();
  private readonly exportsCache = new Map<string, ExportsOf>();
  /** target file -> exported name -> the file that declares it. */
  private before = new Map<string, Map<string, string>>();
  /** The names the default library declares, which the merged barrel must not shadow. */
  private globals = new Set<string>();
  /** `${file}\0${name}` -> the module or barrel another declaration imports it from. */
  private readonly routes = new Map<string, string>();
  /** Private modules that keep their file so no barrel gains an export. */
  private readonly kept = new Set<string>();
  private readonly files: Set<string>;

  constructor(
    private readonly root: string,
    files: Set<string>,
    exports: unknown,
  ) {
    this.files = files;
    for (const target of exportTargets(exports)) {
      if (!target.startsWith("./")) throw new Error(`exports target is not package-relative: ${target}`);
      const path = target.slice(2);
      if (path.includes("*")) {
        const pattern = new RegExp(`^${path.split("*").map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*")}$`);
        for (const file of files) if (pattern.test(file) && file.endsWith(DTS)) this.targets.add(file);
      } else if (path.endsWith(DTS)) {
        this.targets.add(path);
      }
    }
    for (const file of this.targets) if (file.endsWith("/index.d.ts")) this.barrelDirs.push(file);
    this.barrelDirs.sort((a, b) => b.length - a.length);
  }

  async load(): Promise<void> {
    for (const path of this.files) {
      if (!path.endsWith(DTS)) continue;
      const text = await readFile(join(this.root, path), "utf8");
      this.modules.set(path, parseModule(path, text));
    }
    for (const module of this.modules.values()) {
      for (const binding of module.imports) {
        if (binding.specifier.startsWith(".")) binding.target = this.resolve(module.path, binding.specifier);
      }
    }
  }

  /** The exported barrel a private declaration belongs to. */
  canonical(file: string): string {
    let best = "index.d.ts";
    let length = 0;
    for (const barrel of this.barrelDirs) {
      const dir = barrel.slice(0, -"/index.d.ts".length);
      if ((file === `${dir}.d.ts` || file.startsWith(`${dir}/`)) && dir.length > length) {
        best = barrel;
        length = dir.length;
      }
    }
    return best;
  }

  private isMember(file: string, barrel: string): boolean {
    return !this.targets.has(file) && !this.kept.has(file) && this.canonical(file) === barrel;
  }

  private groupOf(file: string): string {
    return this.targets.has(file) ? file : this.canonical(file);
  }

  /** The shipped declaration a relative specifier names. */
  resolve(importer: string, specifier: string): string | undefined {
    const base = posix.normalize(posix.join(posix.dirname(importer), specifier));
    const candidates = specifier.endsWith(".js") ? [`${base.slice(0, -3)}${DTS}`]
      : specifier.endsWith(".svelte") ? [`${base}${DTS}`]
        : [base, `${base}${DTS}`, `${base}/index.d.ts`];
    return candidates.find((candidate) => this.files.has(candidate));
  }

  /** A specifier that names `target` from the directory of `importer`. */
  private specifierFor(importer: string, target: string, hint: string): string {
    const base = target.slice(0, -DTS.length);
    const suffix = hint.endsWith(".js") ? ".js" : "";
    let relative = posix.relative(posix.dirname(importer), base);
    if (!relative.startsWith(".")) relative = `./${relative}`;
    return suffix ? `${relative}${suffix}` : relative;
  }

  private module(path: string): ModuleFile {
    const found = this.modules.get(path);
    if (!found) throw new Error(`no parsed declaration for ${path}`);
    return found;
  }

  private isTypeDeclaration(statement: ts.Statement): boolean {
    return ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement);
  }

  private hasExportModifier(statement: ts.Statement): boolean {
    const modifiers = ts.canHaveModifiers(statement) ? ts.getModifiers(statement) : undefined;
    return modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false;
  }

  /**
   * The public names a module contributes inside `barrel`, following named
   * re-exports and folding the members its `export *` statements name.
   */
  exportsOf(file: string, barrel: string, stack: Set<string>): ExportsOf {
    const cacheKey = `${file}\0${barrel}`;
    const cached = this.exportsCache.get(cacheKey);
    if (cached) return cached;
    if (stack.has(cacheKey)) throw new Error(`declaration re-export cycle at ${file}`);
    stack.add(cacheKey);
    const module = this.module(file);
    const items = new Map<string, ExportItem>();
    const stars: StarRef[] = [];
    const starred: string[] = [];
    const set = (item: ExportItem): void => {
      const existing = items.get(item.name);
      if (existing) {
        const same = existing.local && item.local
          && existing.local.file === item.local.file && existing.local.name === item.local.name;
        if (!same) {
          items.delete(item.name);
          return;
        }
      }
      items.set(item.name, item);
    };
    for (const statement of module.source.statements) {
      if (ts.isImportDeclaration(statement)) continue;
      if (ts.isExportAssignment(statement)) {
        const expression = statement.expression;
        if (!ts.isIdentifier(expression)) throw new Error(`${file}: an exported default that is not a name is not supported`);
        set({ name: "default", local: { file, name: expression.text }, typeOnly: false });
        continue;
      }
      if (ts.isExportDeclaration(statement)) {
        const specifier = statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier) ? statement.moduleSpecifier.text : undefined;
        const target = specifier?.startsWith(".") ? this.resolve(file, specifier) : undefined;
        if (!statement.exportClause) {
          if (!specifier) throw new Error(`${file}: an export star without a specifier is not supported`);
          if (target && this.isMember(target, barrel)) starred.push(target);
          else stars.push({ importer: file, specifier, target });
          continue;
        }
        if (!ts.isNamedExports(statement.exportClause)) throw new Error(`${file}: a namespace export is not supported`);
        for (const element of statement.exportClause.elements) {
          const name = element.name.text;
          const imported = (element.propertyName ?? element.name).text;
          const typeOnly = statement.isTypeOnly || element.isTypeOnly;
          if (!specifier) {
            const declaration = module.declared.get(imported)?.[0];
            if (declaration) {
              set({ name, local: { file, name: imported }, typeOnly: typeOnly || declaration.kind === "type" });
              continue;
            }
            const binding = module.imports.find((entry) => entry.local === imported);
            if (!binding) throw new Error(`${file}: exports ${imported}, which it neither declares nor imports`);
            const resolved = this.resolveExportOfBinding(file, barrel, binding, stack);
            set({ ...resolved, name, typeOnly: typeOnly || resolved.typeOnly });
            continue;
          }
          if (target && this.isMember(target, barrel)) {
            const inner = this.exportsOf(target, barrel, stack).items.get(imported);
            if (!inner) throw new Error(`${file}: re-exports ${imported}, which ${target} does not export`);
            set({ ...inner, name, typeOnly: typeOnly || inner.typeOnly });
            continue;
          }
          set({ name, reexport: { importer: file, specifier, target, imported }, typeOnly });
        }
        continue;
      }
      if (this.hasExportModifier(statement)) {
        const declarations = declaredNamesOf(statement);
        if (hasDefaultModifier(statement)) {
          const declaration = declarations[0];
          if (!declaration) throw new Error(`${file}: an anonymous default declaration is not supported`);
          set({ name: "default", local: { file, name: declaration.name }, typeOnly: false });
          continue;
        }
        for (const declaration of declarations) {
          set({ name: declaration.name, local: { file, name: declaration.name }, typeOnly: declaration.kind === "type" });
        }
      }
    }
    for (const member of starred) {
      const inner = this.exportsOf(member, barrel, stack);
      for (const item of inner.items.values()) {
        if (item.name === "default") continue;
        set(item);
      }
      for (const star of inner.stars) if (!stars.some((entry) => entry.importer === star.importer && entry.specifier === star.specifier)) stars.push(star);
    }
    const result = { items, stars };
    this.exportsCache.set(cacheKey, result);
    stack.delete(cacheKey);
    return result;
  }

  /** What an import binding of `file` brings in, resolved inside `barrel`. */
  private resolveExportOfBinding(file: string, barrel: string, binding: ImportBinding, stack: Set<string>): ExportItem {
    if (binding.target && this.isMember(binding.target, barrel)) {
      const inner = this.exportsOf(binding.target, barrel, stack).items.get(binding.imported);
      if (!inner) throw new Error(`${file}: imports ${binding.imported}, which ${binding.target} does not export`);
      return inner;
    }
    return { name: binding.imported, reexport: { importer: file, specifier: binding.specifier, target: binding.target, imported: binding.imported }, typeOnly: binding.typeOnly };
  }

  /** Record the exported names every barrel had before the merge. */
  loadBefore(): void {
    const surface = surfaceOf(this.root, [...this.modules.keys()], this.targets);
    this.before = surface.exports;
    this.globals = surface.globals;
  }

  /**
   * Every reference that crosses a barrel, with the private module it names.
   * `name` is `*` for a namespace import, an export star, or an unnamed import
   * type.
   */
  private *needs(): Generator<{ importer: string; target: string; name: string }> {
    for (const module of this.modules.values()) {
      const group = this.groupOf(module.path);
      for (const binding of module.imports) {
        if (!binding.target || this.targets.has(binding.target) || this.canonical(binding.target) === group) continue;
        yield { importer: module.path, target: binding.target, name: binding.imported };
      }
      for (const statement of module.source.statements) {
        if (ts.isExportDeclaration(statement) && statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)) {
          const specifier = statement.moduleSpecifier.text;
          if (!specifier.startsWith(".")) continue;
          const target = this.resolve(module.path, specifier);
          if (!target || this.targets.has(target) || this.canonical(target) === group) continue;
          if (!statement.exportClause) {
            yield { importer: module.path, target, name: "*" };
            continue;
          }
          if (!ts.isNamedExports(statement.exportClause)) continue;
          for (const element of statement.exportClause.elements) {
            yield { importer: module.path, target, name: (element.propertyName ?? element.name).text };
          }
        }
      }
      const visit = (node: ts.Node): void => {
        if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal)) {
          const specifier = node.argument.literal.text;
          if (specifier.startsWith(".")) {
            const target = this.resolve(module.path, specifier);
            if (target && !this.targets.has(target) && this.canonical(target) !== group) {
              const qualifier = node.qualifier;
              const name = qualifier && ts.isIdentifier(qualifier) ? qualifier.text : "*";
              needsList.push({ importer: module.path, target, name });
            }
          }
        }
        ts.forEachChild(node, visit);
      };
      const needsList: { importer: string; target: string; name: string }[] = [];
      visit(module.source);
      for (const need of needsList) yield need;
    }
  }

  /**
   * Keep the file of every private module another barrel needs and no barrel
   * exports, plus everything those files reach: a folded module would have to
   * gain a public export to stay reachable.
   */
  chooseKept(): void {
    const seeds: string[] = [];
    for (const need of this.needs()) {
      if (need.name === "*" || this.exportingBarrel(need.target, need.name)) continue;
      const group = this.canonical(need.target);
      const declaration = this.declarationOf(need.target, need.name, group);
      if (!declaration) throw new Error(`${need.target} does not declare ${need.name}, which ${need.importer} needs`);
      seeds.push(declaration.file);
    }
    const queue = [...seeds];
    while (queue.length > 0) {
      const file = queue.pop()!;
      if (this.kept.has(file) || this.targets.has(file)) continue;
      this.kept.add(file);
      // Everything the file names must stay too, or its specifiers dangle.
      for (const specifier of specifiersOfSource(this.module(file).source)) {
        if (!specifier.startsWith(".")) continue;
        const target = this.resolve(file, specifier);
        if (target && !this.targets.has(target)) queue.push(target);
      }
    }
  }

  /** The exported barrel that already carries `name` from the group of `target`. */
  private exportingBarrel(target: string, name: string): string | undefined {
    const group = this.canonical(target);
    const carries = (file: string): boolean => {
      const declaring = this.before.get(file)?.get(name);
      return !!declaring && this.groupOf(declaring) === group;
    };
    if (carries(group)) return group;
    for (const candidate of [...this.targets].sort()) if (candidate !== group && carries(candidate)) return candidate;
    return undefined;
  }

  /**
   * Decide, for every reference that will cross a barrel, which module it should
   * name: a kept file, an existing export, or the kept file declaring the name.
   */
  routeNeeds(): void {
    for (const need of this.needs()) {
      if (need.name === "*") {
        if (!this.kept.has(need.target)) throw new Error(`${need.importer}: a namespace reference to the private ${need.target} cannot be folded`);
        continue;
      }
      this.route(need.target, need.name);
    }
    for (const module of this.modules.values()) {
      const group = this.groupOf(module.path);
      for (const statement of module.source.statements) {
        if (ts.isModuleDeclaration(statement) && ts.isStringLiteral(statement.name) && statement.name.text.startsWith(".")) {
          const target = this.resolve(module.path, statement.name.text);
          if (target && !this.targets.has(target) && !this.kept.has(target) && this.canonical(target) === group) {
            throw new Error(`${module.path}: a module augmentation of the private ${target} in its own barrel is not supported`);
          }
        }
      }
    }
  }

  private route(target: string, name: string): string {
    const key = `${target}\0${name}`;
    const known = this.routes.get(key);
    if (known) return known;
    if (this.kept.has(target)) {
      this.routes.set(key, target);
      return target;
    }
    const barrel = this.canonical(target);
    let chosen = this.exportingBarrel(target, name);
    if (!chosen) {
      const declaration = this.declarationOf(target, name, barrel);
      if (!declaration) throw new Error(`${target} does not declare ${name}, which another declaration needs`);
      if (this.kept.has(declaration.file)) chosen = declaration.file;
      else throw new Error(`nothing exports ${name} from ${barrel}, and ${declaration.file} is folded into it`);
    }
    this.routes.set(key, chosen);
    return chosen;
  }

  /** Where a name is declared inside `group`, following a member's own re-exports. */
  private declarationOf(file: string, name: string, group: string): { file: string; kind: "type" | "value" } | undefined {
    if (name === "default") {
      const declaration = defaultDeclarationOf(this.module(file));
      return declaration ? { file, kind: declaration.kind } : undefined;
    }
    const direct = this.module(file).declared.get(name)?.[0];
    if (direct) return { file, kind: direct.kind };
    const item = this.exportsOf(file, group, new Set()).items.get(name);
    if (item?.local) {
      const declaration = this.module(item.local.file).declared.get(item.local.name)?.[0];
      if (declaration) return { file: item.local.file, kind: declaration.kind };
    }
    return undefined;
  }

  /** The barrel an export item should be written against, after routing. */
  private destinationOf(item: { importer: string; specifier: string; target?: string; imported: string }, from: string): { specifier: string; target?: string } {
    if (item.target && !this.targets.has(item.target) && this.canonical(item.target) !== this.groupOf(from)) {
      const routed = this.route(item.target, item.imported);
      return { target: routed, specifier: this.specifierFor(from, routed, item.specifier) };
    }
    if (item.target) return { target: item.target, specifier: this.specifierFor(from, item.target, item.specifier) };
    return { specifier: item.specifier };
  }

  /** Merge every group, rewrite the other shipped declarations, delete the folded files. */
  async apply(): Promise<{ merged: string[]; kept: string[] }> {
    for (const file of this.modules.keys()) {
      if (this.targets.has(file) || this.kept.has(file)) continue;
      const barrel = this.canonical(file);
      if (!this.targets.has(barrel)) throw new Error(`${file} folds into ${barrel}, which is not an exports target`);
      const members = this.groups.get(barrel) ?? [];
      members.push(file);
      this.groups.set(barrel, members);
    }

    const mergedFiles: string[] = [];
    for (const [barrel, members] of this.groups) {
      mergedFiles.push(...members);
      const text = this.buildGroup(barrel, members);
      await writeFile(join(this.root, barrel), text);
    }
    for (const file of this.modules.keys()) {
      if (!this.targets.has(file) || this.groups.has(file)) continue;
      const text = this.rewriteStandalone(file);
      if (text === undefined) continue;
      await writeFile(join(this.root, file), text);
    }
    return { merged: mergedFiles, kept: [...this.kept].sort() };
  }

  /** The merged barrel text: imports, declarations, then the barrel's exports. */
  private buildGroup(barrel: string, members: string[]): string {
    const files = [barrel, ...members];
    // A private name that the library also declares would shadow it for every
    // declaration the barrel now holds; a public name is the barrel's to keep.
    const taken = new Set(this.globals);
    const allocation = new Map<string, string>();
    const allocate = (file: string, name: string): string => {
      const key = `${file}\0${name}`;
      const known = allocation.get(key);
      if (known) return known;
      let candidate = name;
      let index = 1;
      while (taken.has(candidate)) candidate = `${name}_${index++}`;
      allocation.set(key, candidate);
      taken.add(candidate);
      return candidate;
    };
    const exported = this.exportsOf(barrel, barrel, new Set());
    for (const item of exported.items.values()) {
      if (!item.local || item.name === "default") continue;
      const key = `${item.local.file}\0${item.local.name}`;
      if (allocation.has(key)) continue;
      allocation.set(key, item.name);
      taken.add(item.name);
    }
    for (const file of files) {
      for (const name of this.module(file).declared.keys()) allocate(file, name);
    }

    const kept = new Map<string, KeptImport>();
    const renames = new Map<string, Map<string, string>>();
    const imported = (specifier: string, name: string, namespace: boolean, typeOnly: boolean, preferred: string): KeptImport => {
      const key = `${specifier}\0${name}`;
      const known = kept.get(key);
      if (known) {
        known.typeOnly &&= typeOnly;
        return known;
      }
      let local = preferred;
      let index = 1;
      while (taken.has(local)) local = `${preferred}_${index++}`;
      taken.add(local);
      const record = { local, imported: name, specifier, typeOnly, namespace };
      kept.set(key, record);
      return record;
    };
    for (const file of files) {
      const rename = new Map<string, string>();
      renames.set(file, rename);
      // A declaration renamed for a collision takes every reference that names
      // it along, or the reference would silently resolve to the declaration it
      // collided with.
      for (const name of this.module(file).declared.keys()) {
        const allocated = allocation.get(`${file}\0${name}`);
        if (allocated !== undefined && allocated !== name) rename.set(name, allocated);
      }
      for (const binding of this.module(file).imports) {
        if (binding.imported === "*") {
          if (binding.target && !this.targets.has(binding.target) && !this.kept.has(binding.target)) {
            throw new Error(`${file}: a namespace import of the private ${binding.target} cannot be folded`);
          }
          const destination = binding.target ? { specifier: this.specifierFor(barrel, binding.target, binding.specifier) } : { specifier: binding.specifier };
          rename.set(binding.local, imported(destination.specifier, "*", true, binding.typeOnly, binding.local).local);
          continue;
        }
        if (binding.target && this.isMember(binding.target, barrel)) {
          const item = this.exportsOf(binding.target, barrel, new Set()).items.get(binding.imported);
          if (!item) throw new Error(`${file}: imports ${binding.imported}, which ${binding.target} does not export`);
          if (item.local) {
            rename.set(binding.local, allocation.get(`${item.local.file}\0${item.local.name}`)!);
            continue;
          }
          const destination = this.destinationOf(item.reexport!, file);
          rename.set(binding.local, imported(destination.specifier, item.reexport!.imported, false, binding.typeOnly || item.typeOnly, binding.local).local);
          continue;
        }
        const destination = binding.target
          ? this.targets.has(binding.target)
            ? { specifier: this.specifierFor(barrel, binding.target, binding.specifier) }
            : { specifier: this.specifierFor(barrel, this.route(binding.target, binding.imported), binding.specifier) }
          : { specifier: binding.specifier };
        rename.set(binding.local, imported(destination.specifier, binding.imported, false, binding.typeOnly, binding.local).local);
      }
    }

    const lines: string[] = [];
    const namespaces = [...kept.values()].filter((record) => record.namespace);
    const named = new Map<string, { specifier: string; typeOnly: boolean; names: string[] }>();
    for (const record of kept.values()) {
      if (record.namespace) continue;
      const key = `${record.specifier}\0${record.typeOnly}`;
      const group = named.get(key) ?? { specifier: record.specifier, typeOnly: record.typeOnly, names: [] };
      group.names.push(record.imported === record.local ? record.local : `${record.imported} as ${record.local}`);
      named.set(key, group);
    }
    const statements = [
      ...[...named.values()].map((group) => ({ specifier: group.specifier, text: `import ${group.typeOnly ? "type " : ""}{ ${group.names.sort().join(", ")} }` })),
      ...namespaces.map((record) => ({ specifier: record.specifier, text: `import ${record.typeOnly ? "type " : ""}* as ${record.local}` })),
    ].sort((a, b) => a.specifier.localeCompare(b.specifier) || a.text.localeCompare(b.text));
    for (const statement of statements) lines.push(`${statement.text} from ${JSON.stringify(statement.specifier)};`);
    for (const file of files) {
      const module = this.module(file);
      const rename = renames.get(file)!;
      for (const statement of module.source.statements) {
        if (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement) || ts.isExportAssignment(statement)) continue;
        lines.push(this.statementText(barrel, module, statement, rename, allocation));
      }
    }

    const typeExports: string[] = [];
    const valueExports: string[] = [];
    const reexports: string[] = [];
    const reexportGroups = new Map<string, { specifier: string; typeOnly: boolean; names: string[] }>();
    const exportName = (local: string, name: string): string => (local === name ? local : `${local} as ${name}`);
    /** The barrel-local name of a declaration or of an import the barrel re-exports. */
    const localName = (file: string, name: string): string => {
      const renamed = renames.get(file)?.get(name);
      if (renamed) return renamed;
      const allocated = allocation.get(`${file}\0${name}`);
      if (!allocated) throw new Error(`the merged ${barrel} has no local name for ${name} of ${file}`);
      return allocated;
    };
    for (const item of exported.items.values()) {
      if (item.local) {
        const local = localName(item.local.file, item.local.name);
        (item.typeOnly ? typeExports : valueExports).push(exportName(local, item.name));
        continue;
      }
      const destination = this.destinationOf(item.reexport!, barrel);
      const clause = item.reexport!.imported === item.name ? item.name : `${item.reexport!.imported} as ${item.name}`;
      const key = `${destination.specifier}\0${item.typeOnly}`;
      const group = reexportGroups.get(key) ?? { specifier: destination.specifier, typeOnly: item.typeOnly, names: [] };
      group.names.push(clause);
      reexportGroups.set(key, group);
    }
    for (const group of [...reexportGroups.values()].sort((a, b) => a.specifier.localeCompare(b.specifier) || Number(a.typeOnly) - Number(b.typeOnly))) {
      reexports.push(`export ${group.typeOnly ? "type " : ""}{ ${group.names.sort().join(", ")} } from ${JSON.stringify(group.specifier)};`);
    }
    const stars: string[] = [];
    for (const star of exported.stars) {
      if (star.target && !this.targets.has(star.target) && this.canonical(star.target) !== barrel) {
        throw new Error(`${star.importer}: an export star of the private ${star.target} cannot be folded`);
      }
      const destination = star.target ? this.specifierFor(barrel, star.target, star.specifier) : star.specifier;
      if (!stars.includes(destination)) stars.push(destination);
    }
    for (const specifier of stars) reexports.push(`export * from ${JSON.stringify(specifier)};`);
    if (typeExports.length > 0) lines.push(`export type { ${typeExports.sort().join(", ")} };`);
    if (valueExports.length > 0) lines.push(`export { ${valueExports.sort().join(", ")} };`);
    lines.push(...reexports.sort());
    return `${lines.join("\n")}\n`;
  }

  /** A shipped declaration that keeps its own file: only its specifiers move. */
  private rewriteStandalone(file: string): string | undefined {
    const module = this.module(file);
    const edits: Edit[] = [];
    for (const statement of module.source.statements) {
      if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
        const replacement = this.repointedImport(file, statement);
        if (replacement !== undefined) edits.push({ start: statement.getStart(module.source), end: statement.getEnd(), text: replacement });
      }
      if (ts.isExportDeclaration(statement) && statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)) {
        const replacement = this.repointedExport(file, statement);
        if (replacement !== undefined) edits.push({ start: statement.getStart(module.source), end: statement.getEnd(), text: replacement });
      }
    }
    visitImportTypes(module.source, (node, specifierNode, specifier) => {
      const target = this.resolve(file, specifier);
      if (!target || this.targets.has(target) || this.kept.has(target) || this.canonical(target) === this.groupOf(file)) return;
      const name = importTypeName(node);
      if (!name) throw new Error(`${file}: an import type of the private ${target} without a named qualifier cannot be folded`);
      const rewritten = this.specifierFor(file, this.route(target, name), specifier);
      edits.push({ start: specifierNode.getStart(module.source) + 1, end: specifierNode.getEnd() - 1, text: rewritten });
    });
    if (edits.length === 0) return undefined;
    return apply(module.text, edits);
  }

  /** The import statement, split across every barrel its bindings now name. */
  private repointedImport(file: string, statement: ts.ImportDeclaration): string | undefined {
    const specifier = (statement.moduleSpecifier as ts.StringLiteral).text;
    const target = specifier.startsWith(".") ? this.resolve(file, specifier) : undefined;
    if (!target || this.targets.has(target) || this.kept.has(target) || this.canonical(target) === this.groupOf(file)) return undefined;
    const clause = statement.importClause;
    if (!clause) throw new Error(`${file}: a side-effect import of the private ${target} cannot be folded`);
    const destination = (name: string): string => this.specifierFor(file, this.route(target, name), specifier);
    const lines: string[] = [];
    if (clause.name) {
      lines.push(`import ${clause.isTypeOnly ? "type " : ""}${clause.name.text} from ${JSON.stringify(destination("default"))};`);
    }
    const bindings = clause.namedBindings;
    if (bindings && ts.isNamespaceImport(bindings)) throw new Error(`${file}: a namespace import of the private ${target} cannot be folded`);
    if (bindings && ts.isNamedImports(bindings)) {
      const groups = new Map<string, string[]>();
      for (const element of bindings.elements) {
        const name = (element.propertyName ?? element.name).text;
        const clauseText = name === element.name.text ? name : `${name} as ${element.name.text}`;
        const typePrefix = element.isTypeOnly && !clause.isTypeOnly ? "type " : "";
        const destination = this.specifierFor(file, this.route(target, name), specifier);
        const list = groups.get(destination) ?? [];
        list.push(`${typePrefix}${clauseText}`);
        groups.set(destination, list);
      }
      for (const [destination, names] of groups) {
        lines.push(`import ${clause.isTypeOnly ? "type " : ""}{ ${names.join(", ")} } from ${JSON.stringify(destination)};`);
      }
    }
    return lines.join("\n");
  }

  /** The export statement, split across every barrel its names now live in. */
  private repointedExport(file: string, statement: ts.ExportDeclaration): string | undefined {
    const specifier = (statement.moduleSpecifier as ts.StringLiteral).text;
    const target = specifier.startsWith(".") ? this.resolve(file, specifier) : undefined;
    if (!target || this.targets.has(target) || this.kept.has(target) || this.canonical(target) === this.groupOf(file)) return undefined;
    if (!statement.exportClause) throw new Error(`${file}: an export star of the private ${target} cannot be folded`);
    if (!ts.isNamedExports(statement.exportClause)) throw new Error(`${file}: a namespace export of the private ${target} cannot be folded`);
    const groups = new Map<string, string[]>();
    for (const element of statement.exportClause.elements) {
      const name = (element.propertyName ?? element.name).text;
      const clauseText = name === element.name.text ? name : `${name} as ${element.name.text}`;
      const typePrefix = element.isTypeOnly && !statement.isTypeOnly ? "type " : "";
      const destination = this.specifierFor(file, this.route(target, name), specifier);
      const list = groups.get(destination) ?? [];
      list.push(`${typePrefix}${clauseText}`);
      groups.set(destination, list);
    }
    const lines: string[] = [];
    for (const [specifier, names] of groups) {
      lines.push(`export ${statement.isTypeOnly ? "type " : ""}{ ${names.join(", ")} } from ${JSON.stringify(specifier)};`);
    }
    return lines.join("\n");
  }

  /** One declaration statement, renamed and repointed for the merged barrel. */
  private statementText(barrel: string, module: ModuleFile, statement: ts.Statement, rename: Map<string, string>, allocation: Map<string, string>): string {
    const source = module.source;
    const edits: Edit[] = [];
    const modifiers = ts.canHaveModifiers(statement) ? ts.getModifiers(statement) : undefined;
    let exported = false;
    let declared = false;
    for (const modifier of modifiers ?? []) {
      if (modifier.kind === ts.SyntaxKind.DeclareKeyword) declared = true;
      if (modifier.kind !== ts.SyntaxKind.ExportKeyword && modifier.kind !== ts.SyntaxKind.DefaultKeyword) continue;
      exported = true;
      let end = modifier.getEnd();
      while (end < module.text.length && /\s/.test(module.text[end]!)) end++;
      edits.push({ start: modifier.getStart(source), end, text: "" });
    }
    // A value declaration that loses `export` needs `declare` at the top level of a .d.ts.
    if (exported && !declared
      && (ts.isVariableStatement(statement) || ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)
        || ts.isEnumDeclaration(statement) || ts.isModuleDeclaration(statement))) {
      edits.push({ start: statement.getStart(source), end: statement.getStart(source), text: "declare " });
    }
    const nameNodes = new Set<ts.Node>();
    for (const declaration of declaredNamesOf(statement)) {
      nameNodes.add(declaration.nameNode);
      const allocated = allocation.get(`${module.path}\0${declaration.name}`);
      if (!allocated) throw new Error(`${module.path}: no name allocated for ${declaration.name}`);
      if (allocated !== declaration.name) edits.push({ start: declaration.nameNode.getStart(source), end: declaration.nameNode.getEnd(), text: allocated });
    }
    if (ts.isModuleDeclaration(statement) && ts.isStringLiteral(statement.name) && statement.name.text.startsWith(".")) {
      const specifier = statement.name.text;
      const target = this.resolve(module.path, specifier);
      if (target && !this.targets.has(target) && this.canonical(target) !== barrel) {
        const destination = this.kept.has(target) ? target : this.canonical(target);
        const rewritten = this.specifierFor(barrel, destination, specifier);
        if (rewritten !== specifier) edits.push({ start: statement.name.getStart(source) + 1, end: statement.name.getEnd() - 1, text: rewritten });
      }
    }
    const renameIn = (identifier: ts.Identifier): void => {
      if (nameNodes.has(identifier)) return;
      const renamed = rename.get(identifier.text);
      if (!renamed || renamed === identifier.text) return;
      edits.push({ start: identifier.getStart(source), end: identifier.getEnd(), text: renamed });
    };
    const walkArguments = (node: ts.ImportTypeNode): void => {
      for (const argument of node.typeArguments ?? []) walk(argument);
    };
    const walk = (node: ts.Node): void => {
      if (ts.isImportTypeNode(node)) {
        if (ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal) && node.argument.literal.text.startsWith(".")) {
          const specifier = node.argument.literal.text;
          const target = this.resolve(module.path, specifier);
          if (target && this.isMember(target, barrel)) {
            const name = importTypeName(node);
            if (!name) throw new Error(`${module.path}: an import type of the private ${target} without a named qualifier cannot be folded`);
            const allocated = allocation.get(`${target}\0${name}`);
            if (!allocated) throw new Error(`${module.path}: ${name} is not a top-level declaration of ${target}`);
            const text = node.isTypeOf ? `typeof ${allocated}` : allocated;
            const arguments_ = node.typeArguments;
            if (arguments_ && arguments_.length > 0 && node.qualifier) {
              edits.push({ start: node.getStart(source), end: node.qualifier.getEnd(), text });
              walkArguments(node);
            } else {
              edits.push({ start: node.getStart(source), end: node.getEnd(), text });
            }
            return;
          }
          if (target && !this.targets.has(target) && this.canonical(target) !== barrel) {
            const name = importTypeName(node);
            if (!name) throw new Error(`${module.path}: an import type of the private ${target} without a named qualifier cannot be folded`);
            const rewritten = this.specifierFor(barrel, this.route(target, name), specifier);
            edits.push({ start: node.argument.literal.getStart(source) + 1, end: node.argument.literal.getEnd() - 1, text: rewritten });
          }
        }
        walkArguments(node);
        return;
      }
      if (ts.isIdentifier(node)) {
        if (!isReference(node)) return;
        renameIn(node);
        return;
      }
      ts.forEachChild(node, walk);
    };
    ts.forEachChild(statement, walk);
    const start = statement.getFullStart();
    return apply(module.text.slice(start, statement.getEnd()), edits.map((edit) => ({ start: edit.start - start, end: edit.end - start, text: edit.text })));
  }

  /** The exported names each target has after the merge, as a group key per name. */
  after(removed: ReadonlySet<string>): Map<string, Map<string, string>> {
    const remaining = [...this.modules.keys()].filter((file) => !removed.has(file));
    return surfaceOf(this.root, remaining, this.targets).exports;
  }

  /** The declaration modules the pass started from, by package-relative path. */
  get shipped(): Map<string, ModuleFile> {
    return this.modules;
  }

  /** The targets the exports map names. */
  get exported(): ReadonlySet<string> {
    return this.targets;
  }

  expected(): Map<string, Map<string, string>> {
    return this.before;
  }

  groupKey(file: string): string {
    if (!file) return "";
    return this.groupOf(file);
  }
}

interface Edit {
  start: number;
  end: number;
  text: string;
}

function apply(text: string, edits: Edit[]): string {
  const sorted = [...edits].sort((a, b) => b.start - a.start || b.end - a.end);
  let result = text;
  let limit = Number.POSITIVE_INFINITY;
  for (const edit of sorted) {
    if (edit.end > limit) throw new Error(`overlapping declaration edits at ${edit.start}`);
    result = result.slice(0, edit.start) + edit.text + result.slice(edit.end);
    limit = edit.start;
  }
  return result;
}

/** Top-level declarations of a statement, with the node their name occupies. */
function declaredNamesOf(statement: ts.Statement): DeclaredName[] {
  if (ts.isVariableStatement(statement)) {
    const out: DeclaredName[] = [];
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name)) out.push({ name: declaration.name.text, kind: "value", statement, nameNode: declaration.name });
    }
    return out;
  }
  if (ts.isModuleDeclaration(statement)) {
    if (!ts.isIdentifier(statement.name)) return [];
    if (statement.flags & ts.NodeFlags.GlobalAugmentation) return [];
    return [{ name: statement.name.text, kind: "value", statement, nameNode: statement.name }];
  }
  if (ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement)) {
    return [{ name: statement.name.text, kind: "type", statement, nameNode: statement.name }];
  }
  if (ts.isClassDeclaration(statement)) {
    return statement.name ? [{ name: statement.name.text, kind: "value", statement, nameNode: statement.name }] : [];
  }
  if (ts.isEnumDeclaration(statement)) {
    return [{ name: statement.name.text, kind: "value", statement, nameNode: statement.name }];
  }
  if (ts.isFunctionDeclaration(statement)) {
    return statement.name ? [{ name: statement.name.text, kind: "value", statement, nameNode: statement.name }] : [];
  }
  return [];
}

function defaultDeclarationOf(module: ModuleFile): DeclaredName | undefined {
  for (const statement of module.source.statements) {
    if (ts.isExportAssignment(statement) && ts.isIdentifier(statement.expression)) {
      return module.declared.get(statement.expression.text)?.[0];
    }
    if (hasDefaultModifier(statement)) return declaredNamesOf(statement)[0];
  }
  return undefined;
}

function hasDefaultModifier(statement: ts.Statement): boolean {
  const modifiers = ts.canHaveModifiers(statement) ? ts.getModifiers(statement) : undefined;
  return modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword) ?? false;
}

function importTypeName(node: ts.ImportTypeNode): string | undefined {
  if (!node.qualifier) return "*";
  return ts.isIdentifier(node.qualifier) ? node.qualifier.text : undefined;
}

function visitImportTypes(source: ts.SourceFile, visit: (node: ts.ImportTypeNode, literal: ts.StringLiteral, specifier: string) => void): void {
  const walk = (node: ts.Node): void => {
    if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal)) {
      visit(node, node.argument.literal, node.argument.literal.text);
    }
    ts.forEachChild(node, walk);
  };
  ts.forEachChild(source, walk);
}

/** Whether an identifier in a declaration is a reference rather than a name. */
function isReference(node: ts.Identifier): boolean {
  const parent = node.parent;
  if (!parent) return true;
  if (ts.isPropertyAccessExpression(parent)) return parent.name !== node;
  if (ts.isQualifiedName(parent)) return parent.right !== node;
  if (ts.isShorthandPropertyAssignment(parent)) return parent.name === node;
  if (ts.isPropertyAssignment(parent) || ts.isPropertySignature(parent) || ts.isPropertyDeclaration(parent)
    || ts.isMethodDeclaration(parent) || ts.isMethodSignature(parent) || ts.isEnumMember(parent)) return parent.name !== node;
  if (ts.isParameter(parent) || ts.isTypeParameterDeclaration(parent) || ts.isBindingElement(parent)) return parent.name !== node;
  if (ts.isTypePredicateNode(parent)) return parent.parameterName !== node;
  if (ts.isImportSpecifier(parent) || ts.isExportSpecifier(parent) || ts.isNamespaceImport(parent) || ts.isNamespaceExport(parent)) return false;
  if (ts.isImportClause(parent) || ts.isImportEqualsDeclaration(parent)) return false;
  if (ts.isModuleDeclaration(parent)) return false;
  if (ts.isInterfaceDeclaration(parent) || ts.isTypeAliasDeclaration(parent) || ts.isClassDeclaration(parent)
    || ts.isFunctionDeclaration(parent) || ts.isEnumDeclaration(parent) || ts.isVariableDeclaration(parent)) return parent.name !== node;
  return true;
}

function parseModule(path: string, text: string): ModuleFile {
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
  const imports: ImportBinding[] = [];
  const declared = new Map<string, DeclaredName[]>();
  for (const statement of source.statements) {
    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
      const specifier = statement.moduleSpecifier.text;
      const clause = statement.importClause;
      if (!clause) continue;
      if (clause.name) imports.push({ local: clause.name.text, imported: "default", specifier, typeOnly: clause.isTypeOnly });
      const bindings = clause.namedBindings;
      if (bindings && ts.isNamespaceImport(bindings)) imports.push({ local: bindings.name.text, imported: "*", specifier, typeOnly: clause.isTypeOnly });
      if (bindings && ts.isNamedImports(bindings)) {
        for (const element of bindings.elements) {
          imports.push({
            local: element.name.text,
            imported: (element.propertyName ?? element.name).text,
            specifier,
            typeOnly: clause.isTypeOnly || element.isTypeOnly,
          });
        }
      }
      continue;
    }
    for (const declaration of declaredNamesOf(statement)) {
      const list = declared.get(declaration.name) ?? [];
      list.push(declaration);
      declared.set(declaration.name, list);
    }
  }
  const module: ModuleFile = { path, text, source, imports, declared };
  return module;
}

/** The names a shipped module exports, with the file that declares each one. */
interface Surface {
  /** target file -> exported name -> the file that declares it. */
  exports: Map<string, Map<string, string>>;
  /** Every name the default library declares at the top level. */
  globals: Set<string>;
}

/** A top-level declaration's name, where it has one. */
function declaredNameOf(statement: ts.Statement): string | undefined {
  if (ts.isVariableStatement(statement)) {
    const declaration = statement.declarationList.declarations[0];
    return declaration && ts.isIdentifier(declaration.name) ? declaration.name.text : undefined;
  }
  if (ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement) || ts.isClassDeclaration(statement)
    || ts.isFunctionDeclaration(statement) || ts.isEnumDeclaration(statement) || ts.isModuleDeclaration(statement)) {
    // An anonymous class declaration has no name.
    const name: ts.Node | undefined = statement.name;
    return name !== undefined && ts.isIdentifier(name) ? name.text : undefined;
  }
  return undefined;
}

function surfaceOf(root: string, declarations: string[], targets: ReadonlySet<string>): Surface {
  const program = ts.createProgram(declarations.map((file) => join(root, file)), {
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    target: ts.ScriptTarget.ESNext,
    noEmit: true,
    skipLibCheck: true,
  });
  const checker = program.getTypeChecker();
  const out = new Map<string, Map<string, string>>();
  for (const file of targets) {
    const source = program.getSourceFile(join(root, file));
    if (!source) throw new Error(`the checker did not load ${file}`);
    const symbol = checker.getSymbolAtLocation(source);
    if (!symbol) continue;
    const names = new Map<string, string>();
    for (const exported of checker.getExportsOfModule(symbol)) {
      let target = exported;
      if (target.flags & ts.SymbolFlags.Alias) {
        try {
          target = checker.getAliasedSymbol(target);
        } catch {
          // An unresolved alias still exports the name.
        }
      }
      const declaration = target.declarations?.[0];
      const declaring = declaration ? posix.relative(root, declaration.getSourceFile().fileName) : "";
      names.set(exported.getName(), declaring);
    }
    out.set(file, names);
  }
  // A global declaration folded into a barrel would shadow the library's name
  // for every other declaration in that file, so the merge gives it another one.
  const globals = new Set<string>();
  for (const source of program.getSourceFiles()) {
    if (!program.isSourceFileDefaultLibrary(source)) continue;
    for (const statement of source.statements) {
      const name = declaredNameOf(statement);
      if (name) globals.add(name);
    }
  }
  return { exports: out, globals };
}

async function filesUnder(root: string): Promise<Set<string>> {
  const files = new Set<string>();
  const walk = async (relative: string): Promise<void> => {
    for (const entry of await readdir(join(root, relative), { withFileTypes: true })) {
      const path = relative === "" ? entry.name : `${relative}/${entry.name}`;
      if (entry.isDirectory()) await walk(path);
      else files.add(path);
    }
  };
  await walk("");
  return files;
}

/** Remove directories under `root` that lost their last file. */
async function removeEmptyDirectories(root: string, paths: string[]): Promise<void> {
  const directories = new Set<string>();
  for (const path of paths) {
    let dir = posix.dirname(path);
    while (dir !== "." && dir !== "/" && dir !== "") {
      directories.add(dir);
      dir = posix.dirname(dir);
    }
  }
  for (const dir of [...directories].sort((a, b) => b.split("/").length - a.split("/").length)) {
    try {
      await rmdir(join(root, dir));
    } catch {
      // Not empty, or already gone.
    }
  }
}

/**
 * Fold the private declarations of `outdir` into their exported barrels and
 * delete the files. Fails the build rather than ship a declaration whose
 * exported names or origin changed.
 */
export async function consolidateDeclarations(outdir: string, exports: unknown): Promise<ConsolidateResult> {
  const root = resolve(outdir);
  const files = await filesUnder(root);
  const consolidation = new Consolidation(root, files, exports);
  await consolidation.load();
  consolidation.loadBefore();
  consolidation.chooseKept();
  consolidation.routeNeeds();
  const { merged, kept } = await consolidation.apply();

  let bytes = 0;
  for (const file of merged) {
    bytes += (await stat(join(root, file))).size;
    await unlink(join(root, file));
  }
  await removeEmptyDirectories(root, merged);

  const expected = consolidation.expected();
  const removed = new Set(merged);
  const actual = consolidation.after(removed);
  const problems: string[] = [];
  for (const [file, names] of expected) {
    const present = actual.get(file) ?? new Map<string, string>();
    for (const [name, declaring] of names) {
      if (!present.has(name)) {
        problems.push(`${file} no longer exports ${name}`);
        continue;
      }
      const origin = consolidation.groupKey(declaring);
      const now = consolidation.groupKey(present.get(name)!);
      if (origin && origin !== now) problems.push(`${file}: ${name} moved from ${origin} to ${now || "an unresolved declaration"}`);
    }
    for (const name of present.keys()) {
      if (!names.has(name)) problems.push(`${file} gained an unexpected export ${name}`);
    }
  }
  if (problems.length > 0) throw new Error(`declaration consolidation changed the public surface:\n  ${problems.join("\n  ")}`);

  // Every specifier a surviving declaration still names must resolve to a file
  // the build ships; a folded file may not be referenced from anywhere.
  const remaining = await filesUnder(root);
  for (const file of remaining) {
    if (!file.endsWith(DTS)) continue;
    const text = await readFile(join(root, file), "utf8");
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
    for (const specifier of specifiersOfSource(source)) {
      if (!specifier.startsWith(".")) continue;
      const target = consolidation.resolve(file, specifier);
      if (!target || removed.has(target)) throw new Error(`${file} still refers to ${specifier}, which the build does not ship`);
    }
  }

  return {
    groups: new Set(merged.map((file) => consolidation.canonical(file))).size,
    merged: merged.length,
    removed: [...merged].sort(),
    bytes,
    kept,
  };
}

/** Every relative module specifier a source file names, including augmentations. */
function specifiersOfSource(source: ts.SourceFile): string[] {
  const out: string[] = [];
  const walk = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) out.push(node.moduleSpecifier.text);
    }
    if (ts.isModuleDeclaration(node) && ts.isStringLiteral(node.name)) out.push(node.name.text);
    if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal)) out.push(node.argument.literal.text);
    ts.forEachChild(node, walk);
  };
  ts.forEachChild(source, walk);
  return out;
}
