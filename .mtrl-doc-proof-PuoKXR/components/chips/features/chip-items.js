export const withChipItems = (config) => (component) => {
    const chipInstances = [];
    return {
        ...component,
        chipInstances,
        onCreated() {
            if (typeof component.onCreated === "function") {
                component.onCreated();
            }
            if (Array.isArray(config.chips) && config.chips.length > 0) {
                config.chips.forEach((chipConfig) => {
                    this.chips?.addChip?.(chipConfig);
                });
            }
        },
    };
};
