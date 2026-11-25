// scripts/carousel-zoom-drag-entry.ts
// The browser entry check-carousel-zoom-drag.ts bundles: the factory on the
// window, so a page can mount a carousel without the element's registry.
import { createCarousel } from "../src/components/carousel/index";

/* eslint-disable @typescript-eslint/no-explicit-any -- the page reads the creator off the window. */
(window as any).createCarousel = createCarousel;
(window as any).ready = true;
