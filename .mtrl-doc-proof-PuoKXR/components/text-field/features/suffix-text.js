import { installTextSlot } from "./field.js";
export const withSuffixText = (config) => (component) => {
    const slot = installTextSlot(component, config, config.suffixText, { part: "suffix", modifier: "suffix" });
    return {
        ...component,
        suffixTextElement: slot.element,
        setSuffixText(text) {
            this.suffixTextElement = slot.set(text);
            return this;
        },
        removeSuffixText() {
            if (slot.remove())
                this.suffixTextElement = null;
            return this;
        },
    };
};
