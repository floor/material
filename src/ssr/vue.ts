// src/ssr/vue.ts
/** Enable declarative shadow DOM for mtrl/vue in this server process. @module ssr/vue */
import { getCurrentInstance, h, type ComponentInternalInstance, type VNode } from "vue";
import { ssrRenderVNode } from "@vue/server-renderer";
import "./index";

const bridge = (globalThis as unknown as Record<symbol, {
  shadow: (tag: string, markup: string, prefix: string) => string;
  vue?: (
    tag: string,
    props: Record<string, unknown>,
    children: () => VNode[],
    prefix: string,
  ) => string | Promise<string>;
}>)[Symbol.for("mtrl.ssr")];

const TAG = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

const isThenable = (value: unknown): value is Promise<unknown> =>
  typeof value === "object" && value !== null && typeof (value as { then?: unknown }).then === "function";

/**
 * Vue pushes promises into the buffer when a child `setup` is async. They
 * resolve to strings or nested buffers, in order. Anything else is not markup.
 */
const flatten = (item: unknown): string | Promise<string> => {
  if (typeof item === "string") return item;
  if (isThenable(item)) return Promise.resolve(item).then((value) => Promise.resolve(flatten(value)));
  if (Array.isArray(item)) {
    let html = "";
    let chain: Promise<string> | null = null;
    for (const part of item) {
      const next = flatten(part);
      if (chain) {
        const step = next;
        chain = chain.then((soFar) => typeof step === "string" ? soFar + step : step.then((value) => soFar + value));
      } else if (typeof next === "string") {
        html += next;
      } else {
        const soFar = html;
        chain = next.then((value) => soFar + value);
      }
    }
    return chain ?? html;
  }
  throw new TypeError("Vue SSR shadow markup must be HTML");
};

/** Slot nodes, once. A second pass would run `async setup` again under the page's Suspense. */
const renderNodes = (nodes: VNode[], parent: ComponentInternalInstance | null): string | Promise<string> => {
  const parts: unknown[] = [];
  const push = (item: unknown): void => {
    parts.push(item);
  };
  // The public vnode type omits the scope ids Vue's renderer copies onto slot content.
  const scope = (parent?.vnode as { slotScopeIds?: string[] | null } | undefined)?.slotScopeIds?.join(" ") || undefined;
  const instance = parent ?? (null as unknown as ComponentInternalInstance);
  for (const node of nodes) ssrRenderVNode(push as Parameters<typeof ssrRenderVNode>[0], node, instance, scope);
  return flatten(parts);
};

/** Opening tag, so the shadow renderer can read the host attributes. Children stay separate. */
const openTag = (tag: string, props: Record<string, unknown>, parent: ComponentInternalInstance | null): string => {
  const parts: unknown[] = [];
  const push = (item: unknown): void => {
    parts.push(item);
  };
  const instance = parent ?? (null as unknown as ComponentInternalInstance);
  ssrRenderVNode(push as Parameters<typeof ssrRenderVNode>[0], h(tag, props), instance);
  const html = flatten(parts);
  if (typeof html !== "string") throw new TypeError("Vue SSR host attributes must be synchronous");
  const closing = `</${tag}>`;
  if (!html.endsWith(closing)) throw new TypeError(`Vue SSR host did not close <${tag}>`);
  return html.slice(0, -closing.length);
};

/**
 * Nested hosts already emitted declarative roots for the page. The shadow
 * renderer rejects a host that contains one, so they come off this copy only.
 */
const stripDeclarativeRoots = (html: string): string => {
  let out = "";
  let cursor = 0;
  while (cursor < html.length) {
    const start = html.indexOf("<template", cursor);
    if (start < 0) return out + html.slice(cursor);
    const openEnd = html.indexOf(">", start);
    if (openEnd < 0) return out + html.slice(cursor);
    const open = html.slice(start, openEnd + 1);
    if (!/\sshadowrootmode(?:=|\s|>)/.test(open) && !open.endsWith(" shadowrootmode>")) {
      out += html.slice(cursor, openEnd + 1);
      cursor = openEnd + 1;
      continue;
    }
    out += html.slice(cursor, start);
    let depth = 1;
    let nested = openEnd + 1;
    while (depth > 0) {
      const nextOpen = html.indexOf("<template", nested);
      const nextClose = html.indexOf("</template>", nested);
      if (nextClose < 0) throw new TypeError("Unclosed declarative shadow template");
      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth += 1;
        nested = nextOpen + "<template".length;
      } else {
        depth -= 1;
        nested = nextClose + "</template>".length;
      }
    }
    cursor = nested;
  }
  return out;
};

bridge.vue = (tag, props, children, prefix) => {
  if (!TAG.test(tag)) throw new TypeError(`Invalid tag: ${tag}`);
  const parent = getCurrentInstance();
  const open = openTag(tag, props, parent);
  // One render of the real slot nodes. Sync markup stays a string; an async
  // child becomes a promise the page buffer already knows how to await.
  const light = renderNodes(children(), parent);
  const finish = (lightHtml: string): string => {
    const html = bridge.shadow(tag, `${open}${stripDeclarativeRoots(lightHtml)}</${tag}>`, prefix);
    const template = html ? `<template shadowrootmode="open" shadowrootdelegatesfocus="">${html}</template>` : "";
    return `${template}${lightHtml}`;
  };
  return typeof light === "string" ? finish(light) : light.then(finish);
};
