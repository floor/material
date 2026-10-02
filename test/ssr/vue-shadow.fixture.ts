// test/ssr/vue-shadow.fixture.ts
// Spawned by vue-shadow.test.ts. No DOM shim: this process is the server.
import { expect, test } from "bun:test";
import { PassThrough } from "node:stream";
import { createSSRApp, defineComponent, h, Suspense, type App } from "vue";
import { pipeToNodeWritable, renderToString, renderToWebStream } from "@vue/server-renderer";
import { buttonElement, cardElement, carouselElement, tabsElement } from "../../src/elements";
import { createComponent } from "../../src/vue/create";
import type { ComponentSpec } from "../../src/elements/adapter";
import { assertGlobalHost, GLOBAL_ATTRS_WITH_IS } from "../../scripts/fixtures/ssr-global-host";

const readStream = async (app: App): Promise<string> => {
  const stream = renderToWebStream(app);
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let html = "";
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) {
    const remaining = deadline - Date.now();
    const next = await Promise.race([
      reader.read(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Vue SSR stream did not finish")), remaining)),
    ]);
    if (next.done) return html + decoder.decode();
    html += decoder.decode(next.value, { stream: true });
  }
  throw new Error("Vue SSR stream did not finish");
};

const readNode = (app: App): Promise<string> => new Promise((resolve, reject) => {
  const writable = new PassThrough();
  const chunks: Buffer[] = [];
  const timer = setTimeout(() => reject(new Error("Vue SSR node stream did not finish")), 3000);
  writable.on("data", (chunk: Buffer | string) => chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk));
  writable.on("error", (error) => {
    clearTimeout(timer);
    reject(error);
  });
  writable.on("end", () => {
    clearTimeout(timer);
    resolve(Buffer.concat(chunks).toString());
  });
  pipeToNodeWritable(app, {}, writable);
});

const render = (spec: ComponentSpec, props: Record<string, unknown>, children?: () => unknown): Promise<string> => {
  const Component = createComponent(spec, () => "m-host", "MHost");
  return renderToString(createSSRApp({ render: () => h(Component, props, children) }));
};

test("an unregistered server returns no template; registration renders one and opt-outs render none", async () => {
  const buttonProps = { variant: "filled", disabled: true, onclick: () => undefined };
  const plain = await render(buttonElement.spec, buttonProps, () => "Save");
  expect(plain).not.toContain("shadowrootmode");
  expect(plain).not.toContain("data-mtrl-ssr");
  expect(plain).toContain("disabled");
  expect(plain).toContain("Save");

  await import("../../scripts/fixtures/ssr-css");
  await import("../../src/ssr/vue");
  const bridge = (globalThis as unknown as Record<symbol, { shadow?: unknown; vue?: unknown }>)[Symbol.for("mtrl.ssr")];
  expect(typeof bridge.shadow).toBe("function");
  expect(typeof bridge.vue).toBe("function");

  const html = await render(buttonElement.spec, buttonProps, () => "Save");
  // Vue serializes an empty attribute as the name alone. The selector matches either form.
  expect(html).toMatch(/<m-button\b[^>]*\sdata-mtrl-ssr(?:=""|(?=[\s>]))/);
  expect(html).toContain('<template shadowrootmode="open" shadowrootdelegatesfocus="">');
  expect(html).toMatch(/<m-button[^>]*>\s*<template shadowrootmode="open"/);
  expect(html).toContain("mtrl-button");
  expect(html).toContain("disabled");
  expect(html).toContain("Save");
  expect(html).not.toContain("onclick");

  const ordinary = await render(buttonElement.spec, {
    id: "globals",
    label: "Save",
    disabled: true,
    popover: "auto",
    inputmode: "numeric",
    enterkeyhint: "send",
    itemprop: "name",
    nonce: "abc",
    is: "x-y",
    onclick: "window.__xss=1",
  }, () => "Save");
  assertGlobalHost(ordinary, GLOBAL_ATTRS_WITH_IS);
  expect(ordinary).toContain("disabled");
  // The framework still emits a string handler on the host. The shadow copy must not.
  expect(ordinary).toContain('onclick="window.__xss=1"');
  const shadow = ordinary.slice(ordinary.indexOf('<template shadowrootmode="open"'), ordinary.indexOf("</template>"));
  expect(shadow).not.toContain("onclick");
  expect(shadow).not.toContain("__xss");

  const carousel = await render(carouselElement.spec, { ariaLabel: "Photos" }, () => "Light content");
  expect(carousel).not.toContain("shadowrootmode");
  expect(carousel).not.toContain("data-mtrl-ssr");
  expect(carousel).toContain("Light content");
  expect(carousel).toContain('aria-label="Photos"');

  const tabs = await render(tabsElement.spec, { value: "a" }, () => [
    h("m-tab", { value: "a" }, "Flights"),
    h("m-tab", { value: "b" }, "Trips"),
  ]);
  expect(tabs).toContain('<template shadowrootmode="open" shadowrootdelegatesfocus="">');
  expect(tabs).toContain("Flights");
  expect(tabs).toContain("Trips");

  const Button = createComponent(buttonElement.spec, () => "m-button", "MButton");
  const Card = createComponent(cardElement.spec, () => "m-card", "MCard");
  const nested = await renderToString(createSSRApp({
    render: () => h(Card, { id: "card" }, () => h(Button, { id: "inner" }, () => "Nested")),
  }));
  expect(nested).toMatch(/<m-card[^>]*>\s*<template shadowrootmode="open"/);
  expect(nested).toMatch(/<m-button[^>]*>\s*<template shadowrootmode="open"/);
  expect(nested).toContain("Nested");

  const withPopover = await renderToString(createSSRApp({
    render: () => h(Card, { id: "card" }, () => h(Button, { id: "inner", popover: "auto", label: "Nested" })),
  }));
  const innerAt = withPopover.indexOf('id="inner"');
  expect(innerAt).toBeGreaterThan(-1);
  const innerTemplate = withPopover.slice(innerAt).match(/<template shadowrootmode="open"[^>]*>([\s\S]*?)<\/template>/);
  expect(innerTemplate).not.toBeNull();
  expect(innerTemplate![1]).toContain("mtrl-button");
  expect(innerTemplate![1]).not.toContain("popover");
  expect(withPopover.slice(withPopover.lastIndexOf("<", innerAt), withPopover.indexOf("<template", innerAt))).toMatch(/popover="auto"/);

  // v-html can emit an unclosed declarative template. The string scanner
  // threw on that; the renderer's detached copy tolerates it, and the page
  // keeps the text.
  const vhtml = await renderToString(createSSRApp({
    render: () => h(Button, { id: "vhtml" }, () => h("span", { innerHTML: '<template shadowrootmode="open">' })),
  }));
  expect(vhtml).toMatch(/<m-button[^>]*\bid="vhtml"[^>]*>\s*<template shadowrootmode="open"/);
  expect(vhtml).toContain('<span><template shadowrootmode="open"></span>');

  let setups = 0;
  let reads = 0;
  const pending = new Promise<string>((resolve) => setTimeout(() => resolve("outside-loaded"), 15));
  const Slow = defineComponent({
    name: "Slow",
    async setup() {
      setups += 1;
      await new Promise((resolve) => setTimeout(resolve, 15));
      return () => h("i", { id: "async-setup" }, "async-loaded");
    },
  });
  const Reader = defineComponent({
    name: "Reader",
    async setup() {
      reads += 1;
      const text = await pending;
      return () => h("i", { id: "outside" }, text);
    },
  });
  const SyncRead = defineComponent({
    name: "SyncRead",
    async setup() {
      const text = await pending;
      return () => h(Button, { id: "host-sync" }, () => h("i", { id: "sync-read" }, text));
    },
  });
  const asyncApp = (): App => createSSRApp({
    render: () => h("main", null, [
      h(Suspense, null, {
        default: () => h(Button, { id: "host-async" }, () => h(Slow)),
        fallback: () => h("em", "async-pending"),
      }),
      h(Suspense, null, {
        default: () => h(Button, { id: "host-outside" }, () => h(Reader)),
        fallback: () => h("em", "outside-pending"),
      }),
      h(Suspense, null, {
        default: () => h(SyncRead),
        fallback: () => h("em", "sync-pending"),
      }),
    ]),
  });
  const asyncHtml = await renderToString(asyncApp());
  expect(setups).toBe(1);
  expect(reads).toBe(1);
  expect(asyncHtml).toContain("async-loaded");
  expect(asyncHtml).toContain("outside-loaded");
  expect(asyncHtml).toContain('<i id="sync-read">outside-loaded</i>');
  expect(asyncHtml).not.toContain("pending");
  expect(asyncHtml).toMatch(/<m-button[^>]*\bid="host-async"[^>]*>\s*<template shadowrootmode="open"/);
  expect(asyncHtml).toMatch(/<m-button[^>]*\bid="host-outside"[^>]*>\s*<template shadowrootmode="open"/);
  expect(asyncHtml).toMatch(/<m-button[^>]*\bid="host-sync"[^>]*>\s*<template shadowrootmode="open"/);
  const streamed = await readStream(asyncApp());
  expect(setups).toBe(2);
  expect(reads).toBe(2);
  expect(streamed).toBe(asyncHtml);
  const piped = await readNode(asyncApp());
  expect(setups).toBe(3);
  expect(reads).toBe(3);
  expect(piped).toBe(asyncHtml);
});
