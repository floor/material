import { withTrack as withTrackCore, } from "../../core/compose/features/index.js";
const ensureSwitchStructure = (component, prefix, componentName) => {
    const PREFIX = prefix || "mtrl";
    const COMPONENT = componentName || "switch";
    const existingContainer = component.element.querySelector(`.${PREFIX}-${COMPONENT}__container`);
    if (!existingContainer) {
        const container = document.createElement("div");
        container.className = `${PREFIX}-${COMPONENT}__container`;
        const input = component.element.querySelector(`.${PREFIX}-${COMPONENT}__input`);
        const track = component.element.querySelector(`.${PREFIX}-${COMPONENT}__track`);
        const elementsToMove = [];
        if (input)
            elementsToMove.push(input);
        if (track)
            elementsToMove.push(track);
        const contentWrapper = document.createElement("div");
        contentWrapper.className = `${PREFIX}-${COMPONENT}__content`;
        const label = component.element.querySelector(`.${PREFIX}-${COMPONENT}__label`);
        if (label) {
            contentWrapper.appendChild(label);
        }
        container.appendChild(contentWrapper);
        elementsToMove.forEach((el) => container.appendChild(el));
        component.element.appendChild(container);
        return { container, contentWrapper };
    }
    let contentWrapper = component.element.querySelector(`.${PREFIX}-${COMPONENT}__content`);
    if (!contentWrapper) {
        contentWrapper = document.createElement("div");
        contentWrapper.className = `${PREFIX}-${COMPONENT}__content`;
        const label = component.element.querySelector(`.${PREFIX}-${COMPONENT}__label`);
        if (label) {
            contentWrapper.appendChild(label);
        }
        existingContainer.insertBefore(contentWrapper, existingContainer.firstChild);
    }
    return { container: existingContainer, contentWrapper };
};
export const withSupportingText = (config) => (component) => {
    const PREFIX = config.prefix || "mtrl";
    const COMPONENT = config.componentName || "switch";
    const { contentWrapper } = ensureSwitchStructure(component, PREFIX, COMPONENT);
    const input = component.input;
    let errorState = !!config.error;
    const setError = (isError) => {
        errorState = isError;
        component.element.classList.toggle(`${PREFIX}-${COMPONENT}--error`, isError);
        component.element.querySelector(`.${PREFIX}-${COMPONENT}__helper`)
            ?.classList.toggle(`${PREFIX}-${COMPONENT}__helper--error`, isError);
        if (isError)
            input?.setAttribute("aria-invalid", "true");
        else
            input?.removeAttribute("aria-invalid");
    };
    const describe = (element) => {
        if (!input)
            return;
        if (!element) {
            input.removeAttribute("aria-describedby");
            return;
        }
        if (!element.id)
            element.id = `${PREFIX}-${COMPONENT}-helper-${Math.random().toString(36).slice(2, 9)}`;
        input.setAttribute("aria-describedby", element.id);
    };
    let supportingElement = null;
    if (config.supportingText) {
        supportingElement = document.createElement("div");
        supportingElement.className = `${PREFIX}-${COMPONENT}__helper`;
        supportingElement.textContent = config.supportingText;
        if (config.error) {
            supportingElement.classList.add(`${PREFIX}-${COMPONENT}__helper--error`);
        }
        contentWrapper.appendChild(supportingElement);
        describe(supportingElement);
    }
    setError(!!config.error);
    if ("lifecycle" in component &&
        component.lifecycle &&
        typeof component.lifecycle === "object" &&
        "destroy" in component.lifecycle &&
        supportingElement) {
        const originalDestroy = component.lifecycle.destroy;
        component.lifecycle.destroy = () => {
            if (supportingElement)
                supportingElement.remove();
            originalDestroy.call(component.lifecycle);
        };
    }
    return {
        ...component,
        supportingTextElement: supportingElement,
        setSupportingText(text, isError = false) {
            const { contentWrapper } = ensureSwitchStructure(component, PREFIX, COMPONENT);
            let supportingElement = this.supportingTextElement;
            if (!supportingElement) {
                supportingElement = document.createElement("div");
                supportingElement.className = `${PREFIX}-${COMPONENT}__helper`;
                contentWrapper.appendChild(supportingElement);
                this.supportingTextElement = supportingElement;
                describe(supportingElement);
            }
            supportingElement.textContent = text;
            supportingElement.classList.toggle(`${PREFIX}-${COMPONENT}__helper--error`, isError);
            return this;
        },
        removeSupportingText() {
            if (this.supportingTextElement &&
                this.supportingTextElement.parentNode) {
                this.supportingTextElement.remove();
                this.supportingTextElement = null;
                describe(null);
            }
            return this;
        },
        setError(error) {
            setError(error);
            return this;
        },
        isError: () => errorState,
    };
};
export const withTrack = (config) => (component) => {
    const trackConfig = {
        ...config,
        prefix: config.prefix || "mtrl",
        componentName: config.componentName || "switch",
    };
    return withTrackCore(trackConfig)(component);
};
