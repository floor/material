import { TIME_PICKER_TYPE, TIME_PICKER_ORIENTATION, TIME_FORMAT, TIME_PERIOD } from "./types.js";
import { TIMEPICKER_EVENTS as EVENTS } from "./constants.js";
import { formatFormValue } from "./utils.js";
import { nameTimePicker, renderTimePicker } from "./render.js";
import { setFormValue } from "../../core/dom/form-value.js";
import { deepActiveElement } from "../../core/dom/focus.js";
import { onModalEscape } from "../../core/dom/layer.js";
export const createTimePickerAPI = (baseComponent, modalElement, dialogElement, timeValue, config, options, formValue = null) => {
    let committed = { ...timeValue };
    const format = (time) => formatFormValue(time, config.showSeconds === true);
    const getValue = () => format(committed);
    const notifyChange = () => {
        const value = getValue();
        setFormValue(formValue, value);
        options.events.emit(EVENTS.CHANGE, { value });
    };
    const notifyInput = () => {
        const event = { value: getValue(), draftValue: format(timeValue) };
        options.events.emit(EVENTS.INPUT, event);
    };
    const render = () => {
        renderTimePicker(dialogElement, timeValue, config, notifyInput);
        setFormValue(formValue, getValue());
    };
    const restoreDraft = () => {
        Object.assign(timeValue, committed);
        render();
    };
    const commit = () => {
        const before = getValue();
        committed = { ...timeValue };
        if (getValue() !== before)
            notifyChange();
    };
    let disabled = config.disabled === true;
    const markDisabled = () => {
        baseComponent.element.classList.toggle(`${config.prefix}-time-picker--disabled`, disabled);
        if (disabled)
            baseComponent.element.setAttribute("aria-disabled", "true");
        else
            baseComponent.element.removeAttribute("aria-disabled");
    };
    markDisabled();
    const part = (name) => `.${config.prefix}-time-picker__${name}`;
    const dialog = dialogElement;
    let isOpen = false;
    let returnFocus = null;
    const cancel = () => {
        restoreDraft();
        options.events.emit(EVENTS.CANCEL);
        timePickerAPI.close();
    };
    const confirm = () => {
        commit();
        options.events.emit(EVENTS.CONFIRM, { value: getValue() });
        timePickerAPI.close();
    };
    let escape;
    const show = () => {
        if (!isOpen)
            return;
        if (!baseComponent.element.isConnected && !dialog.isConnected)
            document.body.append(baseComponent.element);
        const active = deepActiveElement();
        returnFocus = active instanceof HTMLElement && active !== document.body ? active : null;
        if (typeof dialog.showModal === 'function' && dialog.isConnected)
            dialog.showModal();
        else
            dialog.setAttribute('open', '');
        dialogElement.classList.add('active');
        focusField();
    };
    const focusField = () => {
        const field = dialog.querySelector('[data-active="true"]') ?? dialog.querySelector('input, button');
        field?.focus();
    };
    const timePickerAPI = {
        element: baseComponent.element,
        modalElement,
        dialogElement,
        isOpen: () => isOpen,
        open(later) {
            if (isOpen || disabled)
                return this;
            restoreDraft();
            isOpen = true;
            baseComponent.element.classList.add(`${config.prefix}-time-picker--open`);
            escape?.stop();
            escape = onModalEscape(dialog, cancel);
            if (later === true)
                setTimeout(show, 0);
            else
                show();
            options.events.emit(EVENTS.OPEN);
            return this;
        },
        close() {
            if (!isOpen)
                return this;
            dialogElement.classList.remove('active');
            if (typeof dialog.close === 'function' && dialog.open)
                dialog.close();
            else
                dialog.removeAttribute('open');
            if (returnFocus?.isConnected)
                returnFocus.focus();
            returnFocus = null;
            isOpen = false;
            escape?.stop();
            baseComponent.element.classList.remove(`${config.prefix}-time-picker--open`);
            options.events.emit(EVENTS.CLOSE);
            return this;
        },
        toggle() {
            return isOpen ? this.close() : this.open();
        },
        getValue() {
            return getValue();
        },
        getTimeObject() {
            return { ...committed };
        },
        setValue(time) {
            try {
                const parsedTime = time.split(':');
                const hours = parseInt(parsedTime[0], 10);
                const minutes = parseInt(parsedTime[1], 10);
                const seconds = parsedTime[2] ? parseInt(parsedTime[2], 10) : 0;
                if (isNaN(hours) || hours < 0 || hours > 23 ||
                    isNaN(minutes) || minutes < 0 || minutes > 59 ||
                    isNaN(seconds) || seconds < 0 || seconds > 59) {
                    throw new Error('Invalid time format. Use HH:MM or HH:MM:SS (24-hour format).');
                }
                timeValue.hours = hours;
                timeValue.minutes = minutes;
                timeValue.seconds = seconds;
                timeValue.period = hours >= 12 ? TIME_PERIOD.PM : TIME_PERIOD.AM;
                committed = { ...timeValue };
                render();
            }
            catch (error) {
                console.error('Error setting time value:', error);
            }
            return this;
        },
        setType(type) {
            if (config.type === type)
                return this;
            config.type = type;
            dialogElement.classList.remove(`${config.prefix}-time-picker__dialog--${TIME_PICKER_TYPE.DIAL}`, `${config.prefix}-time-picker__dialog--${TIME_PICKER_TYPE.INPUT}`);
            dialogElement.classList.add(`${config.prefix}-time-picker__dialog--${type}`);
            render();
            return this;
        },
        getType() {
            return config.type;
        },
        setFormat(format) {
            if (config.format === format)
                return this;
            config.format = format;
            dialogElement.classList.remove(`${config.prefix}-time-picker__dialog--${TIME_FORMAT.AMPM}`, `${config.prefix}-time-picker__dialog--${TIME_FORMAT.MILITARY}`);
            dialogElement.classList.add(`${config.prefix}-time-picker__dialog--${format}`);
            if (format === TIME_FORMAT.MILITARY) {
                timeValue.period = timeValue.hours >= 12 ? TIME_PERIOD.PM : TIME_PERIOD.AM;
            }
            else {
                timeValue.period = timeValue.hours >= 12 ? TIME_PERIOD.PM : TIME_PERIOD.AM;
            }
            render();
            return this;
        },
        getFormat() {
            return config.format;
        },
        setOrientation(orientation) {
            if (config.orientation === orientation)
                return this;
            config.orientation = orientation;
            dialogElement.classList.remove(`${config.prefix}-time-picker__dialog--${TIME_PICKER_ORIENTATION.VERTICAL}`, `${config.prefix}-time-picker__dialog--${TIME_PICKER_ORIENTATION.HORIZONTAL}`);
            dialogElement.classList.add(`${config.prefix}-time-picker__dialog--${orientation}`);
            render();
            return this;
        },
        getOrientation() {
            return config.orientation;
        },
        setTitle(title) {
            config.title = title;
            nameTimePicker(dialogElement, config);
            return this;
        },
        setAriaLabel(label) {
            config.ariaLabel = label;
            nameTimePicker(dialogElement, config);
            return this;
        },
        getTitle() {
            return config.title || '';
        },
        enable() {
            disabled = false;
            markDisabled();
            return this;
        },
        disable() {
            if (isOpen)
                cancel();
            disabled = true;
            markDisabled();
            return this;
        },
        isDisabled() {
            return disabled;
        },
        destroy() {
            if (isOpen)
                this.close();
            modalElement?.remove();
            options.lifecycle.destroy();
        },
        on(event, handler) {
            options.events.on(event, handler);
            return this;
        },
        off(event, handler) {
            options.events.off(event, handler);
            return this;
        }
    };
    dialogElement.addEventListener('click', (event) => {
        if (event.target === dialog) {
            const box = dialog.getBoundingClientRect();
            if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)
                cancel();
            return;
        }
        const target = event.target;
        if (target.closest(part('cancel')))
            cancel();
        if (target.closest(part('confirm')))
            confirm();
        if (target.closest(part('toggle-type'))) {
            const newType = config.type === TIME_PICKER_TYPE.DIAL
                ? TIME_PICKER_TYPE.INPUT
                : TIME_PICKER_TYPE.DIAL;
            timePickerAPI.setType(newType);
            const next = newType === TIME_PICKER_TYPE.INPUT ? dialogElement.querySelector(part('hours')) : dialogElement.querySelector(part('toggle-type'));
            next?.focus();
            if (next instanceof HTMLInputElement)
                next.select();
        }
    });
    dialog.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && event.target instanceof HTMLInputElement)
            event.preventDefault();
    });
    render();
    if (config.onChange)
        timePickerAPI.on(EVENTS.CHANGE, config.onChange);
    if (config.onInput)
        timePickerAPI.on(EVENTS.INPUT, config.onInput);
    if (config.onOpen)
        timePickerAPI.on(EVENTS.OPEN, config.onOpen);
    if (config.onClose)
        timePickerAPI.on(EVENTS.CLOSE, config.onClose);
    if (config.onCancel)
        timePickerAPI.on(EVENTS.CANCEL, config.onCancel);
    if (config.onConfirm)
        timePickerAPI.on(EVENTS.CONFIRM, config.onConfirm);
    return timePickerAPI;
};
