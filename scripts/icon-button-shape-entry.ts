// scripts/icon-button-shape-entry.ts
// The browser entry check-icon-button-shape-default.ts bundles: the factory
// on the window, so a page can mount an icon button without the element's
// registry.
import createIconButton from "../src/components/icon-button/index";

/* eslint-disable @typescript-eslint/no-explicit-any -- the page reads the creator off the window. */
(window as any).createIconButton = createIconButton;
(window as any).ready = true;
