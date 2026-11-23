import { pipe } from "../../core/compose/index.js";
import { createBase, withElement } from "../../core/compose/component.js";
import { withEvents, withDisabled, withLifecycle } from "../../core/compose/features/index.js";
import { createElement } from "../../core/dom/create.js";
import { createComponentConfig, createElementConfig } from "../../core/config/component.js";
import { setHTML } from "../../core/dom/html.js";
import { activeElementOf, deepActiveElement } from "../../core/dom/focus.js";
import { eventsFrom, onModalEscape } from "../../core/dom/layer.js";
import { withAPI } from "./api.js";
import { PREFIX } from "../../core/config.js";
import { formatDate, getLocaleDateFormat, isSameDay, parseDate, parseInputDate, resolveLocale, toIsoValue } from "./field-format.js";
const TRIGGER_ICON = '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><path d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2ZM5 10h14v10H5V10Zm0-4h14v2H5V6Zm2 6h4v4H7v-4Z"/></svg>';
export const defaultConfig = {
    variant: "docked", initialView: "day", selectionMode: "single",
    animate: true, closeOnSelect: false,
};
export const createBaseConfig = (config = {}) => createComponentConfig(defaultConfig, config, "datepicker");
export const getContainerConfig = (config) => createElementConfig({ ...config, ariaLabel: undefined }, {
    tag: "div", forwardEvents: { keydown: true, click: true }, interactive: true,
});
const isRangeObject = (value) => typeof value === "object" && value !== null && !(value instanceof Date) && !Array.isArray(value);
let nextId = 0;
export function createDatePickerShell(config = {}, createSurface) {
    const settings = createBaseConfig(config);
    const base = pipe(createBase, withEvents(), withElement(getContainerConfig(settings)), withDisabled(settings), withLifecycle())(settings);
    const doc = base.element.ownerDocument;
    const view = doc.defaultView ?? window;
    const id = `${PREFIX}-datepicker-${++nextId}`;
    const cls = (name) => base.getClass(`datepicker__${name}`);
    const today = parseDate(new Date());
    const locale = resolveLocale(settings.locale);
    const state = {
        id, prefix: PREFIX, label: settings.label || "Select date", selectedDate: null, rangeEndDate: null,
        currentView: settings.variant !== "fullscreen" && ["month", "year"].includes(settings.initialView ?? "") ? settings.initialView : "day",
        currentMonth: today.getMonth(), currentYear: today.getFullYear(), focusedDate: today,
        minDate: parseDate(settings.minDate ?? null), maxDate: parseDate(settings.maxDate ?? null),
        locale, firstDayOfWeek: 1,
        dateFormat: settings.dateFormat || getLocaleDateFormat(locale), variant: settings.variant === "modal" || settings.variant === "modal-input" || settings.variant === "fullscreen" ? settings.variant : "docked",
        selectionMode: settings.selectionMode === "range" ? "range" : "single", inputMode: settings.variant === "modal-input",
        specialDates: (settings.specialDates ?? []).map(item => ({ ...item })),
        isAllowed: date => (!state.minDate || date >= state.minDate) && (!state.maxDate || date <= state.maxDate) && !state.specialDates.some(item => { const special = parseDate(item.date); return item.disabled && special && isSameDay(date, special); }),
    };
    const modal = state.variant !== "docked";
    let opened = false, destroyed = false, navigationRequested = false, readOnly = false;
    let guard;
    const release = () => { guard?.stop?.(); guard = undefined; };
    let committed = null, committedEnd = null;
    let returnFocus = null;
    const make = (tag, name, text, attributes) => createElement({ tag, className: cls(name), text, attributes });
    const label = make("label", "label", state.label, { for: `${id}-input` });
    const field = make("div", "anchor");
    const input = make("input", "input", undefined, {
        id: `${id}-input`, type: "text", placeholder: settings.placeholder || state.dateFormat, autocomplete: "off",
        "aria-describedby": `${id}-help ${id}-error`, ...(settings.name ? { name: settings.name } : {}),
    });
    input.readOnly = modal;
    const trigger = make("button", "trigger", undefined, {
        type: "button", "data-action": "open", "aria-label": "Choose date", "aria-haspopup": "dialog", "aria-controls": `${id}-dialog`, "aria-expanded": "false",
    });
    setHTML(trigger, TRIGGER_ICON);
    const help = make("div", "help", settings.supportingText || state.dateFormat, { id: `${id}-help` });
    const error = make("div", "error", undefined, { id: `${id}-error`, "aria-live": "polite" });
    const dialog = doc.createElement("dialog");
    dialog.id = `${id}-dialog`;
    dialog.className = cls("calendar");
    dialog.classList.add(base.getClass(`datepicker--${modal ? "modal" : "docked"}`));
    if (state.variant === "fullscreen")
        dialog.classList.add(base.getClass("datepicker--fullscreen"));
    dialog.setAttribute("aria-modal", String(modal));
    if (settings.animate)
        dialog.classList.add(base.getClass("datepicker--animate"));
    if (state.selectionMode === "range")
        dialog.classList.add(base.getClass("datepicker--range"));
    const nameDialog = () => {
        const name = settings.ariaLabel?.trim();
        if (name || !modal) {
            dialog.removeAttribute("aria-labelledby");
            dialog.setAttribute("aria-label", name || state.label);
        }
        else {
            dialog.setAttribute("aria-labelledby", `${id}-title`);
            if (dialog.querySelector(`#${id}-title`))
                dialog.removeAttribute("aria-label");
            else
                dialog.setAttribute("aria-label", state.label);
        }
    };
    nameDialog();
    field.append(input, trigger);
    base.element.append(label, field, help, error, dialog);
    const formatted = (date, end) => formatDate(date, state.dateFormat, state.locale) + (date && end ? ` - ${formatDate(end, state.dateFormat, state.locale)}` : "");
    const getValue = () => committed ? committedEnd ? [new Date(committed), new Date(committedEnd)] : new Date(committed) : null;
    const syncInput = () => {
        input.value = formatted(committed, committedEnd);
        input.removeAttribute("aria-invalid");
        error.textContent = "";
        trigger.setAttribute("aria-label", committed ? `Change date, ${input.value}` : "Choose date");
    };
    const resetDraft = () => { state.selectedDate = committed && new Date(committed); state.rangeEndDate = committedEnd && new Date(committedEnd); };
    const setDisplayDate = (date) => { state.focusedDate = new Date(date); state.currentMonth = date.getMonth(); state.currentYear = date.getFullYear(); };
    const emitChange = () => {
        const rangeEndDate = committedEnd && new Date(committedEnd);
        base.emit("change", { value: getValue(), rangeEndDate, formattedValue: formatted(committed, committedEnd), iso: toIsoValue(getValue(), rangeEndDate) });
    };
    const commitDraft = () => {
        committed = state.selectedDate && new Date(state.selectedDate);
        committedEnd = state.rangeEndDate && new Date(state.rangeEndDate);
        syncInput();
        emitChange();
    };
    const close = (restoreFocus = true) => {
        if (!opened)
            return;
        opened = false;
        release();
        if (typeof dialog.close === "function")
            dialog.close();
        else
            dialog.removeAttribute("open");
        hideSurface();
        resetDraft();
        trigger.setAttribute("aria-expanded", "false");
        if (restoreFocus && returnFocus?.isConnected)
            returnFocus.focus();
        if (!destroyed)
            base.emit("close", { value: getValue() });
    };
    const open = () => {
        if (destroyed || opened || base.disabled.isDisabled() || readOnly)
            return;
        opened = true;
        release();
        guard = modal ? onModalEscape(dialog, () => close()) : eventsFrom(dialog);
        resetDraft();
        state.inputMode = state.variant === "modal-input";
        state.listStart = undefined;
        let initial = committed ?? today;
        if (state.minDate && initial < state.minDate)
            initial = state.minDate;
        if (state.maxDate && initial > state.maxDate)
            initial = state.maxDate;
        if (!navigationRequested)
            setDisplayDate(initial);
        navigationRequested = false;
        const opener = deepActiveElement();
        returnFocus = opener instanceof HTMLElement && opener !== doc.body ? opener : trigger;
        showSurface();
        base.emit("open", { value: getValue() });
    };
    const assignValue = (input, emit) => {
        const given = isRangeObject(input) ? [input.start, input.end] : input;
        const value = state.selectionMode === "range" && !Array.isArray(given) ? [given, given] : given;
        if (destroyed || Array.isArray(value) && state.selectionMode !== "range")
            return;
        const start = parseDate(Array.isArray(value) ? value[0] : value);
        const end = Array.isArray(value) ? parseDate(value[1]) : null;
        if (!start || !state.isAllowed(start) || Array.isArray(value) && (!end || !state.isAllowed(end)))
            return;
        committed = end && end < start ? end : start;
        committedEnd = end && end < start ? start : end;
        resetDraft();
        setDisplayDate(committed);
        syncInput();
        renderSurface();
        if (emit)
            emitChange();
    };
    const clearValue = (emit) => {
        if (destroyed)
            return;
        committed = null;
        committedEnd = null;
        resetDraft();
        syncInput();
        renderSurface();
        if (emit)
            emitChange();
    };
    const onInputChange = () => {
        if (modal || destroyed || base.disabled.isDisabled())
            return;
        if (!input.value.trim()) {
            clearValue(true);
            return;
        }
        const pieces = state.selectionMode === "range" ? input.value.split(' - ') : [input.value];
        const dates = pieces.map(value => parseInputDate(value, state.dateFormat, state.locale));
        if (dates.length !== (state.selectionMode === 'range' ? 2 : 1) || dates.some(date => !date || !state.isAllowed(date)) || dates[1] && dates[0] && dates[1] < dates[0]) {
            input.setAttribute("aria-invalid", "true");
            error.textContent = `Enter a selectable ${state.selectionMode === "range" ? "date range" : "date"} (${state.dateFormat}).`;
            return;
        }
        assignValue(dates.length === 2 ? [dates[0], dates[1]] : dates[0], true);
    };
    const onClick = (event) => {
        if (destroyed || base.disabled.isDisabled())
            return;
        const target = event.target instanceof Element ? event.target.closest('button') : null;
        if (!target || !base.element.contains(target) || target.hasAttribute('disabled'))
            return;
        if (target.dataset.action === "open" && !dialog.contains(target)) {
            opened ? close() : open();
        }
    };
    const onKey = (event) => {
        if (event.key === "Enter" && event.target === input && !modal) {
            event.preventDefault();
            onInputChange();
            return;
        }
        if (!opened) {
            if (event.key === "ArrowDown" && event.target === input) {
                event.preventDefault();
                open();
            }
            return;
        }
        if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            close();
            return;
        }
        if (event.key === "Tab" && modal) {
            const elements = Array.from(dialog.querySelectorAll('button:not(:disabled):not([tabindex="-1"]), input:not(:disabled)'));
            const first = elements[0], last = elements.at(-1);
            const focused = activeElementOf(dialog);
            if (event.shiftKey && focused === first) {
                event.preventDefault();
                last?.focus();
            }
            else if (!event.shiftKey && focused === last) {
                event.preventDefault();
                first?.focus();
            }
            return;
        }
        keySurface(event);
    };
    const onOutside = (event) => {
        if (!opened || (guard?.after && !guard.after(event)))
            return;
        if (!modal && event.target instanceof Node && !event.composedPath().includes(base.element))
            close(false);
        if (modal && event.target === dialog) {
            const bounds = dialog.getBoundingClientRect();
            if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)
                close();
        }
    };
    const onDialogClick = (event) => { clickSurface(event); onOutside(event); event.stopPropagation(); };
    const onInputClick = () => {
        if (modal)
            open();
    };
    const onFocusOut = (event) => {
        if (!destroyed && opened && !modal && event.relatedTarget instanceof Node && !base.element.contains(event.relatedTarget))
            close(false);
    };
    const listeners = [
        [base.element, "click", onClick],
        [base.element, "keydown", onKey],
        [base.element, "focusout", onFocusOut],
        [dialog, "click", onDialogClick],
        [input, "change", onInputChange],
        [input, "click", onInputClick],
        [doc, "click", onOutside],
    ];
    for (const [el, ev, fn] of listeners)
        el.addEventListener(ev, fn);
    const [showSurface, hideSurface, renderSurface, clickSurface, keySurface, validateSurface, destroySurface] = createSurface(state, dialog, cls, view, trigger, !!settings.closeOnSelect, () => opened, close, commitDraft, setDisplayDate, base.emit);
    const setDisabled = (disabled) => {
        if (destroyed)
            return;
        if (disabled) {
            close();
            base.disabled.disable();
        }
        else
            base.disabled.enable();
        input.disabled = disabled;
        trigger.disabled = disabled || readOnly;
    };
    const setReadOnly = (value) => {
        if (destroyed)
            return;
        readOnly = value;
        if (value)
            close();
        input.readOnly = value || modal;
        trigger.disabled = value || base.disabled.isDisabled();
        base.element.classList.toggle(base.getClass("datepicker--readonly"), value);
    };
    const checkValidity = () => !(input.required && !committed);
    const reportValidity = () => {
        const valid = checkValidity();
        if (!valid) {
            input.setAttribute("aria-invalid", "true");
            error.textContent = `Select a ${state.selectionMode === "range" ? "date range" : "date"}.`;
        }
        return valid;
    };
    const destroy = () => {
        if (destroyed)
            return;
        destroyed = true;
        close();
        destroySurface();
        for (const [el, ev, fn] of listeners)
            el.removeEventListener(ev, fn);
        base.lifecycle.destroy();
    };
    const showView = (v) => () => { state.currentView = v; state.inputMode = false; renderSurface(); };
    const nav = (fn) => () => { navigationRequested = !opened; fn(); renderSurface(); };
    const setBound = (key) => (value) => {
        const date = parseDate(value);
        if (date && !destroyed) {
            state[key] = date;
            renderSurface();
            if (state.inputMode)
                validateSurface();
        }
        return api;
    };
    const stepMonth = (d) => nav(() => setDisplayDate(new Date(state.currentYear, state.currentMonth + d, 1)));
    const api = withAPI({
        element: base.element, input, getClass: base.getClass,
        disabled: { enable: () => setDisabled(false), disable: () => setDisabled(true), isDisabled: () => base.disabled.isDisabled() }, lifecycle: { destroy }, destroy,
        open() { open(); return api; }, close() { close(); return api; }, isOpen: () => opened, getValue,
        getFormattedValue: () => formatted(committed, committedEnd),
        setValue(value) { assignValue(value, false); return api; },
        setReadOnly(value) { setReadOnly(value); return api; }, isReadOnly: () => readOnly,
        setRequired(value) {
            input.required = value;
            if (!value)
                syncInput();
            return api;
        }, checkValidity, reportValidity,
        setSupportingText(text) { help.textContent = text || state.dateFormat; return api; },
        setAriaLabel(label) { settings.ariaLabel = label; nameDialog(); return api; },
        clear() { clearValue(false); return api; },
        enable() { setDisabled(false); return api; }, disable() { setDisabled(true); return api; },
        setMinDate: setBound("minDate"),
        setMaxDate: setBound("maxDate"),
        calendar: {
            goToDate(value) {
                const date = parseDate(value);
                if (date)
                    nav(() => setDisplayDate(date))();
            },
            nextMonth: stepMonth(1),
            prevMonth: stepMonth(-1),
            nextYear: nav(() => state.currentYear++), prevYear: nav(() => state.currentYear--),
            showDayView: showView("day"), showMonthView: showView("month"), showYearView: showView("year"),
            getCurrentView: () => state.currentView,
        },
    }, base);
    if (settings.value)
        assignValue(settings.value, false);
    else
        syncInput();
    setDisabled(!!settings.disabled);
    if (settings.required)
        input.required = true;
    if (settings.readOnly)
        setReadOnly(true);
    return api;
}
