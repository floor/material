// src/ssr/styles.ts
import "mtrl/elements/css";
import { hostStyleText, SHADOW_BASE_STYLES, type ElementSpec, type ElementComponent } from "../elements/define";
import { styleText } from "../elements/styles";
import { escapeAttribute, rawText } from "./serialize";
import type { RenderOptions } from "./render-element";

export const renderStyles = (spec: ElementSpec<ElementComponent>, options: RenderOptions): string => {
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
  return `<style>${rawText("style", sources.join("\n"))}</style>`;
};
