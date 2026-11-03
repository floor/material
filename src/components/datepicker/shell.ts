// src/components/datepicker/shell.ts
//
// The datepicker's synchronous half: the field, the trigger, the dialog
// element, the value and draft state, the events, and the public API. It
// paints nothing: the calendar is a surface module, built with the factory by
// the default entry and imported on the first open by the deferred one. Both
// entries run this same shell, so their synchronous contract — isOpen(), the
// open/close events, a close while the surface is in flight — is one
// implementation.

import { pipe } from "../../core/compose";
import { createBase, withElement } from "../../core/compose/component";
import { withEvents, withDisabled, withLifecycle } from "../../core/compose/features";
import { createElement } from "../../core/dom/create";
import { setHTML } from "../../core/dom/html";
import { activeElementOf, deepActiveElement } from "../../core/dom/focus";
import { eventsFrom, onModalEscape, type EventsFrom, type ModalEscape } from "../../core/dom/layer";
import { DATEPICKER_ICONS } from "./constants";
import { PREFIX } from "../../core/config";
import { createBaseConfig, getContainerConfig } from "./config";
import { withAPI } from "./api";
import { addMonths, formatDate, isSameDay, parseDate, parseInputDate, toIsoValue } from "./utils";
import type { DatePickerComponent, DatePickerConfig, DatePickerInput, DatePickerState, DatePickerValue, DatePickerValueOf, DatePickerView } from "./types";
import type { DatePickerSurface, DatePickerSurfaceContext } from "./surface";

const isRangeObject = (value: DatePickerInput): value is { start: Date | string; end: Date | string } =>
  typeof value === "object" && value !== null && !(value instanceof Date) && !Array.isArray(value);

let nextId = 0;
const scrollLocks = new WeakMap<Document, { count: number; overflow: string }>();
function lockScroll(doc: Document): () => void {
  const lock = scrollLocks.get(doc) ?? { count: 0, overflow: doc.body.style.overflow };
  lock.count++; scrollLocks.set(doc, lock); doc.body.style.overflow = "hidden";
  return () => { if (--lock.count === 0) { doc.body.style.overflow = lock.overflow; scrollLocks.delete(doc); } };
}

/** Builds a calendar surface around the shell it belongs to. */
export type DatePickerSurfaceFactory = (context: DatePickerSurfaceContext) => DatePickerSurface;

/** What a deferred entry's dynamic import resolves to. */
export interface DatePickerSurfaceModule {
  createCalendarSurface: DatePickerSurfaceFactory;
}

/**
 * The datepicker factory both entries share.
 *
 * With a deferred loader the trigger's hover or focus starts the import
 * without opening anything, so the first open paints at once.
 *
 * @param config - The picker's configuration
 * @param eager - Builds the surface now, so the picker paints at creation
 * @param deferred - Imports the surface module on the first open or preload
 * @returns The public component
 */
export function createDatePickerShell<M extends string = "single">(
  config: DatePickerConfig & { selectionMode?: M } = {},
  eager?: DatePickerSurfaceFactory,
  deferred?: () => Promise<DatePickerSurfaceModule>,
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
  let surface: DatePickerSurface | null = null;
  let loading = false;
  let opened = false, destroyed = false, navigationRequested = false, readOnly = false;
  // While it is open: a modal picker's place among the open modals (Escape is
  // a key press handled there, for the topmost one), and for a docked one the
  // marker that tells the click that opened it from every later one
  let escape: ModalEscape | undefined, from: EventsFrom | undefined;
  const release = () => { escape?.stop(); from?.stop(); escape = from = undefined; };
  let committed: Date | null = null, committedEnd: Date | null = null;
  let returnFocus: HTMLElement | null = null;
  let unlock: (() => void) | undefined;
  const label = createElement({ tag: "label", className: cls("label"), text: state.label, attributes: { for: `${id}-input` } });
  const field = createElement({ tag: "div", className: cls("anchor") });
  const input = doc.createElement("input");
  input.className = cls("input"); input.id = `${id}-input`; input.type = "text"; input.readOnly = modal;
  if (settings.name) input.name = settings.name;
  input.placeholder = settings.placeholder || state.dateFormat; input.autocomplete = "off";
  input.setAttribute("aria-describedby", `${id}-help ${id}-error`);
  const trigger = doc.createElement("button"); trigger.type = "button"; trigger.className = cls("trigger"); setHTML(trigger, DATEPICKER_ICONS.calendar);
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
  const deferredEntry = deferred !== undefined;
  if (modal) {
    dialog.setAttribute("aria-labelledby", `${id}-title`);
    // The title is rendered by the surface; a deferred picker names the
    // dialog with the label until the target exists. The default entry paints
    // the title with the factory, so its dialog keeps exactly today's markup.
    if (deferredEntry) dialog.setAttribute("aria-label", state.label);
  } else dialog.setAttribute("aria-label", state.label);
  const announcement = createElement({ tag: "div", className: cls("sr-only"), attributes: { "aria-live": "polite", "aria-atomic": "true" } });
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
    unlock?.(); unlock = undefined; resetDraft();
    trigger.setAttribute("aria-expanded", "false");
    if (restoreFocus && returnFocus?.isConnected) returnFocus.focus();
    if (!destroyed) base.emit("close", { value: getValue() });
  };
  // The surface module, the first time it is needed. A close while it flies
  // leaves it mounted for the next open and never shows it.
  const load = () => {
    if (surface || loading || destroyed || !deferred) return;
    loading = true;
    deferred().then(({ createCalendarSurface }) => {
      loading = false;
      if (destroyed) return;
      surface = createCalendarSurface(context);
      surface.mount();
      if (opened) surface.show();
    }, (error: unknown) => {
      loading = false;
      console.error("Date picker surface failed to load:", error);
    });
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
    // The state and `open` are synchronous; the paint waits for the surface.
    if (surface) surface.show(); else load();
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
    resetDraft(); setDisplayDate(committed); syncInput(); surface?.render(); if (emit) emitChange();
  };
  // setValue() and clear() are silent, as a native input set by script; the
  // user's entry and the calendar emit `change`.
  const clearValue = (emit: boolean) => {
    if (destroyed) return;
    committed = null; committedEnd = null; resetDraft(); syncInput(); surface?.render(); if (emit) emitChange();
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
    surface?.key(event);
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
  const onDialogClick = (event: MouseEvent) => { surface?.click(event); onOutside(event); event.stopPropagation(); };
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
  const context: DatePickerSurfaceContext = {
    state, dialog, announcement, cls, view, modal,
    closeOnSelect: settings.closeOnSelect === true,
    isOpen: () => opened,
    close: restoreFocus => close(restoreFocus),
    commitDraft,
    setDisplayDate,
    lockScroll: () => { unlock = lockScroll(doc); },
    setExpanded: value => trigger.setAttribute("aria-expanded", String(value)),
  };
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
    surface?.destroy();
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
    setMinDate(value) { const date = parseDate(value); if (date && !destroyed) { state.minDate = date; surface?.render(); if (state.inputMode) surface?.validate(); } return api; },
    setMaxDate(value) { const date = parseDate(value); if (date && !destroyed) { state.maxDate = date; surface?.render(); } return api; },
    calendar: {
      goToDate(value) { const date = parseDate(value); if (date) { navigationRequested = !opened; setDisplayDate(date); surface?.render(); } },
      nextMonth() { navigationRequested = !opened; setDisplayDate(addMonths(new Date(state.currentYear, state.currentMonth, 1), 1)); surface?.render(); },
      prevMonth() { navigationRequested = !opened; setDisplayDate(addMonths(new Date(state.currentYear, state.currentMonth, 1), -1)); surface?.render(); },
      nextYear() { navigationRequested = !opened; state.currentYear++; surface?.render(); }, prevYear() { navigationRequested = !opened; state.currentYear--; surface?.render(); },
      showDayView() { state.currentView = "day"; state.inputMode = false; surface?.render(); },
      showMonthView() { state.currentView = "month"; state.inputMode = false; surface?.render(); },
      showYearView() { state.currentView = "year"; state.inputMode = false; surface?.render(); },
      getCurrentView: () => state.currentView,
    },
  }, base);
  if (settings.value) assignValue(settings.value, false); else syncInput();
  // The default entry builds the surface with the factory: the calendar is
  // painted at creation, exactly as before the split.
  if (eager) { surface = eager(context); surface.mount(); }
  // A deferred entry starts the load on the intent that precedes the click:
  // the trigger's hover or focus warms the chunk. The load is idempotent.
  if (deferredEntry) {
    trigger.addEventListener("pointerenter", load, { once: true });
    trigger.addEventListener("focus", load, { once: true });
  }
  setDisabled(!!settings.disabled);
  if (settings.required) input.required = true;
  if (settings.readOnly) setReadOnly(true);
  // The runtime value follows the same mode the type names.
  return api as unknown as DatePickerComponent<DatePickerValueOf<M>>;
}
