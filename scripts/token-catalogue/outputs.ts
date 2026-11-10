/**
 * scripts/token-catalogue/outputs.ts
 *
 * The frozen coverage manifest: every final CSS output the inventory parses,
 * derived from the same style manifest the build uses, so the catalogue and
 * the build cannot drift apart. The declared surfaces are the complete set of
 * shipped CSS files: the full stylesheet, every selective entry, every theme
 * and its contrast sheet, the elements' shadow CSS and host sheets, and the
 * pre-upgrade rules. Any CSS file in the package outside this list fails the
 * inventory gate rather than passing unexamined.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  componentStyles, themeStyles, standaloneThemes, contrastStyle, optionalStyleProfiles,
} from "../style-manifest";
import type { OutputFile } from "./inventory";

/** The selective `styles/*` entries, in manifest order. */
export const styleEntries = [
  "base", "base-elements", "base-lite", "typography", contrastStyle, "utilities",
  ...Object.keys(componentStyles),
  ...Object.keys(optionalStyleProfiles),
];

const cssNames = (directory: string): string[] => {
  try {
    return readdirSync(directory).filter(name => name.endsWith(".css")).map(name => name.replace(/\.css$/, ""));
  } catch {
    return [];
  }
};

/** Every CSS file the package ships, as (export surface, dist path) pairs. */
export function declaredCssFiles(outdir: string): Array<{ export: string; path: string }> {
  const files: Array<{ export: string; path: string }> = [
    { export: "styles.css", path: "styles.css" },
  ];
  for (const name of styleEntries) files.push({ export: `styles/${name}`, path: `styles/${name}.css` });
  for (const name of [...themeStyles, ...standaloneThemes]) {
    files.push({ export: `themes/${name}`, path: `themes/${name}.css` });
    files.push({ export: `themes/${name}-contrast`, path: `themes/${name}-contrast.css` });
  }
  // The elements' shadow CSS: ripple, every emitted component sheet and host
  // sheet, listed from the build and cross-checked against the manifest.
  for (const name of cssNames(join(outdir, "elements/css"))) {
    files.push({ export: `elements/css/${name}`, path: `elements/css/${name}.css` });
  }
  for (const name of cssNames(join(outdir, "elements/css/hosts"))) {
    files.push({ export: `elements/css/hosts/${name}`, path: `elements/css/hosts/${name}.css` });
  }
  files.push({ export: "elements/preupgrade", path: "elements/preupgrade.css" });
  for (const name of cssNames(join(outdir, "elements/preupgrade"))) {
    files.push({ export: `elements/preupgrade/${name}`, path: `elements/preupgrade/${name}.css` });
  }
  return files.sort((a, b) => a.export.localeCompare(b.export));
}

/** Read every declared output from a dist directory. */
export function readOutputs(outdir: string): OutputFile[] {
  return declaredCssFiles(outdir).map(({ export: exportName, path }) => ({
    export: exportName,
    css: readFileSync(join(outdir, path), "utf8"),
  }));
}

/** Every CSS file under the dist directory, for the no-undeclared-output gate. */
export function cssFilesOnDisk(outdir: string): string[] {
  const found: string[] = [];
  const visit = (directory: string): void => {
    for (const entry of readdirSync(join(outdir, directory), { withFileTypes: true })) {
      const relative = directory ? `${directory}/${entry.name}` : entry.name;
      if (entry.isDirectory()) visit(relative);
      else if (entry.name.endsWith(".css")) found.push(relative);
    }
  };
  visit("");
  return found.sort();
}

/**
 * The coverage gate: every declared file exists, every CSS file on disk is
 * declared, and every element sheet is a manifest component (or the shared
 * ripple) so the manifest and the build cannot drift apart.
 */
export function outputsComplete(outdir: string): string[] {
  const declared = declaredCssFiles(outdir);
  const declaredPaths = new Set(declared.map(file => file.path));
  const componentNames = new Set(Object.keys(componentStyles));
  const problems: string[] = [];
  for (const path of declaredPaths) {
    try {
      statSync(join(outdir, path));
    } catch {
      problems.push(`declared output ${path} is missing from the build`);
    }
  }
  for (const path of cssFilesOnDisk(outdir)) {
    if (!declaredPaths.has(path)) problems.push(`undeclared CSS output ${path} ships without a coverage entry`);
  }
  for (const file of declared) {
    const element = /^elements\/css\/([^/]+)\.css$/.exec(file.path);
    if (element && element[1] !== "ripple" && !componentNames.has(element[1]!)) {
      problems.push(`${file.path} is not in the style manifest`);
    }
    const style = /^styles\/([^/]+)\.css$/.exec(file.path);
    if (style && !styleEntries.includes(style[1]!)) problems.push(`${file.path} is not a declared entry`);
  }
  return problems;
}
