/** A value the browser's Trusted Types API accepts for innerHTML. */
export interface TrustedHTMLLike {
    toString(): string;
}
/** Markup a component accepts: a string, or a TrustedHTML from a policy. */
export type HTMLInput = string | TrustedHTMLLike;
export interface HTMLPolicy {
    /** Called with every markup string before it is written. */
    sanitize: (html: string) => HTMLInput;
}
/** Sets the policy every component's markup goes through, or clears it with null. */
export declare const configureHTML: (next: HTMLPolicy | null) => void;
/** The policy in force, if any. */
export declare const getHTMLPolicy: () => HTMLPolicy | null;
/** Writes markup into an element, through the policy when one is set. */
export declare const setHTML: (element: Element, html: HTMLInput | null | undefined) => void;
