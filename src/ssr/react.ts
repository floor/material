// src/ssr/react.ts
/**
 * Enable declarative shadow DOM for mtrl/react in this server process.
 * The identity HTML policy is not a sanitizer; configure a synchronous sanitizer for untrusted markup.
 * The server-rendered shadow root is built without the providers above the component.
 * The children see that context in the page's own render; this separate render for the declarative shadow root is built without those providers.
 * Until upgrade, the painted shadow root shows the context's default value, or there is no declarative shadow root when a child requires its provider.
 * Pass the resolved string as a prop or attribute, or accept client-rendered text until the upgrade. A fix is planned for 1.1 (FLO-517).
 * @module ssr/react
 */
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
/**
 * The identity HTML policy is not a sanitizer; configure a synchronous sanitizer for untrusted markup.
 * The server-rendered shadow root is built without the providers above the component.
 * The children see that context in the page's own render; this separate render for the declarative shadow root is built without those providers.
 * Until upgrade, the painted shadow root shows the context's default value, or there is no declarative shadow root when a child requires its provider (FLO-517).
 * @module ssr/react
 */
import "./index";

const bridge = (globalThis as unknown as Record<symbol, {
  shadow: (tag: string, markup: string, prefix: string) => string;
  react?: (tag: string, props: Record<string, unknown>, children: React.ReactNode, prefix: string) => string | undefined;
}>)[Symbol.for("mtrl.ssr")];
let serializingChildren = false;
bridge.react = (tag, props, children, prefix) => {
  // Pass declaration HTML to the renderer. Nested React components emit their
  // own roots when React renders the outer tree; feeding those templates back
  // into the renderer would declare a shadow root twice.
  if (serializingChildren) return undefined;
  let markup: string;
  serializingChildren = true;
  try {
    markup = renderToStaticMarkup(React.createElement(tag, props, children));
  } finally { serializingChildren = false; }
  // Let React serialize host props (style objects, tabIndex, boolean/data/aria
  // attributes). The server bridge parses them in its own DOM realm.
  // An opted-out host has no shadow content and must not get an empty template.
  return bridge.shadow(tag, markup, prefix) || undefined;
};
