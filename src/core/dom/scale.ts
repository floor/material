// src/core/dom/scale.ts

/**
 * The zoom an element renders at: its own `zoom` multiplied with every zoomed
 * ancestor's. 1 for an element nothing zooms.
 *
 * This is the read side of `.mtrl-scale`. A rect read answers in the frame's
 * *visual* pixels inside a zoomed subtree, while a length written there
 * (`style.width`, `style.left`, a canvas style) is laid out in the element's
 * own pixels and scaled again on the way to the screen; `offsetWidth`,
 * `offsetLeft`, `offsetTop` and `scrollLeft` already answer in those own
 * pixels. A position taken from a rect and written back needs dividing by this
 * factor first, or the element lands at its factor squared.
 *
 * `currentCSSZoom` is the cumulative factor, native wherever `zoom` is. Where
 * the property is missing the element is treated as unzoomed: there is nothing
 * to read, and a page that never sets `--mtrl-scale` is at 1 anyway.
 */
export const effectiveZoom = (element: Element | null | undefined): number => {
  const zoom = (element as (Element & { currentCSSZoom?: unknown }) | null | undefined)?.currentCSSZoom;
  return typeof zoom === "number" && zoom > 0 ? zoom : 1;
};
