import { BottomAppBarComponent, BottomAppBarConfig } from "./types.js";
/**
 * Creates a bottom app bar component
 * @deprecated Material Design 3 Expressive replaces the bottom app bar with
 * the docked toolbar. Use createToolbar with
 * { variant: 'docked', placement: 'bottom' } from material/components/toolbar
 * instead. A centred FAB, adding a FAB after creation, a custom
 * transitionDuration and a custom tag are not yet available on the docked
 * toolbar. Removal is parked until Material Design v4.
 * @param config
 */
export declare const createBottomAppBar: (config?: BottomAppBarConfig) => BottomAppBarComponent;
