import { SnackbarConfig, SnackbarComponent } from "./types.js";
/**
 * Creates a new Snackbar component
 * @param config
 */
declare const createSnackbar: (config: SnackbarConfig) => SnackbarComponent;
/** Dismisses the snackbar on screen and drops the ones still waiting. */
export declare const clearSnackbars: () => void;
export default createSnackbar;
