// src/ssr/solid.ts
/** Enable declarative shadow DOM for mtrl/solid in this server process. @module ssr/solid */
import { sharedConfig } from "solid-js";
import { resolveSSRNode, ssrElement } from "solid-js/web";
import "./index";

const bridge = (globalThis as unknown as Record<symbol, {
  shadow: (tag: string, markup: string, prefix: string) => string;
  solid?: (
    tag: string,
    props: Record<string, unknown>,
    children: () => unknown,
    prefix: string,
  ) => string;
}>)[Symbol.for("mtrl.ssr")];

let serializingChildren = false;
const TAG = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

/**
 * Light DOM for one host, rendered where Solid will not assign hydration keys.
 * The page render that follows assigns those keys; spending them here would
 * make the browser look up nodes that exist only inside this string.
 */
const renderHost = (tag: string, props: Record<string, unknown>, children: () => unknown): string => {
  const previous = sharedConfig.context;
  // A fresh context so this string spends none of the page's hydration ids.
  // `noHydrate` is read by Solid at runtime; the public context type omits it.
  sharedConfig.context = {
    id: "",
    count: 0,
    noHydrate: true,
    suspense: {},
    lazy: {},
    assets: [],
    serialize() { /* discarded with this string */ },
    roots: 0,
    nextRoot() { return ""; },
  } as NonNullable<typeof sharedConfig.context>;
  try {
    const host: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(props)) {
      if (key === "children" || typeof value === "function") continue;
      host[key] = value;
    }
    return resolveSSRNode(ssrElement(tag, host, children(), false));
  } finally {
    sharedConfig.context = previous;
  }
};

bridge.solid = (tag, props, children, prefix) => {
  // Nested hosts emit their own roots in the outer tree. Serializing them
  // again would declare a shadow root twice, which the renderer rejects.
  if (serializingChildren) return "";
  if (!TAG.test(tag)) throw new TypeError(`Invalid tag: ${tag}`);
  let markup: string;
  serializingChildren = true;
  try {
    markup = renderHost(tag, props, children);
  } finally {
    serializingChildren = false;
  }
  // An opted-out host has no shadow content and must not get an empty template.
  const html = bridge.shadow(tag, markup, prefix);
  return html ? `<template shadowrootmode="open" shadowrootdelegatesfocus="">${html}</template>` : "";
};
