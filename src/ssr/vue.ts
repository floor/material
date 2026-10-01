// src/ssr/vue.ts
/** Enable declarative shadow DOM for mtrl/vue in this server process. @module ssr/vue */
import { h, type VNode } from "vue";
import { ssrRenderVNode } from "@vue/server-renderer";
import "./index";

const bridge = (globalThis as unknown as Record<symbol, {
  shadow: (tag: string, markup: string, prefix: string) => string;
  vue?: (
    tag: string,
    props: Record<string, unknown>,
    children: () => VNode[],
    prefix: string,
  ) => string;
}>)[Symbol.for("mtrl.ssr")];

let serializingChildren = false;
const TAG = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

/**
 * One host as HTML, using the synchronous renderer `renderToString` walks.
 * The bridge cannot await `renderToString`: Vue calls this while it is
 * already rendering, and that entry always returns a promise.
 */
const renderHost = (tag: string, props: Record<string, unknown>, children: VNode[]): string => {
  const parts: unknown[] = [];
  const push = (item: unknown): void => {
    parts.push(item);
  };
  ssrRenderVNode(push as Parameters<typeof ssrRenderVNode>[0], h(tag, props, children), null as never);
  return flatten(parts);
};

/** Strings and nested buffers. A promise means an async child, which this bridge cannot wait for. */
const flatten = (item: unknown): string => {
  if (typeof item === "string") return item;
  if (Array.isArray(item)) {
    let html = "";
    for (const part of item) html += flatten(part);
    return html;
  }
  throw new TypeError("Vue SSR shadow markup must be synchronous");
};

bridge.vue = (tag, props, children, prefix) => {
  // Nested hosts emit their own roots in the outer tree. Serializing them
  // again would declare a shadow root twice, which the renderer rejects.
  if (serializingChildren) return "";
  if (!TAG.test(tag)) throw new TypeError(`Invalid tag: ${tag}`);
  let markup: string;
  serializingChildren = true;
  try {
    markup = renderHost(tag, props, children());
  } finally {
    serializingChildren = false;
  }
  // An opted-out host has no shadow content and must not get an empty template.
  const html = bridge.shadow(tag, markup, prefix);
  return html ? `<template shadowrootmode="open" shadowrootdelegatesfocus="">${html}</template>` : "";
};
