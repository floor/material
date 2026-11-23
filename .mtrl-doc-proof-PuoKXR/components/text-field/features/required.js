export const withRequired = (config) => (component) => {
    const PREFIX = config.prefix || "mtrl";
    const NAME = config.componentName || "text-field";
    const label = component.label;
    let required = Boolean(config.required);
    const asterisk = () => label?.getElement().querySelector(`.${PREFIX}-${NAME}__required`) ?? null;
    const render = () => {
        if (!label)
            return;
        const shown = asterisk();
        if (required && !config.noAsterisk) {
            if (shown)
                return;
            const span = document.createElement("span");
            span.className = `${PREFIX}-${NAME}__required`;
            span.setAttribute("aria-hidden", "true");
            span.textContent = "*";
            label.getElement().append(span);
        }
        else {
            shown?.remove();
        }
    };
    if (label) {
        const setText = label.setText.bind(label);
        label.setText = (text) => {
            setText(text);
            render();
            return label;
        };
        label.getText = () => {
            const text = label.getElement().textContent ?? "";
            return asterisk() ? text.slice(0, -1) : text;
        };
    }
    render();
    return {
        ...component,
        setRequired(next) {
            required = next;
            if (component.input)
                component.input.required = next;
            render();
            return this;
        },
        isRequired() {
            return required;
        },
    };
};
