import { addIdRef, removeIdRef, supportingRow } from "./field.js";
export const withCounter = (config) => (component) => {
    const input = component.input;
    if (!input)
        return { ...component, updateCounter: () => { } };
    const PREFIX = config.prefix || "mtrl";
    const NAME = config.componentName || "text-field";
    const row = supportingRow(component.element, PREFIX, NAME);
    const id = `${PREFIX}-${NAME}-counter-${Math.random().toString(36).slice(2, 9)}`;
    let counter = null;
    const update = () => {
        const max = input.maxLength;
        if (max > 0) {
            if (!counter) {
                counter = document.createElement("div");
                counter.className = `${PREFIX}-${NAME}__counter`;
                counter.id = id;
                row.ensure().append(counter);
                addIdRef(input, "aria-describedby", id);
            }
            counter.textContent = `${input.value.length}/${max}`;
        }
        else if (counter) {
            counter.remove();
            counter = null;
            row.release();
            removeIdRef(input, "aria-describedby", id);
        }
    };
    input.addEventListener("input", update);
    const limits = new MutationObserver(update);
    limits.observe(input, { attributes: true, attributeFilter: ["maxlength"] });
    update();
    if (component.lifecycle?.destroy) {
        const destroy = component.lifecycle.destroy;
        component.lifecycle.destroy = () => {
            input.removeEventListener("input", update);
            limits.disconnect();
            destroy.call(component.lifecycle);
        };
    }
    const setValue = component.setValue;
    return {
        ...component,
        ...(setValue && {
            setValue(value) {
                setValue.call(this, value);
                update();
                return this;
            },
        }),
        updateCounter: update,
    };
};
