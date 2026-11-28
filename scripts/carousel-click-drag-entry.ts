// scripts/carousel-click-drag-entry.ts
// The browser entry check-carousel-click-drag.ts bundles: the factory on the
// window, so a page can mount a carousel without the element's registry.
import { createCarousel } from "../src/components/carousel/index";

(window as unknown as { createCarousel: typeof createCarousel }).createCarousel = createCarousel;
(window as unknown as { ready: boolean }).ready = true;
