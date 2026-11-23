import type { TopAppBarComponent, TopAppBarConfig } from "./types.js";
export type { TopAppBarComponent };
/**
 * Creates a top app bar component
 * @deprecated use {@link createAppBar}. Material Design 3 names the
 * component the app bar; this name stays for 3.x.
 * @param config
 */
export declare const createTopAppBar: (config?: TopAppBarConfig) => TopAppBarComponent;
/** Creates an app bar: the same factory as {@link createTopAppBar}, under the name Material Design 3 gives the component. */
export declare const createAppBar: (config?: TopAppBarConfig) => TopAppBarComponent;
