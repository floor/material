// src/components/datepicker/shell.ts
//
// The datepicker's synchronous half: the field, the trigger, the dialog
// element, the value and draft state, the events, and the public API. The
// calendar is a surface module the entry builds through a factory: the default
// entry passes createCalendarSurface, so the picker paints at creation, and the
// deferred one passes a stand-in that imports the calendar on the first open.
// Both entries run this same shell, so their synchronous contract — isOpen(),
// the open/close events, a close while the surface is in flight — is one
// implementation.

import { pipe } from "../../core/compose";
import { createBase, withElement } from "../../core/compose/component";
import { withEvents, withDisabled, withLifecycle } from "../../core/compose/features";
import { createElement } from "../../core/dom/create";
import { createComponentConfig, createElementConfig } from "../../core/config/component";
import { setHTML } from "../../core/dom/html";
import { activeElementOf, deepActiveElement } from "../../core/dom/focus";
import { eventsFrom, onModalEscape, type EventsFrom, type ModalEscape } from "../../core/dom/layer";
import { CALENDAR_ICON, DEFAULT_DATE_FORMAT } from "./constants";
import { PREFIX } from "../../core/config";
import { addMonths, formatDate, isSameDay, parseDate, parseInputDate, toIsoValue } from "./utils";
import type { DatePickerComponent, DatePickerConfig, DatePickerEvents, DatePickerInput, DatePickerState, DatePickerValue, DatePickerValueOf, DatePickerView } from "./types";
import type { EventCallback } from "../../core/state/emitter";
import type { DatePickerSurfaceFactory } from "./surface";

export const defaultConfig: DatePickerConfig = {
  variant: "docked", initialView: "day", selectionMode: "single",
  dateFormat: DEFAULT_DATE_FORMAT, animate: true, closeOnSelect: false,
};
export const createBaseConfig = (config: DatePickerConfig = {}) =>
  createComponentConfig(defaultConfig, config, "datepicker");
export const getContainerConfig = (config: DatePickerConfig) => createElementConfig(config, {
  tag: "div", forwardEvents: { keydown: true, click: true }, interactive: true,
});

/** Keep the typed public event API and fluent return identity at the boundary. */
export function withAPI(
  component: Omit<DatePickerComponent, "on" | "off">,
  events: { on(event: string, handler: EventCallback): unknown; off(event: string, handler: EventCallback): unknown },
): DatePickerComponent {
  const api: DatePickerComponent = {
    ...component,
    on<K extends keyof DatePickerEvents>(event: K, handler: DatePickerEvents[K]) { events.on(event, handler); return api; },
    off<K extends keyof DatePickerEvents>(event: K, handler: DatePickerEvents[K]) { events.off(event, handler); return api; },
  };
  return api;
}

const isRangeObject = (value: DatePickerInput): value is { start: Date | string; end: Date | string } =>
  typeof value === "object" && value !== null && !(value instanceof Date) && !Array.isArray(value);

let nextId = 0;

/**
 * The datepicker factory both entries share.
 *
 * The surface is built by the factory the entry passes: the calendar itself,
 * or a stand-in that defers the import and hands over the calendar when it
 * lands.
 *
 * @param config - The picker's configuration
 * @param createSurface - Builds the surface now, so the picker paints at creation
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
  const state: DatePickerState = {
    id, prefix: PREFIX, label: settings.label || "Select date", selectedDate: null, rangeEndDate: null,
    // The full-screen list has no month or year views.
    currentView: settings.variant !== "fullscreen" && ["month", "year"].includes(settings.initialView ?? "") ? settings.initialView as DatePickerView : "day",
    currentMonth: today.getMonth(), currentYear: today.getFullYear(), focusedDate: today,
    minDate: parseDate(settings.minDate ?? null), maxDate: parseDate(settings.maxDate ?? null),
    dateFormat: settings.dateFormat || "MM/DD/YYYY", variant: settings.variant === "modal" || settings.variant === "modal-input" || settings.variant === "fullscreen" ? settings.variant : "docked",
    selectionMode: settings.selectionMode === "range" ? "range" : "single", inputMode: settings.variant === "modal-input",
    specialDates: (settings.specialDates ?? []).map(item => ({ ...item })),
    isAllowed: date => (!state.minDate || date >= state.minDate) && (!state.maxDate || date <= state.maxDate) && !state.specialDates.some(item => { const special = parseDate(item.date); return item.disabled && special && isSameDay(date, special); }),
  };
  const modal = state.variant !== "docked";
  let opened = false, destroyed = false, navigationRequested = false, readOnly = false;
  // While it is open: a modal picker's place among the open modals (Escape is
  // a key press handled there, for the topmost one), and for a docked one the
  // marker that tells the click that opened it from every later one
  let escape: ModalEscape | undefined, from: EventsFrom | undefined;
  const release = () => { escape?.stop(); from?.stop(); escape = from = undefined; };
  let committed: Date | null = null, committedEnd: Date | null = null;
  let returnFocus: HTMLElement | null = null;
  const label = createElement({ tag: "label", className: cls("label"), text: state.label, attributes: { for: `${id}-input` } });
  const field = createElement({ tag: "div", className: cls("anchor") });
  const input = doc.createElement("input");
  input.className = cls("input"); input.id = `${id}-input`; input.type = "text"; input.readOnly = modal;
  if (settings.name) input.name = settings.name;
  input.placeholder = settings.placeholder || state.dateFormat; input.autocomplete = "off";
  input.setAttribute("aria-describedby", `${id}-help ${id}-error`);
  const trigger = doc.createElement("button"); trigger.type = "button"; trigger.className = cls("trigger"); setHTML(trigger, CALENDAR_ICON);
  trigger.dataset.action = "open"; trigger.setAttribute("aria-label", "Choose date"); trigger.setAttribute("aria-haspopup", "dialog"); trigger.setAttribute("aria-controls", `${id}-dialog`); trigger.setAttribute("aria-expanded", "false");
  // The supporting text, the date format unless given.
  const help = createElement({ tag: "div", className: cls("help"), text: settings.supportingText || state.dateFormat, attributes: { id: `${id}-help` } });
  const error = createElement({ tag: "div", className: cls("error"), attributes: { id: `${id}-error`, "aria-live": "polite" } });
  const dialog = doc.createElement("dialog"); dialog.id = `${id}-dialog`; dialog.className = cls("calendar");
  dialog.classList.add(base.getClass(`datepicker--${modal ? "modal" : "docked"}`));
  if (state.variant === "fullscreen") dialog.classList.add(base.getClass("datepicker--fullscreen"));
  dialog.setAttribute("aria-modal", String(modal));
  if (settings.animate) dialog.classList.add(base.getClass("datepicker--animate"));
  if (state.selectionMode === "range") dialog.classList.add(base.getClass("datepicker--range"));
  if (modal) dialog.setAttribute("aria-labelledby", `${id}-title`);
  else dialog.setAttribute("aria-label", state.label);
  field.append(input, trigger); base.element.append(label, field, help, error, dialog);
  const formatted = (date: Date | null, end: Date | null) => formatDate(date, state.dateFormat) + (date && end ? ` - ${formatDate(end, state.dateFormat)}` : "");
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
    if (modal) escape = onModalEscape(dialog, () => close()); else from = eventsFrom(dialog);
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
    const dates = pieces.map(value => parseInputDate(value, state.dateFormat));
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
  // A close request that is not a key press. The browser's cancel in the task
  // the picker opened in is the opening key's, when the page stopped that key
  // press before it reached the window.
  const onCancel = (event: Event) => { event.preventDefault(); if (!escape?.opening) close(); };
  const onOutside = (event: MouseEvent) => {
    // The click that called open() reaches the document after it: the event
    // that opened the picker never dismisses it, and only that one
    if (!opened || (from && !from.after(event))) return;
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
  base.element.addEventListener("click", onClick); base.element.addEventListener("keydown", onKey);
  base.element.addEventListener("focusout", onFocusOut);
  dialog.addEventListener("click", onDialogClick); dialog.addEventListener("cancel", onCancel);
  input.addEventListener("change", onInputChange); input.addEventListener("click", onInputClick); doc.addEventListener("click", onOutside);
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
    doc.removeEventListener("click", onOutside); input.removeEventListener("change", onInputChange); input.removeEventListener("click", onInputClick);
    base.element.removeEventListener("click", onClick); base.element.removeEventListener("keydown", onKey); base.element.removeEventListener("focusout", onFocusOut);
    dialog.removeEventListener("click", onDialogClick); dialog.removeEventListener("cancel", onCancel);
    base.lifecycle.destroy();
  };
  const api = withAPI({
    element: base.element, input, getClass: base.getClass,
    disabled: { enable: () => setDisabled(false), disable: () => setDisabled(true), isDisabled: () => base.disabled.isDisabled() }, lifecycle: { destroy }, destroy,
    open() { open(); return api; }, close() { close(); return api; }, isOpen: () => opened, getValue,
    getFormattedValue: () => formatted(committed, committedEnd),
    setValue(value) { assignValue(value, false); return api; },
    setReadOnly(value) { setReadOnly(value); return api; }, isReadOnly: () => readOnly,
    setRequired(value) { input.required = value; if (!value) syncInput(); return api; }, checkValidity, reportValidity,
    setSupportingText(text) { help.textContent = text || state.dateFormat; return api; },
    clear() { clearValue(false); return api; },
    enable() { setDisabled(false); return api; }, disable() { setDisabled(true); return api; },
    setMinDate(value) { const date = parseDate(value); if (date && !destroyed) { state.minDate = date; renderSurface(); if (state.inputMode) validateSurface(); } return api; },
    setMaxDate(value) { const date = parseDate(value); if (date && !destroyed) { state.maxDate = date; renderSurface(); } return api; },
    calendar: {
      goToDate(value) { const date = parseDate(value); if (date) { navigationRequested = !opened; setDisplayDate(date); renderSurface(); } },
      nextMonth() { navigationRequested = !opened; setDisplayDate(addMonths(new Date(state.currentYear, state.currentMonth, 1), 1)); renderSurface(); },
      prevMonth() { navigationRequested = !opened; setDisplayDate(addMonths(new Date(state.currentYear, state.currentMonth, 1), -1)); renderSurface(); },
      nextYear() { navigationRequested = !opened; state.currentYear++; renderSurface(); }, prevYear() { navigationRequested = !opened; state.currentYear--; renderSurface(); },
      showDayView() { state.currentView = "day"; state.inputMode = false; renderSurface(); },
      showMonthView() { state.currentView = "month"; state.inputMode = false; renderSurface(); },
      showYearView() { state.currentView = "year"; state.inputMode = false; renderSurface(); },
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
