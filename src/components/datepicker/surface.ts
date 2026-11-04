// src/components/datepicker/surface.ts
//
// The opt-in entry's calendar: its render, its focus handling and every
// interaction with the days, months and years. The deferred entry imports this
// module on the first open (or the trigger's intent to open) and builds the
// calendar when the chunk lands. The default entry's calendar is not this
// module: its picker keeps the modules it always had, untouched.
//
// Everything the surface needs from the shell arrives as the tuple the shell
// hands the factory: the state it renders, the dialog it paints into, the
// shell's open state, and the shell operations a calendar interaction calls
// (commit, close, move the displayed date).

import { activeElementOf } from "../../core/dom/focus";
import { createElement } from "../../core/dom/create";
import { setHTML } from "../../core/dom/html";
import { CALENDAR_ICON } from "./constants";
import { MONTH_NAMES, MONTH_NAMES_SHORT, type CalendarDate, type DatePickerState } from "./types";
import { addMonths, formatDate, getDaysInMonth, isSameDay, parseDate, parseInputDate } from "./utils";

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
    announcement.textContent = new Date(state.currentYear, state.currentMonth, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
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
    const values = fields.map(field => parseInputDate(field.value, state.dateFormat));
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
      if (headline) headline.textContent = formatDate(state.selectedDate, "MMM D, YYYY") + (state.rangeEndDate ? ` – ${formatDate(state.rangeEndDate, "MMM D, YYYY")}` : "");
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
      else if (event.key === "Home") next = addDays(date, -date.getDay());
      else if (event.key === "End") next = addDays(date, 6 - date.getDay());
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

// The calendar’s own SVG assets; accessible names are on their buttons. They
// live with the calendar (this module) rather than in ./constants, so the
// deferred entry carries only the trigger’s calendar icon until it loads.
export const EDIT_ICON = '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><path d="m3 17.25 11.06-11.06 3.75 3.75L6.75 21H3v-3.75ZM20.71 7.04l-1.83 1.83-3.75-3.75 1.83-1.83a1 1 0 0 1 1.41 0l2.34 2.34a1 1 0 0 1 0 1.41Z"/></svg>';
export const PREVIOUS_ICON = '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><path d="m15.4 7.4-1.4-1.4-6 6 6 6 1.4-1.4-4.6-4.6Z"/></svg>';
export const NEXT_ICON = '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><path d="m8.6 7.4 1.4-1.4 6 6-6 6-1.4-1.4 4.6-4.6Z"/></svg>';
export const CLOSE_ICON = '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12Z"/></svg>';

/** The seven weekday names, read by the grid’s labels and the full-screen list. */
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
/** The keyboard hint, announced by the grid and written out on the full screen. */
const KEYBOARD_HINT = "Use arrow keys for days, Home and End for the week, Page Up and Page Down for months, with Shift for years.";

/** Rendering is passive: one delegated listener owns each picker, including rerenders. */
export function renderCalendar(state: DatePickerState): HTMLElement {
  const cls = (name: string) => `${state.prefix}-datepicker__${name}`;
  const make = (tag: string, name: string, text?: string, attributes?: Record<string, string | boolean>) =>
    createElement({ tag, className: cls(name), text, attributes });
  const button = (name: string, text: string, action: string, label = text) => {
    const element = make("button", name, text, { type: "button", "data-action": action, "aria-label": label });
    const icon = name === "close" ? CLOSE_ICON : action === "toggle-mode" ? (state.inputMode ? CALENDAR_ICON : EDIT_ICON) : action === "prev" ? PREVIOUS_ICON : action === "next" ? NEXT_ICON : null;
    if (icon) setHTML(element, icon);
    return element;
  };
  /**
   * One month of days: a grid of 6 weeks. Only the current month takes the tab stop.
   * In the full-screen list a month shows its own days only, under a subhead, and its
   * weekday row is for assistive tech (one visible row heads the list).
   */
  const monthGrid = (year: number, month: number, current: boolean, list = false): HTMLElement => {
    const grid = make("div", "days", undefined, { role: "grid", "aria-label": `${MONTH_NAMES[month]} ${year}`, "aria-describedby": `${state.id}-keyboard` });
    const weekdays = make("div", "weekdays", undefined, { role: "row" });
    if (list) weekdays.classList.add(cls("sr-only"));
    for (const name of WEEKDAYS) weekdays.append(make("span", "weekday", name[0], { role: "columnheader", "aria-label": name }));
    grid.append(weekdays);
    const dates = generateCalendarDates(year, month, state.selectedDate, state.rangeEndDate, state.minDate, state.maxDate);
    const focus = dates.find(item => isSameDay(item.date, state.focusedDate) && state.isAllowed(item.date)) ?? dates.find(item => item.isCurrentMonth && state.isAllowed(item.date));
    for (let week = 0; week < 6; week++) {
      const row = make("div", "week", undefined, { role: "row" });
      for (const item of dates.slice(week * 7, week * 7 + 7)) {
        const selected = !!state.selectedDate && (isSameDay(item.date, state.selectedDate) || !!state.rangeEndDate && isSameDay(item.date, state.rangeEndDate));
        // Another month's day is never in range: the band is the shown month's (as in
        // Compose, which leaves those cells empty), so it never runs into them.
        const inRange = item.isCurrentMonth && !!state.selectedDate && !!state.rangeEndDate && item.date >= state.selectedDate && item.date <= state.rangeEndDate;
        if (list && !item.isCurrentMonth) { row.append(make("div", "cell", undefined, { role: "gridcell" })); continue; }
        const cell = make("div", "cell", undefined, { role: "gridcell", "aria-selected": String(selected || inRange) });
        if (inRange) cell.classList.add(cls("cell--range"));
        if (item.isCurrentMonth && state.selectedDate && isSameDay(item.date, state.selectedDate)) cell.classList.add(cls("cell--range-start"));
        if (item.isCurrentMonth && state.rangeEndDate && isSameDay(item.date, state.rangeEndDate)) cell.classList.add(cls("cell--range-end"));
        const special = state.specialDates.find(special => { const date = parseDate(special.date); return date && isSameDay(date, item.date); });
        const day = make("button", "day", String(item.day), {
          type: "button", "data-date": formatDate(item.date, "YYYY-MM-DD"), "aria-label": item.date.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
          "aria-pressed": String(selected), disabled: !state.isAllowed(item.date), tabindex: current && item === focus ? "0" : "-1",
        });
        if (!state.isAllowed(item.date)) day.classList.add(cls("day--disabled"));
        if (item.isToday) { day.classList.add(cls("day--today")); day.setAttribute("aria-current", "date"); }
        if (!item.isCurrentMonth) day.classList.add(cls("day--outside"));
        if (selected) day.classList.add(cls("day--selected"));
        if (special?.highlight) day.classList.add(cls("day--highlight"));
        if (special?.tooltip) day.title = special.tooltip;
        cell.append(day); row.append(cell);
      }
      grid.append(row);
    }
    return grid;
  };
  const content = make("div", "content");
  const modal = state.variant !== "docked";
  const fullscreen = state.variant === "fullscreen";
  const confirmDisabled = !state.selectedDate || !state.isAllowed(state.selectedDate) || state.selectionMode === "range" && (!state.rangeEndDate || !state.isAllowed(state.rangeEndDate));
  if (modal) {
    const header = make("div", "modal-header");
    // Full screen: a close (x) icon button and a Save text button above the headline
    // (m3.material.io: "Mobile full-screen pickers also have an additional close
    // affordance (x) icon button and Save confirmation").
    if (fullscreen) {
      const save = button("save", "Save", "confirm") as HTMLButtonElement;
      save.disabled = confirmDisabled;
      header.append(button("close", "", "cancel", "Close"), save);
    }
    header.append(make("div", "title", state.label, { id: `${state.id}-title` }));
    // The full-screen headline drops the year, as m3's does ("Aug 17 – Aug 23"), to fit
    // one line of Title Large.
    const pattern = fullscreen ? "MMM D" : "MMM D, YYYY";
    const headline = state.selectedDate ? formatDate(state.selectedDate, pattern) : state.selectionMode === "range" ? "Select range" : "Select date";
    header.append(make("div", "headline", state.selectionMode === "range" && state.rangeEndDate ? `${headline} – ${formatDate(state.rangeEndDate, pattern)}` : headline));
    header.append(button("mode-toggle", state.inputMode ? "▦" : "✎", "toggle-mode", state.inputMode ? "Switch to calendar" : "Switch to date input"));
    content.append(header);
  }
  if (state.inputMode) {
    const fields = make("div", "fields");
    for (const endpoint of state.selectionMode === "range" ? ["start", "end"] : ["start"]) {
      const wrapper = make("div", "field");
      const id = `${state.id}-${endpoint}`;
      wrapper.append(make("label", "label", state.selectionMode === "range" ? (endpoint === "start" ? "Start date" : "End date") : "Date", { for: id }));
      const input = make("input", "input", undefined, { id, type: "text", autocomplete: "off", placeholder: state.dateFormat, "data-entry": endpoint, "aria-describedby": `${id}-help ${id}-error` }) as HTMLInputElement;
      input.value = formatDate(endpoint === "start" ? state.selectedDate : state.rangeEndDate, state.dateFormat);
      wrapper.append(input, make("div", "help", state.dateFormat, { id: `${id}-help` }), make("div", "error", "", { id: `${id}-error`, "aria-live": "polite" }));
      fields.append(wrapper);
    }
    content.append(fields);
  } else if (fullscreen) {
    // Full screen: one weekday row over a vertically scrolling list of months
    // (m3.material.io: "To navigate across months, scroll vertically"). Only the months
    // of state.listStart/listLength are rendered; the picker extends them as the list
    // scrolls.
    const weekdays = make("div", "weekdays", undefined, { "aria-hidden": "true" });
    for (const name of WEEKDAYS) weekdays.append(make("span", "weekday", name[0]));
    const list = make("div", "list");
    const start = state.listStart ?? new Date(state.currentYear, state.currentMonth, 1);
    for (let index = 0; index < (state.listLength ?? 1); index++) {
      const first = new Date(start.getFullYear(), start.getMonth() + index, 1);
      const section = make("section", "month-section", undefined, { "data-month-key": `${first.getFullYear()}-${first.getMonth()}` });
      section.append(make("div", "subhead", `${MONTH_NAMES[first.getMonth()]} ${first.getFullYear()}`, { "aria-hidden": "true" }));
      section.append(monthGrid(first.getFullYear(), first.getMonth(), first.getFullYear() === state.focusedDate.getFullYear() && first.getMonth() === state.focusedDate.getMonth(), true));
      list.append(section);
    }
    content.append(weekdays, list, make("div", "sr-only", KEYBOARD_HINT, { id: `${state.id}-keyboard` }));
  } else {
    const header = make("div", "header");
    const nav = make("div", "navigation");
    nav.append(button("month-selector", MONTH_NAMES[state.currentMonth], "month", "Select month"), button("year-selector", String(state.currentYear), "year", "Select year"));
    header.append(nav);
    // The year list scrolls, so it has no arrows to page it.
    if (state.currentView !== "year") {
      const span = state.currentView === "day" ? "month" : "year";
      header.append(button("prev", "‹", "prev", `Previous ${span}`), button("next", "›", "next", `Next ${span}`));
    }
    content.append(header);
    if (state.currentView === "day") {
      // The previous, current and next months side by side in a scroll-snapping track:
      // a horizontal swipe, trackpad or wheel pages the months natively (m3.material.io:
      // "To navigate across months, swipe horizontally"). Only the current month is
      // reachable; its neighbours are inert and hidden from assistive tech.
      const track = make("div", "track");
      for (const offset of [-1, 0, 1]) {
        const first = new Date(state.currentYear, state.currentMonth + offset, 1);
        const grid = monthGrid(first.getFullYear(), first.getMonth(), offset === 0);
        // A neighbour is only seen while it slides in: it keeps no date hooks, so the
        // current month's buttons are the only [data-date] in the picker.
        if (offset) {
          grid.setAttribute("aria-hidden", "true"); grid.inert = true;
          grid.querySelectorAll("[data-date]").forEach(day => day.removeAttribute("data-date"));
        }
        track.append(grid);
      }
      content.append(track);
    } else {
      const months = state.currentView === "month";
      const grid = make("div", months ? "months" : "years", undefined, { role: "group", "aria-label": months ? "Choose month" : "Choose year" });
      // Every year from minDate to maxDate, or Compose's default 1900-2100, in a list
      // that scrolls vertically (m3.material.io: "To navigate across years, scroll
      // vertically"); it was ±10 years paged by the arrows.
      const first = state.minDate?.getFullYear() ?? 1900, last = state.maxDate?.getFullYear() ?? 2100;
      for (const value of months ? Array.from({ length: 12 }, (_, i) => i) : Array.from({ length: last - first + 1 }, (_, i) => first + i)) {
        const selected = value === (months ? state.currentMonth : state.currentYear);
        grid.append(make("button", months ? "month" : "year", months ? MONTH_NAMES_SHORT[value] : String(value), {
          type: "button", [months ? "data-month" : "data-year"]: String(value), "aria-pressed": String(selected), tabindex: selected ? "0" : "-1",
        }));
      }
      content.append(grid);
    }
    content.append(make("div", "sr-only", KEYBOARD_HINT, { id: `${state.id}-keyboard` }));
  }
  if (modal && !fullscreen) {
    const footer = make("div", "footer");
    const confirm = button("confirm", "OK", "confirm") as HTMLButtonElement;
    confirm.disabled = confirmDisabled;
    footer.append(button("cancel", "Cancel", "cancel"), confirm); content.append(footer);
  }
  return content;
}

/**
 * Gets the first day of the month
 * @param year - Year
 * @param month - Month (0-11)
 * @returns Day of the week (0-6, where 0 is Sunday)
 */
export const getFirstDayOfMonth = (year: number, month: number): number => {
  return new Date(year, month, 1).getDay();
};

/**
 * Checks if a date is between two other dates (inclusive)
 * @param date - Date to check
 * @param startDate - Start date
 * @param endDate - End date
 * @returns True if date is between start and end, false otherwise
 */
export const isDateInRange = (date: Date, startDate: Date, endDate: Date): boolean => {
  const timestamp = date.getTime();
  return timestamp >= startDate.getTime() && timestamp <= endDate.getTime();
};

/**
 * Generates calendar dates for a month
 * @param year - Year
 * @param month - Month (0-11)
 * @param selectedDate - Currently selected date
 * @param rangeEndDate - End date if range selection
 * @param minDate - Minimum selectable date
 * @param maxDate - Maximum selectable date
 * @returns Array of calendar dates
 */
export const generateCalendarDates = (
  year: number,
  month: number,
  selectedDate: Date | null = null,
  rangeEndDate: Date | null = null,
  minDate: Date | null = null,
  maxDate: Date | null = null
): CalendarDate[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // A bare `(minDate && …) || (maxDate && …)` yields null when both bounds are
  // absent, so isDisabled was declared boolean while carrying null. Falsy
  // either way, but a consumer testing `=== false` would have been wrong.
  const outOfRange = (date: Date): boolean =>
    Boolean((minDate && date < minDate) || (maxDate && date > maxDate));

  const result: CalendarDate[] = [];

  // Calculate days needed from previous month
  const firstDay = getFirstDayOfMonth(year, month);
  const daysInPrevMonth = getDaysInMonth(year, month - 1);

  // Add days from previous month
  for (let i = firstDay - 1; i >= 0; i--) {
    const date = new Date(year, month - 1, daysInPrevMonth - i);
    const isDisabled = outOfRange(date);

    result.push({
      date,
      day: date.getDate(),
      isCurrentMonth: false,
      isToday: isSameDay(date, today),
      isSelected: selectedDate ? isSameDay(date, selectedDate) : false,
      isDisabled
    });
  }

  // Add days from current month
  const daysInMonth = getDaysInMonth(year, month);
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(year, month, i);
    const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;
    const isDisabled = outOfRange(date);

    const calendarDate: CalendarDate = {
      date,
      day: i,
      isCurrentMonth: true,
      isToday: isSameDay(date, today),
      isSelected,
      isDisabled
    };

    // Handle range selection
    if (selectedDate && rangeEndDate) {
      calendarDate.isRangeStart = isSameDay(date, selectedDate);
      calendarDate.isRangeEnd = isSameDay(date, rangeEndDate);
      calendarDate.isRangeMiddle = isDateInRange(date, selectedDate, rangeEndDate) &&
        !calendarDate.isRangeStart && !calendarDate.isRangeEnd;
    }

    result.push(calendarDate);
  }

  // Add days from next month to complete the calendar grid (6 rows × 7 columns)
  const totalDaysNeeded = 42; // 6 rows × 7 columns
  const remainingDays = totalDaysNeeded - result.length;

  for (let i = 1; i <= remainingDays; i++) {
    const date = new Date(year, month + 1, i);
    const isDisabled = outOfRange(date);

    result.push({
      date,
      day: i,
      isCurrentMonth: false,
      isToday: isSameDay(date, today),
      isSelected: selectedDate ? isSameDay(date, selectedDate) : false,
      isDisabled
    });
  }

  return result;
};

/**
 * Adds days to a date
 * @param date - Base date
 * @param days - Number of days to add
 * @returns New date with days added
 */
export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};
