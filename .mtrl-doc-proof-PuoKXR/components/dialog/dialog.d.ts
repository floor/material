/** Dialog Component Implementation This module implements a Material Design 3 dialog component that can be used for alerts, confirmations, form submissions, and complex interactions. */
import { DialogConfig, DialogComponent } from "./types.js";
/**
 * Creates a new Dialog component with the specified configuration.
 * @param config
 */
declare const createDialog: (config?: DialogConfig) => DialogComponent;
export default createDialog;
