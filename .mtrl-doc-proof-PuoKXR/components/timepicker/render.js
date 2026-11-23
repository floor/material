import { TIME_PICKER_TYPE, TIME_FORMAT, TIME_PERIOD, } from "./types.js";
import { TIMEPICKER_ICONS } from "./constants.js";
import { padZero, convertTo12Hour, limitsOf, reachable, constrainTime, secondsOfTime } from "./utils.js";
import { createDial, nameFor } from "./dial.js";
let fieldIds = 0;
import { setHTML } from "../../core/dom/html.js";
export const nameTimePicker = (container, config) => {
    let title = container.querySelector(`.${config.prefix}-time-picker__title`);
    if (config.title) {
        if (!title) {
            title = container.ownerDocument.createElement("div");
            title.className = `${config.prefix}-time-picker__title`;
            title.id = config.titleId ?? `${config.prefix}-time-picker__title`;
            container.prepend(title);
        }
        title.textContent = config.title;
    }
    else
        title?.remove();
    const explicit = config.ariaLabel?.trim();
    if (!explicit && config.title?.trim() && title) {
        container.removeAttribute("aria-label");
        container.setAttribute("aria-labelledby", title.id);
    }
    else {
        container.removeAttribute("aria-labelledby");
        container.setAttribute("aria-label", explicit || "Select time");
    }
};
export const renderTimePicker = (container, timeValue, config, onTimeChange) => {
    container.replaceChildren();
    nameTimePicker(container, config);
    const content = document.createElement("div");
    content.className = `${config.prefix}-time-picker__content`;
    container.appendChild(content);
    const inputContainer = document.createElement("div");
    inputContainer.className = `${config.prefix}-time-picker__input-container`;
    content.appendChild(inputContainer);
    const { hours: displayHours } = config.format === TIME_FORMAT.MILITARY
        ? { hours: timeValue.hours }
        : convertTo12Hour(timeValue.hours);
    const dialMode = config.type === TIME_PICKER_TYPE.DIAL;
    const selectors = document.createElement("div");
    selectors.className = `${config.prefix}-time-picker__selectors`;
    if (dialMode) {
        selectors.setAttribute("role", "radiogroup");
        selectors.setAttribute("aria-label", "Time");
    }
    inputContainer.appendChild(selectors);
    const SELECT = { hour: "Select hour", minute: "Select minutes", second: "Select seconds" };
    const NAME = { hour: "Hour", minute: "Minute", second: "Second" };
    const CLASS = { hour: "hours", minute: "minutes", second: "seconds" };
    const show = (field, value) => {
        if (!field)
            return;
        const unit = field.getAttribute("data-type");
        if (dialMode) {
            field.textContent = padZero(value);
            field.setAttribute("aria-label", `${SELECT[unit]}: ${nameFor(unit, config.format, value)}`);
        }
        else {
            field.value = padZero(value);
        }
    };
    const createField = (unit, min, max, value) => {
        const wrapper = document.createElement("div");
        wrapper.className = `${config.prefix}-time-picker__time-input-field`;
        let field;
        if (dialMode) {
            field = document.createElement("button");
            field.type = "button";
            field.setAttribute("role", "radio");
            const active = unit === "hour";
            field.setAttribute("aria-checked", String(active));
            field.setAttribute("data-active", String(active));
            field.tabIndex = active ? 0 : -1;
        }
        else {
            const input = document.createElement("input");
            input.type = "number";
            input.min = String(min);
            input.max = String(max);
            input.setAttribute("aria-label", NAME[unit]);
            input.setAttribute("inputmode", "numeric");
            input.setAttribute("pattern", "[0-9]*");
            field = input;
        }
        field.className = `${config.prefix}-time-picker__${CLASS[unit]}`;
        field.setAttribute("data-type", unit);
        show(field, value);
        wrapper.appendChild(field);
        if (!dialMode) {
            field.id = `${config.prefix}-time-picker-${unit}-${++fieldIds}`;
            const label = document.createElement("label");
            label.className = `${config.prefix}-time-picker__input-label`;
            label.htmlFor = field.id;
            label.textContent = NAME[unit];
            wrapper.appendChild(label);
        }
        selectors.appendChild(wrapper);
        return field;
    };
    const createSeparator = () => {
        const separator = document.createElement("div");
        separator.className = `${config.prefix}-time-picker__separator`;
        separator.textContent = ":";
        selectors.appendChild(separator);
    };
    const military = config.format === TIME_FORMAT.MILITARY;
    const hoursInput = createField("hour", military ? 0 : 1, military ? 23 : 12, displayHours);
    createSeparator();
    const minutesInput = createField("minute", 0, 59, timeValue.minutes);
    let secondsInput;
    if (config.showSeconds) {
        createSeparator();
        secondsInput = createField("second", 0, 59, timeValue.seconds || 0);
    }
    if (config.format === TIME_FORMAT.AMPM) {
        const periodContainer = document.createElement("div");
        periodContainer.className = `${config.prefix}-time-picker__period`;
        periodContainer.setAttribute("role", "radiogroup");
        periodContainer.setAttribute("aria-label", "AM or PM");
        const createPeriodOption = (period) => {
            const selected = timeValue.period === period;
            const option = document.createElement("div");
            option.className = `${config.prefix}-time-picker__period-${period.toLowerCase()} ${selected ? `${config.prefix}-time-picker__period--selected` : ""}`;
            option.textContent = period;
            option.setAttribute("role", "radio");
            option.setAttribute("aria-checked", selected ? "true" : "false");
            option.setAttribute("tabindex", selected ? "0" : "-1");
            return option;
        };
        const amPeriod = createPeriodOption(TIME_PERIOD.AM);
        const pmPeriod = createPeriodOption(TIME_PERIOD.PM);
        periodContainer.appendChild(amPeriod);
        periodContainer.appendChild(pmPeriod);
        inputContainer.appendChild(periodContainer);
    }
    const dialContainer = document.createElement("div");
    dialContainer.className = `${config.prefix}-time-picker__dial`;
    dialContainer.style.display =
        config.type === TIME_PICKER_TYPE.DIAL ? "block" : "none";
    content.appendChild(dialContainer);
    const dial = createDial({
        prefix: config.prefix,
        format: config.format,
        onSelect: (value, final, pointer) => selectFromDial(value, final, pointer),
        allowed: (unit, value) => allowed(unit, value),
    });
    dialContainer.appendChild(dial.element);
    const actions = document.createElement("div");
    actions.className = `${config.prefix}-time-picker__actions`;
    container.appendChild(actions);
    const toggleTypeButton = document.createElement("button");
    toggleTypeButton.className = `${config.prefix}-time-picker__toggle-type`;
    toggleTypeButton.setAttribute("type", "button");
    toggleTypeButton.setAttribute("aria-label", config.type === TIME_PICKER_TYPE.DIAL
        ? "Toggle input picker"
        : "Toggle dial picker");
    const toggleIcon = document.createElement("span");
    toggleIcon.setAttribute("aria-hidden", "true");
    setHTML(toggleIcon, config.type === TIME_PICKER_TYPE.DIAL
        ? config.keyboardIcon || TIMEPICKER_ICONS.KEYBOARD
        : config.clockIcon || TIMEPICKER_ICONS.CLOCK);
    toggleTypeButton.appendChild(toggleIcon);
    actions.appendChild(toggleTypeButton);
    const actionButtons = document.createElement("div");
    actionButtons.className = `${config.prefix}-time-picker__action-buttons`;
    actions.appendChild(actionButtons);
    const cancelButton = document.createElement("button");
    cancelButton.className = `${config.prefix}-time-picker__cancel`;
    cancelButton.textContent = config.cancelText || "Cancel";
    cancelButton.setAttribute("type", "button");
    actionButtons.appendChild(cancelButton);
    const confirmButton = document.createElement("button");
    confirmButton.className = `${config.prefix}-time-picker__confirm`;
    confirmButton.textContent = config.confirmText || "OK";
    confirmButton.setAttribute("type", "button");
    actionButtons.appendChild(confirmButton);
    let activeSelector = "hour";
    let advance;
    const fields = () => [["hour", hoursInput], ["minute", minutesInput], ["second", secondsInput]]
        .filter((entry) => entry[1] !== undefined);
    const setActive = (unit) => {
        clearTimeout(advance);
        activeSelector = unit;
        for (const [type, field] of fields()) {
            field.setAttribute("data-active", String(type === unit));
            if (dialMode) {
                field.setAttribute("aria-checked", String(type === unit));
                field.tabIndex = type === unit ? 0 : -1;
            }
        }
        dial.update(timeValue, activeSelector);
    };
    const limits = limitsOf(config.minTime, config.maxTime);
    const minuteStep = Math.max(1, Math.floor(config.minuteStep) || 1);
    const secondStep = Math.max(1, Math.floor(config.secondStep) || 1);
    const HALF_DAY = 12 * 3600;
    const roundToStep = (value, step) => Math.min(Math.round(value / step) * step, 59 - (59 % step));
    const to24 = (hour) => config.format === TIME_FORMAT.MILITARY ? hour : (hour % 12) + (timeValue.period === TIME_PERIOD.PM ? 12 : 0);
    const periodAllowed = (period) => period === TIME_PERIOD.AM ? reachable(limits, 0, HALF_DAY - 1) : reachable(limits, HALF_DAY, 2 * HALF_DAY - 1);
    function allowed(unit, value) {
        if (unit === "hour") {
            const start = to24(value) * 3600;
            return reachable(limits, start, start + 3599);
        }
        const hour = timeValue.hours * 3600;
        if (unit === "minute")
            return value % minuteStep === 0 && reachable(limits, hour + value * 60, hour + value * 60 + 59);
        return value % secondStep === 0 && reachable(limits, hour + timeValue.minutes * 60 + value);
    }
    const refresh = (animate = false) => {
        show(hoursInput, config.format === TIME_FORMAT.MILITARY ? timeValue.hours : timeValue.hours % 12 || 12);
        show(minutesInput, timeValue.minutes);
        show(secondsInput, timeValue.seconds ?? 0);
        markPeriod();
        dial.update(timeValue, activeSelector, animate);
    };
    const settle = (animate = false) => {
        Object.assign(timeValue, constrainTime(timeValue, limits, minuteStep, secondStep));
        refresh(animate);
    };
    const notify = (before) => {
        if (secondsOfTime(before) !== secondsOfTime(timeValue))
            onTimeChange?.("hours", timeValue.hours);
    };
    function markPeriod() {
        for (const period of [TIME_PERIOD.AM, TIME_PERIOD.PM]) {
            const element = container.querySelector(`.${config.prefix}-time-picker__period-${period.toLowerCase()}`);
            if (!element)
                continue;
            const selected = timeValue.period === period;
            element.classList.toggle(`${config.prefix}-time-picker__period--selected`, selected);
            element.setAttribute("aria-checked", String(selected));
            element.setAttribute("tabindex", selected ? "0" : "-1");
            if (periodAllowed(period))
                element.removeAttribute("aria-disabled");
            else
                element.setAttribute("aria-disabled", "true");
        }
    }
    dial.update(timeValue, activeSelector, typeof getComputedStyle === "function");
    const handleInputChange = (e) => {
        const target = e.target;
        const type = target.getAttribute("data-type");
        const value = target.value;
        const commit = e.type !== "input";
        const numValue = parseInt(value, 10);
        if (isNaN(numValue)) {
            if (commit)
                refresh();
            return;
        }
        const previousValue = { ...timeValue };
        if (type === "hour") {
            let newHours = numValue;
            if (config.format === TIME_FORMAT.AMPM) {
                if (numValue < 1)
                    newHours = 12;
                if (numValue > 12)
                    newHours = 1;
                if (timeValue.period === TIME_PERIOD.PM && newHours !== 12) {
                    newHours += 12;
                }
                else if (timeValue.period === TIME_PERIOD.AM && newHours === 12) {
                    newHours = 0;
                }
            }
            else {
                if (numValue < 0)
                    newHours = 0;
                if (numValue > 23)
                    newHours = 23;
            }
            timeValue.hours = newHours;
            timeValue.period = newHours >= 12 ? TIME_PERIOD.PM : TIME_PERIOD.AM;
            setActive("hour");
        }
        else if (type === "minute") {
            let newMinutes = numValue;
            if (numValue < 0)
                newMinutes = 0;
            if (numValue > 59)
                newMinutes = 59;
            timeValue.minutes = commit ? roundToStep(newMinutes, minuteStep) : newMinutes;
            setActive("minute");
        }
        else if (type === "second") {
            let newSeconds = numValue;
            if (numValue < 0)
                newSeconds = 0;
            if (numValue > 59)
                newSeconds = 59;
            timeValue.seconds = commit ? roundToStep(newSeconds, secondStep) : newSeconds;
            setActive("second");
        }
        if (commit)
            settle();
        notify(previousValue);
    };
    const isInput = (field) => field?.tagName === "INPUT";
    for (const input of [hoursInput, minutesInput, secondsInput]) {
        if (!isInput(input))
            continue;
        input.addEventListener("input", handleInputChange);
        input.addEventListener("change", handleInputChange);
        input.addEventListener("keyup", event => {
            if (event.key === "Enter")
                handleInputChange(event);
        });
    }
    if (isInput(hoursInput) && isInput(minutesInput)) {
        const hours = hoursInput, minutes = minutesInput;
        hours.addEventListener("keyup", (e) => {
            if (e.key === "Enter") {
                minutes.focus();
                minutes.select();
            }
        });
        minutes.addEventListener("keyup", (e) => {
            if (e.key === "Enter") {
                if (config.showSeconds && isInput(secondsInput)) {
                    secondsInput.focus();
                    secondsInput.select();
                }
                else {
                    confirmButton.focus();
                }
            }
        });
        if (isInput(secondsInput)) {
            secondsInput.addEventListener("keyup", (e) => {
                if (e.key === "Enter") {
                    confirmButton.focus();
                }
            });
        }
    }
    const handlePeriodChange = (period) => {
        if (timeValue.period === period || !periodAllowed(period))
            return;
        const previousValue = { ...timeValue };
        timeValue.period = period;
        timeValue.hours = (timeValue.hours % 12) + (period === TIME_PERIOD.PM ? 12 : 0);
        settle();
        notify(previousValue);
    };
    if (config.format === TIME_FORMAT.AMPM) {
        const amPeriodElement = container.querySelector(`.${config.prefix}-time-picker__period-am`);
        const pmPeriodElement = container.querySelector(`.${config.prefix}-time-picker__period-pm`);
        const wirePeriod = (element, period, other) => {
            if (!element)
                return;
            element.addEventListener("click", () => handlePeriodChange(period));
            element.addEventListener("keydown", (event) => {
                const key = event.key;
                if (key === "Enter" || key === " " || key === "Spacebar") {
                    event.preventDefault();
                    handlePeriodChange(period);
                    return;
                }
                if (key === "ArrowLeft" ||
                    key === "ArrowRight" ||
                    key === "ArrowUp" ||
                    key === "ArrowDown") {
                    event.preventDefault();
                    if (!periodAllowed(other))
                        return;
                    handlePeriodChange(other);
                    const moved = container.querySelector(`.${config.prefix}-time-picker__period-${other.toLowerCase()}`);
                    if (moved instanceof HTMLElement)
                        moved.focus();
                }
            });
        };
        wirePeriod(amPeriodElement, TIME_PERIOD.AM, TIME_PERIOD.PM);
        wirePeriod(pmPeriodElement, TIME_PERIOD.PM, TIME_PERIOD.AM);
    }
    let started = null;
    function selectFromDial(value, final, pointer) {
        clearTimeout(advance);
        if (!final && !started)
            started = { ...timeValue };
        const previousValue = started ?? { ...timeValue };
        if (activeSelector !== "hour")
            value = roundToStep(value, activeSelector === "minute" ? minuteStep : secondStep);
        const picked = allowed(activeSelector, value);
        if (picked) {
            if (activeSelector === "hour") {
                timeValue.hours = to24(value);
                timeValue.period = timeValue.hours >= 12 ? TIME_PERIOD.PM : TIME_PERIOD.AM;
            }
            else if (activeSelector === "minute") {
                timeValue.minutes = value;
            }
            else if (secondsInput) {
                timeValue.seconds = value;
            }
            settle(true);
        }
        if (!final)
            return;
        started = null;
        notify(previousValue);
        if (picked && pointer && activeSelector === "hour") {
            advance = setTimeout(() => {
                if (dial.element.isConnected && activeSelector === "hour")
                    minutesInput.click();
            }, parseFloat(getComputedStyle(dial.element).transitionDuration) * 1000);
        }
    }
    markPeriod();
    if (dialMode) {
        for (const [unit, field] of fields()) {
            field.addEventListener("click", () => setActive(unit));
            field.addEventListener("keydown", event => {
                const key = event.key;
                const step = key === "ArrowRight" || key === "ArrowDown" ? 1
                    : key === "ArrowLeft" || key === "ArrowUp" ? -1 : 0;
                if (!step)
                    return;
                event.preventDefault();
                const all = fields();
                const [next, target] = all[(all.findIndex(([type]) => type === unit) + step + all.length) % all.length];
                setActive(next);
                target.focus();
            });
        }
    }
};
