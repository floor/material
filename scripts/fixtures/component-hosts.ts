// Host attributes after render, for the React checks. `data-mtrl-ssr` is
// reported separately: the comparison of everything else is what
// `suppressHydrationWarning` would hide.
//
// A live property (`value`, `checked`, and the other names in `liveAttributes`)
// is an attribute on the server, the markup's default, and a property in the
// browser. Hydration leaves the attribute in the DOM; a client render never
// writes it. The reader records the property, and the comparison is that
// attribute against it: text against text, or a boolean attribute's presence
// against `true` / `false`. An element that does not have the property keeps
// the attribute, so a shared name does not hide a real attribute.
//
// `style` differs only by serialization, and React 19's `nonce` is a property
// the browser does not reflect. Neither is a live value, so both stay out.

import { camel, describe, type ComponentSpec } from "../../src/elements/adapter";
import { elements } from "../../src/elements";

export interface ComponentHost {
  tag: string;
  ssr: boolean;
  attrs: Record<string, string>;
  /** Live properties keyed by property name. A missing key means this element has none. `null` is a null or undefined property. */
  props: Record<string, string | number | boolean | null>;
}

export interface LiveAttribute {
  /** Attribute name in markup (`second-value`). */
  attribute: string;
  /** Property name on the element (`secondValue`). */
  property: string;
  /** Boolean attributes compare by presence. Every other type compares as text. */
  presence: boolean;
}

const liveByName = new Map<string, LiveAttribute>();
for (const element of Object.values(elements)) {
  for (const attribute of describe(element.spec as ComponentSpec).shadowedBy.values()) {
    const row = liveByName.get(attribute.name);
    if (row) {
      if (attribute.type === "boolean") row.presence = true;
      continue;
    }
    liveByName.set(attribute.name, {
      attribute: attribute.name,
      property: camel(attribute.name),
      presence: attribute.type === "boolean",
    });
  }
}

/** Attributes a live property shadows, one entry per attribute name. */
export const liveAttributes: readonly LiveAttribute[] = [...liveByName.values()];

// React's server render writes `margin-top:4px`. The browser's style attribute
// serializes the same declaration as `margin-top: 4px;`.
const styleText = (value: string): string =>
  value.split(";").map((part) => part.trim().replace(/:\s+/g, ":")).filter(Boolean).sort().join(";");

const normalize = (attrs: Record<string, string>): Record<string, string> => {
  const next = { ...attrs };
  // React 19 sets nonce on the property. The browser does not reflect it to
  // the content attribute, so a client render has none; server markup still does.
  delete next.nonce;
  if (next.style !== undefined) next.style = styleText(next.style);
  return next;
};

const propertyText = (value: string | number | boolean | null | undefined): string | undefined => {
  if (value === undefined || value === null) return undefined;
  return String(value);
};

/** Text the live value contributes. A boolean is `""` when on and absent when off. */
const liveText = (item: LiveAttribute, attribute: string | undefined, property: string | number | boolean | null | undefined, fromProperty: boolean): string | undefined => {
  if (item.presence) return (fromProperty ? property === true : attribute !== undefined) ? "" : undefined;
  return fromProperty ? propertyText(property) : attribute;
};

/**
 * Drops each recorded live attribute and puts back the side being compared:
 * the hydrated attribute, or the client property. Names with no recorded
 * property stay as attributes.
 */
const project = (attrs: Record<string, string>, props: ComponentHost["props"], fromProperty: boolean): Record<string, string> => {
  const next = { ...attrs };
  for (const item of liveAttributes) {
    if (!Object.prototype.hasOwnProperty.call(props, item.property)) continue;
    const attribute = Object.prototype.hasOwnProperty.call(attrs, item.attribute) ? attrs[item.attribute] : undefined;
    delete next[item.attribute];
    const text = liveText(item, attribute, props[item.property], fromProperty);
    if (text !== undefined) next[item.attribute] = text;
  }
  return next;
};

/** Hydrated attributes, each recorded live property compared with the client element's property. */
export const comparableAttributes = (hydrated: ComponentHost, client: ComponentHost): Record<string, string> =>
  normalize(project(hydrated.attrs, client.props, false));

/** Client-render attributes, with recorded live properties in the same form as the hydrated attribute. */
export const clientAttributes = (client: ComponentHost): Record<string, string> =>
  normalize(project(client.attrs, client.props, true));

/** Component hosts under `#root` for one tag prefix (`m` or `demo`). */
export const readComponentHosts = (query: { prefix: string; live: readonly LiveAttribute[] }): ComponentHost[] => {
  const root = document.getElementById("root");
  if (!root) return [];
  const start = `${query.prefix}-`;
  return [...root.querySelectorAll("*")].flatMap((el) => {
    if (!el.localName.startsWith(start)) return [];
    const attrs: Record<string, string> = {};
    for (const attr of el.attributes) {
      if (attr.name === "data-mtrl-ssr") continue;
      attrs[attr.name] = attr.value;
    }
    const props: ComponentHost["props"] = {};
    const target = el as unknown as Record<string, unknown>;
    for (const item of query.live) {
      if (!(item.property in el)) continue;
      const value = target[item.property];
      if (item.presence) props[item.property] = value === true;
      else if (typeof value === "number") props[item.property] = Number.isFinite(value) ? value : null;
      else if (typeof value === "string") props[item.property] = value;
      else if (value === null || value === undefined) props[item.property] = null;
      else props[item.property] = String(value);
    }
    return [{ tag: el.localName, ssr: el.hasAttribute("data-mtrl-ssr"), attrs, props }];
  });
};
