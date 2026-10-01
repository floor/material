// scripts/fixtures/ssr-parity.ts
import { defineAll, elements, SHADOW_BASE_STYLES } from "../../dist/elements/index.js";
import "../../dist/elements/css/index.js";
import { styleText } from "../../dist/elements/styles.js";
import { setHTML } from "../../dist/core/dom/html.js";

export type Snapshot = Record<string, string>;
// Only generated ID families, never arbitrary authored IDs or ARIA values.
const generated = /^(?:mtrl-|textfield-|select-|tabs-|tab-|radio-|checkbox-|switch-|menu-|search-|datepicker-|timepicker-|dialog-|card-)/;
export const snapshot = (host: Element, authoredIds: string[]): Snapshot => {
  const result: Snapshot = {};
  const ids = new Map<string, string>();
  const collect = (node: Element): void => {
    if (node.id && !authoredIds.includes(node.id) && generated.test(node.id)) {
      if (ids.has(node.id)) throw new Error(`Duplicate generated ID: ${node.id}`);
      ids.set(node.id, `@id${ids.size}`);
    }
    for (const child of Array.from(node.children)) collect(child);
    if (node.shadowRoot) for (const child of Array.from(node.shadowRoot.children)) collect(child);
  };
  collect(host);
  const external = new Map<string, string>();
  const reference = (value: string) => value.split(/(\s+)/).map(id => {
    if (ids.has(id)) return ids.get(id)!;
    // Closed menu surfaces can be detached. Preserve their unresolved status
    // and the bijection instead of erasing arbitrary reference strings.
    if (/^menu-\d+-\d+$/.test(id) && !authoredIds.includes(id)) {
      if (!external.has(id)) external.set(id, `@detached${external.size}`);
      return external.get(id)!;
    }
    return id;
  }).join("");
  const groups = new Map<string, string>();
  const css = (text: string): string => {
    const sheet = new CSSStyleSheet(); sheet.replaceSync(text);
    return Array.from(sheet.cssRules, rule => rule.cssText).join("\n");
  };
  const walk = (node: Node, path: string): void => {
    if (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.COMMENT_NODE) {
      result[`${path}/text`] = node.textContent ?? "";
      return;
    }
    if (!(node instanceof Element)) return;
    result[`${path}/tag`] = node.localName;
    const attributes = new Map(Array.from(node.attributes, a => [a.name, a.value]));
    // HTML carries live state in attributes; factory-created controls carry it
    // in properties. Compare both in their serializable, effective form.
    if (node instanceof HTMLInputElement) {
      if (node.value || attributes.has("value")) attributes.set("value", node.value);
      if (node.checked) attributes.set("checked", ""); else attributes.delete("checked");
    }
    for (const [name, value] of [...attributes].sort(([a], [b]) => a.localeCompare(b))) {
      const attribute = { name, value };
      if (attribute.name === "style") {
        const style = (node as HTMLElement).style;
        for (const name of Array.from(style).sort()) result[`${path}/style:${name}`] = style.getPropertyValue(name).trim();
      } else {
        const value = attribute.name === "id" ? ids.get(attribute.value) ?? attribute.value :
          ["for", "aria-controls", "aria-labelledby", "aria-describedby", "aria-activedescendant", "aria-owns"].includes(attribute.name) ? reference(attribute.value) : attribute.value;
        if (attribute.name === "name" && node instanceof HTMLInputElement && node.type === "radio" && /^radios-[a-z0-9]{7}$/.test(value)) {
          if (!groups.has(value)) groups.set(value, `@group${groups.size}`);
          result[`${path}/@name`] = groups.get(value)!;
        } else result[`${path}/@${attribute.name}`] = attribute.name === "class" ? value.trim().split(/\s+/).join(" ") : value;
      }
    }
    if (node instanceof HTMLInputElement) {
      result[`${path}/value`] = node.value;
      result[`${path}/checked`] = String(node.checked);
    }
    if (node instanceof HTMLTextAreaElement) result[`${path}/value`] = node.value;
    const children = node instanceof HTMLTemplateElement ? node.content.childNodes : node.childNodes;
    Array.from(children).forEach((child, index) => walk(child, `${path}/${index}`));
    if (node.shadowRoot) {
      const root = node.shadowRoot;
      // Only the first SSR style (the joined registered sheets) is structural.
      // Any subsequent factory/authored style remains in the node comparison.
      const first = root.firstElementChild;
      const inline = !root.adoptedStyleSheets.length && first?.localName === "style" ? first : null;
      result[`${path}/shadow/css`] = inline ? css(inline.textContent ?? "") :
        root.adoptedStyleSheets.map(sheet => Array.from(sheet.cssRules, rule => rule.cssText).join("\n")).join("\n");
      Array.from(root.childNodes).filter(child => child !== inline).forEach((child, index) => walk(child, `${path}/shadow/${index}`));
    }
  };
  walk(host, "host");
  return result;
};

const api = {
  snapshot,
  styleOrder(host: Element) {
    const spec = Object.values(elements).find(entry => `m-${entry.spec.name}` === host.localName)!.spec;
    const names = [`host:${spec.name}`, ...SHADOW_BASE_STYLES, ...spec.styles];
    const normalize = (text: string) => {
      const sheet = new CSSStyleSheet(); sheet.replaceSync(text);
      return Array.from(sheet.cssRules, rule => rule.cssText).join("\n");
    };
    const adopted = host.shadowRoot!.adoptedStyleSheets.map(sheet => Array.from(sheet.cssRules, rule => rule.cssText).join("\n"));
    return { names, sources: names.map(name => normalize(styleText(name)!)), adopted };
  },
  mount(html: string): Element {
    defineAll();
    const container = document.createElement("main");
    setHTML(container, html);
    document.body.append(container);
    return container.firstElementChild!;
  },
  upgrade: () => defineAll(),
};
Object.assign(window, { ssrParity: api });
export type ParityAPI = typeof api;
