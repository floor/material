import { PREFIX } from "../core/config.js";
const ariaAttribute = (name, reference) => ({
    type: "string",
    update(component, value, host) {
        const button = component.leadingElement ?? component.element;
        if (reference) {
            const control = button;
            if (!(reference in control))
                return;
            const root = host.getRootNode();
            const targets = [];
            for (const id of String(value ?? "").split(/[\t\n\f\r ]+/)) {
                const target = id && root.getElementById?.(id);
                if (target)
                    targets.push(target);
            }
            control[reference] = targets.length ? targets : null;
        }
        else if (value !== null) {
            button.setAttribute(name, String(value));
        }
        else if (name === "aria-pressed" && (button.classList.contains(`${PREFIX}-button--toggle`) || button.classList.contains(`${PREFIX}-icon-button--toggle`))) {
            button.setAttribute(name, String(component.isSelected?.() ?? false));
        }
        else {
            button.removeAttribute(name);
        }
    },
});
export const buttonAria = {
    "aria-expanded": ariaAttribute("aria-expanded"),
    "aria-haspopup": ariaAttribute("aria-haspopup"),
    "aria-pressed": ariaAttribute("aria-pressed"),
    "aria-controls": ariaAttribute("aria-controls", "ariaControlsElements"),
    "aria-describedby": ariaAttribute("aria-describedby", "ariaDescribedByElements"),
};
export const syncButtonAria = (host, component) => {
    for (const [name, attribute] of Object.entries(buttonAria)) {
        const value = host.getAttribute(name);
        if (value !== null)
            attribute.update?.(component, value, host);
    }
};
export const typeAttribute = { type: "string", update: () => undefined };
export const buttonForm = () => ({
    value: () => null,
    disable: (c, disabled) => void (disabled ? c.disable() : c.enable()),
});
export const setupFormButton = (host, component) => {
    syncButtonAria(host, component);
    const onClick = () => {
        const form = host.internals?.form;
        const type = host.getAttribute("type");
        if (!form || host.hasAttribute("disabled"))
            return;
        if (type === "submit")
            form.requestSubmit();
        else if (type === "reset")
            form.reset();
    };
    host.addEventListener("click", onClick);
    return () => host.removeEventListener("click", onClick);
};
