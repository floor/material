// src/components/datepicker/shell.ts
//
// The opt-in entry's synchronous half: the field, the trigger, the dialog
// element, the value and draft state, the events, and the public API. The
// calendar is a surface module the entry builds through a factory, and the
// deferred entry passes a stand-in that imports it on the first open.
//
// The default's API module is imported here, and its calendar paint, helpers
// and icon set are imported by the surface; none of those modules changes for
// it, so the default's bytes do not move. The config is the exception: it is
// repeated below, because ./config imports ./constants, which would make
// ./constants a module shared between this first load and the deferred
// calendar chunk — and a shared module is hoisted whole, so the calendar's
// five-icon object would ship in the first load. This shell therefore touches
// ./constants not at all.

import { pipe } from "../../core/compose";
import { createBase, withElement } from "../../core/compose/component";
import { withEvents, withDisabled, withLifecycle } from "../../core/compose/features";
import { createElement } from "../../core/dom/create";
import { createComponentConfig, createElementConfig } from "../../core/config/component";
import { setHTML } from "../../core/dom/html";
import { activeElementOf, deepActiveElement } from "../../core/dom/focus";
import { eventsFrom, onModalEscape, type EventsFrom } from "../../core/dom/layer";
import { withAPI } from "./api";
import { PREFIX } from "../../core/config";
import { addMonths, formatDate, getFirstDayOfWeek, getLocaleDateFormat, isSameDay, parseDate, parseInputDate, resolveLocale, toIsoValue } from "./utils";
import type { DatePickerComponent, DatePickerConfig, DatePickerInput, DatePickerState, DatePickerValue, DatePickerValueOf, DatePickerView } from "./types";
import type { DatePickerSurfaceFactory } from "./surface";

/** The trigger's calendar icon: DATEPICKER_ICONS.calendar, kept out of that object's import. */
const TRIGGER_ICON = '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><path d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2ZM5 10h14v10H5V10Zm0-4h14v2H5V6Zm2 6h4v4H7v-4Z"/></svg>';

/** The default entry's config, repeated so this module imports no constant. */
export const defaultConfig: DatePickerConfig = {
  variant: "docked", initialView: "day", selectionMode: "single",
  dateFormat: "MM/DD/YYYY", animate: true, closeOnSelect: false,
};
export const createBaseConfig = (config: DatePickerConfig = {}) =>
  createComponentConfig(defaultConfig, config, "datepicker");
export const getContainerConfig = (config: DatePickerConfig) => createElementConfig({ ...config, ariaLabel: undefined }, {
  tag: "div", forwardEvents: { keydown: true, click: true }, interactive: true,
});

const isRangeObject = (value: DatePickerInput): value is { start: Date | string; end: Date | string } =>
  typeof value === "object" && value !== null && !(value instanceof Date) && !Array.isArray(value);

let nextId = 0;

/**
 * The deferred entry's factory.
 *
 * The surface is built by the factory the entry passes: here always a stand-in
 * that defers the import and hands over the calendar when it lands.
 *
 * @param config - The picker's configuration
 * @param createSurface - Builds the surface now, so the picker answers at creation
 * @returns The public component
 */
export function createDatePickerShell<M extends string = "single">(
  config: DatePickerConfig & { selectionMode?: M } = {},
  createSurface: DatePickerSurfaceFactory,
): DatePickerComponent<DatePickerValueOf<M>> {
  const settings = createBaseConfig(config);
  const base = pipe(createBase, withEvents(), withElement(getContainerConfig(settings)), withDisabled(settings), withLifecycle())(settings);
  const doc = base.element.ownerDocument;
  const view = doc.defaultView ?? window;
  const id = `${PREFIX}-datepicker-${++nextId}`;
  const cls = (name: string) => base.getClass(`datepicker__${name}`);
  const today = parseDate(new Date())!;
  const locale = resolveLocale(settings.locale);
  const state: DatePickerState = {
    id, prefix: PREFIX, label: settings.label || "Select date", selectedDate: null, rangeEndDate: null,
    // The full-screen list has no month or year views.
    currentView: settings.variant !== "fullscreen" && ["month", "year"].includes(settings.initialView ?? "") ? settings.initialView as DatePickerView : "day",
    currentMonth: today.getMonth(), currentYear: today.getFullYear(), focusedDate: today,
    minDate: parseDate(settings.minDate ?? null), maxDate: parseDate(settings.maxDate ?? null),
    locale, firstDayOfWeek: getFirstDayOfWeek(locale),
    dateFormat: config.dateFormat || getLocaleDateFormat(locale), variant: settings.variant === "modal" || settings.variant === "modal-input" || settings.variant === "fullscreen" ? settings.variant : "docked",
    selectionMode: settings.selectionMode === "range" ? "range" : "single", inputMode: settings.variant === "modal-input",
    specialDates: (settings.specialDates ?? []).map(item => ({ ...item })),
    isAllowed: date => (!state.minDate || date >= state.minDate) && (!state.maxDate || date <= state.maxDate) && !state.specialDates.some(item => { const special = parseDate(item.date); return item.disabled && special && isSameDay(date, special); }),
  };
  const modal = state.variant !== "docked";
  let opened = false, destroyed = false, navigationRequested = false, readOnly = false;
  // While it is open: a modal picker's place among the open modals (Escape is
  // a key press handled there, for the topmost one), and for a docked one the
  // marker that tells the click that opened it from every later one
  let guard: Partial<EventsFrom> | undefined;
  const release = () => { guard?.stop?.(); guard = undefined; };
  let committed: Date | null = null, committedEnd: Date | null = null;
  let returnFocus: HTMLElement | null = null;
  const make = (tag: string, name: string, text?: string, attributes?: Record<string, string | boolean>) =>
    createElement({ tag, className: cls(name), text, attributes });
  const label = make("label", "label", state.label, { for: `${id}-input` });
  const field = make("div", "anchor");
  const input = make("input", "input", undefined, {
    id: `${id}-input`, type: "text", placeholder: settings.placeholder || state.dateFormat, autocomplete: "off",
    "aria-describedby": `${id}-help ${id}-error`, ...(settings.name ? { name: settings.name } : {}),
  }) as HTMLInputElement;
  input.readOnly = modal;
  const trigger = make("button", "trigger", undefined, {
    type: "button", "data-action": "open", "aria-label": "Choose date", "aria-haspopup": "dialog", "aria-controls": `${id}-dialog`, "aria-expanded": "false",
  }) as HTMLButtonElement;
  setHTML(trigger, TRIGGER_ICON);
  // The supporting text, the date format unless given.
  const help = make("div", "help", settings.supportingText || state.dateFormat, { id: `${id}-help` });
  const error = make("div", "error", undefined, { id: `${id}-error`, "aria-live": "polite" });
  const dialog = doc.createElement("dialog"); dialog.id = `${id}-dialog`; dialog.className = cls("calendar");
  dialog.classList.add(base.getClass(`datepicker--${modal ? "modal" : "docked"}`));
  if (state.variant === "fullscreen") dialog.classList.add(base.getClass("datepicker--fullscreen"));
  dialog.setAttribute("aria-modal", String(modal));
  if (settings.animate) dialog.classList.add(base.getClass("datepicker--animate"));
  if (state.selectionMode === "range") dialog.classList.add(base.getClass("datepicker--range"));
  const nameDialog = () => {
    const name = settings.ariaLabel?.trim();
    if (name || !modal) {
      dialog.removeAttribute("aria-labelledby");
      dialog.setAttribute("aria-label", name || state.label);
    } else {
      dialog.setAttribute("aria-labelledby", `${id}-title`);
      // Before the surface lands there is no title to resolve. Keep the
      // deferred entry's synchronous fallback name until it exists.
      if (dialog.querySelector(`#${id}-title`)) dialog.removeAttribute("aria-label");
      else dialog.setAttribute("aria-label", state.label);
    }
  };
  nameDialog();
  field.append(input, trigger); base.element.append(label, field, help, error, dialog);
  const formatted = (date: Date | null, end: Date | null) => formatDate(date, state.dateFormat, state.locale) + (date && end ? ` - ${formatDate(end, state.dateFormat, state.locale)}` : "");
  const getValue = (): DatePickerValue => committed ? committedEnd ? [new Date(committed), new Date(committedEnd)] : new Date(committed) : null;
  const syncInput = () => {
    input.value = formatted(committed, committedEnd); input.removeAttribute("aria-invalid"); error.textContent = "";
    trigger.setAttribute("aria-label", committed ? `Change date, ${input.value}` : "Choose date");
  };
  const resetDraft = () => { state.selectedDate = committed && new Date(committed); state.rangeEndDate = committedEnd && new Date(committedEnd); };
  const setDisplayDate = (date: Date) => { state.focusedDate = new Date(date); state.currentMonth = date.getMonth(); state.currentYear = date.getFullYear(); };
  // One shape, whatever committed it: a range's value is the pair, and
  // rangeEndDate its end, kept for compatibility. The docked calendar sent the
  // start as the value and the end apart; the dialog's Save, the pair.
  // `iso`: the value as the <m-datepicker> element's `value` carries it.
  const emitChange = () => {
    const rangeEndDate = committedEnd && new Date(committedEnd);
    base.emit("change", { value: getValue(), rangeEndDate, formattedValue: formatted(committed, committedEnd), iso: toIsoValue(getValue(), rangeEndDate) });
  };
  const commitDraft = () => {
    committed = state.selectedDate && new Date(state.selectedDate); committedEnd = state.rangeEndDate && new Date(state.rangeEndDate); syncInput();
    emitChange();
  };
  const close = (restoreFocus = true) => {
    if (!opened) return;
    opened = false; release();
    if (typeof dialog.close === "function") dialog.close(); else dialog.removeAttribute("open");
    hideSurface();
    resetDraft();
    trigger.setAttribute("aria-expanded", "false");
    if (restoreFocus && returnFocus?.isConnected) returnFocus.focus();
    if (!destroyed) base.emit("close", { value: getValue() });
  };
  const open = () => {
    if (destroyed || opened || base.disabled.isDisabled() || readOnly) return;
    opened = true; release();
    guard = modal ? onModalEscape(dialog, () => close()) : eventsFrom(dialog);
    resetDraft(); state.inputMode = state.variant === "modal-input"; state.listStart = undefined;
    let initial = committed ?? today;
    if (state.minDate && initial < state.minDate) initial = state.minDate;
    if (state.maxDate && initial > state.maxDate) initial = state.maxDate;
    if (!navigationRequested) setDisplayDate(initial);
    navigationRequested = false;
    // Whatever really had focus, through any shadow roots, gets it back.
    const opener = deepActiveElement();
    returnFocus = opener instanceof HTMLElement && opener !== doc.body ? opener : trigger;
    // The state and `open` are synchronous; the paint is the surface's. A
    // deferred entry's stand-in starts its import here and paints when the
    // calendar lands.
    showSurface();
    base.emit("open", { value: getValue() });
  };
  const assignValue = (input: DatePickerInput, emit: boolean) => {
    // A range as { start, end } too, besides the pair.
    const given = isRangeObject(input) ? [input.start, input.end] as [Date | string, Date | string] : input;
    // In range mode a lone date is a one-day range, so a range's value is
    // always a pair: it was the start alone.
    const value = state.selectionMode === "range" && !Array.isArray(given) ? [given, given] as [Date | string, Date | string] : given;
    if (destroyed || Array.isArray(value) && state.selectionMode !== "range") return;
    const start = parseDate(Array.isArray(value) ? value[0] : value);
    const end = Array.isArray(value) ? parseDate(value[1]) : null;
    if (!start || !state.isAllowed(start) || Array.isArray(value) && (!end || !state.isAllowed(end))) return;
    committed = end && end < start ? end : start; committedEnd = end && end < start ? start : end;
    resetDraft(); setDisplayDate(committed); syncInput(); renderSurface(); if (emit) emitChange();
  };
  // setValue() and clear() are silent, as a native input set by script; the
  // user's entry and the calendar emit `change`.
  const clearValue = (emit: boolean) => {
    if (destroyed) return;
    committed = null; committedEnd = null; resetDraft(); syncInput(); renderSurface(); if (emit) emitChange();
  };
  const onInputChange = () => {
    if (modal || destroyed || base.disabled.isDisabled()) return;
    if (!input.value.trim()) { clearValue(true); return; }
    const pieces = state.selectionMode === "range" ? input.value.split(' - ') : [input.value];
    const dates = pieces.map(value => parseInputDate(value, state.dateFormat, state.locale));
    if (dates.length !== (state.selectionMode === 'range' ? 2 : 1) || dates.some(date => !date || !state.isAllowed(date)) || dates[1] && dates[0] && dates[1] < dates[0]) {
      input.setAttribute("aria-invalid", "true"); error.textContent = `Enter a selectable ${state.selectionMode === "range" ? "date range" : "date"} (${state.dateFormat}).`; return;
    }
    assignValue(dates.length === 2 ? [dates[0]!, dates[1]!] : dates[0]!, true);
  };
  const onClick = (event: MouseEvent) => {
    if (destroyed || base.disabled.isDisabled()) return;
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>('button') : null;
    if (!target || !base.element.contains(target) || target.hasAttribute('disabled')) return;
    // The calendar's own buttons stop their click at the dialog; this is the
    // trigger's open/close.
    if (target.dataset.action === "open" && !dialog.contains(target)) { opened ? close() : open(); }
  };
  const onKey = (event: KeyboardEvent) => {
    if (event.key === "Enter" && event.target === input && !modal) { event.preventDefault(); onInputChange(); return; }
    if (!opened) { if (event.key === "ArrowDown" && event.target === input) { event.preventDefault(); open(); } return; }
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); return; }
    if (event.key === "Tab" && modal) {
      const elements = Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled):not([tabindex="-1"]), input:not(:disabled)'));
      const first = elements[0], last = elements.at(-1);
      const focused = activeElementOf(dialog);
      if (event.shiftKey && focused === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && focused === last) { event.preventDefault(); first?.focus(); }
      return;
    }
    keySurface(event);
  };
  const onOutside = (event: MouseEvent) => {
    // The click that called open() reaches the document after it: the event
    // that opened the picker never dismisses it, and only that one
    if (!opened || (guard?.after && !guard.after(event))) return;
    if (!modal && event.target instanceof Node && !event.composedPath().includes(base.element)) close(false);
    if (modal && event.target === dialog) { const bounds = dialog.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close(); }
  };
  const onDialogClick = (event: MouseEvent) => { clickSurface(event); onOutside(event); event.stopPropagation(); };
  const onInputClick = () => { if (modal) open(); };
  const onFocusOut = (event: FocusEvent) => {
    // Native focus changes can run microtasks before activeElement has settled.
    // Use the destination so moving between days cannot close the popup mid-click.
    if (!destroyed && opened && !modal && event.relatedTarget instanceof Node && !base.element.contains(event.relatedTarget)) close(false);
  };
  const listeners: [EventTarget, string, EventListener][] = [
    [base.element, "click", onClick as EventListener],
    [base.element, "keydown", onKey as EventListener],
    [base.element, "focusout", onFocusOut as EventListener],
    [dialog, "click", onDialogClick as EventListener],
    [input, "change", onInputChange],
    [input, "click", onInputClick],
    [doc, "click", onOutside as EventListener],
  ];
  for (const [el, ev, fn] of listeners) el.addEventListener(ev, fn);
  // The entry's surface: the calendar, or the stand-in that imports it. The
  // tuple is the surface's whole runtime contract, so a stand-in forwards
  // without this shell knowing which it holds.
  const [showSurface, hideSurface, renderSurface, clickSurface, keySurface, validateSurface, destroySurface] =
    createSurface(state, dialog, cls, view, trigger, !!settings.closeOnSelect, () => opened, close, commitDraft, setDisplayDate);
  const setDisabled = (disabled: boolean) => {
    if (destroyed) return;
    if (disabled) { close(); base.disabled.disable(); } else base.disabled.enable();
    input.disabled = disabled; trigger.disabled = disabled || readOnly;
  };
  // Read-only: the value shows and cannot change; the field takes
  // no typing and the calendar does not open.
  const setReadOnly = (value: boolean) => {
    if (destroyed) return;
    readOnly = value;
    if (value) close();
    input.readOnly = value || modal;
    trigger.disabled = value || base.disabled.isDisabled();
    base.element.classList.toggle(base.getClass("datepicker--readonly"), value);
  };
  // Required: on the input for forms, where the docked field is
  // typed in; a dialog variant's input is read-only, which forms do not
  // validate. checkValidity() says whether a required date is missing, and
  // reportValidity() shows it on the field as well, as native inputs do.
  const checkValidity = (): boolean => !(input.required && !committed);
  const reportValidity = (): boolean => {
    const valid = checkValidity();
    if (!valid) { input.setAttribute("aria-invalid", "true"); error.textContent = `Select a ${state.selectionMode === "range" ? "date range" : "date"}.`; }
    return valid;
  };
  const destroy = () => {
    if (destroyed) return;
    destroyed = true; close();
    destroySurface();
    for (const [el, ev, fn] of listeners) el.removeEventListener(ev, fn);
    base.lifecycle.destroy();
  };
  const showView = (v: DatePickerView) => () => { state.currentView = v; state.inputMode = false; renderSurface(); };
  const nav = (fn: () => void) => () => { navigationRequested = !opened; fn(); renderSurface(); };
  const setBound = (key: "minDate" | "maxDate") => (value: Date | string) => {
    const date = parseDate(value); if (date && !destroyed) { state[key] = date; renderSurface(); if (state.inputMode) validateSurface(); } return api;
  };
  const stepMonth = (d: number) => nav(() => setDisplayDate(addMonths(new Date(state.currentYear, state.currentMonth, 1), d)));
  const api = withAPI({
    element: base.element, input, getClass: base.getClass,
    disabled: { enable: () => setDisabled(false), disable: () => setDisabled(true), isDisabled: () => base.disabled.isDisabled() }, lifecycle: { destroy }, destroy,
    open() { open(); return api; }, close() { close(); return api; }, isOpen: () => opened, getValue,
    getFormattedValue: () => formatted(committed, committedEnd),
    setValue(value) { assignValue(value, false); return api; },
    setReadOnly(value) { setReadOnly(value); return api; }, isReadOnly: () => readOnly,
    setRequired(value) { input.required = value; if (!value) syncInput(); return api; }, checkValidity, reportValidity,
    setSupportingText(text) { help.textContent = text || state.dateFormat; return api; },
    setAriaLabel(label) { settings.ariaLabel = label; nameDialog(); return api; },
    clear() { clearValue(false); return api; },
    enable() { setDisabled(false); return api; }, disable() { setDisabled(true); return api; },
    setMinDate: setBound("minDate"),
    setMaxDate: setBound("maxDate"),
    calendar: {
      goToDate(value) { const date = parseDate(value); if (date) nav(() => setDisplayDate(date))(); },
      nextMonth: stepMonth(1),
      prevMonth: stepMonth(-1),
      nextYear: nav(() => state.currentYear++), prevYear: nav(() => state.currentYear--),
      showDayView: showView("day"), showMonthView: showView("month"), showYearView: showView("year"),
      getCurrentView: () => state.currentView,
    },
  }, base);
  if (settings.value) assignValue(settings.value, false); else syncInput();
  setDisabled(!!settings.disabled);
  if (settings.required) input.required = true;
  if (settings.readOnly) setReadOnly(true);
  // The runtime value follows the same mode the type names.
  return api as unknown as DatePickerComponent<DatePickerValueOf<M>>;
}
