const overrides = new Map();
export const setIcons = (icons) => {
    for (const name of Object.keys(icons)) {
        const value = icons[name];
        if (typeof value === "string" && value.length > 0)
            overrides.set(name, value);
        else
            overrides.delete(name);
    }
};
export const getIcon = (name, fallback) => overrides.get(name) ?? fallback;
