// src/components/bottom-app-bar/constants.ts

/**
 * FAB position constants for Bottom App Bar
 *
 * @deprecated Material Design 3 Expressive replaces the bottom app bar with
 * the docked toolbar. Use the toolbar's fabPosition: 'start' or 'end'. A
 * centred FAB is not yet available on the docked toolbar.
 */
export const FAB_POSITIONS = {
  CENTER: 'center',
  END: 'end'
} as const;

/**
 * Default transition duration for show/hide animations
 *
 * @deprecated The docked toolbar transitions with the motion tokens; a custom
 * transition duration is not yet available on the docked toolbar.
 */
export const DEFAULT_TRANSITION_DURATION = 300;

/**
 * CSS class names used in the bottom app bar component
 *
 * @deprecated The docked toolbar applies its own classes; style it with its
 * parts (toolbar, bar, fab, overflow) instead.
 */
export const BOTTOM_APP_BAR_CLASSES = {
  ROOT: 'bottom-app-bar',
  ACTIONS: 'bottom-app-bar__actions',
  FAB_CONTAINER: 'bottom-app-bar__fab-container',
  HIDDEN: 'bottom-app-bar--hidden',
  FAB_CENTER: 'bottom-app-bar--fab-center',
  FAB_END: 'bottom-app-bar--fab-end'
} as const;