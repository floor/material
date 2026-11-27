// test/token-catalogue/identity.test.ts
//
// The identity gate compares two packed tarballs member by member. These tests
// drive scripts/check-catalogue-identity.ts itself, on synthetic npm-style
// tarballs, so the gate's own rules are what fails when they break: what a
// data-only change may add, and where the allowance stops.
import { describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { filledSmallRoundCss } from "../../scripts/button-style-profile";
import { profileStyleModule } from "../../scripts/optional-style-profiles";
import {
  catalogueInputReceipt, createCatalogueGraph, recordCatalogueSourceOutput,
  type CatalogueInputReceipt,
} from "../../scripts/catalogue-input-graph";

const script = join(import.meta.dir, "..", "..", "scripts", "check-catalogue-identity.ts");

/** An npm-style tarball of the files: every member under package/, as npm pack writes. */
const pack = (root: string, name: string, files: Record<string, string>): string => {
  const source = join(root, `${name}-src`);
  for (const [member, body] of Object.entries(files)) {
    const target = join(source, "package", member);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, body);
  }
  const tgz = join(root, `${name}.tgz`);
  execFileSync("tar", ["-czf", tgz, "-C", source, "package"]);
  return tgz;
};

/** The gate's verdict on one tarball pair: exit code and combined output. */
const runGate = (branch: string, base: string, scope?: { cwd: string; revision: string; graph?: string; baseGraph?: string }): { code: number; out: string } => {
  const args = scope ? ["--base-revision", scope.revision] : [];
  if (scope?.graph) args.push("--input-graph", scope.graph);
  if (scope?.baseGraph) args.push("--base-input-graph", scope.baseGraph);
  const proc = Bun.spawnSync(["bun", "run", script, branch, base, ...args], { cwd: scope?.cwd });
  const text = (bytes: Uint8Array | undefined): string => (bytes ?? new Uint8Array()).toString();
  return { code: proc.exitCode, out: text(proc.stdout) + text(proc.stderr) };
};

const git = (cwd: string, ...args: string[]): string =>
  execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

const commit = (cwd: string, files: Record<string, string>): string => {
  for (const [path, bytes] of Object.entries(files)) {
    const target = join(cwd, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, bytes);
  }
  git(cwd, "add", ".");
  git(cwd, "-c", "user.name=Identity Fixture", "-c", "user.email=identity@example.test", "commit", "-qm", "Fixture");
  return git(cwd, "rev-parse", "HEAD");
};

const receipt = (
  root: string, name: string, outputs: Record<string, string>,
  members: CatalogueInputReceipt["members"] = {}, addedMembers: CatalogueInputReceipt["addedMembers"] = {},
): string => {
  const graph = createCatalogueGraph();
  for (const [source, text] of Object.entries(outputs)) {
    recordCatalogueSourceOutput(graph, source.endsWith(".scss") ? "output.css" : "output.d.ts", source, text);
  }
  const path = join(root, `${name}.json`);
  writeFileSync(path, JSON.stringify({ ...catalogueInputReceipt(graph), members, addedMembers }));
  return path;
};

const readMe = ["# Fixture", "", "Docs.", ""].join("\n");
const manifest = (extra: Record<string, unknown> = {}): string =>
  JSON.stringify({ name: "fixture", version: "1.0.0", exports: { ".": "./index.js" }, ...extra });
const defaults = { "package.json": manifest(), "README.md": readMe, "dist/module.js": "export {};\n" };
const buttonCss = '@layer mtrl.button{.mtrl-button{height:40px}.mtrl-button--m{height:56px}}';
const withButton = { ...defaults, "dist/styles/button.css": buttonCss,
  "dist/styles/progress.js": 'import "./progress.css";\n', "dist/styles/progress.css": '.mtrl-progress{display:block}' };
const optionalPair = { "dist/styles/button-filled-small-round.css": filledSmallRoundCss(buttonCss),
  "dist/styles/button-filled-small-round.js": profileStyleModule("button-filled-small-round", ["progress"]) };

describe("catalogue identity gate", () => {
  test("only the new validated profile may add its exact build parser and check script", () => {
    const root = mkdtempSync(join(tmpdir(), "mtrl-identity-"));
    try {
      const devDependencies = { sass: "1.85.1" };
      const base = pack(root, "base", { ...withButton, "package.json": manifest({ devDependencies }) });
      const additions = { devDependencies: { ...devDependencies, postcss: "8.5.28" },
        scripts: { "button-profile:check": "bun run scripts/check-button-profile.ts" } };
      expect(runGate(pack(root, "valid", { ...withButton, ...optionalPair, "package.json": manifest(additions) }), base).code).toBe(0);
      expect(runGate(pack(root, "no-profile", { ...withButton, "package.json": manifest(additions) }), base).code).toBe(1);
      const wrongParser = runGate(pack(root, "parser", { ...withButton, ...optionalPair,
        "package.json": manifest({ ...additions, devDependencies: { ...devDependencies, postcss: "9.0.0" } }) }), base);
      expect(wrongParser.code).toBe(1);
      expect(wrongParser.out).toContain("package.json field devDependencies changed");
      const compiler = runGate(pack(root, "compiler", { ...withButton, ...optionalPair,
        "package.json": manifest({ ...additions, devDependencies: { sass: "2.0.0", postcss: "8.5.28" } }) }), base);
      expect(compiler.code).toBe(1);
      const script = runGate(pack(root, "script", { ...withButton, ...optionalPair,
        "package.json": manifest({ ...additions, scripts: { "button-profile:check": "bun run unrelated.ts" } }) }), base);
      expect(script.code).toBe(1);
      expect(script.out).toContain("new script button-profile:check outside the catalogue gate allowlist");
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  test("only the validated additive optional stylesheet pair passes", () => {
    const root = mkdtempSync(join(tmpdir(), "mtrl-identity-"));
    try {
      const base = pack(root, "base", withButton);
      expect(runGate(pack(root, "valid", { ...withButton, ...optionalPair }), base).code).toBe(0);
      const missing = runGate(pack(root, "missing", { ...withButton,
        "dist/styles/button-filled-small-round.css": optionalPair["dist/styles/button-filled-small-round.css"] }), base);
      expect(missing.code).toBe(1);
      expect(missing.out).toContain("both optional CSS and JS files must ship");
      const altered = runGate(pack(root, "altered", { ...withButton, ...optionalPair,
        "dist/styles/button-filled-small-round.css": ".wrong{}" }), base);
      expect(altered.code).toBe(1);
      expect(altered.out).toContain("CSS differs from the reviewed projection");
      const imports = runGate(pack(root, "imports", { ...withButton, ...optionalPair,
        "dist/styles/button-filled-small-round.js": 'import "./button-filled-small-round.css";\n' }), base);
      expect(imports.code).toBe(1);
      expect(imports.out).toContain("dependency imports changed");
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  test("the profile allowance never admits changes to existing or undeclared styles", () => {
    const root = mkdtempSync(join(tmpdir(), "mtrl-identity-"));
    try {
      const base = pack(root, "base", withButton);
      const changed = runGate(pack(root, "changed", { ...withButton, ...optionalPair,
        "dist/module.js": "export const changed=true;" }), base);
      expect(changed.code).toBe(1);
      expect(changed.out).toContain("changed member dist/module.js");
      const unknown = runGate(pack(root, "unknown", { ...withButton, ...optionalPair,
        "dist/styles/button-other.css": ".other{}" }), base);
      expect(unknown.code).toBe(1);
      expect(unknown.out).toContain("added member dist/styles/button-other.css outside the allowlist");
      const existing = pack(root, "existing", { ...withButton, ...optionalPair });
      const css = buttonCss.replace("40px", "41px");
      const changedProfile = runGate(pack(root, "changed-profile", { ...withButton, ...optionalPair,
        "dist/styles/button.css": css, "dist/styles/button-filled-small-round.css": filledSmallRoundCss(css) }), existing);
      expect(changedProfile.code).toBe(1);
      expect(changedProfile.out).toContain("changed member dist/styles/button-filled-small-round.css");
      expect(changedProfile.out).toContain("changed member dist/styles/button.css");
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  test("identical tarballs pass", () => {
    const root = mkdtempSync(join(tmpdir(), "mtrl-identity-"));
    try {
      const a = pack(root, "a", defaults);
      const b = pack(root, "b", defaults);
      const gate = runGate(b, a);
      expect(gate.code).toBe(0);
      expect(gate.out).toContain("byte-identical");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("new dist/tokens data and its export key pass", () => {
    const root = mkdtempSync(join(tmpdir(), "mtrl-identity-"));
    try {
      const base = pack(root, "base", defaults);
      const branch = pack(root, "branch", {
        ...defaults,
        "package.json": manifest({ exports: { ".": "./index.js", "./tokens/catalogue.json": "./dist/tokens/catalogue.json" } }),
        "dist/tokens/catalogue.json": '{"rows":[]}\n',
      });
      const gate = runGate(branch, base);
      expect(gate.code).toBe(0);
      expect(gate.out).toContain("dist/tokens/catalogue.json");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("README.md may change by whole-line additions only", () => {
    const root = mkdtempSync(join(tmpdir(), "mtrl-identity-"));
    try {
      const withSection = ["# Fixture", "", "Docs.", "", "### Token catalogue", "", "New data.", ""].join("\n");
      const rewritten = ["# Fixture", "", "Documentation.", ""].join("\n");
      const added = pack(root, "added", { ...defaults, "README.md": withSection });
      const edited = pack(root, "edited", { ...defaults, "README.md": rewritten });
      const base = pack(root, "base", defaults);
      expect(runGate(added, base).code).toBe(0);
      const gate = runGate(edited, base);
      expect(gate.code).toBe(1);
      expect(gate.out).toContain("README.md beyond whole-line additions");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("catalogue and text-field source changes may move only text-field members", () => {
    const root = mkdtempSync(join(tmpdir(), "mtrl-identity-"));
    try {
      const cwd = join(root, "checkout");
      mkdirSync(cwd);
      git(cwd, "init", "-q");
      const revision = commit(cwd, {
        "scripts/style-manifest.ts": "base manifest",
        "src/components/text-field/api.ts": "base API",
        "src/styles/components/_text-field.scss": "base field",
        "src/components/chips/index.ts": "other component",
        "src/elements/text-field.ts": "base element",
        "src/elements/define.ts": "shared element helper",
      });
      commit(cwd, {
        "scripts/style-manifest.ts": "new style entry",
        "src/components/text-field/api.ts": "new API",
        "src/styles/components/_text-field.scss": "new field",
        "src/components/text-field/features/chips.ts": "new implementation",
        "src/elements/text-field.ts": "new element",
        "src/elements/define.ts": "shared integration",
      });
      const before = {
        ...defaults,
        "dist/components/text-field/index.js": "base entry",
        "dist/components/text-field/api.js": "base API",
        "dist/components/text-field/index.d.ts": "base types",
        "dist/elements/text-field.js": "base element",
        "dist/styles/text-field.css": "base field",
        "dist/components/chips/index.js": "other component",
        "dist/elements/define.js": "shared element helper",
        "dist/styles.css": "full stylesheet",
        "dist/styles/listbox.css": "initial listbox sheet",
      };
      const base = pack(root, "base", before);
      const after = {
        ...before,
        "dist/components/text-field/api.js": "changed API",
        "dist/components/text-field/index.d.ts": "changed types",
        "dist/elements/text-field.js": "changed element",
        "dist/styles/text-field.css": "changed field",
      };
      const oldOutputs = {
        "src/components/text-field/api.ts": "export declare const version = 1;",
        "src/elements/text-field.ts": "export declare const version = 1;",
        "src/styles/components/_text-field.scss": ".field{width:10px}",
      };
      const baseGraph = receipt(root, "base-inputs", oldOutputs);
      const outputs = {
        "src/components/text-field/api.ts": "export declare const version = 2;",
        "src/elements/text-field.ts": "export declare const version = 2;",
        "src/styles/components/_text-field.scss": ".field{width:15px}",
        "src/components/text-field/features/chips.ts": "export declare const chips = 1;",
      };
      const members = {
        "dist/components/text-field/api.js": ["src/components/text-field/api.ts"],
        "dist/components/text-field/index.d.ts": ["src/components/text-field/api.ts"],
        "dist/elements/text-field.js": ["src/elements/text-field.ts"],
        "dist/styles/text-field.css": ["src/styles/components/_text-field.scss"],
      };
      const graph = receipt(root, "inputs", outputs, {
        ...members, "dist/styles.css": ["src/styles/components/_button.scss"],
      });
      const scope = { cwd, revision, graph, baseGraph };
      const scoped = runGate(pack(root, "scoped", after), base, scope);
      expect(scoped.code).toBe(0);
      expect(scoped.out).toMatch(/changed dist\/components\/text-field\/api.js .* from src\/components\/text-field\/api.ts/);
      expect(scoped.out).toMatch(/changed dist\/elements\/text-field.js .* from src\/elements\/text-field.ts/);

      const escaped = runGate(pack(root, "escaped", {
        ...after,
        "dist/components/chips/index.js": "unrelated drift",
        "dist/components/text-field/features/chips.js": "new implementation",
        "dist/elements/define.js": "shared drift",
        "dist/styles.css": "full sheet drift",
        "dist/styles/listbox.css": "unrelated listbox drift",
      }), base, scope);
      expect(escaped.code).toBe(1);
      expect(escaped.out).toContain("changed member dist/components/chips/index.js");
      expect(escaped.out).toContain("added member dist/components/text-field/features/chips.js");
      expect(escaped.out).toContain("changed member dist/elements/define.js");
      expect(escaped.out).toContain("changed member dist/styles.css");
      expect(escaped.out).toContain("changed member dist/styles/listbox.css");

      const fullGraph = receipt(root, "full-inputs", outputs, {
        ...members, "dist/styles.css": ["src/styles/components/_text-field.scss", "src/styles/components/_button.scss"],
      });
      const full = runGate(pack(root, "full", { ...after, "dist/styles.css": "changed field in the full sheet" }),
        base, { ...scope, graph: fullGraph });
      expect(full.code).toBe(0);
      expect(full.out).toMatch(/changed dist\/styles\.css .* from src\/styles\/components\/_text-field\.scss/);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  test("shared element and SSR outputs require their own changed build input", () => {
    const root = mkdtempSync(join(tmpdir(), "mtrl-identity-"));
    try {
      const cwd = join(root, "checkout");
        mkdirSync(cwd);
      git(cwd, "init", "-q");
      const revision = commit(cwd, {
        "src/elements/styles.ts": "base styles",
        "src/elements/define.ts": "shared element helper",
        "src/ssr/render-element.ts": "initial SSR",
        "src/ssr/browser.ts": "browser SSR",
        "src/solid/jsx.ts": "old JSX",
      });
      commit(cwd, {
        "src/elements/styles.ts": "changed styles",
        "src/ssr/render-element.ts": "changed SSR",
        "src/solid/jsx.ts": "new JSX",
        "src/components/text-field/chips.ts": "new chips",
      });
      const oldOutputs = {
        "src/elements/styles.ts": "export declare const value = 1;",
        "src/elements/define.ts": "export declare const value = 1;",
        "src/ssr/render-element.ts": "export declare const value = 1;",
        "src/ssr/browser.ts": "export declare const value = 1;",
        "src/solid/jsx.ts": "export declare const value = 1;",
      };
      const baseGraph = receipt(root, "base-inputs", oldOutputs);
      const graph = receipt(root, "inputs", {
        ...oldOutputs,
        "src/elements/styles.ts": "export declare const value = 2;",
        "src/ssr/render-element.ts": "export declare const value = 2;",
        "src/solid/jsx.ts": "export declare const value = 2;",
        "src/components/text-field/chips.ts": "export declare const chips = 1;",
      }, {
        "dist/elements/styles.js": ["src/elements/styles.ts"],
        "dist/elements/define.js": ["src/elements/define.ts"],
        "dist/ssr/index.js": ["src/ssr/render-element.ts"],
        "dist/ssr/browser.js": ["src/ssr/browser.ts"],
        "dist/solid/jsx.d.ts": ["src/solid/jsx.ts"],
        "dist/components/text-field/chips.js": ["src/components/text-field/chips.ts"],
      }, {
        "dist/components/text-field/features/trailing-icon.d.ts": ["src/components/text-field/chips.ts"],
      });
      const scope = { cwd, revision, graph, baseGraph };
      const before = {
        ...defaults,
        "dist/elements/styles.js": "base styles",
        "dist/elements/define.js": "shared element helper",
        "dist/ssr/index.js": "initial SSR",
        "dist/ssr/browser.js": "browser SSR",
        "dist/solid/jsx.d.ts": "old JSX",
      };
      const base = pack(root, "base", before);
      const after = {
        ...before,
        "dist/elements/styles.js": "changed styles",
        "dist/ssr/index.js": "changed SSR",
        "dist/solid/jsx.d.ts": "new JSX",
        "dist/components/text-field/chips.js": "new chips",
        "dist/components/text-field/features/trailing-icon.d.ts": "newly referenced declaration",
      };
      const changed = pack(root, "changed", after);
      const allowed = runGate(changed, base, scope);
      expect(allowed.code).toBe(0);
      expect(allowed.out).toMatch(/changed dist\/elements\/styles\.js .* from src\/elements\/styles\.ts/);
      expect(allowed.out).toMatch(/changed dist\/ssr\/index\.js .* from src\/ssr\/render-element\.ts/);
      expect(allowed.out).toMatch(/changed dist\/solid\/jsx.d.ts .* from src\/solid\/jsx.ts/);
      expect(allowed.out).toContain("added dist/components/text-field/chips.js from src/components/text-field/chips.ts");
      expect(allowed.out).toContain("added dist/components/text-field/features/trailing-icon.d.ts from src/components/text-field/chips.ts");
      expect(runGate(changed, base, { cwd, revision }).code).toBe(1);

      const drift = runGate(pack(root, "drift", {
        ...after,
        "dist/elements/define.js": "unrelated element drift",
        "dist/ssr/browser.js": "unrelated SSR drift",
      }), base, scope);
      expect(drift.code).toBe(1);
      expect(drift.out).toContain("changed member dist/elements/define.js");
      expect(drift.out).toContain("changed member dist/ssr/browser.js");
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  test("equivalent compiler output from a touched source grants no scope", () => {
    const root = mkdtempSync(join(tmpdir(), "mtrl-identity-"));
    try {
      const cwd = join(root, "checkout");
      const source = "src/components/text-field/text-field.ts";
      mkdirSync(cwd);
      git(cwd, "init", "-q");
      const original = [
        'import type { A, B } from "./first.js";',
        'import type { C } from "./second.js";',
        "export declare const field: A & B & C;",
      ].join("\n");
      const reordered = [
        '// A harmless comment.',
        'import type { C } from "./second.js";   ',
        'import type { B, A } from "./first.js";',
        "export declare const field: A & B & C;",
      ].join("\n");
      const revision = commit(cwd, { [source]: original });
      commit(cwd, { [source]: reordered });
      const owned = "dist/components/text-field/text-field.d.ts";
      const unrelated = {
        "dist/components/text-field/api.js": "api",
        "dist/elements/text-field.js": "element",
        "dist/styles/text-field.css": "css",
      };
      const base = pack(root, "base", { ...defaults, ...unrelated, [owned]: original });
      const branch = pack(root, "branch", {
        ...defaults,
        ...Object.fromEntries(Object.keys(unrelated).map(member => [member, "drift"])),
        [owned]: reordered,
      });
      const baseGraph = receipt(root, "base-inputs", { [source]: original });
      const graph = receipt(root, "inputs", { [source]: reordered }, { [owned]: [source] });
      const result = runGate(branch, base, { cwd, revision, graph, baseGraph });
      expect(result.code).toBe(1);
      for (const member of [owned, ...Object.keys(unrelated)]) {
        expect(result.out).toContain(`changed member ${member}`);
      }
      expect(result.out).not.toContain("Catalogue members backed by changed sources");
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  test("manifest-only edits still freeze every default member", () => {
    const root = mkdtempSync(join(tmpdir(), "mtrl-identity-"));
    try {
      const cwd = join(root, "checkout");
      mkdirSync(cwd);
      git(cwd, "init", "-q");
      const revision = commit(cwd, {
        "scripts/style-manifest.ts": 'export const typographyDependencies = ["base"];',
        "src/components/text-field/api.ts": "same source",
      });
      commit(cwd, { "scripts/style-manifest.ts": 'export const typographyDependencies = ["base", "button"];' });
      const before = {
        ...defaults,
        "dist/styles/typography.js": 'import "./base.js";',
        "dist/components/text-field/api.js": "same source",
      };
      const base = pack(root, "base", before);
      const drift = runGate(pack(root, "drift", {
        ...before,
        "dist/styles/typography.js": 'import "./base.js";\nimport "./button.js";',
        "dist/components/text-field/api.js": "same source plus one byte.",
      }), base, { cwd, revision });
      expect(drift.code).toBe(1);
      expect(drift.out).toContain("changed member dist/styles/typography.js");
      expect(drift.out).toContain("changed member dist/components/text-field/api.js");
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  test("a changed default member fails with the member named", () => {
    const root = mkdtempSync(join(tmpdir(), "mtrl-identity-"));
    try {
      const base = pack(root, "base", defaults);
      const branch = pack(root, "branch", { ...defaults, "dist/module.js": "export { x };\n" });
      const gate = runGate(branch, base);
      expect(gate.code).toBe(1);
      expect(gate.out).toContain("changed member dist/module.js");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("a removed member fails", () => {
    const root = mkdtempSync(join(tmpdir(), "mtrl-identity-"));
    try {
      const base = pack(root, "base", defaults);
      const { "dist/module.js": _removed, ...without } = defaults;
      const branch = pack(root, "branch", without);
      const gate = runGate(branch, base);
      expect(gate.code).toBe(1);
      expect(gate.out).toContain("removed member dist/module.js");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("catalogue data already in main is the merged state, not a violation", () => {
    const root = mkdtempSync(join(tmpdir(), "mtrl-identity-"));
    try {
      // Since the catalogue merged, both sides of the comparison carry the
      // data files and their export keys: identical tarballs must pass, and a
      // regenerated catalogue document is the sanctioned data change — while
      // a moved byte in any default member still fails.
      const merged = {
        ...defaults,
        "package.json": manifest({ exports: { ".": "./index.js", "./tokens/catalogue.json": "./dist/tokens/catalogue.json", "./tokens/catalogue.schema.json": "./dist/tokens/catalogue.schema.json" } }),
        "dist/tokens/catalogue.json": '{"rows":[]}\n',
        "dist/tokens/catalogue.schema.json": '{"type":"object"}\n',
      };
      const base = pack(root, "base", merged);
      expect(runGate(pack(root, "identical", merged), base).code).toBe(0);
      expect(runGate(pack(root, "regenerated", { ...merged, "dist/tokens/catalogue.json": '{"rows":[1]}\n' }), base).code).toBe(0);
      const touched = pack(root, "touched", { ...merged, "dist/module.js": "export { y };\n" });
      expect(runGate(touched, base).out).toContain("changed member dist/module.js");
      expect(runGate(touched, base).code).toBe(1);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("a removed export key fails", () => {
    const root = mkdtempSync(join(tmpdir(), "mtrl-identity-"));
    try {
      const base = pack(root, "base", defaults);
      const branch = pack(root, "branch", {
        ...defaults,
        "package.json": manifest({ exports: { "./other": "./other.js" } }),
      });
      const gate = runGate(branch, base);
      expect(gate.code).toBe(1);
      expect(gate.out).toContain('export key . was removed');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("a changed field outside the allowlist fails (type, sideEffects, added field)", () => {
    const root = mkdtempSync(join(tmpdir(), "mtrl-identity-"));
    try {
      const base = pack(root, "base", {
        ...defaults,
        "package.json": manifest({ type: "module", sideEffects: ["**/*.css"] }),
      });
      const type = pack(root, "type", { ...defaults, "package.json": manifest({ type: "commonjs", sideEffects: ["**/*.css"] }) });
      const sideEffects = pack(root, "effects", { ...defaults, "package.json": manifest({ type: "module", sideEffects: false }) });
      const added = pack(root, "added", { ...defaults, "package.json": manifest({ type: "module", sideEffects: ["**/*.css"], browser: "./browser.js" }) });
      expect(runGate(type, base).out).toContain("package.json field type changed");
      expect(runGate(sideEffects, base).out).toContain("package.json field sideEffects changed");
      expect(runGate(added, base).out).toContain("package.json field browser was added");
      expect(runGate(type, base).code).toBe(1);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("scripts: catalogue gates may be added, nothing else may move", () => {
    const root = mkdtempSync(join(tmpdir(), "mtrl-identity-"));
    try {
      const withScript = { ...defaults, "package.json": manifest({ scripts: { build: "bun run build" } }) };
      const base = pack(root, "base", withScript);
      const addedGate = pack(root, "gate", {
        ...withScript,
        "package.json": manifest({ scripts: { build: "bun run build", "tokens:catalogue:check": "bun run scripts/check-token-catalogue.ts" } }),
      });
      expect(runGate(addedGate, base).code).toBe(0);
      const changed = pack(root, "changed", { ...withScript, "package.json": manifest({ scripts: { build: "bun run x" } }) });
      const removed = pack(root, "removed", { ...withScript, "package.json": manifest({ scripts: {} }) });
      const foreign = pack(root, "foreign", { ...withScript, "package.json": manifest({ scripts: { build: "bun run build", lint: "eslint" } }) });
      expect(runGate(changed, base).out).toContain("script build changed");
      expect(runGate(removed, base).out).toContain("script build was removed");
      expect(runGate(foreign, base).out).toContain("new script lint outside the catalogue gate allowlist");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
