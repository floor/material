// src/ssr/styles.ts
import "mtrl/elements/css";
import { hostStyleText, SHADOW_BASE_STYLES, type ElementSpec, type ElementComponent } from "../elements/define";
import { styleText } from "../elements/styles";
import { escapeAttribute, rawText } from "./serialize";
import type { RenderOptions } from "./render-element";

// The link assets use the selective stylesheet dependency graph. Keep this
// server-only copy honest against resolveStyleDependencies in the source tests.
const dependencies: Readonly<Record<string, readonly string[]>> = {
  button: ["progress"], tabs: ["badge", "button"], select: ["textfield", "menu"],
  "button-group": ["button", "icon-button"], "fab-menu": ["fab", "menu"],
  card: ["button"], dialog: ["button", "divider"], "split-button": ["menu", "button"],
  snackbar: ["button", "icon-button"], toolbar: ["button", "icon-button"],
};
const linkNames = (names: readonly string[]): string[] => {
  const ordered = new Set<string>();
  const visit = (name: string): void => {
    if (ordered.has(name)) return;
    for (const dependency of dependencies[name] ?? []) visit(dependency);
    ordered.add(name);
  };
  names.forEach(visit);
  return [...ordered];
};

export const renderStyles = (spec: ElementSpec<ElementComponent>, options: RenderOptions): string => {
  const names = [...SHADOW_BASE_STYLES, ...spec.styles];
  if (options.styles === "link") {
    const base = options.cssBase.replace(/\/$/, "");
    return [`hosts/${spec.name}`, ...linkNames(names)].map(name =>
      `<link rel="stylesheet" href="${escapeAttribute(`${base}/${name}.css`)}">`,
    ).join("");
  }
  const sources = [styleText(`host:${spec.name}`) ?? hostStyleText(spec), ...names.map(name => {
    const text = styleText(name);
    if (text === undefined) throw new TypeError(`Missing SSR CSS module: ${name}`);
    return text;
  })];
  return `<style>${rawText("style", sources.join("\n"))}</style>`;
};
