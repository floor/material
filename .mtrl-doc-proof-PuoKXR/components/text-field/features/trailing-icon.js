import { setHTML } from "../../../core/dom/html.js";
import { fieldOf } from "./field.js";
export const withTrailingIcon = (config) => (component) => {
    const PREFIX = config.prefix || 'mtrl';
    const NAME = config.componentName || 'text-field';
    let slot = null;
    let label = config.trailingIconLabel ?? '';
    const activate = (event) => {
        if (component.input?.disabled)
            return;
        const detail = { value: component.input?.value ?? '', event };
        component.emit?.('trailing', detail);
    };
    const create = () => {
        const className = `${PREFIX}-${NAME}__trailing-icon`;
        if (!label) {
            const element = document.createElement('span');
            element.className = className;
            element.setAttribute('aria-hidden', 'true');
            return element;
        }
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `${className} ${className}--button`;
        button.setAttribute('aria-label', label);
        button.disabled = Boolean(component.input?.disabled ?? config.disabled);
        button.addEventListener('click', activate);
        return button;
    };
    const ensureSlot = () => {
        const wanted = label ? 'BUTTON' : 'SPAN';
        if (slot && slot.parentNode && slot.tagName === wanted) {
            if (label)
                slot.setAttribute('aria-label', label);
            return slot;
        }
        const element = create();
        if (slot?.parentNode) {
            element.append(...Array.from(slot.childNodes));
            slot.replaceWith(element);
        }
        else {
            fieldOf(component).appendChild(element);
        }
        component.element.classList.add(`${PREFIX}-${NAME}--with-trailing-icon`);
        if (component.input) {
            component.input.classList.add(`${PREFIX}-${NAME}__input--with-trailing-icon`);
        }
        slot = element;
        return element;
    };
    const detachSlot = () => {
        slot?.remove();
        slot = null;
        component.element.classList.remove(`${PREFIX}-${NAME}--with-trailing-icon`);
        if (component.input) {
            component.input.classList.remove(`${PREFIX}-${NAME}__input--with-trailing-icon`);
        }
    };
    const write = (element, value) => {
        setHTML(element, value);
    };
    if (config.trailingIcon) {
        write(ensureSlot(), config.trailingIcon);
    }
    if ('lifecycle' in component && component.lifecycle?.destroy) {
        const originalDestroy = component.lifecycle.destroy;
        component.lifecycle.destroy = () => {
            slot?.remove();
            slot = null;
            originalDestroy.call(component.lifecycle);
        };
    }
    return {
        ...component,
        trailingIcon: slot,
        setTrailingIcon(html, nextLabel) {
            if (nextLabel !== undefined)
                label = nextLabel;
            this.trailingIcon = ensureSlot();
            write(this.trailingIcon, html);
            return this;
        },
        removeTrailingIcon() {
            if (slot) {
                detachSlot();
                this.trailingIcon = null;
            }
            return this;
        }
    };
};
