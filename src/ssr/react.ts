// src/ssr/react.ts
/**
 * Enable declarative shadow DOM for material/react in this server process.
 * The identity HTML policy is not a sanitizer; configure a synchronous sanitizer for untrusted markup.
 * The server-rendered shadow root is built in a separate render, without the context of providers above the component.
 * The page's own render (the light DOM) sees the provided value. Until upgrade, a child reading context with a default shows that default in the painted shadow root; a child requiring its context leaves this component without a declarative shadow root while the page still renders. In development, a warning names the element.
 * The Vue and Solid bridges see the provided value in both the shadow root and light DOM. Svelte has this same context limit and logs a development-only warning naming the element when required context leaves it without a shadow root.
 * Pass the resolved string as a prop or attribute, or accept client-rendered text until the upgrade. A fix is planned for a later 3.x release.
 * A `Suspense` boundary inside the component ships its resolved content: the host re-renders until no boundary inside it is still pending, and a boundary that never resolves ships its fallback at the retry cap.
 * The reasoning behind the ladder, the marker and the error probe is in test/ssr/react-suspense.md.
 * @module ssr/react
 */
import * as React from "react";
import * as ReactDOMServer from "react-dom/server";
import "./index";

const bridge = (globalThis as unknown as Record<symbol, {
  shadow: (tag: string, markup: string, prefix: string) => string;
  react?: (tag: string, props: Record<string, unknown>, children: React.ReactNode, prefix: string) => string | undefined;
}>)[Symbol.for("mtrl.ssr")];

/** The retry backoff: start next task, then double. See test/ssr/react-suspense.md. */
const RETRY_DELAYS_MS = [0, 2, 4, 8, 16, 32, 64, 128, 250];

/** Past this, the page keeps the child. See test/ssr/react-suspense.md. */
const MAX_SUSPENDS = 40;

let serializingChildren = false;

interface Attempt { count: number; nodes: object[]; gaveUp: boolean }

/** One counter per host. The child element is stable across the host's retries; a ref is not. */
const attempts = new WeakMap<object, Attempt>();

/** The top call frame of an error, or undefined. A suspend is recognised by its frame. */
const firstFrame = (error: unknown): string | undefined => {
  if (!(error instanceof Error) || typeof error.stack !== "string") return undefined;
  const header = `${error.name}: ${error.message}`;
  const rest = error.stack.startsWith(header) ? error.stack.slice(header.length) : error.stack;
  return rest.split("\n").map((line) => line.trim()).find((line) => line.startsWith("at ") || /@[^@]*:\d+:\d+/.test(line));
};

/** `null` until the first suspend samples this process's React. An empty sample stays unset. */
let sampledFrame: string | undefined | null = null;

const suspendFrame = (): string | undefined => {
  if (sampledFrame !== null) return sampledFrame;
  const pending = new Promise<never>(() => {});
  const Probe = (): never => { throw pending; };
  const errorLog = console.error;
  const warnLog = console.warn;
  console.error = () => {};
  console.warn = () => {};
  try {
    ReactDOMServer.renderToStaticMarkup(React.createElement(Probe));
    sampledFrame = undefined;
  } catch (error) {
    sampledFrame = firstFrame(error);
  } finally {
    console.error = errorLog;
    console.warn = warnLog;
  }
  // Once per process: the sample is cached, and a second host does not sample again.
  if (sampledFrame === undefined && isDevelopment()) {
    console.warn("[mtrl] Suspending children of mtrl components will render without a server shadow root because no stack frame is available. Error.stackTraceLimit is 0, or Error.prepareStackTrace is custom.");
  }
  return sampledFrame;
};

const isSynchronousSuspend = (error: unknown): boolean => {
  const frame = firstFrame(error);
  return frame !== undefined && frame === sampledFrame;
};

/** Same guard as core/utils/warn.ts: tsc leaves NODE_ENV in place, and a browser without process must not throw. */
const isDevelopment = (): boolean => {
  try {
    return typeof process !== "undefined" && process.env != null && process.env.NODE_ENV !== "production";
  } catch {
    return false;
  }
};

const elementLabel = (tag: string, props: Record<string, unknown>): string => {
  const id = typeof props.id === "string" && props.id ? ` id=${JSON.stringify(props.id)}` : "";
  return `<${tag}${id}>`;
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
  if (!state) state = { count: 0, nodes, gaveUp: false };
  state.count += 1;
  state.nodes = nodes;
  for (const node of nodes) attempts.set(node, state);
  return state.count;
};

const suspendedGaveUp = (children: React.ReactNode): boolean => {
  for (const node of childNodes(children)) {
    if (attempts.get(node)?.gaveUp) return true;
  }
  return false;
};

/** Keeps the counter so a later render of the same child does not warn again. */
const markGaveUp = (children: React.ReactNode): boolean => {
  let state: Attempt | undefined;
  for (const node of childNodes(children)) {
    state = attempts.get(node);
    if (state) break;
  }
  if (!state || state.gaveUp) return false;
  state.gaveUp = true;
  return true;
};

/** Long enough for a boundary's error to reach onError, short enough to keep one ladder step (#461). */
const PROBE_TIMEOUT_MS = 50;

interface BoundaryProbe { reported: boolean; complete: boolean; settled: boolean; done: Promise<void> }

/**
 * Asks the streaming renderer whether a boundary errored, and whether every
 * boundary in the host has finished. See test/ssr/react-suspense.md.
 */
const probeBoundaryError = (element: React.ReactElement): BoundaryProbe => {
  const probe: BoundaryProbe = { reported: false, complete: false, settled: false, done: Promise.resolve() };
  let resolveDone!: () => void;
  probe.done = new Promise<void>((resolve) => { resolveDone = resolve; });
  let listening = true;
  let release: (() => void) | undefined;
  const settle = (): void => {
    if (probe.settled) return;
    probe.settled = true;
    release?.();
    resolveDone();
  };
  const onError = (): void => {
    if (!listening) return;
    probe.reported = true;
    if (probe.complete) settle();
  };
  const onComplete = (): void => {
    if (!listening) return;
    probe.complete = true;
    settle();
  };
  const timer = setTimeout(() => {
    listening = false;
    settle();
  }, PROBE_TIMEOUT_MS);
  const readable = (ReactDOMServer as {
    renderToReadableStream?: (element: React.ReactElement, options: { onError: (error: unknown) => void; signal: AbortSignal }) => Promise<{ allReady?: Promise<unknown> }>;
  }).renderToReadableStream;
  if (typeof readable === "function") {
    const controller = new AbortController();
    release = () => {
      clearTimeout(timer);
      listening = false;
      controller.abort();
    };
    void readable(element, { onError, signal: controller.signal }).then(
      (response) => {
        const all = response?.allReady;
        if (all) void all.then(onComplete, onComplete);
      },
      // A shell failure kills the whole render; nothing can still be pending.
      onComplete,
    ).catch(() => {});
  } else {
    const pipeable = (ReactDOMServer as {
      renderToPipeableStream?: (element: React.ReactElement, options: { onError: (error: unknown) => void; onShellError: (error: unknown) => void; onShellReady: () => void; onAllReady: () => void }) => { abort: () => void };
    }).renderToPipeableStream;
    if (typeof pipeable !== "function") {
      // A build whose server exports neither stream renderer cannot be probed;
      // the ladder keeps its behavior and the cap still ships the markup.
      clearTimeout(timer);
      listening = false;
      settle();
      return probe;
    }
    const onShellDeath = (): void => {
      onError();
      onComplete();
    };
    const stream = pipeable(element, { onError, onShellError: onShellDeath, onShellReady() {}, onAllReady: onComplete });
    release = () => {
      clearTimeout(timer);
      listening = false;
      stream.abort();
    };
  }
  return probe;
};

/** One probe per host, keyed like the attempt counter (#461). */
const boundaryProbes = new WeakMap<object, BoundaryProbe>();

/** The probe stored for this host, settled or not, with both answers. */
const storedBoundaryProbe = (children: React.ReactNode): BoundaryProbe | undefined => {
  for (const node of childNodes(children)) {
    const probe = boundaryProbes.get(node);
    if (probe) return probe;
  }
  return undefined;
};

/** The probe this pass waits on: an unsettled stored one, or a fresh render. */
const boundaryProbe = (children: React.ReactNode, element: React.ReactElement): BoundaryProbe => {
  const nodes = childNodes(children);
  let existing: BoundaryProbe | undefined;
  for (const node of nodes) existing ??= boundaryProbes.get(node);
  if (existing && !existing.settled) return existing;
  const probe = probeBoundaryError(element);
  for (const node of nodes) boundaryProbes.set(node, probe);
  return probe;
};

const clearAttempt = (children: React.ReactNode): void => {
  const nodes = childNodes(children);
  let state: Attempt | undefined;
  for (const node of nodes) {
    boundaryProbes.delete(node);
    state ??= attempts.get(node);
  }
  if (!state) return;
  for (const node of state.nodes) attempts.delete(node);
  for (const node of nodes) attempts.delete(node);
};

const retryDelay = (attempt: number): number =>
  RETRY_DELAYS_MS[Math.min(attempt - 1, RETRY_DELAYS_MS.length - 1)] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1] ?? 250;

/** Counts `then` calls made by a pass: a synchronous pending signal. See test/ssr/react-suspense.md. */
const countPendingSubscriptions = (): { read: () => number; restore: () => void } => {
  const prototype = Promise.prototype as { then: (this: unknown, ...arguments_: unknown[]) => unknown };
  const original = prototype.then;
  let calls = 0;
  prototype.then = function (this: unknown, ...arguments_: unknown[]) {
    calls += 1;
    return original.apply(this, arguments_);
  };
  return { read: () => calls, restore: () => { prototype.then = original; } };
};

/** What the string renderer writes for a boundary it did not wait for (#461). */
const PENDING_BOUNDARY = "<!--$!-->";

/** The renderer's own pending marker, for thenables the subscription count cannot see. */
const boundaryStillPending = (element: React.ReactElement): boolean => {
  serializingChildren = true;
  try {
    return ReactDOMServer.renderToString(element).includes(PENDING_BOUNDARY);
  } catch {
    // The static pass above succeeded on the same tree, so this should not
    // fail; if it does, shipping the static markup keeps the page's own error
    // handling exactly as it is without this pass.
    return false;
  } finally {
    serializingChildren = false;
  }
};

bridge.react = (tag, props, children, prefix) => {
  // Nested hosts emit their own roots when React renders the outer tree.
  // A template from this pass would declare a shadow root twice.
  if (serializingChildren) return undefined;
  // The cap already let this child go. A later pass must not open another wait or warn again.
  if (suspendedGaveUp(children)) return undefined;
  // Sample outside a render. Doing it from the catch would nest renderToStaticMarkup.
  suspendFrame();
  const element = React.createElement(tag, props, children);
  let markup: string;
  serializingChildren = true;
  const subscriptions = countPendingSubscriptions();
  try {
    // No Suspense wrapper: the static renderer draws an error and a suspend
    // the same way, so a wrapper could not tell them apart.
    markup = ReactDOMServer.renderToStaticMarkup(element);
  } catch (error) {
    if (!isSynchronousSuspend(error)) {
      // Returning lets the host finish. The page then renders this child and
      // reports its error, as it does without the bridge. Development names the
      // host and the error; nothing is remembered past this call.
      if (isDevelopment()) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`[mtrl] ${elementLabel(tag, props)} child snapshot failed, often because it needs ancestor context; this response has no shadow root for it: ${message}`);
      }
      clearAttempt(children);
      return undefined;
    }
    const attempt = nextAttempt(children);
    if (attempt > MAX_SUSPENDS) {
      // No template, and the page render reaches the child. A slow response is not a failed request.
      if (markGaveUp(children) && isDevelopment()) {
        console.warn(`[mtrl] ${elementLabel(tag, props)} still had a suspending child after ${MAX_SUSPENDS} attempts, so this response has no shadow root for it.`);
      }
      return undefined;
    }
    const delay = retryDelay(attempt);
    throw new Promise<void>((resolve) => { setTimeout(resolve, delay); });
  } finally {
    subscriptions.restore();
    serializingChildren = false;
  }
  // A boundary in the children caught a suspend, so this markup is
  // fallback-shaped. A subscription is pending by definition; the marker can
  // also be an error the boundary caught, so that path asks the probe. See
  // test/ssr/react-suspense.md.
  if (subscriptions.read() > 0 || boundaryStillPending(element)) {
    const attempt = nextAttempt(children);
    const withinCap = attempt <= MAX_SUSPENDS;
    if (subscriptions.read() > 0) {
      // A subscription is pending by definition and never pays a probe.
      if (withinCap) throw new Promise<void>((resolve) => { setTimeout(resolve, retryDelay(attempt)); });
    } else {
      // Reuse a settled probe answer; otherwise wait for a fresh one before
      // the retry delay, so the next pass reads a settled answer.
      const stored = storedBoundaryProbe(children);
      if (stored?.reported && stored.complete) {
        clearAttempt(children);
        return bridge.shadow(tag, markup, prefix) || undefined;
      }
      const probe = withinCap ? boundaryProbe(children, element) : undefined;
      if (probe && !probe.settled) {
        throw new Promise<void>((resolve) => {
          void probe.done.then(() => {
            // A report plus completion means the whole host finished: ship
            // without the backoff a pending boundary still needs.
            if (probe.reported && probe.complete) { resolve(); return; }
            setTimeout(resolve, retryDelay(attempt));
          });
        });
      }
    }
  }
  clearAttempt(children);
  // Let React serialize host props (style objects, tabIndex, boolean/data/aria
  // attributes). The server bridge parses them in its own DOM realm.
  // An opted-out host has no shadow content and must not get an empty template.
  return bridge.shadow(tag, markup, prefix) || undefined;
};
