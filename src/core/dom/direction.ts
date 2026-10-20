// src/core/dom/direction.ts
//
// The direction a component reads is the one it inherits: the nearest `[dir]`
// ancestor (or a stylesheet's `direction`), as the browser computed it for the
// element. An attribute selector cannot express "nearest": `[dir='rtl'] &`
// matches any right-to-left ancestor, so markup in a `dir="ltr"` subtree of an
// RTL page still mirrored by the page root. Every element the library manages
// carries the direction it resolved as a class, so a sheet can match the
// nearest boundary; the attribute fallback is cut at a nearer `dir="ltr"`:
//
// - `mtrl-rtl` on the root when the nearest direction is right-to-left; the
//   part rules match it with `:where(.mtrl-rtl) &` in the light DOM and
//   `:where(:host(.mtrl-rtl)) &` inside the root's own shadow tree. The
//   attribute fallback for markup the runtime does not manage is guarded by a
//   nearer `dir="ltr"` boundary, which is the same nearest resolution when
//   direction comes from `dir` attributes.
//
// `:dir()` carries the same nearest resolution at runtime, through the
// flattened tree (src/core/dom/roving.ts). It stays out of the shipped sheet
// only because consumer bundlers lower it into `:lang()` lists that match no
// `dir` (src/styles/components/_text-field.scss).
import { PREFIX } from "../config";

/** A root that has been read while connected, marked on the element itself. */
type Seen = HTMLElement & { _m?: boolean };

/**
 * Reads the direction the element resolves — `:dir()`, which follows the
 * flattened tree, so it is the nearest `[dir]` even across a shadow boundary —
 * and reflects it as the classes the sheets read.
 */
const reflectDirection = (element: Seen): void => {
  const rtl = element.matches(":dir(rtl)");
  element._m = true;
  element.classList.toggle(PREFIX + "-ltr", !rtl);
  element.classList.toggle(PREFIX + "-rtl", rtl);
};

const tracked = new Set<Seen>();
let directionObserver: MutationObserver | null;

/**
 * Follows the direction an element resolves: after it is in the document, and
 * after a `dir` attribute changes anywhere (a page switching direction at
 * runtime). A root created detached is read on the mutation that inserts it,
 * where its inherited direction exists. A stylesheet changing `direction`
 * without a `dir` change is read on connect.
 */
export const trackDirection = (element: Seen): void => {
  if (typeof document > "u") return;
  tracked.add(element);
  if (element.isConnected) reflectDirection(element);
  (directionObserver ||= new MutationObserver(() => {
    tracked.forEach((trackedElement) =>
      trackedElement.isConnected
        ? reflectDirection(trackedElement)
        : trackedElement._m && tracked.delete(trackedElement),
    );
  })).observe(document, {
    attributes: true,
    attributeFilter: ["dir"],
    childList: true,
    subtree: true,
  });
};
