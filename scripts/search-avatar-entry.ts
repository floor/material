// scripts/search-avatar-entry.ts
// The browser entry check-search-avatar.ts bundles: the search factory, the
// `<m-search>` definition and the shadow stylesheet registry, on the window so
// the page can mount both paths and give the element its CSS.
import createSearch from "../src/components/search/index";
import { defineSearch } from "../src/elements/search";
import { registerStyles } from "../src/elements/styles";

/* eslint-disable @typescript-eslint/no-explicit-any -- the page reads them off the window. */
(window as any).createSearch = createSearch;
(window as any).defineSearch = defineSearch;
(window as any).registerStyles = registerStyles;
(window as any).ready = true;
