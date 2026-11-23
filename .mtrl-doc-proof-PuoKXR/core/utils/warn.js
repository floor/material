const isDevelopment = () => {
    try {
        return (typeof process !== "undefined" &&
            process.env != null &&
            process.env.NODE_ENV !== "production");
    }
    catch {
        return false;
    }
};
export const warnUnknownValue = (component, value) => {
    if (!isDevelopment())
        return;
    console.warn(`[mtrl] ${component}: no option with value "${String(value)}"`);
};
export const warnDev = (component, message) => {
    if (!isDevelopment())
        return;
    console.warn(`[mtrl] ${component}: ${message}`);
};
