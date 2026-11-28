// src/core/dom/zoom.ts
//
// The CSS `zoom` in effect where an element is laid out
// (https://drafts.csswg.org/css-viewport/#zoom-property). A rect reports
// zoomed viewport pixels while `style.left/top/width` inside a zoomed subtree
// are local pixels, and a pointer delta is in the viewport's units while a
// scroller's position is in its own: a component that copies one into the
// other without this lands at the zoom times its intent (md3.io, 2026-11-25).
//
// `currentCSSZoom` is the engine's own answer — exactly 1 when nothing is
// zoomed, which a rect-over-`offsetWidth` ratio is not, since `offsetWidth`
// rounds to whole pixels. Where the property is missing (Firefox today) the
// computed `zoom` of the element and each ancestor multiply. A transform
// scales the painted result but is not a zoom, so it never counts.

export const effectiveZoom = (element: Element): number => {
  const native = (element as Element & { currentCSSZoom?: number }).currentCSSZoom;
  if (typeof native === "number" && native > 0) return native;
  let zoom = 1;
  for (let node: Element | null = element; node; node = node.parentElement) {
    const view = node.ownerDocument.defaultView;
    const value = parseFloat(view?.getComputedStyle(node).zoom ?? "1");
    if (Number.isFinite(value) && value > 0) zoom *= value;
  }
  return zoom;
};
