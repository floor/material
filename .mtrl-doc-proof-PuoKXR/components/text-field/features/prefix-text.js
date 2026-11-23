import { installTextSlot } from "./field.js";
export const withPrefixText = (config) => (component) => {
    const slot = installTextSlot(component, config, config.prefixText, { part: "prefix", modifier: "prefix" });
    return {
        ...component,
        prefixTextElement: slot.element,
        setPrefixText(text) {
            this.prefixTextElement = slot.set(text);
            return this;
        },
        removePrefixText() {
            if (slot.remove())
                this.prefixTextElement = null;
            return this;
        },
    };
};
