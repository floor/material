// Host attributes after render, for the React checks. `data-mtrl-ssr` is
// reported separately: the comparison of everything else is what
// `suppressHydrationWarning` would hide.
//
// A live property (`value`, `checked`) is an attribute on the server, the
// markup's default, and a property in the browser. Hydration leaves the
// attribute in the DOM; a client render never writes it.

import { describe, type ComponentSpec } from "../../src/elements/adapter";
import { elements } from "../../src/elements";

export interface ComponentHost {
  tag: string;
  ssr: boolean;
  attrs: Record<string, string>;
}

const serverDefaultAttributes = new Set<string>();
for (const element of Object.values(elements)) {
  for (const attribute of describe(element.spec as ComponentSpec).shadowedBy.values()) {
    serverDefaultAttributes.add(attribute.name);
  }
}

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

/** Hydrated attributes with the server-only defaults removed when the client render has none. */
export const comparableAttributes = (hydrated: ComponentHost, client: ComponentHost): Record<string, string> => {
  const attrs = { ...hydrated.attrs };
  for (const name of serverDefaultAttributes) {
    if (!Object.prototype.hasOwnProperty.call(client.attrs, name)) delete attrs[name];
  }
  return normalize(attrs);
};

/** Client-render attributes, with `style` in the same form as the server. */
export const clientAttributes = (client: ComponentHost): Record<string, string> => normalize({ ...client.attrs });

/** Component hosts under `#root` for one tag prefix (`m` or `demo`). */
export const readComponentHosts = (prefix: string): ComponentHost[] => {
  const root = document.getElementById("root");
  if (!root) return [];
  const start = `${prefix}-`;
  return [...root.querySelectorAll("*")].flatMap((el) => {
    if (!el.localName.startsWith(start)) return [];
    const attrs: Record<string, string> = {};
    for (const attr of el.attributes) {
      if (attr.name === "data-mtrl-ssr") continue;
      attrs[attr.name] = attr.value;
    }
    return [{ tag: el.localName, ssr: el.hasAttribute("data-mtrl-ssr"), attrs }];
  });
};
