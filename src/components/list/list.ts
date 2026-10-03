// src/components/list/list.ts

import { pipe } from "../../core/compose/pipe";
import { createBase, withElement } from "../../core/compose/component";
import { withEvents, withLifecycle, withVariant } from "../../core/compose/features";
import { withRenderer, withSelection } from "./features";
import { withAPI } from "./api";
import { createBaseConfig, getElementConfig, getApiConfig } from "./config";
import type { ListComponent, ListConfig, ListItem } from "./types";

/**
 * Creates a new List component
 *
 * The List component provides a simple way to render static arrays of data
 * with Material item anatomy and built-in selection capabilities.
 *
 * `variant` is the list's style. `'standard'` (the default) is the baseline
 * list: no container, square rows in every state. `'segmented'` is the
 * expressive list: each row paints its own container colour and shape, with
 * a gap between rows; the list itself has no background and no radius.
 *
 * A segmented list reads five custom properties, named as the button's
 * `--mtrl-button-shape` and `--mtrl-button-shape-pressed`:
 * `--mtrl-list-item-shape` (4px at rest), `--mtrl-list-item-shape-outer`
 * (16px, the outer corners of the first and the last row),
 * `--mtrl-list-item-shape-hover` (12px), `--mtrl-list-item-shape-active`
 * (16px focused, pressed or selected) and `--mtrl-list-segmented-gap` (2px
 * between rows). The row colour is `--mtrl-list-item-container-color` in
 * both variants (surface by default in standard, surface-container in
 * segmented); set it to `transparent` for rows without their own colour.
 * The list reads these and does not declare them, so set them on the list,
 * on any ancestor, or on the `<m-list>` element.
 *
 * @param config - Configuration options for the list
 * @returns List component instance
 */
const createList = (
  config: Partial<ListConfig<ListItem>> = {},
): ListComponent<ListItem> => {
  try {
    // Process the configuration with defaults
    const baseConfig = createBaseConfig(config);

    // Create the component through functional composition
    const component = pipe(
      createBase,
      withEvents(),
      withElement(getElementConfig(baseConfig)),
      withVariant(baseConfig),
      withRenderer(baseConfig),        // Item rendering
      withSelection(baseConfig),       // Selection capabilities
      withLifecycle(),
      (comp) => withAPI(getApiConfig(comp, baseConfig))(comp) // Apply public API
    )(baseConfig);

    return component;
  } catch (error) {
    console.error("List creation error:", error);
    throw new Error(`Failed to create list: ${(error as Error).message}`);
  }
};

export default createList;