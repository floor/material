import { setHTML } from "../../../core/dom/html.js";
export const withField = (config) => (component) => {
    const field = document.createElement("div");
    field.className = `${config.prefix || "mtrl"}-${config.componentName || "text-field"}__field`;
    component.element.appendChild(field);
    return { ...component, field };
};
export const fieldOf = (component) => component.field ?? component.element;
export const supportingRow = (root, prefix, name) => {
    const className = `${prefix}-${name}__supporting`;
    const find = () => root.querySelector(`:scope > .${className}`);
    return {
        ensure() {
            const existing = find();
            if (existing)
                return existing;
            const row = document.createElement("div");
            row.className = className;
            root.appendChild(row);
            return row;
        },
        release() {
            const row = find();
            if (row && !row.children.length)
                row.remove();
        },
    };
};
export const addIdRef = (element, attribute, id) => {
    const ids = (element.getAttribute(attribute) || "").split(/\s+/).filter(Boolean);
    if (!ids.includes(id))
        element.setAttribute(attribute, [...ids, id].join(" "));
};
export const removeIdRef = (element, attribute, id) => {
    const ids = (element.getAttribute(attribute) || "").split(/\s+/).filter((ref) => ref && ref !== id);
    if (ids.length)
        element.setAttribute(attribute, ids.join(" "));
    else
        element.removeAttribute(attribute);
};
export const installTextSlot = (component, names, initial, options) => {
    const prefix = names.prefix || "mtrl";
    const name = names.componentName || "text-field";
    const rootClass = `${prefix}-${name}--with-${options.modifier}`;
    const inputClass = options.inputModifier ? `${prefix}-${name}__input--with-${options.inputModifier}` : "";
    let slot = null;
    const ensure = () => {
        if (slot?.parentNode)
            return slot;
        const element = document.createElement("span");
        element.className = `${prefix}-${name}__${options.part}`;
        if (options.hidden)
            element.setAttribute("aria-hidden", "true");
        fieldOf(component).appendChild(element);
        component.element.classList.add(rootClass);
        if (inputClass && component.input)
            component.input.classList.add(inputClass);
        slot = element;
        return element;
    };
    const detach = () => {
        slot?.remove();
        slot = null;
        component.element.classList.remove(rootClass);
        if (inputClass && component.input)
            component.input.classList.remove(inputClass);
    };
    const write = (element, value) => {
        if (options.html)
            setHTML(element, value);
        else
            element.textContent = value;
    };
    if (initial)
        write(ensure(), initial);
    if (component.lifecycle?.destroy) {
        const destroy = component.lifecycle.destroy;
        component.lifecycle.destroy = () => {
            slot?.remove();
            slot = null;
            destroy.call(component.lifecycle);
        };
    }
    return {
        get element() {
            return slot;
        },
        set(value) {
            const element = ensure();
            write(element, value);
            return element;
        },
        remove() {
            if (!slot)
                return false;
            detach();
            return true;
        },
    };
};
