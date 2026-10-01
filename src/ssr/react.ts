// src/ssr/react.ts
/** Enable declarative shadow DOM for mtrl/react in this server process. @module ssr/react */
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
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
  return bridge.shadow(tag, markup, prefix);
};
