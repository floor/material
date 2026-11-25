Section: Fixed

**Carousel drag in a zoomed document.** A pointer delta is in zoomed viewport pixels while the scroller's position is in the element's own, so under a CSS `zoom` the strip moved the drag times the zoom — a 120 px drag moved 92 px at 0.7 and 66 at 0.5 (md3.io, 2026-11-25). The drag now divides its delta by the effective zoom (`currentCSSZoom`, or the computed zoom product where the engine lacks it), so a drag follows the pointer at any zoom.
