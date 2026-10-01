// src/ssr/react.ts
/** Enable declarative shadow DOM for mtrl/react in this server process. @module ssr/react */
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import "./index";

const bridge = (globalThis as unknown as Record<symbol, {
  shadow: (tag: string, markup: string, prefix: string) => string;
  react?: (tag: string, props: Record<string, unknown>, children: React.ReactNode, prefix: string) => string | undefined;
}>)[Symbol.for("mtrl.ssr")];

/**
 * Waits before each retry of a suspending child. The first retry is the next
 * task, so a child that resolves in a few milliseconds is snapshotted at once.
 * The wait then doubles, and further retries keep the last step. A slow child
 * is rendered a few times a second instead of hundreds.
 */
const RETRY_DELAYS_MS = [0, 2, 4, 8, 16, 32, 64, 128, 250];

/**
 * Suspensions past this are left to the page. Forty attempts is about eight
 * seconds at the delays above. The host is then rendered with no shadow root,
 * and the page keeps streaming for as long as it would without the bridge.
 */
const MAX_SUSPENDS = 40;

let serializingChildren = false;

interface Attempt { count: number; nodes: object[] }

/** One counter per host. The child element is stable across the host's retries; a ref is not. */
const attempts = new WeakMap<object, Attempt>();

/**
 * renderToStaticMarkup reports a synchronous suspend only as an Error message.
 * The thenable the child threw does not escape, and the error carries no code
 * or digest. Development builds, and React 18 in production, keep the sentence.
 * React 19's browser production build (what Bun loads for react-dom/server)
 * minifies it to #426. A Suspense fallback is also what a thrown error renders
 * here, and an error boundary is not consulted, so the message is the signal.
 */
const isSynchronousSuspend = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const message = error.message;
  return message.includes("suspended while responding to synchronous input")
    || /Minified React error #426\b/.test(message);
};

/** Elements the attempt counter can hang from. Slot wrappers are recreated on every host render, so the counter hangs from the child inside them. */
const childNodes = (children: React.ReactNode): object[] => {
  const nodes: object[] = [];
  const visit = (node: React.ReactNode): void => {
    if (Array.isArray(node)) {
      for (const child of node) visit(child);
      return;
    }
    if (node === null || typeof node !== "object") return;
    if (React.isValidElement(node) && node.type === "span") {
      const props = node.props as { slot?: unknown; children?: React.ReactNode };
      if (props.slot != null) {
        visit(props.children);
        return;
      }
    }
    nodes.push(node);
  };
  const top = React.isValidElement(children) && children.type === React.Fragment
    ? (children.props as { children?: React.ReactNode }).children
    : children;
  visit(top);
  return nodes;
};

const nextAttempt = (children: React.ReactNode): number => {
  const nodes = childNodes(children);
  if (nodes.length === 0) return MAX_SUSPENDS + 1;
  let state: Attempt | undefined;
  for (const node of nodes) {
    state = attempts.get(node);
    if (state) break;
  }
  if (!state) state = { count: 0, nodes };
  state.count += 1;
  state.nodes = nodes;
  for (const node of nodes) attempts.set(node, state);
  return state.count;
};

const clearAttempt = (children: React.ReactNode): void => {
  const nodes = childNodes(children);
  let state: Attempt | undefined;
  for (const node of nodes) {
    state = attempts.get(node);
    if (state) break;
  }
  if (!state) return;
  for (const node of state.nodes) attempts.delete(node);
  for (const node of nodes) attempts.delete(node);
};

const retryDelay = (attempt: number): number =>
  RETRY_DELAYS_MS[Math.min(attempt - 1, RETRY_DELAYS_MS.length - 1)] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1] ?? 250;

bridge.react = (tag, props, children, prefix) => {
  // Nested hosts emit their own roots when React renders the outer tree.
  // A template from this pass would declare a shadow root twice.
  if (serializingChildren) return undefined;
  let markup: string;
  serializingChildren = true;
  try {
    // No Suspense wrapper here. renderToStaticMarkup renders an error and a
    // suspension as the same fallback, so a wrapper cannot tell them apart.
    // A suspension throws React's synchronous-input error, minified as #426
    // in React 19 production. Any other throw is the child's error. A boundary
    // already inside the children still renders its own fallback, and this
    // pass does not throw.
    markup = renderToStaticMarkup(React.createElement(tag, props, children));
  } catch (error) {
    if (!isSynchronousSuspend(error)) {
      // Returning lets the host finish. The page then renders this child and
      // reports its error, as it does without the bridge.
      clearAttempt(children);
      return undefined;
    }
    const attempt = nextAttempt(children);
    if (attempt > MAX_SUSPENDS) {
      // Same as the child's own error: no template, and the page render
      // reaches the child. A slow response is not a failed request.
      clearAttempt(children);
      return undefined;
    }
    const delay = retryDelay(attempt);
    throw new Promise<void>((resolve) => { setTimeout(resolve, delay); });
  } finally { serializingChildren = false; }
  clearAttempt(children);
  // Let React serialize host props (style objects, tabIndex, boolean/data/aria
  // attributes). The server bridge parses them in its own DOM realm.
  // An opted-out host has no shadow content and must not get an empty template.
  return bridge.shadow(tag, markup, prefix) || undefined;
};
