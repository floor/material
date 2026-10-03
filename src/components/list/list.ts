// src/components/list/list.ts

import { pipe } from "../../core/compose/pipe";
import { createBase, withElement } from "../../core/compose/component";
import { withEvents, withLifecycle } from "../../core/compose/features";
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
 * The row's corners are four custom properties, named as the button's
 * `--mtrl-button-shape` and `--mtrl-button-shape-pressed`:
 * `--mtrl-list-item-shape` (4px at rest), `--mtrl-list-item-shape-outer`
 * (16px, the rows' outer corners and the container),
 * `--mtrl-list-item-shape-hover` (12px) and `--mtrl-list-item-shape-active`
 * (16px focused, pressed or selected). The list reads them and does not
 * declare them, so set them on the list, on any ancestor, or on the
 * `<m-list>` element. The container is rounded by
 * `--mtrl-list-item-shape-outer`, so the corners show at rest on a
 * background that is not the surface colour. Set that property to `0` to
 * square the container and the rows' outer corners. Set the four to `0`
 * for square rows.
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