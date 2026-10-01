// src/ssr/render-element.ts
import { DOMParser } from "linkedom";
import { elements } from "../elements";
import { createElementClass, type ElementSpec, type ElementComponent } from "../elements/define";
import { isFallbackStyle } from "../elements/styles";
import { getComponentDefaults } from "../core/config/global";
import { setHTML } from "../core/dom/html";
import { withServerScope } from "./server-dom";
import { attributesText, serializeNode } from "./serialize";
import { renderStyles } from "./styles";

/** true emits an empty attribute; false, null and undefined omit it. Numbers must be finite. */
export type RenderAttributes = Readonly<Record<string, string | number | boolean | null | undefined>>;
/** Tag prefix defaults to "m". Link styles may flash while their CSS loads. */
export type RenderOptions = { prefix?: string } & (
  | { styles?: "inline" }
  | { styles: "link"; cssBase: string }
);
const specs = new Map<string, ElementSpec<ElementComponent>>(
  Object.values(elements).map(({ spec }) => [spec.name, spec as unknown as ElementSpec<ElementComponent>]),
);
const globals = new Set(("id class style title slot part exportparts role tabindex hidden inert lang dir draggable " +
  "accesskey contenteditable spellcheck translate autocapitalize autofocus name form").split(" "));

const validateAttributes = (attributes: RenderAttributes, spec: ElementSpec<ElementComponent>): Map<string, string> => {
  if (!attributes || typeof attributes !== "object" || Array.isArray(attributes)) throw new TypeError("Attributes must be a record");
  const result = new Map<string, string>();
  const seen = new Set<string>();
  for (const key of Reflect.ownKeys(attributes)) {
    if (typeof key !== "string") throw new TypeError("Attribute names must be strings");
    const name = key.toLowerCase();
    if (!/^[a-z][a-z0-9_.:-]*$/.test(name) || /^on/.test(name) || name === "srcdoc" || seen.has(name) ||
        !(globals.has(name) || /^(data|aria)-[a-z0-9_.:-]+$/.test(name) || Object.prototype.hasOwnProperty.call(spec.attributes ?? {}, name) || spec.slot?.attribute === name)) {
      throw new TypeError(`Invalid host attribute: ${key}`);
    }
    seen.add(name);
    const value = attributes[key];
    if (value === false || value === null || value === undefined) continue;
    if (!["string", "number", "boolean"].includes(typeof value) || (typeof value === "number" && !Number.isFinite(value))) {
      throw new TypeError(`Invalid value for attribute: ${key}`);
    }
    const text = value === true ? "" : String(value);
    if (text.includes("\0")) throw new TypeError(`NUL in attribute: ${key}`);
    result.set(name, text);
  }
  return result;
};

const validateOptions = (options: RenderOptions): string => {
  if (!options || typeof options !== "object" || Array.isArray(options)) throw new TypeError("Invalid render options");
  const prefix = options.prefix ?? "m";
  if (typeof prefix !== "string" || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(prefix)) throw new TypeError("Invalid tag prefix");
  for (const key of Reflect.ownKeys(options)) {
    if (!["prefix", "styles", "cssBase"].includes(String(key))) throw new TypeError(`Invalid render option: ${String(key)}`);
  }
  if (options.styles !== undefined && options.styles !== "inline" && options.styles !== "link") throw new TypeError("Invalid styles mode");
  if (options.styles === "link") {
    const base = options.cssBase;
    // eslint-disable-next-line no-control-regex
    if (typeof base !== "string" || !base || /[\s\u0000-\u001f\u007f\\<>"'?#]/.test(base) || base.startsWith("//") ||
        (/^[^/]*:/.test(base) && !/^https?:\/\/[^/]+/i.test(base))) throw new TypeError("cssBase must be a relative or HTTP(S) URL base");
    if (/^https?:/i.test(base)) {
      const url = new URL(base);
      if (url.username || url.password) throw new TypeError("cssBase must not contain credentials");
    }
  } else if ("cssBase" in options) throw new TypeError("cssBase requires styles: link");
  return prefix;
};

/**
 * Render a registered tag to declarative shadow DOM, synchronously and detached.
 * Children are HTML processed by setHTML/configureHTML. The default policy is
 * identity: this function is NOT a sanitizer. Configure a synchronous sanitizer
 * for untrusted children or HTML-valued attributes such as icons.
 *
 * Each call owns a temporary DOM realm (zero layout, 1024×768 viewport); hooks
 * must be synchronous and must not reenter the renderer. Base/theme CSS belongs
 * in the page head. Every shadow root receives its own styles.
 * Known asynchronous configurations throw before mounting (FLO-370).
 */
export function renderElement(
  tag: string,
  attributes: RenderAttributes = {},
  children = "",
  options: RenderOptions = {},
): string {
  const prefix = validateOptions(options);
  // Global defaults also reach factories created inside another component.
  // These paths start native promises/imports, outside the inert scheduler.
  const defaultsFor = getComponentDefaults as (name: string) => {
    showProgress?: boolean; buttons?: readonly unknown[]; presentation?: string;
  } | undefined;
  if (defaultsFor("button")?.showProgress || defaultsFor("card")?.buttons?.length ||
      defaultsFor("fab-menu")?.presentation === "menu") {
    throw new TypeError("SSR cannot use asynchronous button/card/fab-menu global defaults (FLO-370)");
  }
  const resolve = (name: string): ElementSpec<ElementComponent> | undefined =>
    name.startsWith(`${prefix}-`) ? specs.get(name.slice(prefix.length + 1)) : undefined;
  const spec = typeof tag === "string" ? resolve(tag) : undefined;
  if (!spec) throw new TypeError(`Unknown renderable tag: ${String(tag)}`);
  const attrs = validateAttributes(attributes, spec);
  if (typeof children !== "string") throw new TypeError("Children must be an HTML string");
  try {
    return withServerScope(scope => {
      for (const [name, entry] of specs) customElements.define(`${prefix}-${name}`, createElementClass(entry));
      const host = scope.document.createElement(tag);
      for (const [name, value] of attrs) host.setAttribute(name, value);
      setHTML(host, children);
      // linkedom parses textarea as raw text and keeps HTML's ignored first
      // newline. Repair only authored nodes, after the HTML policy has run.
      const normalize = (node: Element): void => {
        if (node.localName === "textarea") {
          const raw = (node.textContent ?? "").replace(/</g, "&lt;");
          const decoded = new DOMParser().parseFromString(`<span>${raw}</span>`, "text/html").firstElementChild!.textContent ?? "";
          node.textContent = decoded;
        }
        if (["textarea", "pre", "listing"].includes(node.localName) && node.firstChild?.nodeType === 3) {
          node.firstChild.textContent = (node.firstChild.textContent ?? "").replace(/^\n/, "");
        }
        const container = node.localName === "template" ? (node as HTMLTemplateElement).content : node;
        for (const child of Array.from(container.children)) normalize(child);
      };
      normalize(host);
      // Audit the entire authored tree before the first factory runs. Templates
      // are inert; their declarations are never mounted or interpreted here.
      const audit = (element: Element, depth: number): void => {
        if (element.localName === "template") return;
        const entry = resolve(element.localName);
        if (entry) {
          if (depth >= 64) throw new RangeError("SSR element nesting exceeds 64 levels");
          validateAttributes(Object.fromEntries(Array.from(element.attributes, a => [a.name, a.value])), entry);
          if (entry.name === "fab-menu" && (element.hasAttribute("open") || element.getAttribute("presentation") === "menu")) {
            throw new TypeError("SSR cannot render fab-menu[open] or fab-menu[presentation=menu] (FLO-370)");
          }
          if (Array.from(element.children).some(child => child.localName === "template" && child.hasAttribute("shadowrootmode"))) {
            throw new TypeError("SSR host already declares a shadow root");
          }
          depth++;
        }
        if (element.localName === `${prefix}-menu-item` && element.querySelector(`${prefix}-menu-item`)) {
          throw new TypeError("SSR cannot render nested submenu declarations (FLO-370)");
        }
        for (const child of Array.from(element.children)) audit(child, depth);
      };
      audit(host, 0);
      const expand = (element: HTMLElement, depth: number): string | undefined => {
        const entry = resolve(element.localName);
        if (!entry) return undefined;
        audit(element, depth);
        const authored = Array.from(element.attributes, a => [a.name, a.value] as const);
        const light = Array.from(element.childNodes, node => node.cloneNode(true));
        const styles = renderStyles(entry, options);
        scope.mount(element);
        const shadow = Array.from(element.shadowRoot!.childNodes)
          .filter(node => !isFallbackStyle(node))
          .map(node => serializeNode(node, expand, depth + 1)).join("");
        const content = light.map(node => serializeNode(node, expand, depth + 1)).join("");
        return `<${element.localName}${attributesText(authored)}><template shadowrootmode="open" shadowrootdelegatesfocus="">` +
          `${styles}${shadow}</template>${content}</${element.localName}>`;
      };
      return expand(host, 0)!;
    });
  } catch (cause) {
    const Failure = cause instanceof RangeError ? RangeError : cause instanceof TypeError ? TypeError : Error;
    const error = new Failure(`SSR <${tag}>: ${cause instanceof Error ? cause.message : String(cause)}`);
    Object.defineProperty(error, "cause", { value: cause, configurable: true });
    throw error;
  }
}
