// src/components/bottom-app-bar/types.ts
/**
 * @module components/bottom-app-bar
 * @description Type definitions for Bottom App Bar component
 */

import { ElementComponent } from '../../core/compose';

/**
 * FAB position type for Bottom App Bar
 *
 * @deprecated Material Design 3 Expressive replaces the bottom app bar with
 * the docked toolbar. Use the toolbar's fabPosition: 'start' or 'end'. A
 * centred FAB is not yet available on the docked toolbar.
 * @category Components
 */
export type FabPosition = 'center' | 'end';

/**
 * Configuration options for Bottom App Bar component
 *
 * @deprecated Material Design 3 Expressive replaces the bottom app bar with
 * the docked toolbar. Use ToolbarConfig with
 * { variant: 'docked', placement: 'bottom' }; each option here names its
 * toolbar replacement. A centred FAB, adding a FAB after creation, a custom
 * transition duration and a custom tag are not yet available on the docked
 * toolbar. Removal is parked until Material Design v4.
 * @category Components
 */
export interface BottomAppBarConfig {
  /**
   * Element to use for the container
   * @default 'div'
   * @deprecated The docked toolbar renders a div; a custom tag is not yet
   * available on the docked toolbar.
   */
  tag?: string;

  /**
   * Whether to show FAB in the bottom bar
   * @default false
   * @deprecated Pass the FAB as fab to createToolbar, or use slot="fab" on
   * m-toolbar.
   */
  hasFab?: boolean;

  /**
   * FAB position in bottom bar
   * @default 'end'
   * @deprecated Use the toolbar's fabPosition: 'start' or 'end'. A centred
   * FAB ('center') is not yet available on the docked toolbar.
   */
  fabPosition?: FabPosition;

  /**
   * Additional CSS classes to apply
   * @deprecated Use the toolbar's class option; the classes it applies are
   * its own.
   */
  class?: string;

  /**
   * Whether to enable auto-hide on scroll
   * @default false
   * @deprecated Use scrollBehavior: 'exit' on createToolbar. Its threshold is
   * set with scrollThreshold (default 40; the bottom app bar used 10), and a
   * hidden toolbar is also inert.
   */
  autoHide?: boolean;

  /**
   * Transition duration for show/hide in ms
   * @default 300
   * @deprecated The docked toolbar transitions with the motion tokens; a
   * custom transition duration is not yet available on the docked toolbar.
   */
  transitionDuration?: number;

  /**
   * Called with the new visibility when it changes. There is no matching
   * event, so this stays a callback rather than a listener.
   * @deprecated Listen for the toolbar's show and hide events with
   * toolbar.on('show', handler) and toolbar.on('hide', handler).
   */
  onVisibilityChange?: (visible: boolean) => void;

  /**
   * Component prefix for class names
   * @default 'mtrl'
   * @deprecated Never took effect: the prefix is fixed at build time. The
   * docked toolbar has no per-instance prefix option either.
   */
  prefix?: string;

  /**
   * Component name for class generation
   * @deprecated Use the toolbar's componentName option; the docked toolbar's
   * classes are its own.
   */
  componentName?: string;
}

/**
 * Bottom App Bar component interface
 *
 * @deprecated Material Design 3 Expressive replaces the bottom app bar with
 * the docked toolbar. Use ToolbarComponent from createToolbar with
 * { variant: 'docked', placement: 'bottom' }; each method names its toolbar
 * replacement. Removal is parked until Material Design v4.
 * @category Components
 */
export interface BottomAppBarComponent extends ElementComponent {
  /**
   * Adds an action button to the bottom bar
   * @param {HTMLElement} button - Button element to add
   * @returns {BottomAppBarComponent} BottomAppBarComponent instance for chaining
   * @deprecated Use toolbar.add(item), which returns the item's element.
   */
  addAction(button: HTMLElement): this;

  /**
   * Adds a floating action button to the bottom bar
   * @param {HTMLElement} fab - FAB element to add
   * @returns {BottomAppBarComponent} BottomAppBarComponent instance for chaining
   * @deprecated Pass fab to createToolbar's config. Adding a FAB after
   * creation is not yet available on the docked toolbar.
   */
  addFab(fab: HTMLElement): this;

  /**
   * Shows the bottom bar
   * @returns {BottomAppBarComponent} BottomAppBarComponent instance for chaining
   * @deprecated Use toolbar.show().
   */
  show(): this;

  /**
   * Hides the bottom bar
   * @returns {BottomAppBarComponent} BottomAppBarComponent instance for chaining
   * @deprecated Use toolbar.hide(), which also takes the toolbar out of the
   * focus order with inert.
   */
  hide(): this;

  /**
   * Checks if the bottom bar is visible
   * @returns {boolean} Whether the bottom bar is visible
   * @deprecated Use toolbar.isVisible().
   */
  isVisible: () => boolean;

  /**
   * Get the actions container element
   * @returns {HTMLElement} Actions container element
   * @deprecated Use toolbar.bar (the element with the toolbar role) or
   * toolbar.getItems().
   */
  getActionsContainer: () => HTMLElement;
}