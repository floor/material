import { getPrefix, isBrowser } from "../elements/adapter.js";
export const shadow = (tag, props, children) => {
    if (isBrowser)
        return "";
    const render = globalThis[Symbol.for("mtrl.ssr")]?.vue;
    if (!render)
        return "";
    return render(tag, props, children, getPrefix());
};
