export const setFormValue = (input, value) => {
    input?.setAttribute("value", value);
};
export const createFormValue = (container, name, value, disabled = false) => {
    if (!name)
        return null;
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.disabled = disabled;
    setFormValue(input, value);
    container.appendChild(input);
    return input;
};
