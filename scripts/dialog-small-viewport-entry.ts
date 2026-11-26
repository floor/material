// scripts/dialog-small-viewport-entry.ts
// The browser entry check-dialog-small-viewport.ts bundles: the factory on
// the window, so a page can mount a dialog without the element's registry.
import createDialog from "../src/components/dialog/index";

/* eslint-disable @typescript-eslint/no-explicit-any -- the page reads the creator off the window. */
(window as any).createDialog = createDialog;
(window as any).ready = true;
