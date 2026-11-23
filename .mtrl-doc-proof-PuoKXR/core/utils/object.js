export const isObject = (value) => {
    return Boolean(value &&
        typeof value === 'object' &&
        Object.getPrototypeOf(value) === Object.getPrototypeOf({}));
};
export const byString = (obj, path) => {
    const normalizedPath = path.replace(/\[(\w+)\]/g, '.$1');
    const cleanPath = normalizedPath.replace(/^\./, '');
    const keys = cleanPath.split('.');
    let result = obj;
    for (let i = 0, n = keys.length; i < n; ++i) {
        const key = keys[i];
        if (key in result) {
            result = result[key];
        }
        else {
            return undefined;
        }
    }
    return result;
};
