// src/components/navigation-bar/config.ts
import { createComponentConfig } from '../../core/config/component';
import type { NavigationBarConfig } from './types';

export const createBaseConfig = (config: NavigationBarConfig): NavigationBarConfig =>
    createComponentConfig({ items: [], itemLayout: 'auto', ripple: true } as NavigationBarConfig, config, 'navigation-bar') as NavigationBarConfig;
