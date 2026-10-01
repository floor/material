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
let suspended = false;

/** Shown by the static pass when a child suspends. The flag is the only result that matters. */
const StaticFallback = (): null => {
  suspended = true;
  return null;
};

bridge.react = (tag, props, children, prefix) => {
  // Pass declaration HTML to the renderer. Nested React components emit their
  // own roots when React renders the outer tree; feeding those templates back
  // into the renderer would declare a shadow root twice.
  if (serializingChildren) return undefined;
  let markup: string;
  suspended = false;
  serializingChildren = true;
  try {
    // renderToStaticMarkup has no boundary of its own: a suspending child
    // throws "suspended while responding to synchronous input" out of the
    // host, and the page's boundary client-renders. A boundary here renders
    // the fallback instead of throwing.
    markup = renderToStaticMarkup(React.createElement(
      tag, props, React.createElement(React.Suspense, { fallback: React.createElement(StaticFallback) }, children),
    ));
  } finally { serializingChildren = false; }
  // That fallback is an empty light DOM, and the host is not rendered again
  // when the content arrives, so the template would keep the empty snapshot:
  // no label slot, no tabs, no list items. Suspending retries the host. A
  // boundary already inside the children still wins, and this pass then sees
  // that boundary's fallback rather than the resolved children.
  if (suspended) throw new Promise<void>((resolve) => { setTimeout(resolve, 0); });
  // Let React serialize host props (style objects, tabIndex, boolean/data/aria
  // attributes). The server bridge parses them in its own DOM realm.
  // An opted-out host has no shadow content and must not get an empty template.
  return bridge.shadow(tag, markup, prefix) || undefined;
};
