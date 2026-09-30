// src/components/toolbar/config.ts

import { createComponentConfig } from "../../core/config/component";
import type { ToolbarConfig } from "./types";
import {
  TOOLBAR_VARIANTS,
  TOOLBAR_COLORS,
  TOOLBAR_ORIENTATIONS,
  TOOLBAR_PLACEMENTS,
  TOOLBAR_ARRANGEMENTS,
  TOOLBAR_SCROLL_BEHAVIORS,
  TOOLBAR_SCROLL_THRESHOLD,
  type ToolbarVariant,
  type ToolbarColor,
  type ToolbarOrientation,
  type ToolbarPlacement,
  type ToolbarArrangement,
  type ToolbarFabPosition,
} from "./constants";

/** Material "more vert", the overflow button's default icon */
export const OVERFLOW_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>';

export const defaultConfig: ToolbarConfig = {
  variant: TOOLBAR_VARIANTS.DOCKED,
  color: TOOLBAR_COLORS.STANDARD,
  orientation: TOOLBAR_ORIENTATIONS.HORIZONTAL,
  placement: TOOLBAR_PLACEMENTS.NONE,
  arrangement: TOOLBAR_ARRANGEMENTS.SPREAD,
  fabPosition: "end",
  scrollBehavior: TOOLBAR_SCROLL_BEHAVIORS.NONE,
  scrollThreshold: TOOLBAR_SCROLL_THRESHOLD,
  overflowLabel: "More options",
  ariaLabel: "Toolbar",
};

/** The config with every choice settled to one the variant supports. */
export interface ResolvedToolbarConfig extends ToolbarConfig {
  variant: ToolbarVariant;
  color: ToolbarColor;
  orientation: ToolbarOrientation;
  placement: ToolbarPlacement;
  arrangement: ToolbarArrangement;
  fabPosition: ToolbarFabPosition;
  elevated: boolean;
  exit: boolean;
  scrollThreshold: number;
}

const oneOf = <T extends string>(values: Record<string, T>, value: unknown, fallback: T): T =>
  (Object.values(values) as unknown[]).includes(value) ? (value as T) : fallback;

export const resolveColor = (color: unknown): ToolbarColor =>
  oneOf(TOOLBAR_COLORS, color, TOOLBAR_COLORS.STANDARD);

/**
 * A placement the layout supports: a docked toolbar only docks at the bottom
 * (m3.material.io toolbars guidelines), a horizontal floating one at the bottom
 * or top, a vertical one at the start or end.
 */
const resolvePlacement = (
  placement: ToolbarPlacement,
  variant: ToolbarVariant,
  orientation: ToolbarOrientation
): ToolbarPlacement => {
  if (placement === TOOLBAR_PLACEMENTS.NONE) return placement;
  if (variant === TOOLBAR_VARIANTS.DOCKED) return TOOLBAR_PLACEMENTS.BOTTOM;
  if (orientation === TOOLBAR_ORIENTATIONS.VERTICAL)
    return placement === TOOLBAR_PLACEMENTS.START ? placement : TOOLBAR_PLACEMENTS.END;
  return placement === TOOLBAR_PLACEMENTS.TOP ? placement : TOOLBAR_PLACEMENTS.BOTTOM;
};

export const createConfig = (config: ToolbarConfig = {}): ResolvedToolbarConfig => {
  const merged = createComponentConfig(defaultConfig, config, "toolbar") as ToolbarConfig;
  const variant = oneOf(TOOLBAR_VARIANTS, merged.variant, TOOLBAR_VARIANTS.DOCKED);
  const floating = variant === TOOLBAR_VARIANTS.FLOATING;
  const orientation = floating
    ? oneOf(TOOLBAR_ORIENTATIONS, merged.orientation, TOOLBAR_ORIENTATIONS.HORIZONTAL)
    : TOOLBAR_ORIENTATIONS.HORIZONTAL;
  return {
    ...merged,
    variant,
    orientation,
    color: resolveColor(merged.color),
    placement: resolvePlacement(
      oneOf(TOOLBAR_PLACEMENTS, merged.placement, TOOLBAR_PLACEMENTS.NONE),
      variant,
      orientation
    ),
    arrangement: oneOf(TOOLBAR_ARRANGEMENTS, merged.arrangement, TOOLBAR_ARRANGEMENTS.SPREAD),
    fabPosition: merged.fabPosition === "start" ? "start" : "end",
    // The site: "Floating toolbars have elevation by default". Compose raises
    // the floating toolbar to Level1 when it pairs with a FAB, which is the
    // level used here. The docked toolbar has "No shadow".
    elevated: floating && merged.elevated !== false,
    exit: merged.scrollBehavior === TOOLBAR_SCROLL_BEHAVIORS.EXIT,
    scrollThreshold: Math.max(0, Number(merged.scrollThreshold) || 0),
  };
};
