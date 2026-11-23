/** `<m-bottom-app-bar>`: the bottom app bar as a container with slots. */
import type { BottomAppBarComponent } from "../components/bottom-app-bar/types.js";
import { type Config, type DefineOptions, type ElementInstance } from "./define.js";
declare const bottomAppBarSpec: {
    name: string;
    slots: readonly [
        "fab"
    ];
    create: (config: Config) => BottomAppBarComponent;
    styles: string[];
    hostStyles: string;
    attributes: {
        "fab-position": {
            type: "string";
            config: string;
        };
        "auto-hide": {
            type: "boolean";
            config: string;
        };
        "transition-duration": {
            type: "number";
            config: string;
        };
        "aria-label": {
            type: "string";
            update: (c: BottomAppBarComponent, v: import("./define.js").AttributeValue) => void;
        };
    };
    methods: readonly [
        "show",
        "hide"
    ];
    config: (host: HTMLElement) => Config;
    setup: (host: import("./define.js").ElementHost<BottomAppBarComponent>, component: BottomAppBarComponent) => () => void | undefined;
};
/**
 * The `<m-bottom-app-bar>` element.
 * @deprecated Material Design 3 Expressive replaces the bottom app bar with
 * the docked toolbar. Use `<m-toolbar variant="docked" placement="bottom">`
 * and toolbarElement instead. A centred FAB, adding a FAB after creation, a
 * custom transition duration and a custom tag are not yet available on the
 * docked toolbar.
 */
export declare const bottomAppBarElement: import("./define.js").ElementDefinition<BottomAppBarComponent>;
/** @deprecated Use ToolbarSpec: the docked toolbar's element spec. */
export type BottomAppBarSpec = typeof bottomAppBarSpec;
/**
 * `<m-bottom-app-bar>` as a ref or a query returns it.
 * @deprecated Use ToolbarElement: the docked toolbar's element type.
 */
export type BottomAppBarElement = ElementInstance<BottomAppBarSpec, BottomAppBarComponent>;
/**
 * Registers `<m-bottom-app-bar>` (or `<prefix-bottom-app-bar>`).
 * @deprecated Material Design 3 Expressive replaces the bottom app bar with
 * the docked toolbar. Use defineToolbar and
 * `<m-toolbar variant="docked" placement="bottom">` instead.
 */
export declare const defineBottomAppBar: (options?: DefineOptions) => string;
declare global {
    /** `document.querySelector("m-…")` and `createElement` return the element's type (the default prefix). */
    interface HTMLElementTagNameMap {
        "m-bottom-app-bar": BottomAppBarElement;
    }
}
export {};
