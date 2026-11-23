/** Stylesheets for the shadow roots of the elements. */
/** The tag prefix: `<m-switch>`. */
export declare const DEFAULT_PREFIX = "m";
/** Internal registry access; preserves application registrations and overrides. */
export declare const styleText: (name: string) => string | undefined;
/** Identifies only fallback nodes inserted by applyStyles, never authored styles. */
export declare const isFallbackStyle: (node: Node) => boolean;
/** Registers the CSS text of style entries, keyed as in `componentStyles`. */
export declare const registerStyles: (css: Record<string, string>) => void;
/** Whether CSS is registered under a name. */
export declare const hasStyles: (name: string) => boolean;
/** On a host the server rendered with a declarative shadow root. */
export declare const RENDERED_HOST_ATTRIBUTE = "data-mtrl-ssr";
/** Last rule of every pre-upgrade sheet, inside `mtrl.preupgrade`. */
export declare const preupgradeRollback: () => string;
/** Pre-upgrade CSS, built for the default prefix, for another one: every tag selector `m-*` becomes `<prefix>-*`. */
export declare const retagPreupgrade: (css: string, prefix: string) => string;
/** The rules as one layered stylesheet, for each prefix. */
export declare const preupgradeSheet: (css: string, prefixes?: Iterable<string>) => string;
/** Applies the registered entries to a shadow root, in the given order. */
export declare const applyStyles: (root: ShadowRoot, names: readonly string[]) => void;
