// src/components/datepicker/surface.ts
//
// The opt-in entry's calendar: its interaction with the days, months and
// years. The deferred entry imports this module on the first open (or the
// trigger's intent to open) and builds the calendar when the chunk lands.
//
// The paint is the default entry's: `renderCalendar` and the date helpers are
// imported from ./render and ./utils, not repeated here, so the only new code
// the opt-in carries is this interaction. Those modules are untouched — the
// default's picker keeps them exactly as they were.
//
// Everything the surface needs from the shell arrives as the tuple the shell
// hands the factory: the state it renders, the dialog it paints into, the
// shell's open state, and the shell operations a calendar interaction calls
// (commit, close, move the displayed date).

import { activeElementOf } from "../../core/dom/focus";
import { createElement } from "../../core/dom/create";
import { renderCalendar } from "./render";
import type { DatePickerState } from "./types";
import { addDays, addMonths, dtf, formatDate, parseDate, parseInputDate } from "./utils";

const scrollLocks = new WeakMap<Document, { count: number; overflow: string }>();
function lockScroll(doc: Document): () => void {
  const lock = scrollLocks.get(doc) ?? { count: 0, overflow: doc.body.style.overflow };
  lock.count++; scrollLocks.set(doc, lock); doc.body.style.overflow = "hidden";
  return () => { if (--lock.count === 0) { doc.body.style.overflow = lock.overflow; scrollLocks.delete(doc); } };
}

/** What a surface is built from: the shell's state and elements, and its operations. */
export type DatePickerSurfaceInput = [
  state: DatePickerState,
  dialog: HTMLDialogElement,
  /** A class name with the component's prefix. */
  cls: (name: string) => string,
  view: Window,
  trigger: HTMLElement,
  closeOnSelect: boolean,
  isOpen: () => boolean,
  close: (restoreFocus?: boolean) => void,
  commitDraft: () => void,
  setDisplayDate: (date: Date) => void,
];

/** Builds the surface the shell calls: the calendar, which the stand-in builds when its chunk lands. */
export type DatePickerSurfaceFactory = (...input: DatePickerSurfaceInput) => DatePickerSurface;

/** The calendar half of a datepicker: show, hide, render, click, key, validate, destroy. */
export type DatePickerSurface = [
  /** The paint half of an open: render, show, centre, reveal, expand, focus. */
  show: () => void,
  /** The close half of an open: releases what show() took. */
  hide: () => void,
  /** Paints again; a no-op while the picker is closed. */
  render: (focus?: boolean, action?: string) => void,
  /** A click inside the dialog, after the shell's own guards. */
  click: (event: MouseEvent) => void,
  /** A key press the shell did not handle itself. */
  key: (event: KeyboardEvent) => void,
  /** Re-runs the entry fields' validation, after a new bound. */
  validate: () => boolean,
  /** Stops the surface's listeners. */
  destroy: () => void,
];

/**
 * Builds the calendar surface around a shell
 *
 * @param input - The shell's state, elements and operations
 * @returns The surface's functions, with the calendar painted into the dialog
 */
export function createCalendarSurface(state: DatePickerState, dialog: HTMLDialogElement, cls: (name: string) => string, view: Window, trigger: HTMLElement, closeOnSelect: boolean, isOpen: () => boolean, close: (restoreFocus?: boolean) => void, commitDraft: () => void, setDisplayDate: (date: Date) => void): DatePickerSurface {
  const modal = state.variant !== "docked";
  const announcement = createElement({ tag: "div", className: cls("sr-only"), attributes: { "aria-live": "polite", "aria-atomic": "true" } });
  let unlock: (() => void) | undefined;

  const focusCurrent = () => {
    const selector = state.inputMode ? '[data-entry="start"]' : '[data-date][tabindex="0"], [data-month][tabindex="0"], [data-year][tabindex="0"]';
    (dialog.querySelector<HTMLElement>(selector) ?? dialog.querySelector<HTMLElement>('button:not(:disabled)'))?.focus();
  };
  const track = () => dialog.querySelector<HTMLElement>(`.${cls("track")}`);
  const rtl = (element: HTMLElement) => view.getComputedStyle(element).direction === "rtl";
  // The current month is the middle page; re-centred without motion after each render.
  // The year list opens with the selected year in its middle.
  const centre = () => {
    const element = track();
    if (element?.clientWidth) element.scrollLeft = (rtl(element) ? -1 : 1) * element.clientWidth;
    const years = dialog.querySelector<HTMLElement>(`.${cls("years")}`);
    const year = years?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (years && year) years.scrollTop = year.offsetTop - (years.clientHeight - year.offsetHeight) / 2;
  };
  // Full screen: the rendered months are a window around the focused month, clamped
  // to minDate and maxDate, and extended by a year as the list nears either end. The
  // list keeps its scroll position across renders; months added above shift it by
  // their height.
  const monthIndex = (date: Date) => date.getFullYear() * 12 + date.getMonth();
  const fromIndex = (index: number) => new Date(Math.floor(index / 12), index % 12, 1);
  const list = () => dialog.querySelector<HTMLElement>(`.${cls("list")}`);
  const limits = () => [state.minDate ? monthIndex(state.minDate) : -Infinity, state.maxDate ? monthIndex(state.maxDate) : Infinity];
  let shiftBy: number | null = null;
  const ensureWindow = () => {
    if (state.variant !== "fullscreen") return;
    const focus = state.currentYear * 12 + state.currentMonth;
    const start = state.listStart ? monthIndex(state.listStart) : NaN;
    if (start <= focus && focus < start + (state.listLength ?? 0)) return;
    const [min, max] = limits();
    const first = Math.max(min, focus - 12), last = Math.min(max, focus + 12);
    state.listStart = fromIndex(first); state.listLength = last - first + 1;
  };
  const extend = (element: HTMLElement) => {
    const [min, max] = limits();
    const start = monthIndex(state.listStart!), end = start + state.listLength! - 1;
    const margin = element.clientHeight;
    if (element.scrollTop < margin && start > min) {
      const first = Math.max(min, start - 12);
      state.listStart = fromIndex(first); state.listLength = end - first + 1; shiftBy = element.scrollHeight;
    } else if (element.scrollHeight - element.scrollTop - element.clientHeight < margin && end < max) {
      state.listLength = Math.min(max, end + 12) - start + 1;
    } else return;
    // Focus is read from the picker's own root: inside a shadow root the
    // document only sees the host.
    const focused = activeElementOf(dialog);
    const active = focused instanceof HTMLElement ? focused.dataset.date : undefined;
    render();
    if (active) dialog.querySelector<HTMLElement>(`[data-date="${active}"]`)?.focus({ preventScroll: true });
  };
  // Opening shows the focused month at the top of the list.
  const reveal = () => {
    const element = list();
    const section = element?.querySelector<HTMLElement>(`[data-month-key="${state.currentYear}-${state.currentMonth}"]`);
    if (element && section) element.scrollTop = section.offsetTop;
  };
  const render = (focus = false, action?: string) => {
    if (!isOpen()) return;
    ensureWindow();
    const previous = list();
    const kept = previous && { top: previous.scrollTop, height: previous.scrollHeight };
    dialog.replaceChildren(renderCalendar(state), announcement);
    const current = list();
    if (current && kept) current.scrollTop = kept.top + (shiftBy === null ? 0 : current.scrollHeight - kept.height);
    shiftBy = null;
    centre();
    announcement.textContent = dtf(state.locale, { month: "long", year: "numeric" }).format(new Date(state.currentYear, state.currentMonth, 1));
    if (action) dialog.querySelector<HTMLElement>(`[data-action="${action}"]`)?.focus();
    else if (focus) focusCurrent();
  };
  const select = (date: Date, accept = closeOnSelect) => {
    if (!state.isAllowed(date)) return;
    if (state.selectionMode === "range" && state.selectedDate && !state.rangeEndDate) {
      state.rangeEndDate = date < state.selectedDate ? state.selectedDate : date;
      state.selectedDate = date < state.selectedDate ? date : state.selectedDate;
    } else { state.selectedDate = date; state.rangeEndDate = null; }
    setDisplayDate(date);
    // A docked range commits once it is whole: its start alone is not a value.
    const whole = state.selectionMode !== "range" || !!state.rangeEndDate;
    if ((!modal || accept) && whole) commitDraft();
    if (accept && whole) close(); else render(true);
  };
  const navigate = (amount: number) => {
    // The year view has no arrows: its list scrolls.
    const count = state.currentView === "day" ? amount : amount * 12;
    const anchor = new Date(state.currentYear, state.currentMonth, 1);
    anchor.setDate(Math.min(state.focusedDate.getDate(), new Date(state.currentYear, state.currentMonth + 1, 0).getDate()));
    setDisplayDate(addMonths(anchor, count));
  };
  const validateEntries = (): boolean => {
    const fields = Array.from(dialog.querySelectorAll<HTMLInputElement>('[data-entry]'));
    if (!fields.length) return !!state.selectedDate && state.isAllowed(state.selectedDate) && (state.selectionMode !== "range" || !!state.rangeEndDate && state.isAllowed(state.rangeEndDate));
    const values = fields.map(field => parseInputDate(field.value, state.dateFormat, state.locale));
    let valid = true;
    fields.forEach((field, index) => {
      const date = values[index];
      const message = !date ? `Enter a valid date (${state.dateFormat}).` : !state.isAllowed(date) ? "Date is not selectable." : index === 1 && values[0] && date < values[0] ? "End date must be on or after start date." : "";
      if (message) { field.setAttribute("aria-invalid", "true"); valid = false; } else field.removeAttribute("aria-invalid");
      dialog.querySelector<HTMLElement>(`#${field.id}-error`)!.textContent = message;
    });
    const confirm = dialog.querySelector<HTMLButtonElement>('[data-action="confirm"]'); if (confirm) confirm.disabled = !valid;
    if (valid) {
      state.selectedDate = values[0]; state.rangeEndDate = values[1] ?? null; setDisplayDate(values[0]!);
      const headline = dialog.querySelector<HTMLElement>(`.${cls("headline")}`);
      if (headline) headline.textContent = formatDate(state.selectedDate, "MMM D, YYYY", state.locale) + (state.rangeEndDate ? ` – ${formatDate(state.rangeEndDate, "MMM D, YYYY", state.locale)}` : "");
    }
    return valid;
  };
  const click = (event: MouseEvent) => {
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>('button') : null;
    if (!target || !dialog.contains(target) || target.hasAttribute('disabled') || !isOpen()) return;
    const action = target.dataset.action;
    if (target.dataset.date) { select(parseDate(target.dataset.date)!); return; }
    if (target.dataset.month) { setDisplayDate(new Date(state.currentYear, Number(target.dataset.month), 1)); state.currentView = "day"; render(true); return; }
    if (target.dataset.year) { state.currentYear = Number(target.dataset.year); state.currentView = "month"; render(true); return; }
    if (action === "cancel") close();
    else if (action === "confirm") { if (validateEntries()) { commitDraft(); close(); } }
    else if (action === "toggle-mode") { if (state.inputMode && !validateEntries()) return; state.inputMode = !state.inputMode; render(true); }
    else if (action === "month" || action === "year") { state.currentView = action; render(true); }
    else if (action === "prev" || action === "next") {
      // In the day view the arrows slide the track as a swipe would; the month
      // changes when it settles. Reduced motion, or no layout, changes it at once.
      const element = state.currentView === "day" ? track() : null;
      if (element?.clientWidth && !view.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
        element.scrollBy({ left: (action === "prev" ? -1 : 1) * (rtl(element) ? -1 : 1) * element.clientWidth, behavior: "smooth" });
      } else { navigate(action === "prev" ? -1 : 1); render(false, action); }
    }
  };
  const key = (event: KeyboardEvent) => {
    if (event.key === "Enter" && isOpen() && state.inputMode && event.target instanceof HTMLElement && event.target.hasAttribute("data-entry")) {
      event.preventDefault(); if (validateEntries()) { commitDraft(); close(); } return;
    }
    if (!isOpen()) return;
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (target?.dataset.date) {
      const date = parseDate(target.dataset.date)!;
      // Enter accepts a single date (M3 keyboard navigation). Prevent the
      // button's native click from selecting or committing the date again.
      if (event.key === "Enter" && state.selectionMode === "single") {
        event.preventDefault(); select(date, true); return;
      }
      let next: Date;
      // Left and right follow the reading direction.
      const ahead = rtl(dialog) ? -1 : 1;
      if (event.key === "ArrowLeft") next = addDays(date, -ahead);
      else if (event.key === "ArrowRight") next = addDays(date, ahead);
      else if (event.key === "ArrowUp") next = addDays(date, -7);
      else if (event.key === "ArrowDown") next = addDays(date, 7);
      else if (event.key === "Home") next = addDays(date, -((date.getDay() - state.firstDayOfWeek + 7) % 7));
      else if (event.key === "End") next = addDays(date, 6 - ((date.getDay() - state.firstDayOfWeek + 7) % 7));
      else if (event.key === "PageUp" || event.key === "PageDown") next = addMonths(date, (event.key === "PageUp" ? -1 : 1) * (event.shiftKey ? 12 : 1));
      else return;
      event.preventDefault();
      if (state.minDate && next < state.minDate) next = new Date(state.minDate);
      if (state.maxDate && next > state.maxDate) next = new Date(state.maxDate);
      const direction = next < date ? -1 : 1;
      // Only explicitly disabled special dates require skipping; bounds are clamped.
      for (let n = 0; !state.isAllowed(next) && n <= state.specialDates.length; n++) next = addDays(next, direction);
      if (state.isAllowed(next)) { setDisplayDate(next); render(true); }
    } else if (target?.hasAttribute('data-month') || target?.hasAttribute('data-year')) {
      const buttons = Array.from(dialog.querySelectorAll<HTMLElement>('[data-month], [data-year]'));
      let index = buttons.indexOf(target!);
      const ahead = rtl(dialog) ? -1 : 1;
      const delta = ({ ArrowLeft: -ahead, ArrowRight: ahead, ArrowUp: -3, ArrowDown: 3 } as Record<string, number>)[event.key];
      if (event.key === "Home") index = 0; else if (event.key === "End") index = buttons.length - 1; else if (delta) index = Math.min(buttons.length - 1, Math.max(0, index + delta)); else return;
      event.preventDefault(); buttons.forEach(button => button.tabIndex = -1); buttons[index].tabIndex = 0; buttons[index].focus();
    }
  };
  const onFocus = (event: FocusEvent) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (target?.dataset.date) { state.focusedDate = parseDate(target.dataset.date)!; dialog.querySelectorAll<HTMLElement>('[data-date]').forEach(el => el.tabIndex = el === target ? 0 : -1); }
  };
  // A settled swipe, or an arrow's slide: the page it rests on becomes the month.
  // scrollend where there is one; otherwise the scroll going quiet.
  let quiet: ReturnType<typeof setTimeout> | undefined;
  const settle = () => {
    const element = track();
    if (!isOpen() || !element?.clientWidth) return;
    const page = Math.round(Math.abs(element.scrollLeft) / element.clientWidth) - 1;
    if (!page) return;
    const focused = activeElementOf(dialog);
    const active = focused instanceof HTMLElement && dialog.contains(focused) ? focused : null;
    navigate(page);
    render(!!active?.dataset.date, active?.dataset.action);
  };
  const onScroll = (event: Event) => {
    if (event.type === "scroll" && event.target instanceof HTMLElement && event.target === list()) { extend(event.target); return; }
    if (!(event.target instanceof HTMLElement) || event.target !== track()) return;
    if (event.type === "scrollend") { settle(); return; }
    if ("onscrollend" in view) return;
    clearTimeout(quiet); quiet = setTimeout(settle, 150);
  };
  const onEntry = () => { validateEntries(); };

  // Creation-time paint, closed: the shell builds its surface before opening it.
  dialog.append(renderCalendar(state), announcement);
  dialog.addEventListener("focusin", onFocus);
  dialog.addEventListener("input", onEntry);
  dialog.addEventListener("scroll", onScroll, true);
  dialog.addEventListener("scrollend", onScroll, true);

  return [
    function show() {
      if (!isOpen()) return;
      render();
      // The native top layer supplies the scrim and makes the background inert.
      // DOM-only environments without dialog methods still expose the open state.
      if (modal && typeof dialog.showModal === "function" && dialog.isConnected) dialog.showModal();
      else if (!modal && typeof dialog.show === "function") dialog.show();
      else dialog.setAttribute("open", "");
      if (modal) unlock = lockScroll(dialog.ownerDocument);
      centre(); reveal();
      trigger.setAttribute("aria-expanded", "true");
      focusCurrent();
    },
    function hide() {
      unlock?.(); unlock = undefined;
    },
    render,
    click,
    key,
    validateEntries,
    function destroy() {
      dialog.removeEventListener("focusin", onFocus);
      dialog.removeEventListener("input", onEntry);
      dialog.removeEventListener("scroll", onScroll, true);
      dialog.removeEventListener("scrollend", onScroll, true);
      clearTimeout(quiet);
      unlock?.(); unlock = undefined;
    },
  ];
}
