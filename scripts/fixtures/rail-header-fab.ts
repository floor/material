import createNavigationRail from "../../dist/components/navigation-rail/index.js";
import createExtendedFab from "../../dist/components/extended-fab/index.js";
import createFab from "../../dist/components/fab/index.js";
import { defineNavigationRail } from "../../dist/elements/navigation-rail.js";
import { defineExtendedFab } from "../../dist/elements/extended-fab.js";
import "../../dist/elements/css/navigation-rail.js";
import "../../dist/elements/css/extended-fab.js";

// The rail upgrades first; the check also defines a FAB after slot assignment.
defineNavigationRail();
defineNavigationRail({ prefix: "test-ui" });

export const fixture = { createNavigationRail, createExtendedFab, createFab, defineExtendedFab };
Object.assign(window, { railHeaderFab: fixture });
