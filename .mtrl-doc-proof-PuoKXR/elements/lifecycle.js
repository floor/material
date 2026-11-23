export const MOUNT = Symbol();
export const DISPOSE = Symbol();
export const mountElement = (host) => {
    const element = host;
    if (typeof element[MOUNT] !== "function")
        throw new TypeError("Not a renderable mtrl element");
    element[MOUNT]();
};
export const disposeElement = (host) => {
    const element = host;
    if (typeof element[DISPOSE] !== "function")
        throw new TypeError("Not a renderable mtrl element");
    element[DISPOSE]();
};
