export const withToggle = (config) => (component) => {
    if (!config.toggle) {
        return component;
    }
    const { element } = component;
    const buttonClass = component.getClass("button");
    let selected = false;
    const apply = (next) => {
        selected = next;
        element.classList.toggle(`${buttonClass}--selected`, next);
        element.setAttribute("aria-pressed", String(next));
    };
    element.classList.add(`${buttonClass}--toggle`);
    apply(config.selected === true);
    if (config.toggleOnClick !== false) {
        element.addEventListener("click", () => {
            if (element.disabled)
                return;
            apply(!selected);
            component.emit?.("change", { selected, value: element.value });
        });
    }
    return {
        ...component,
        toggle: {
            setSelected: (next) => {
                if (next !== selected)
                    apply(next);
            },
            isSelected: () => selected,
        },
    };
};
