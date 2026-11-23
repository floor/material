const classCache = new Map();
const MAX_CACHE_SIZE = 500;
export const normalizeClasses = (...classes) => {
    if (classes.length === 0)
        return [];
    if (classes.length === 1 && typeof classes[0] === "string") {
        const input = classes[0];
        if (!input)
            return [];
        if (!input.includes(" "))
            return [input];
        if (classCache.has(input)) {
            return classCache.get(input);
        }
    }
    const seen = new Set();
    const result = [];
    for (const cls of classes) {
        if (typeof cls === "string" && cls) {
            if (!cls.includes(" ")) {
                if (!seen.has(cls)) {
                    seen.add(cls);
                    result.push(cls);
                }
            }
            else {
                cls.split(" ").forEach((c) => {
                    const trimmed = c.trim();
                    if (trimmed && !seen.has(trimmed)) {
                        seen.add(trimmed);
                        result.push(trimmed);
                    }
                });
            }
        }
        else if (Array.isArray(cls)) {
            cls.forEach((c) => {
                if (typeof c === "string" && c) {
                    c.split(" ").forEach((part) => {
                        const trimmed = part.trim();
                        if (trimmed && !seen.has(trimmed)) {
                            seen.add(trimmed);
                            result.push(trimmed);
                        }
                    });
                }
            });
        }
    }
    if (classes.length === 1 &&
        typeof classes[0] === "string" &&
        result.length <= 10) {
        if (classCache.size < MAX_CACHE_SIZE) {
            classCache.set(classes[0], result);
        }
    }
    return result;
};
const forEachClass = (classes, apply) => {
    if (classes.length === 1 &&
        typeof classes[0] === "string" &&
        classes[0] &&
        !classes[0].includes(" ")) {
        apply(classes[0]);
        return;
    }
    for (const name of normalizeClasses(...classes))
        apply(name);
};
export const addClass = (element, ...classes) => {
    forEachClass(classes, (name) => element.classList.add(name));
    return element;
};
export const removeClass = (element, ...classes) => {
    forEachClass(classes, (name) => element.classList.remove(name));
    return element;
};
export const toggleClass = (element, ...classes) => {
    forEachClass(classes, (name) => element.classList.toggle(name));
    return element;
};
export const hasClass = (element, ...classes) => {
    for (const name of normalizeClasses(...classes)) {
        if (!element.classList.contains(name))
            return false;
    }
    return true;
};
