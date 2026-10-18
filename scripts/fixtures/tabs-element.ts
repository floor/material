// Browser entry for the <m-tabs> badge mount of scripts/check-tabs.ts: the built
// element and its compiled shadow-root styles, both from dist, because the
// styles register into the build's own registry. Run `bun run build` first, as
// CI does.
import "../../dist/elements/css/tabs.js";
import { defineTabs } from "../../dist/elements/tabs.js";

defineTabs();
(window as unknown as Record<string, unknown>).tabsElementReady = true;
