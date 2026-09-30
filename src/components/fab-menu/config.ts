// src/components/fab-menu/config.ts

import { createComponentConfig } from "../../core/config/component";
import type { FabMenuConfig } from "./types";
import {
  FAB_MENU_COLORS,
  FAB_MENU_SIZES,
  FAB_MENU_PRESENTATIONS,
  FAB_MENU_PLACEMENTS,
  type FabMenuColor,
  type FabMenuSize,
  type FabMenuPresentation,
  type FabMenuPlacement,
} from "./constants";

/** Material "close", the close button's default icon (drawn at 20dp) */
export const CLOSE_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';

export interface ResolvedFabMenuConfig extends FabMenuConfig {
  color: FabMenuColor;
  size: FabMenuSize;
  presentation: FabMenuPresentation;
  placement: FabMenuPlacement;
}

const oneOf = <T extends string>(values: Record<string, T>, value: unknown, fallback: T): T =>
  (Object.values(values) as unknown[]).includes(value) ? (value as T) : fallback;

export const createConfig = (config: FabMenuConfig): ResolvedFabMenuConfig => {
  const merged = createComponentConfig({}, config, "fab-menu") as unknown as FabMenuConfig;
  return {
    ...merged,
    items: merged.items ?? [],
    color: oneOf(FAB_MENU_COLORS, merged.color, FAB_MENU_COLORS.PRIMARY),
    size: oneOf(FAB_MENU_SIZES, merged.size, FAB_MENU_SIZES.DEFAULT),
    presentation: oneOf(FAB_MENU_PRESENTATIONS, merged.presentation, FAB_MENU_PRESENTATIONS.AUTO),
    placement: oneOf(FAB_MENU_PLACEMENTS, merged.placement, FAB_MENU_PLACEMENTS.NONE),
  };
};
