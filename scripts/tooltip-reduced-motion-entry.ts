// scripts/tooltip-reduced-motion-entry.ts
// The browser entry check-tooltip-reduced-motion.ts bundles: the factory on
// the window, so a page can show a tooltip without the element's registry.
import createTooltip from "../src/components/tooltip/index";

/* eslint-disable @typescript-eslint/no-explicit-any -- the page reads the creator off the window. */
(window as any).createTooltip = createTooltip;
(window as any).ready = true;
