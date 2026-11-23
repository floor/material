/** true emits an empty attribute; false, null and undefined omit it. */
export type RenderAttributes = Readonly<Record<string, string | number | boolean | null | undefined>>;
/** Tag prefix defaults to "m". */
export type RenderOptions = {
    prefix?: string;
} & ({
    styles?: "inline";
} | {
    styles: "link";
    cssBase: string;
});
/** Render a registered tag to declarative shadow DOM, synchronously and detached. */
export declare function renderElement(tag: string, attributes?: RenderAttributes, children?: string, options?: RenderOptions): string;
