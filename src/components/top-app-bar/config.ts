// src/components/top-app-bar/config.ts
/**
 * @module components/top-app-bar
 * @description Configuration for top app bar component
 */

import { createComponentConfig } from '../../core/config/component';
import { AppBarConfig } from './types';
import { TOP_APP_BAR_DEFAULTS } from './constants';

/**
 * Default configuration for top app bar
 */
export const defaultConfig: Partial<AppBarConfig> = {
  tag: TOP_APP_BAR_DEFAULTS.TAG,
  type: TOP_APP_BAR_DEFAULTS.TYPE,
  scrollable: TOP_APP_BAR_DEFAULTS.SCROLLABLE,
  compressible: TOP_APP_BAR_DEFAULTS.COMPRESSIBLE,
  scrollThreshold: TOP_APP_BAR_DEFAULTS.SCROLL_THRESHOLD
};

/**
 * Creates the configuration for a top app bar component
 * 
 * @param {AppBarConfig} config - User provided configuration
 * @returns {AppBarConfig} Complete configuration with defaults applied
 */
export const createConfig = (config: AppBarConfig = {} as AppBarConfig): AppBarConfig => 
  createComponentConfig(defaultConfig, config, 'top-app-bar') as AppBarConfig;