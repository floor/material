import { warnUnknownValue } from "../../core/utils/warn.js";
export const withRadio = (config) => (component) => {
    const radios = [];
    const radiosClass = component.getClass('radios');
    let selectedValue = config.value || '';
    component.element.classList.add(`${radiosClass}--${config.direction || 'vertical'}`);
    if (config.disabled) {
        component.element.classList.add(`${radiosClass}--disabled`);
    }
    const createRadioItem = (option) => {
        const radioContainer = document.createElement('div');
        radioContainer.classList.add(`${radiosClass}__item`);
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = config.name;
        input.value = option.value;
        input.classList.add(`${radiosClass}__input`);
        if (selectedValue === option.value) {
            input.checked = true;
        }
        if (config.disabled || option.disabled) {
            input.disabled = true;
            radioContainer.classList.add(`${radiosClass}__item--disabled`);
        }
        if (config.required)
            input.required = true;
        const label = document.createElement('label');
        label.classList.add(`${radiosClass}__label`);
        const radioControl = document.createElement('span');
        radioControl.classList.add(`${radiosClass}__control`);
        const radioCircle = document.createElement('span');
        radioCircle.classList.add(`${radiosClass}__circle`);
        if (config.ripple !== false) {
            const rippleContainer = document.createElement('span');
            rippleContainer.classList.add(`${radiosClass}__ripple`);
            radioControl.appendChild(rippleContainer);
        }
        radioControl.appendChild(radioCircle);
        const textSpan = document.createElement('span');
        textSpan.classList.add(`${radiosClass}__text`);
        textSpan.textContent = option.label;
        if (option.labelBefore) {
            label.classList.add(`${radiosClass}__label--before`);
            label.appendChild(textSpan);
            label.appendChild(radioControl);
        }
        else {
            label.appendChild(radioControl);
            label.appendChild(textSpan);
        }
        const inputId = `${radiosClass}-${option.value}-${Math.random().toString(36).substring(2, 9)}`;
        input.id = inputId;
        label.htmlFor = inputId;
        radioContainer.appendChild(input);
        radioContainer.appendChild(label);
        const handleChange = (e) => {
            if (input.checked) {
                selectedValue = option.value;
                radios.forEach(radio => {
                    if (radio.input !== input) {
                        radio.input.checked = false;
                    }
                });
                component.emit?.('change', {
                    value: option.value || null,
                    originalEvent: e,
                    option
                });
            }
        };
        input.addEventListener('change', handleChange);
        return {
            element: radioContainer,
            input,
            label,
            config: option,
            destroy: () => {
                input.removeEventListener('change', handleChange);
                if (radioContainer.parentNode) {
                    radioContainer.parentNode.removeChild(radioContainer);
                }
            }
        };
    };
    const addOption = (option) => {
        const radioItem = createRadioItem(option);
        component.element.appendChild(radioItem.element);
        radios.push(radioItem);
        return component;
    };
    const removeOption = (value) => {
        const index = radios.findIndex(radio => radio.config.value === value);
        if (index !== -1) {
            const radioItem = radios[index];
            radioItem.destroy();
            radios.splice(index, 1);
            if (selectedValue === value) {
                selectedValue = '';
            }
        }
        return component;
    };
    if (config.options && Array.isArray(config.options)) {
        config.options.forEach(option => addOption(option));
    }
    return {
        ...component,
        radios,
        getValue: () => selectedValue || null,
        setValue: (value) => {
            const known = value !== null && radios.some(radio => radio.config.value === value);
            selectedValue = known ? value : '';
            radios.forEach(radio => {
                radio.input.checked = known && radio.config.value === value;
            });
            if (!known && value !== null)
                warnUnknownValue('radios', value);
            return component;
        },
        getSelected: () => {
            const selected = radios.find(radio => radio.config.value === selectedValue);
            return selected ? selected.config : null;
        },
        addOption,
        removeOption,
        enable: () => {
            component.element.classList.remove(`${radiosClass}--disabled`);
            radios.forEach(radio => {
                radio.input.disabled = radio.config.disabled || false;
                if (!radio.config.disabled) {
                    radio.element.classList.remove(`${radiosClass}__item--disabled`);
                }
            });
            return component;
        },
        isDisabled: () => component.element.classList.contains(`${radiosClass}--disabled`),
        disable: () => {
            component.element.classList.add(`${radiosClass}--disabled`);
            radios.forEach(radio => {
                radio.input.disabled = true;
                radio.element.classList.add(`${radiosClass}__item--disabled`);
            });
            return component;
        },
        enableOption: (value) => {
            const radio = radios.find(r => r.config.value === value);
            if (radio) {
                radio.config.disabled = false;
                radio.input.disabled = component.element.classList.contains(`${radiosClass}--disabled`);
                if (!radio.input.disabled) {
                    radio.element.classList.remove(`${radiosClass}__item--disabled`);
                }
            }
            return component;
        },
        disableOption: (value) => {
            const radio = radios.find(r => r.config.value === value);
            if (radio) {
                radio.config.disabled = true;
                radio.input.disabled = true;
                radio.element.classList.add(`${radiosClass}__item--disabled`);
            }
            return component;
        }
    };
};
export default withRadio;
