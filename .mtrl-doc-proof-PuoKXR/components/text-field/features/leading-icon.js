import { installTextSlot } from "./field.js";
export const withLeadingIcon = (config) => (component) => {
    const slot = installTextSlot(component, config, config.leadingIcon, {
        part: "leading-icon",
        modifier: "leading-icon",
        inputModifier: "leading-icon",
        hidden: true,
        html: true,
    });
    return {
        ...component,
        leadingIcon: slot.element,
        setLeadingIcon(html) {
            this.leadingIcon = slot.set(html);
            return this;
        },
        removeLeadingIcon() {
            if (slot.remove())
                this.leadingIcon = null;
            return this;
        },
    };
};
