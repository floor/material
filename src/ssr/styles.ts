// src/ssr/styles.ts
import { hostStyleText, SHADOW_BASE_STYLES, type ElementSpec, type ElementComponent } from "../elements/define";
import { styleText } from "../elements/styles";
import { escapeAttribute, rawText } from "./serialize";
import { pruneStyles } from "./prune-styles";
import type { RenderOptions } from "./render-element";

/**
 * `present` is the class set of the rendered shadow root. Inline mode drops
 * every rule the root can never match; link mode serves whole files and takes
 * no set.
 */
export const renderStyles = (spec: ElementSpec<ElementComponent>, options: RenderOptions, present?: ReadonlySet<string>): string => {
  const names = [...SHADOW_BASE_STYLES, ...spec.styles];
  if (options.styles === "link") {
    const base = options.cssBase.replace(/\/$/, "");
    return [`hosts/${spec.name}`, ...names].map(name =>
      `<link rel="stylesheet" href="${escapeAttribute(`${base}/${name}.css`)}">`,
    ).join("");
  }
  const sources = [styleText(`host:${spec.name}`) ?? hostStyleText(spec), ...names.map(name => {
    const text = styleText(name);
    if (text === undefined) throw new TypeError(`Missing SSR CSS module: ${name}`);
    return text;
  })];
  const css = sources.join("\n");
  return `<style>${rawText("style", present === undefined ? css : pruneStyles(css, present))}</style>`;
};
