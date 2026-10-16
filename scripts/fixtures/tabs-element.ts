// Browser entry for the <m-tabs> badge mount of scripts/check-tabs.ts: the
// shadow-root styles are the build's compiled scss (dist/elements/css), the
// element itself from src. Run `bun run build` first, as CI does.
import "../../dist/elements/css/index.js";
import { defineTabs } from "../../src/elements/tabs";

defineTabs();
(window as unknown as Record<string, unknown>).tabsElementReady = true;
