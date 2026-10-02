// test/styles/contrast-sheets.ts
// Compile the theme sheets the FLO-540 resolver compares. `all` is what
// origin/next emits (the mixin default). `preference` and `explicit` are the
// split: they need `$contrast-emit` in themes/_base-theme.scss. Until that
// switch exists, the base file still carries both, and there is no contrast
// sheet. The cascade test then fails its "without the import" assertion.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as sass from "sass";
import { baseStyles, componentStyles, resolveStyleDependencies } from "../../scripts/style-manifest";
import { hexOf, resolveColors, type ElementState, type OsState } from "./contrast-cascade";
import { THEME_ROLES } from "../../src/core/theme/tokens";

export const ORIGIN_COMMIT = "b475ea5dc88c68b888c947399403f682b05a6ba2";

/** The measurement named 528 states. These axes multiply to 576; none is dropped. */
export const STATE_COUNT = 2 * 3 * 3 * 4 * 2 * 2 * 2;

const stylesDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../src/styles");
const MARKER = "// contrast roles: generated, do not edit";
const options: sass.StringOptions<"sync"> = { loadPaths: [stylesDir], style: "compressed", logger: sass.Logger.silent };
const cache = new Map<string, string>();

export type Target = "root" | "element";
export type SheetMode = "today" | "with" | "without";

export function splitEnabled(): boolean {
  return readFileSync(resolve(stylesDir, "themes/_base-theme.scss"), "utf8").includes("$contrast-emit");
}

/** Same prelude as scripts/build-styles.ts. Contrast uses `mtrl.base`, not its own layer. */
export function styleLayerOrder(): string {
  const layers = ["base", "utilities", ...resolveStyleDependencies(Object.keys(componentStyles))];
  return `@layer ${layers.map(layer => `mtrl.${layer}`).join(",")};`;
}

export function inBaseLayer(css: string): string {
  return `${styleLayerOrder()}@layer mtrl.base{${css}}`;
}

function compile(emit: "all" | "preference", sources: string[]): string {
  const key = `${emit}\n${sources.join("\n")}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const config = emit === "all" ? ""
    : `@use "themes/base-theme" as contrast-config with ($contrast-emit: ${emit});\n`;
  const body = sources.map((source, i) => `@use "${source}" as entry${i};`).join("\n");
  const css = sass.compileString(config + body, options).css;
  cache.set(key, css);
  return css;
}

/** Explicit attribute rules only, from the generated contrast block of one theme. */
export function compileExplicit(name: string): string {
  const key = `explicit:${name}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const source = readFileSync(resolve(stylesDir, `themes/_${name}.scss`), "utf8");
  const at = source.indexOf(MARKER);
  if (at < 0) throw new Error(`${name} has no contrast block`);
  const scss = `@use "themes/base-theme" as * with ($contrast-emit: explicit);\n${source.slice(at)}`;
  const css = sass.compileString(scss, options).css;
  cache.set(key, css);
  return css;
}

export function compileAll(sources: string[]): string {
  return compile("all", sources);
}

export function compilePreference(sources: string[]): string {
  return compile("preference", sources);
}

const baseToday = () => inBaseLayer(compile("all", baseStyles));
const basePreference = () => inBaseLayer(compile("preference", baseStyles));
const baseExplicit = () => inBaseLayer(compileExplicit("baseline"));

/** `today` is origin/next. `with` loads the contrast sheet. `without` does not. */
export function sheets(theme: string, mode: SheetMode, contrastFirst = false): string[] {
  const today = [baseToday(), compile("all", [`themes/${theme}`])];
  if (!splitEnabled()) return today;
  if (mode === "today") return today;
  const base = contrastFirst ? [baseExplicit(), basePreference()] : [basePreference(), baseExplicit()];
  const themed = contrastFirst
    ? [compileExplicit(theme), compile("preference", [`themes/${theme}`])]
    : [compile("preference", [`themes/${theme}`]), compileExplicit(theme)];
  if (mode === "with") return [...base, ...themed];
  return [basePreference(), compile("preference", [`themes/${theme}`])];
}

export type GridState = { target: Target; el: ElementState; os: OsState };

export function grid(themes: readonly (string | null)[]): GridState[] {
  const states: GridState[] = [];
  const modes = [null, "light", "dark"] as const;
  const contrasts = [null, "standard", "medium", "high"] as const;
  for (const target of ["root", "element"] as const) {
    for (const theme of themes) {
      for (const mode of modes) {
        for (const contrast of contrasts) {
          for (const dark of [false, true]) {
            for (const scheme of ["light", "dark"] as const) {
              for (const pref of ["no-preference", "more"] as const) {
                states.push({
                  target,
                  el: { root: target === "root", theme, mode, contrast, dark },
                  os: { scheme, contrast: pref },
                });
              }
            }
          }
        }
      }
    }
  }
  return states;
}

export function stateKey(state: GridState): string {
  const { el, os, target } = state;
  return [target, el.theme ?? "-", el.mode ?? "-", el.contrast ?? "-", el.dark ? "1" : "0", os.scheme, os.contrast].join("|");
}

const PARENT: ElementState = { root: true, theme: null, mode: null, contrast: null, dark: false };

export function roleColors(sheetList: string[], state: GridState, parents: Map<string, Record<string, string>>): string[] {
  const osKey = `${state.os.scheme}|${state.os.contrast}`;
  let parent: Record<string, string> | null = null;
  if (state.target === "element") {
    parent = parents.get(osKey) ?? null;
    if (!parent) {
      parent = resolveColors(sheetList, PARENT, state.os, null);
      parents.set(osKey, parent);
    }
  }
  const colors = resolveColors(sheetList, state.el, state.os, parent);
  return THEME_ROLES.map(role => {
    const hex = hexOf(colors[`--mtrl-sys-color-${role}`]);
    if (!hex) throw new Error(`missing --mtrl-sys-color-${role} for ${stateKey(state)}`);
    return hex;
  });
}

export function primaryOf(sheetList: string[], el: ElementState, os: OsState): string | null {
  const parent = el.root ? null : resolveColors(sheetList, PARENT, os, null);
  return hexOf(resolveColors(sheetList, el, os, parent)["--mtrl-sys-color-primary"]);
}
