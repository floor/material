// src/components/tabs/responsive.ts
//
// The `responsive` option createTabs takes, as a plugin the app imports and
// passes in. It lives in its own entry so that a page which never imports it
// carries none of the behaviour: `material/components/tabs` does not re-export
// this module, and its deprecated `setupResponsiveBehavior` re-export keeps
// the enhancer itself in the tabs entry's graph, where it already was.
import { setupResponsiveBehavior } from './responsive-legacy';
import type { ResponsiveConfig } from './responsive-legacy';
import type { TabsComponent } from './types';

export type { ResponsiveConfig } from './responsive-legacy';

/**
 * The behaviour `tabsResponsive` builds, applied by `createTabs` while the
 * group is created.
 */
export type TabsResponsive = (tabs: TabsComponent) => void;

/**
 * Creates the `responsive` option for `createTabs`.
 *
 * It is a plugin, not a flag: the app imports it from
 * `material/components/tabs/responsive` and passes the result as the option,
 * so a page that never imports it does not carry the behaviour. `createTabs`
 * calls it synchronously while it builds the group, so the first paint
 * already carries the responsive layout — there is no frame in the built one.
 *
 * It takes the same configuration as `setupResponsiveBehavior`: below the
 * small breakpoint (600 by default) a tab built with an icon and a label
 * takes `smallScreen.layout` (`'icon-only'` by default), and the group
 * carries its `--responsive-small` class while it does.
 *
 * @example
 * ```ts
 * import { createTabs } from 'material/components/tabs';
 * import { tabsResponsive } from 'material/components/tabs/responsive';
 *
 * const tabs = createTabs({
 *   tabs: [{ text: 'Flights', value: 'flights', icon: flightsIcon }],
 *   responsive: tabsResponsive({ smallScreen: { layout: 'icon-only' } }),
 * });
 * ```
 * @param config - Responsive configuration
 */
export const tabsResponsive = (config: ResponsiveConfig = {}): TabsResponsive =>
  (tabs: TabsComponent): void => {
    // A server render creates the group with no window to measure: the layout
    // is applied when the app hydrates and creates it on the client.
    if (typeof window === 'undefined' || typeof ResizeObserver === 'undefined') return;
    setupResponsiveBehavior(tabs, config);
  };
