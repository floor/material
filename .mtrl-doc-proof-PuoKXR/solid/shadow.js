import { isServer } from "solid-js/web";
import { getPrefix } from "../elements/adapter.js";
export const shadow = (tag, props, children) => {
    if (!isServer)
        return children;
    const render = globalThis[Symbol.for("mtrl.ssr")]?.solid;
    if (!render)
        return children;
    return render(tag, props, children, getPrefix());
};
