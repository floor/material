/** Attributes whose value is a URL, and so must be checked before assignment. */
export declare const URL_ATTRIBUTES: Set<string>;
/** Whether a URL is safe to assign to a navigable attribute. */
export declare const isSafeUrl: (url: string) => boolean;
/** Returns the URL if its scheme is allowed, otherwise an empty string. */
export declare const safeUrl: (url: string) => string;
