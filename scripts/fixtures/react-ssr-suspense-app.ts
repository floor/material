// scripts/fixtures/react-ssr-suspense-app.ts
// The six shapes from the SSR audit, plus the two from #461: a boundary inside
// the host. React 19 suspends with use(); React 18 throws the promise.
import * as React from "react";
import { runInNewContext } from "node:vm";
import { Button, Card, Tab, Tabs } from "material/react";

const h = React.createElement;
export const SUSPENSE_TEXT = "loaded 5";

type Recorded = Promise<string> & { status?: "pending" | "fulfilled" | "rejected"; value?: string; reason?: unknown };

/** React 19 reads with use(). React 18 throws the promise until it has settled. */
export const readPromise = (promise: Promise<string>): string => {
  const use = (React as { use?: (value: Promise<string>) => string }).use;
  if (typeof use === "function") return use(promise);
  const recorded = promise as Recorded;
  if (recorded.status === "fulfilled") return recorded.value ?? "";
  if (recorded.status === "rejected") throw recorded.reason;
  if (recorded.status !== "pending") {
    recorded.status = "pending";
    promise.then((value) => {
      recorded.status = "fulfilled";
      recorded.value = value;
    }, (reason) => {
      recorded.status = "rejected";
      recorded.reason = reason;
    });
  }
  throw promise;
};

const Late = ({ promise }: { promise: Promise<string> }) => h("i", null, readPromise(promise));

/** #461 review: the same inner boundary wrapped in an ordinary component, so it exists only in the component's output. */
const Wrap = ({ promise }: { promise: Promise<string> }) =>
  h(React.Suspense, { fallback: null }, h(Late, { promise }));

const pending = (ms: number, text: string): Promise<string> => new Promise((resolve) => { setTimeout(() => resolve(text), ms); });

/**
 * #461: a thenable with its own `then` method. React subscribes on the object
 * itself, so the call never dispatches through this realm's Promise.prototype.
 */
const customThenable = (ms: number, text: string): Promise<string> => {
  const callbacks: Array<(value: string) => void> = [];
  let ready = false;
  setTimeout(() => {
    ready = true;
    for (const callback of callbacks.splice(0)) callback(text);
  }, ms);
  return {
    then(onFulfilled?: (value: string) => void) {
      if (ready) onFulfilled?.(text);
      else callbacks.push((value) => onFulfilled?.(value));
    },
  } as unknown as Promise<string>;
};

/** #461: a native Promise from another realm; `then` dispatches on that realm's prototype. */
const foreignThenable = (ms: number, text: string): Promise<string> => {
  const foreign = runInNewContext(
    '(() => { let fulfill; const promise = new Promise(resolve => { fulfill = resolve; }); return { promise, fulfill }; })()',
  ) as { promise: Promise<string>; fulfill: (value: string) => void };
  setTimeout(() => { foreign.fulfill(text); }, ms);
  return foreign.promise;
};

/** One fresh tree. A lazy component must not be reused from an earlier render. */
export const suspenseShape = (name: string, promise: Promise<string>): React.ReactNode => {
  const LazyInner = React.lazy(async () => {
    await pending(5, "lazy loaded");
    return { default: () => h("b", null, "lazy loaded") };
  });
  const fallback = h("em", null, "pending");
  const shapes: Record<string, React.ReactNode> = {
    A: h(React.Suspense, { fallback }, h(Button, { id: "a" }, h(Late, { promise }))),
    A2: h(React.Suspense, { fallback }, h(Button, { id: "a2" }, h(LazyInner))),
    B: h(Card, { id: "b" }, h(React.Suspense, { fallback }, h(Late, { promise }))),
    // #461: a boundary INSIDE the host. The static pass renders the fallback
    // without throwing, so the snapshot is built from the fallback state while
    // the page's own stream waits for the resolved children.
    B2: h(Button, { id: "b2" }, h(React.Suspense, { fallback: null }, h(Late, { promise }))),
    B3: h(Tabs, { id: "b3" }, h(React.Suspense, { fallback }, h(Tab, { label: "One" }, h(Late, { promise }))), h(Tab, { label: "Two" }, "two")),
    // #461 review: a boundary an element walk from the host cannot reach — only
    // the renderer's own pending signal sees it.
    B5: h(Button, { id: "b5" }, h(Wrap, { promise })),
    // #461 round 3: the wrapped boundary suspending on a thenable a
    // prototype-level subscription count cannot see — its own `then` method,
    // then a Promise built in another realm. These shapes build their own
    // thenable, as A2 builds its own lazy component.
    B6: h(Button, { id: "b6" }, h(Wrap, { promise: customThenable(15, SUSPENSE_TEXT) })),
    B7: h(Button, { id: "b7" }, h(Wrap, { promise: foreignThenable(15, SUSPENSE_TEXT) })),
    C: h(React.Suspense, { fallback }, h(({ promise: value }: { promise: Promise<string> }) => h(Button, { id: "c" }, readPromise(value)), { promise })),
    E: h(React.Suspense, { fallback }, h("div", null, h(Late, { promise }))),
    F: h(Button, { id: "f" }, h(Late, { promise })),
  };
  const node = shapes[name];
  if (!node) throw new Error(`Unknown suspense shape: ${name}`);
  return node;
};

export const SUSPENSE_SHAPES = ["A", "A2", "B", "B2", "B3", "B5", "B6", "B7", "C", "E", "F"] as const;

/** Renders inside a host so a check can count static passes. */
export const renderCounts = { sibling: 0 };

export const CountedSibling = (): React.ReactElement => {
  renderCounts.sibling += 1;
  return h("u", null, "sibling");
};

const pendingFallback = h("em", null, "pending");

/** A child whose message copies React's production suspend text. The bridge must not treat it as a suspend. */
const Mislabelled = (): React.ReactNode => {
  throw new Error("Minified React error #426; visit https://react.dev/errors/426 for the full message or use the non-minified dev environment for full errors and additional helpful warnings.");
};

export const mislabelledTree = (): React.ReactNode => h(Button, { id: "mislabelled" }, h(Mislabelled));

/** A host whose child rejects. `boundary` wraps it in the page's Suspense. */
export const rejectionTree = (promise: Promise<string>, boundary: boolean): React.ReactNode => {
  const host = h(Button, { id: boundary ? "rej" : "rej-shell" }, h(Late, { promise }));
  return boundary ? h(React.Suspense, { fallback: pendingFallback }, host) : host;
};

/** Suspense above a host that has a counted sibling and a suspending child. */
export const countedSuspendedButton = (promise: Promise<string>): React.ReactNode =>
  h(React.Suspense, { fallback: pendingFallback }, h(Button, { id: "count" }, h(CountedSibling), h(Late, { promise })));

/**
 * #461: a boundary inside the host that never resolves, with a counted sibling
 * beside it. The retry ladder re-renders the sibling on every attempt before the
 * cap ships the fallback-shaped root; a single-pass snapshot renders it once.
 */
export const neverBoundaryButton = (): React.ReactNode =>
  h(Button, { id: "never-boundary" }, h(CountedSibling), h(React.Suspense, { fallback: null }, h(Late, { promise: neverPromise() })));

export const rejectingPromise = (): Promise<string> =>
  new Promise((_, reject) => { setTimeout(() => reject(new Error("backend down")), 20); });

export const neverPromise = (): Promise<string> => new Promise(() => {});

/** Resolved on the client, still pending for a moment on the server. */
export const hydrationPromise = (): Promise<string> =>
  typeof window === "undefined" ? pending(15, SUSPENSE_TEXT) : Promise.resolve(SUSPENSE_TEXT);

export const SuspenseHydration = ({ promise }: { promise: Promise<string> }) => h(React.Fragment, null,
  h(React.Suspense, { fallback: h("em", null, "pending") }, h(Button, { id: "late" }, h(Late, { promise }))),
  h(Button, { id: "sync" }, "Save"),
);
