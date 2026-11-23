import { CardContentConfig, CardHeaderConfig, CardMediaConfig, CardActionsConfig } from "./types.js";
export declare const CARD_CONTENT_PADDING = true;
/**
 * Creates a card content component
 * @param config
 */
export declare const createCardContent: (config?: CardContentConfig) => HTMLElement;
/**
 * Creates a card header component
 * @param config
 */
export declare const createCardHeader: (config?: CardHeaderConfig) => HTMLElement;
/**
 * Creates a card actions component
 * @param config
 */
export declare const createCardActions: (config?: CardActionsConfig) => HTMLElement;
/** Controls inside a clickable card. */
export declare const NESTED_ACTION_SELECTOR = "button,a[href],input,select,textarea,m-button,m-icon-button,[role=button],[role=link],slot[name=actions],slot[name=header-action]";
/**
 * Creates a card media component
 * @param config
 */
export declare const createCardMedia: (config?: CardMediaConfig) => HTMLElement;
