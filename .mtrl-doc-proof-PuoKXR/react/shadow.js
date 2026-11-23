"use client";
import * as React from "react";
import { getPrefix, isBrowser } from "../elements/adapter.js";
export const shadow = (tag, props, children) => {
    if (isBrowser)
        return null;
    const render = globalThis[Symbol.for("mtrl.ssr")]?.react;
    const html = render?.(tag, props, children, getPrefix());
    return html === undefined ? null : React.createElement("template", {
        shadowrootmode: "open", shadowrootdelegatesfocus: "",
        dangerouslySetInnerHTML: { __html: html },
    });
};
