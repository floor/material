// src/ssr/react.ts
/**
 * Enable declarative shadow DOM for material/react in this server process.
 * The identity HTML policy is not a sanitizer; configure a synchronous sanitizer for untrusted markup.
 * The server-rendered shadow root is built in a separate render, without the context of providers above the component.
 * The page's own render (the light DOM) sees the provided value. Until upgrade, a child reading context with a default shows that default in the painted shadow root; a child requiring its context leaves this component without a declarative shadow root while the page still renders. In development, a warning names the element.
 * The Vue and Solid bridges see the provided value in both the shadow root and light DOM. Svelte has this same context limit and logs a development-only warning naming the element when required context leaves it without a shadow root.
 * Pass the resolved string as a prop or attribute, or accept client-rendered text until the upgrade. A fix is planned for a later 3.x release.
 * A `Suspense` boundary inside the component contributes its fallback to the first static pass, which does not throw; the host then re-renders on the retry backoff until no boundary inside it is still pending — wherever the boundary renders, inside an ordinary component as well, and whatever thenable the child suspends with — and the shadow root ships the resolved content (#461). A boundary that never resolves server-side ships its fallback in the root, at the retry cap. An error a boundary inside the component caught is reported by the streaming renderer's onError probe and ships its fallback-shaped root at once, without entering the retry ladder, exactly as the page renders it without the bridge.
 * @module ssr/react
 */
import * as React from "react";
import * as ReactDOMServer from "react-dom/server";
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

interface Attempt { count: number; nodes: object[]; gaveUp: boolean }

/** One counter per host. The child element is stable across the host's retries; a ref is not. */
const attempts = new WeakMap<object, Attempt>();

/**
 * renderToStaticMarkup reports a synchronous suspend as a plain Error thrown
 * from one place in React. The thenable the child threw does not escape, and
 * the Error has no code or digest. The message depends on the build, so it is
 * not the signal: the header is skipped and the first call frame is compared
 * with a frame sampled from this process's own React. A child's error is
 * thrown from the child, including one whose text copies React's message.
 * A frame is a V8 line starting with `at `, or a JavaScriptCore or SpiderMonkey
 * `name@file:line:col` line. Anything else is not a frame, so the error is not
 * a suspension.
 */
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

interface BoundaryProbe { reported: boolean; settled: boolean; done: Promise<void> }

/**
 * React reports an error a boundary caught through the streaming renderers'
 * onError alone: in development and in production, on React 19's
 * renderToReadableStream and React 18's renderToPipeableStream. The serialized
 * markup cannot tell that error from a pending boundary — the string renderer
 * writes the same pending marker for both, and production strips the message
 * its client-render template carries in development — and the string renderers
 * take no onError at all. So this renders the host's own element once through
 * this build's streaming renderer and listens: onError firing means the
 * boundary failed rather than waited, and a wait the renderer itself has
 * abandoned can never resolve, so retrying it can only burn the ladder. The
 * probe settles on that report or on its timeout, never on the shell (React 18
 * delivers a boundary's error only after its shell), and the probe's own abort
 * is ignored once it stops listening. Its output is discarded; the shipped
 * markup stays the static pass's (#461).
 */
const probeBoundaryError = (element: React.ReactElement): BoundaryProbe => {
  const probe: BoundaryProbe = { reported: false, settled: false, done: Promise.resolve() };
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
    settle();
  };
  const timer = setTimeout(() => {
    listening = false;
    settle();
  }, PROBE_TIMEOUT_MS);
  const readable = (ReactDOMServer as {
    renderToReadableStream?: (element: React.ReactElement, options: { onError: (error: unknown) => void; signal: AbortSignal }) => Promise<unknown>;
  }).renderToReadableStream;
  if (typeof readable === "function") {
    const controller = new AbortController();
    release = () => {
      clearTimeout(timer);
      listening = false;
      controller.abort();
    };
    void readable(element, { onError, signal: controller.signal }).catch(() => {});
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
    const stream = pipeable(element, { onError, onShellError: onError, onShellReady() {}, onAllReady() {} });
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

/**
 * The probe stored for this host, settled or not (#461).
 */
const storedBoundaryProbe = (children: React.ReactNode): BoundaryProbe | undefined => {
  for (const node of childNodes(children)) {
    const probe = boundaryProbes.get(node);
    if (probe) return probe;
  }
  return undefined;
};

/**
 * The probe this pass waits on: an unsettled stored one, or a fresh render.
 * A settled silent answer is replaced — a boundary pending now may fail on a
 * later pass — but only after the decision above has read it.
 */
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

/**
 * The static renderer reports a suspend a boundary caught only by
 * subscribing: it calls `then` on the thenable the child threw, while the
 * boundary renders its fallback and the pass succeeds (#461). The
 * subscription happens wherever the boundary sits — directly in the children
 * or inside a component an element walk cannot reach — and a resolved child
 * subscribes to nothing, so the count is a synchronous pending signal. Every
 * call passes through unchanged, and the patch is installed for the length of
 * one nested static pass, which is synchronous: nothing else runs inside it.
 * A child that calls `then` for its own reasons during render also counts;
 * that host re-renders to the retry cap and then ships the current markup, so
 * it is slow, never wrong.
 */
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

/**
 * The subscription count above reads zero for a thenable whose `then` never
 * dispatches through this realm's Promise.prototype: an object with its own
 * `then` method, or a native Promise from another realm (#461). The string
 * renderer, which never waits, instead marks a boundary it left pending in its
 * own serialized output, whatever thenable the child threw and wherever the
 * boundary renders; a boundary whose content it read synchronously carries no
 * pending marker. The marker is the renderer's report, not the thenable's
 * dispatch, so it sees every thenable kind. An error the boundary caught also
 * writes the marker — production output is byte-identical to a pending
 * boundary's — but the boundary catches that error again in every later pass,
 * so the static pass never throws and the marker alone cannot say which it
 * is. The error probe below answers that. The output is discarded — the
 * shipped markup stays the static pass's.
 */
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
    // No Suspense wrapper here. renderToStaticMarkup renders an error and a
    // suspension as the same fallback, so a wrapper cannot tell them apart.
    // A suspension is thrown from React's static renderer; any other throw is
    // the child's error. A boundary already inside the children catches its
    // own child's suspend, so this pass succeeds — and the subscription count
    // above still reports that suspend, at whatever depth the boundary renders
    // (#461), for a thenable whose `then` runs through this realm's
    // Promise.prototype.
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
  // A boundary inside the children caught a suspend during the pass: this
  // markup is fallback-shaped while the page's own stream waits for the data.
  // The count above reports a thenable that dispatched through this realm's
  // Promise.prototype; a custom `then` or a Promise from another realm is
  // reported by the string pass instead. A subscription is pending by
  // definition; the marker alone cannot say pending from error — the boundary
  // catches its error again in every pass — so the marker-only path asks the
  // streaming-renderer probe. A reported error ships this
  // pass's fallback-shaped markup at once, as the page renders it without the
  // bridge: retrying it could only burn the ladder to its cap (#461). A
  // pending boundary re-renders on the same backoff as a thrown suspend, so a
  // page that waits for its data ships a root built from the resolved
  // children. At the cap the current markup ships, as a boundary that never
  // resolves always has.
  if (subscriptions.read() > 0 || boundaryStillPending(element)) {
    const attempt = nextAttempt(children);
    const withinCap = attempt <= MAX_SUSPENDS;
    if (subscriptions.read() > 0) {
      // A subscription is a thenable the boundary caught: pending by
      // definition, never erroring, and it pays no probe.
      if (withinCap) throw new Promise<void>((resolve) => { setTimeout(resolve, retryDelay(attempt)); });
    } else {
      // The marker-only path asks the probe. The stored probe's settled
      // answer is the previous pass's: a report ships this pass's
      // fallback-shaped markup at once. A silence is replaced, and the retry
      // waits for the new probe's answer before its delay, so the next pass
      // reads a settled one.
      if (storedBoundaryProbe(children)?.reported) {
        clearAttempt(children);
        return bridge.shadow(tag, markup, prefix) || undefined;
      }
      const probe = withinCap ? boundaryProbe(children, element) : undefined;
      if (probe && !probe.settled) {
        throw new Promise<void>((resolve) => {
          void probe.done.then(() => { setTimeout(resolve, retryDelay(attempt)); });
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
