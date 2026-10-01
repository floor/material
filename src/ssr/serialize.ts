// src/ssr/serialize.ts
import { removeEmptyStyles } from "./server-dom";

export const escapeText = (text: string): string => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\r/g, "&#13;");
export const escapeAttribute = (text: string): string => escapeText(text).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const htmlNamespace = "http://www.w3.org/1999/xhtml";
const voidTags = new Set("area base br col embed hr img input link meta param source track wbr".split(" "));
const rawTags = new Set("script style xmp iframe noembed noframes".split(" "));

/** Raw text uses parser delimiters, never HTML entity escaping. */
export const rawText = (tag: string, text: string): string => {
  if (text.includes("\0") || new RegExp(`</${tag}`, "i").test(text) ||
      (tag === "script" && /<!--|<script/i.test(text))) {
    throw new TypeError(`Unsafe raw text in <${tag}>`);
  }
  return text;
};

export const attributesText = (attributes: Iterable<readonly [string, string]>): string =>
  Array.from(attributes, ([name, value]) => {
    if (!/^[a-zA-Z_:][a-zA-Z0-9_.:-]*$/.test(name) || value.includes("\0")) {
      throw new TypeError(`Invalid serialized attribute: ${name}`);
    }
    return ` ${name}="${escapeAttribute(value)}"`;
  }).join("");

/** One serializer for light DOM, shadow DOM and inert template contents. */
export const serializeNode = (
  node: Node,
  expand: (element: HTMLElement, depth: number) => string | undefined,
  depth = 0,
  inert = false,
): string => {
  if (node.nodeType === 3) return escapeText(node.textContent ?? "");
  if (node.nodeType === 8) {
    const text = node.textContent ?? "";
    // Reject ambiguous HTML comment endings, including bogus linkedom comments.
    if (/[<>\0]|--/.test(text)) throw new TypeError("Unsafe HTML comment");
    return `<!--${text}-->`;
  }
  if (node.nodeType !== 1) throw new TypeError(`Unsupported SSR node type: ${node.nodeType}`);
  const element = node as HTMLElement;
  const html = element.namespaceURI === htmlNamespace;
  const tag = element.localName;
  if (!/^[a-zA-Z][a-zA-Z0-9_.:-]*$/.test(tag)) throw new TypeError("Invalid serialized tag");
  if (!inert && html) {
    const rendered = expand(element, depth);
    if (rendered !== undefined) return rendered;
  }
  if (html && (tag === "plaintext" || tag === "noscript")) throw new TypeError(`Unsupported parser context: ${tag}`);
  if (html) removeEmptyStyles(element);
  const attributes = new Map(Array.from(element.attributes, attr => [attr.name, attr.value]));
  // Live form state must survive parsing; JS properties alone do not serialize.
  if (html && tag === "input") {
    const input = element as HTMLInputElement;
    if (input.value || attributes.has("value")) attributes.set("value", input.value);
    if (input.checked) attributes.set("checked", "");
    else attributes.delete("checked");
  }
  const opening = `<${tag}${attributesText(attributes)}>`;
  if (html && voidTags.has(tag)) return opening;
  let content: string;
  if (html && rawTags.has(tag)) content = rawText(tag, element.textContent ?? "");
  else if (html && (tag === "textarea" || tag === "title")) {
    const value = tag === "textarea" ? (element as HTMLTextAreaElement).value : element.textContent ?? "";
    content = (tag === "textarea" && value.startsWith("\n") ? "\n" : "") + escapeText(value);
  } else {
    const template = html && tag === "template";
    const children = template ? (element as HTMLTemplateElement).content.childNodes : element.childNodes;
    content = Array.from(children, child => serializeNode(child, expand, depth, inert || template)).join("");
    if (html && (tag === "pre" || tag === "listing") && content.startsWith("\n")) content = "\n" + content;
  }
  return `${opening}${content}</${tag}>`;
};
