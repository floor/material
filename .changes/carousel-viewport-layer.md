Section: Fixed

**Carousel strip against its keylines.** The items now sit in a layer pinned to the scroller's viewport, so an item's transform is its placement and never carries the scroll offset. A painted offset the main thread has not laid out yet — a Mac trackpad's momentum, the compositor ahead of the layout — no longer moves the strip, which showed as slides squeezed into slivers with a blank stretch of track.
