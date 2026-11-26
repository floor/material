// scripts/card-state-layers-entry.ts
// The browser entry check-card-state-layers.ts bundles: the card factory on
// the window, so a page can mount every variant without the element registry.
import createCard from "../src/components/card/index";

/* eslint-disable @typescript-eslint/no-explicit-any -- the page reads the creator off the window. */
(window as any).createCard = createCard;
(window as any).ready = true;
