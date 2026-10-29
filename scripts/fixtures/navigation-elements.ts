// Browser entry for the <m-navigation-bar> and <m-navigation-rail> badge mounts
// of the navigation badge checks: the built elements and their compiled
// shadow-root styles, both from dist, because the styles register into the
// build's own registry. Run `bun run build` first, as CI does.
import "../../dist/elements/css/navigation-bar.js";
import "../../dist/elements/css/navigation-rail.js";
import { defineNavigationBar } from "../../dist/elements/navigation-bar.js";
import { defineNavigationRail } from "../../dist/elements/navigation-rail.js";

defineNavigationBar();
defineNavigationRail();
(window as unknown as Record<string, unknown>).navigationElementsReady = true;
