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
import { PREFIX } from "../config";

/** A root that has been read while connected, marked on the element itself. */
type Seen = HTMLElement & { _m?: boolean };

/** One direction observer per document, kept on the document itself. */
type Watched = Document & { _d?: MutationObserver };

/** How a root resolves its direction when it is (re)read. */
type Reflect = (element: Seen) => void;

const reflectHost = (element: Seen): void => {
  const rtl = typeof getComputedStyle === "function" && getComputedStyle(element).direction === "rtl";
  element._m = true;
  element.classList.toggle(PREFIX + "-rtl", rtl);
  element.classList.toggle(PREFIX + "-ltr", !rtl && !!element.closest("[dir=rtl]"));
};

const reflectFactory = (element: Seen): void => {
  const nearest = element.closest("[dir]");
  const dir = nearest?.getAttribute("dir");
  element._m = true;
  element.classList.toggle(PREFIX + "-rtl", dir === "rtl");
  element.classList.toggle(PREFIX + "-ltr", dir === "ltr" && !!nearest?.closest("[dir=rtl]"));
};

const tracked = new Map<Seen, Reflect>();

const follow = (element: Seen, reflect: Reflect): void => {
  if (typeof MutationObserver !== "function") return;
  tracked.set(element, reflect);
  if (element.isConnected) reflect(element);
  const owner = element.ownerDocument as Watched;
  if (owner._d) return;
  owner._d = new MutationObserver(() => {
    tracked.forEach((trackedReflect, trackedElement) =>
      trackedElement.isConnected
        ? trackedReflect(trackedElement)
        : trackedElement._m && tracked.delete(trackedElement),
    );
  });
  owner._d.observe(owner.documentElement, {
    attributes: true,
    attributeFilter: ["dir"],
    childList: true,
    subtree: true,
  });
};

/**
 * Follows an element host: it is read while connected, on the mutation that
 * inserts a host created detached, and after a `dir` attribute changes
 * anywhere (a page switching direction at runtime).
 */
export const trackDirection = (element: Seen): void => follow(element, reflectHost);

/**
 * Follows a factory root by the nearest `[dir]` attribute, with no style read:
 * its markup is light DOM, where the attribute fallback applies.
 */
export const trackFactoryDirection = (element: Seen): void => follow(element, reflectFactory);
