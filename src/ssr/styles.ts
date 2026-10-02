// src/ssr/styles.ts
import { hostStyleText, SHADOW_BASE_STYLES, type ElementSpec, type ElementComponent } from "../elements/define";
import { styleText } from "../elements/styles";
import { escapeAttribute, rawText } from "./serialize";
import type { RenderOptions } from "./render-element";

/**
 * Unlayered, so it beats `mtrl.preupgrade` whatever that sheet's specificity.
 * It is the first rule in the shadow: later host and component rules in the
 * same style override it for the properties they set, and everything else
 * stays at the initial value a host without the pre-upgrade sheet already had.
 * A page that does not server-render never emits it.
 */
export const PREUPGRADE_SSR_GUARD = ":host,:host::before,:host::after{all:unset}";

export const renderStyles = (spec: ElementSpec<ElementComponent>, options: RenderOptions): string => {
  const names = [...SHADOW_BASE_STYLES, ...spec.styles];
  if (options.styles === "link") {
    const base = options.cssBase.replace(/\/$/, "");
    const links = [`hosts/${spec.name}`, ...names].map(name =>
      `<link rel="stylesheet" href="${escapeAttribute(`${base}/${name}.css`)}">`,
    ).join("");
    return `<style>${PREUPGRADE_SSR_GUARD}</style>${links}`;
  }
  const sources = [styleText(`host:${spec.name}`) ?? hostStyleText(spec), ...names.map(name => {
    const text = styleText(name);
    if (text === undefined) throw new TypeError(`Missing SSR CSS module: ${name}`);
    return text;
  })];
  return `<style>${rawText("style", `${PREUPGRADE_SSR_GUARD}\n${sources.join("\n")}`)}</style>`;
};
