export const withError = (config) => (component) => {
    const PREFIX = config.prefix || "mtrl";
    const COMPONENT = config.componentName || "text-field";
    let errorState = config.error || false;
    let displacedText = null;
    const markInvalid = (invalid) => {
        if (!component.input)
            return;
        if (invalid)
            component.input.setAttribute("aria-invalid", "true");
        else
            component.input.removeAttribute("aria-invalid");
    };
    if (errorState) {
        component.element.classList.add(`${PREFIX}-${COMPONENT}--error`);
    }
    markInvalid(errorState);
    return {
        ...component,
        errorState,
        setError(error, message) {
            errorState = error;
            component.element.classList.toggle(`${PREFIX}-${COMPONENT}--error`, error);
            markInvalid(error);
            if (message !== undefined && component.setSupportingText) {
                if (message) {
                    if (error && displacedText === null) {
                        displacedText = component.supportingTextElement?.textContent ?? "";
                    }
                    component.setSupportingText(message, error);
                }
                else if (!error) {
                    component.setSupportingText("", false);
                    displacedText = null;
                }
            }
            else if (!error && displacedText !== null && component.setSupportingText) {
                if (displacedText)
                    component.setSupportingText(displacedText, false);
                else
                    component.removeSupportingText?.();
                displacedText = null;
            }
            else if (component.supportingTextElement &&
                component.setSupportingText) {
                const currentText = component.supportingTextElement.textContent || "";
                if (currentText) {
                    component.setSupportingText(currentText, error);
                }
            }
            return this;
        },
        isError() {
            return errorState;
        },
    };
};
