/**
 * scripts/token-catalogue/checks.ts
 *
 * The registry of assertions a catalogue row can cite: a stable ID, the file
 * that carries it, the scope it asserts on, the rule it applies, the surface
 * it runs on, and the kind of evidence a pass produces. Stable IDs locate an
 * assertion; the browser probe's evidence file — not the ID — establishes
 * that it executed, passed, and ran on these built inputs.
 */
import type { CheckRecord } from "./types";

export const checks: CheckRecord[] = [
  {
    id: "shape.corner.root-defaults",
    file: "scripts/check-token-catalogue-browser.ts",
    scope: ":root custom properties --mtrl-sys-shape-corner-*",
    rule: "computed :root value equals the independent expected dp value, px realized 1:1",
    surface: "dist/styles.css in a browser",
    evidence: "browser-computed",
  },
  {
    id: "shape.corner.consumer-attribution",
    file: "scripts/check-token-catalogue-browser.ts",
    scope: "each mapped consumer's computed border-radius",
    rule: "with all ten corner tokens set to distinguishable probes, each consumer reads exactly its mapped step's probe; a redirected consumer fails",
    surface: "dist/styles.css in a browser",
    evidence: "browser-computed",
  },
  {
    id: "shape.corner.selective-fallback",
    file: "scripts/check-token-catalogue-browser.ts",
    scope: "a consumer rendered from the component sheet alone",
    rule: "without the base sheet the radius equals the recorded literal fallback",
    surface: "dist/styles/button.css without dist/styles/base.css",
    evidence: "browser-computed",
  },
  {
    id: "typescale.role.root-defaults",
    file: "scripts/check-token-catalogue-browser.ts",
    scope: ":root custom properties --mtrl-sys-typescale-*",
    rule: "computed :root values equal the independent expected font, size, line height, tracking and weight for all fifteen roles",
    surface: "dist/styles.css in a browser",
    evidence: "browser-computed",
  },
  {
    id: "typescale.role.override-consumption",
    file: "scripts/check-token-catalogue-browser.ts",
    scope: ".mtrl-<role> utility classes",
    rule: "setting one role's font-size token moves that class's computed font-size; omitted, it returns to the expected default",
    surface: "dist/styles.css in a browser",
    evidence: "browser-computed",
  },
  {
    id: "typeface.ref.defaults",
    file: "scripts/check-token-catalogue-browser.ts",
    scope: ":root --mtrl-ref-typeface-brand and -plain",
    rule: "computed :root values equal 'Roboto, sans-serif', the page's default for both faces",
    surface: "dist/styles.css in a browser",
    evidence: "browser-computed",
  },
  {
    id: "typeface.ref.override-consumption",
    file: "scripts/check-token-catalogue-browser.ts",
    scope: "role font tokens and .mtrl-<role> classes",
    rule: "setting a face token moves the roles mapped to that face, and no other",
    surface: "dist/styles.css in a browser",
    evidence: "browser-computed",
  },
  {
    id: "shape.scale.emitted-set",
    file: "test/styles/shape-tokens.test.ts",
    scope: ":root --mtrl-sys-shape-corner-* declarations",
    rule: "the root emits exactly the ten steps of the scale, and nothing else",
    surface: "compiled base/tokens entry",
    evidence: "compile-declaration",
  },
  {
    id: "typescale.baseline.emitted",
    file: "test/styles/typescale.test.ts",
    scope: ":root --mtrl-sys-typescale-<role>-* declarations",
    rule: "each role's tokens hold the baseline scale, and the utility class reads the tokens",
    surface: "compiled main entry",
    evidence: "compile-declaration",
  },
  {
    id: "typeface.mixins.fallback",
    file: "test/styles/typeface-tokens.test.ts",
    scope: "typography mixin font-family",
    rule: "a role reads its face token with the compiled family as the fallback; base declares both faces",
    surface: "compiled mixin and base/tokens entry",
    evidence: "compile-declaration",
  },
  {
    id: "tokens.render.override-response",
    file: "scripts/check-token-render.ts",
    scope: "recorded corner and typeface consumers across all cases",
    rule: "with the tokens probed, every element recorded as following them changes, and no other",
    surface: "dist/styles.css in a browser",
    evidence: "browser-computed",
  },
  {
    id: "catalogue.inventory.complete",
    file: "scripts/check-token-catalogue.ts",
    scope: "every declaration and reference in the declared outputs",
    rule: "each resolves to a row, a registration, or a recorded consumer-provided entry; none unresolved",
    surface: "all declared dist CSS outputs",
    evidence: "inventory",
  },
  {
    id: "catalogue.determinism.bytes",
    file: "scripts/check-token-catalogue.ts",
    scope: "the generated catalogue document",
    rule: "generated twice from the same inputs and source commit, byte-identical; no wall-clock in the output",
    surface: "generator over the built outputs",
    evidence: "inventory",
  },
  {
    id: "catalogue.schema.valid",
    file: "scripts/check-token-catalogue.ts",
    scope: "the generated catalogue and schema documents",
    rule: "the catalogue validates against the emitted schema; required fields present, enum fields exact",
    surface: "generated dist/tokens documents",
    evidence: "schema",
  },
  {
    id: "catalogue.packed-consumer.resolves",
    file: "test/token-catalogue/packed-consumer.test.ts",
    scope: "material/tokens/catalogue.json and catalogue.schema.json",
    rule: "a clean packed consumer resolves both exports and validates the data without importing runtime code",
    surface: "npm-packed package installed in a consumer fixture",
    evidence: "schema",
  },
  {
    id: "catalogue.identity.default-bytes",
    file: "scripts/check-catalogue-identity.ts",
    scope: "every published default CSS/JS file in the packed tarballs",
    rule: "branch and named main byte-identical outside the allowlisted new data and export keys",
    surface: "packed tarballs of main and the branch, same pinned toolchain",
    evidence: "inventory",
  },
];
