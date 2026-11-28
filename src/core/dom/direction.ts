// src/core/dom/direction.ts
//
// The direction a component reads is the one it inherits: `direction` is
// inherited, so the browser's computed value for the element is the nearest
// `[dir]` ancestor's direction (or a stylesheet's), through the flattened
// tree. An attribute selector cannot express "nearest": `[dir='rtl'] &`
// matches any right-to-left ancestor, so markup in a `dir="ltr"` subtree of an
// RTL page still mirrors by the page root. Every root the library manages
// carries the direction it resolved as a class, so a sheet can match the
// nearest boundary; the attribute fallback for markup the runtime does not
// manage is cut at a nearer `dir="ltr"`:
//
// - `mtrl-rtl` on the root when the nearest direction is right-to-left; the
//   part rules match it with `:where(.mtrl-rtl) &` in the light DOM and
//   `:where(:host(.mtrl-rtl)) &` inside the root's own shadow tree.
// - `mtrl-ltr` on a left-to-right root while an RTL `dir` attribute is an
//   ancestor: only the attribute fallback can be wrong without it, so an
//   ordinary left-to-right host keeps its class attribute as authored, and
//   the fallback's `:not(:where(.mtrl-ltr, .mtrl-ltr *))` guard cuts it inside
//   the nearer subtree.
//
// A factory's markup is light DOM, where the attribute fallback already
// reaches, so its roots resolve from the nearest `[dir]` attribute with no
// style read (a plain field must not pay one). An element host's parts are in
// its shadow tree, where no attribute selector crosses, so the host reads its
// computed direction: the same nearest boundary, including a stylesheet's.
//
// What a DOM change costs is sized by the change, never by the page: an
// inserted or moved subtree is walked for the roots in it, a `dir` change for
// the roots under the element that carries it, and a change anywhere else
// reads no direction at all. A factory root is marked on the element itself:
// past the task that creates it, nothing here keeps a component alive,
// destroyed or not.
import { PREFIX } from "../config";

/** A followed root. Its marks live on the element, so they are as weak as it is. */
type Seen = HTMLElement & {
  /**
   * A followed factory root: 1 until it is first read while connected, 2 from
   * then on, 0 once its component is destroyed.
   */
  _m?: number;
  /** Its entry in `waiting`, while it has one. */
  _p?: WeakRef<Seen>;
  /** An element host: its own shadow root is the library's, and is not watched. */
  _h?: boolean;
  /** Where someone listens: the direction last reported, and who asked. */
  _r?: boolean;
  _c?: Set<(rtl: boolean) => void>;
};

/** One direction observer per document, kept on the document and on each shadow root it watches. */
type Watched = { _d?: MutationObserver };

const WATCH: MutationObserverInit = {
  attributes: true,
  attributeFilter: ["dir"],
  childList: true,
  subtree: true,
};

const noop = (): void => {};

/**
 * Factory roots created detached in the running task. One microtask sorts
 * them out, so a component that is created and mounted, or created and
 * destroyed, in the same task leaves nothing here and allocates nothing.
 */
const fresh = new Set<Seen>();

/**
 * Factory roots that stayed detached past the task that created them. No
 * record reports an insertion into a shadow tree the observer does not watch,
 * so these are checked on each callback until they connect. The entries are
 * weak: a component that is dropped without being mounted is collected.
 */
const waiting = new Set<WeakRef<Seen>>();

/** The roots the running callback has to read: each once, wherever its records name it. */
const found = new Set<Seen>();

// Two parts only some pages use add themselves here on first use, so a bundle
// that has no element host, or no listener, carries neither.

/** Reads the element hosts again, after a `dir` attribute changed. */
let readHosts: (() => void) | undefined;

/** Tells a root's listeners the direction it resolved. */
let report: ((element: Seen, rtl: boolean) => void) | undefined;

const reflect = (element: Seen, rtl: boolean, ltr: boolean): void => {
  element.classList.toggle(PREFIX + "-rtl", rtl);
  element.classList.toggle(PREFIX + "-ltr", ltr);
  report?.(element, rtl);
};

/**
 * Watches the element's document and, for a root inside shadow trees, every
 * shadow root above it. An element host's own shadow root is left alone:
 * nothing in the library's own tree moves or changes direction.
 */
const watch = (element: Seen): void => {
  const owner = element.ownerDocument as Document & Watched;
  let observer = owner._d;
  if (!observer) (observer = owner._d = new MutationObserver(onRecords)).observe(owner.documentElement, WATCH);
  let root = element.getRootNode() as ShadowRoot & Watched;
  for (; root.host; root = root.host.getRootNode() as ShadowRoot & Watched) {
    if (!root._d && !(root.host as Seen)._h) (root._d = observer).observe(root, WATCH);
  }
};

const readFactory = (element: Seen): void => {
  const nearest = element.closest("[dir]");
  const dir = nearest?.getAttribute("dir");
  element._m = 2;
  reflect(element, dir === "rtl", dir === "ltr" && !!nearest?.closest("[dir=rtl]"));
  // Where it was read is where it is followed: a root may have reached a
  // shadow tree no record came from.
  watch(element);
};

const settle = (): void => {
  fresh.forEach((element) => {
    // Already read: the observer's callback came first.
    if (element._m !== 1) return;
    if (!element.isConnected) waiting.add((element._p = new WeakRef(element)));
    // Connected where the observer watches, a record is on its way and its
    // callback reads the root; anywhere else nothing would.
    else if (!(element.getRootNode() as Watched)._d) readFactory(element);
  });
  fresh.clear();
};

/**
 * Finds the followed factory roots of a connected subtree, the node itself
 * included. A tree walker, not a live collection: a collection that is still
 * alive slows every later change to the tree it covers.
 */
const sweep = (node: Node): void => {
  if (node.nodeType !== 1 || !node.isConnected) return;
  if ((node as Seen)._m) found.add(node as Seen);
  if (!(node as Element).firstElementChild) return;
  const walker = (node.ownerDocument as Document).createTreeWalker(node, 1);
  for (let current = walker.nextNode(); current; current = walker.nextNode()) {
    if ((current as Seen)._m) found.add(current as Seen);
  }
};

function onRecords(records: MutationRecord[]): void {
  let flipped = false;
  for (const record of records) {
    if (record.type === "attributes") {
      flipped = true;
      sweep(record.target);
    } else {
      // Indexed loops: a callback per node costs more than the walk it starts.
      const added = record.addedNodes;
      for (let index = 0; index < added.length; index++) sweep(added[index]);
      // A node that was only removed is not connected. One that is was moved,
      // and a move into a tree this observer does not watch yet is reported
      // as this removal only.
      const removed = record.removedNodes;
      for (let index = 0; index < removed.length; index++) sweep(removed[index]);
    }
  }
  // Read after the walks: a listener may change the tree it is told about.
  found.forEach((element) => element._m && readFactory(element));
  found.clear();
  waiting.forEach((entry) => {
    const element = entry.deref();
    if (element?._m === 1 && element.isConnected) readFactory(element);
    if (element?._m !== 1) waiting.delete(entry);
  });
  if (flipped) readHosts?.();
}

/**
 * The connected element hosts, read again when a `dir` attribute changes: a
 * host's direction is inherited through every shadow boundary, where no walk
 * from the changed element reaches. A host leaves when it is torn down.
 */
const hosts = new Set<Seen>();

const readHost = (element: Seen): void => {
  const rtl = typeof getComputedStyle === "function" && getComputedStyle(element).direction === "rtl";
  reflect(element, rtl, !rtl && !!element.closest("[dir=rtl]"));
};

const readEveryHost = (): void => hosts.forEach(readHost);

/**
 * Follows an element host. A connected host is read now, and again after a
 * `dir` attribute changes above it (a page switching direction at runtime).
 * The host calls this when it is built and each time it is connected, which
 * is how a move is read; the function returned stops following it.
 */
export const trackDirection = (element: Seen): (() => void) => {
  element._h = true;
  if (typeof MutationObserver !== "function" || !element.isConnected) return noop;
  readHosts = readEveryHost;
  readHost(element);
  hosts.add(element);
  watch(element);
  return () => hosts.delete(element);
};

/**
 * Follows a factory root by the nearest `[dir]` attribute, with no style read:
 * its markup is light DOM, where the attribute fallback applies. A connected
 * root is read now; one created detached is read by the mutation that inserts
 * it, and any root again when it is moved or a `dir` attribute above it
 * changes. The function returned stops following it: a destroyed component's
 * element is never read again.
 */
export const trackFactoryDirection = (element: Seen): (() => void) => {
  if (typeof MutationObserver !== "function") return noop;
  element._m = 1;
  if (element.isConnected) readFactory(element);
  else {
    watch(element);
    if (!fresh.size) queueMicrotask(settle);
    fresh.add(element);
  }
  return () => {
    element._m = 0;
    fresh.delete(element);
    waiting.delete(element._p as WeakRef<Seen>);
  };
};

const tell = (element: Seen, rtl: boolean): void => {
  if (element._c && rtl !== element._r) {
    element._r = rtl;
    element._c.forEach((callback) => callback(rtl));
  }
};

/**
 * Calls back when the direction a followed root resolves changes, with whether
 * it is now right-to-left. A root that has not been read yet counts as
 * left-to-right. The function returned removes the callback.
 */
export const onDirectionChange = (element: Seen, callback: (rtl: boolean) => void): (() => void) => {
  report = tell;
  if (!element._c) element._r = element.classList.contains(PREFIX + "-rtl");
  const callbacks = element._c || (element._c = new Set());
  callbacks.add(callback);
  return () => callbacks.delete(callback);
};
