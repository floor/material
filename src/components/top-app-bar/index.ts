// src/components/top-app-bar/index.ts
/**
 * @module components/top-app-bar
 * @description Top app bar component for application headers
 */

import { createAppBar } from './top-app-bar';

// Export constants
export { 
  TOP_APP_BAR_TYPES,
  TOP_APP_BAR_STATES,
  TOP_APP_BAR_DEFAULTS,
  TOP_APP_BAR_CLASSES
} from './constants';

// Export main component and types
export default createAppBar;
export { createAppBar, createTopAppBar } from './top-app-bar';
export type {
  AppBarConfig,
  AppBarComponent,
  TopAppBarConfig,
  TopAppBarComponent,
} from './types';