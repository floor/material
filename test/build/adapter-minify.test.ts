// test/build/adapter-minify.test.ts
import { expect, test } from "bun:test";
import { minifyAdapterModule } from "../../scripts/build-modules";

// The shape tsc emits for src/ssr/react.ts once the build has rewritten the
// specifier: the side-effect import must survive, in place, or the adapter
// reads the bridge before the SSR entry has installed it.
const EMIT = `// src/ssr/react.ts
import * as React from "react";
import * as ReactDOMServer from "react-dom/server";
import "./index.js";
const bridge = globalThis[Symbol.for("mtrl.ssr")];
// Prose the emit used to carry.
const RETRY_DELAYS_MS = [0, 2, 4, 8, 16, 32, 64, 128, 250];
const probe = () => ReactDOMServer.renderToStaticMarkup(React.createElement(() => {
  throw new Promise(() => {});
}));
bridge.react = (tag, props) => tag + RETRY_DELAYS_MS.length + typeof probe + typeof props;
`;

test("the minified adapter emit keeps its imports and their order", () => {
  const output = minifyAdapterModule(EMIT);
  expect(output).toMatch(/from\s*"react"/);
  expect(output).toMatch(/from\s*"react-dom\/server"/);
  expect(output).toMatch(/import\s*"\.\/index\.js"/);
  expect(output.indexOf('"react"')).toBeLessThan(output.indexOf('"react-dom/server"'));
  expect(output.indexOf('"react-dom/server"')).toBeLessThan(output.indexOf('"./index.js"'));
  expect(output).not.toContain("src/ssr/react.ts");
  expect(output).not.toContain("Prose the emit used to carry");
  expect(output.length).toBeLessThan(EMIT.length);
  expect(minifyAdapterModule(EMIT)).toBe(output);
});

test("the minified emit keeps the adapters' runtime NODE_ENV check", () => {
  // The transpiler defines process.env.NODE_ENV as "development" by default;
  // without the build's self-define this compiles to `true`, and a production
  // server render warns as if it were development.
  const source = `globalThis[Symbol.for("adapter-minify-probe")] = (() => {
    try {
      return typeof process !== "undefined" && process.env != null && process.env.NODE_ENV !== "production";
    } catch {
      return false;
    }
  })();
`;
  const run = () => {
    new Function(minifyAdapterModule(source))();
    return (globalThis as unknown as Record<symbol, unknown>)[Symbol.for("adapter-minify-probe")];
  };
  const before = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "production";
    expect(run()).toBe(false);
    process.env.NODE_ENV = "development";
    expect(run()).toBe(true);
  } finally {
    if (before === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = before;
  }
});

test("minification keeps the wrapper's behaviour and its comment-like data", () => {
  // The adapters have no exports: they register on a global and are imported
  // for that side effect. The probe fixture does the same, so the minified
  // module is evaluated exactly as the adapter is.
  const source = `const retryDelays = [0, 2, 4, 8, 16, 32, 64, 128, 250];
// Prose is not behaviour.
const firstFrame = (error) => {
  if (!(error instanceof Error) || typeof error.stack !== "string") return undefined;
  return error.stack.split("\\n").find((line) => line.trim().startsWith("at "));
};
const template = (html) => \`<template shadowrootmode="open">\${html}</template>\`;
const literal = "// not a comment";
const error = new Error("boom");
error.stack = "Error: boom\\n    at probe (file:1:2)";
globalThis[Symbol.for("adapter-minify-probe")] = [template("<b>1</b>"), firstFrame(error), literal, retryDelays.length];
`;
  const run = (text: string) => {
    new Function(text)();
    return (globalThis as unknown as Record<symbol, unknown>)[Symbol.for("adapter-minify-probe")];
  };
  const output = minifyAdapterModule(source);
  expect(output).not.toContain("Prose is not behaviour");
  expect(run(output)).toEqual(run(source));
});
