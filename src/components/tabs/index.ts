// src/components/tabs/index.ts
import createTabs from "./tabs";
import { setupResponsiveBehavior } from "./responsive";

// Export constants
export {
  TAB_VARIANTS,
  TAB_STATES,
  TAB_INDICATOR_WIDTH_STRATEGIES,
  TAB_EVENTS,
  TABS_EVENTS,
  TABS_DEFAULTS,
  TABS_CLASSES,
  TAB_CLASSES,
} from "./constants";

export type {
  // Types
  TabsConfig,
  TabsComponent,
  TabComponent,
  TabConfig,
  TabChangeEventData,
  // Public: TabsConfig.indicator takes it (FLO-381 keeps it)
  IndicatorConfig,
} from "./types";

// Public and documented (md3.io tabs); a responsive option on createTabs
// replaces it in 1.1 (FLO-381)
export { setupResponsiveBehavior };

// Default export
export default createTabs;
