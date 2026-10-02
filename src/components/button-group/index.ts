// src/components/button-group/index.ts

/**
 * Button Group component exports
 *
 * The Button Group component provides a container for grouping related action buttons.
 * A standard group holds related actions, each button acting on its own; a
 * connected group (`kind: "connected"`, with `selection`) is M3's replacement for
 * the segmented button, which material 3.0.0 removed (FLO-382).
 *
 * @packageDocumentation
 */

// Export main component
export { default as createButtonGroup } from './button-group';
export { default } from './button-group';

// Export types
export type {
  ButtonGroupConfig,
  ButtonGroupComponent,
  ButtonGroupItemConfig,
  ButtonGroupEvent,
  ButtonGroupEventType,
  ButtonGroupVariant,
  ButtonGroupOrientation,
  ButtonGroupDensity
} from './types';
// The kind, selection and change payload its config and events use (FLO-384)
export type { ButtonGroupKind, ButtonGroupSelection, ButtonGroupChangeEvent } from './types';

// Export constants
export {
  BUTTON_GROUP_VARIANTS,
  BUTTON_GROUP_ORIENTATIONS,
  BUTTON_GROUP_DENSITY,
  BUTTON_GROUP_EVENTS,
  BUTTON_GROUP_DEFAULTS,
  BUTTON_GROUP_CLASSES
} from './constants';
