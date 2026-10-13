import { DATEPICKER_ICONS } from "./constants";
import { setHTML } from "../../core/dom/html";
import { createElement } from "../../core/dom/create";
import { MONTH_NAMES, MONTH_NAMES_SHORT, type DatePickerState } from "./types";
import { formatDate, generateCalendarDates, isSameDay, parseDate } from "./utils";

/** Rendering is passive: one delegated listener owns each picker, including rerenders. */
export function renderCalendar(state: DatePickerState): HTMLElement {
  const cls = (name: string) => `${state.prefix}-datepicker__${name}`;
  const make = (tag: string, name: string, text?: string, attributes?: Record<string, string | boolean>) =>
    createElement({ tag, className: cls(name), text, attributes });
  const button = (name: string, text: string, action: string, label = text) => {
    const element = make("button", name, text, { type: "button", "data-action": action, "aria-label": label });
    const icon = name === "close" ? DATEPICKER_ICONS.close : action === "toggle-mode" ? (state.inputMode ? DATEPICKER_ICONS.calendar : DATEPICKER_ICONS.edit) : action === "prev" ? DATEPICKER_ICONS.previous : action === "next" ? DATEPICKER_ICONS.next : null;
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
    for (const name of ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]) weekdays.append(make("span", "weekday", name[0], { role: "columnheader", "aria-label": name }));
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
    for (const name of ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]) weekdays.append(make("span", "weekday", name[0]));
    const list = make("div", "list");
    const start = state.listStart ?? new Date(state.currentYear, state.currentMonth, 1);
    for (let index = 0; index < (state.listLength ?? 1); index++) {
      const first = new Date(start.getFullYear(), start.getMonth() + index, 1);
      const section = make("section", "month-section", undefined, { "data-month-key": `${first.getFullYear()}-${first.getMonth()}` });
      section.append(make("div", "subhead", `${MONTH_NAMES[first.getMonth()]} ${first.getFullYear()}`, { "aria-hidden": "true" }));
      section.append(monthGrid(first.getFullYear(), first.getMonth(), first.getFullYear() === state.focusedDate.getFullYear() && first.getMonth() === state.focusedDate.getMonth(), true));
      list.append(section);
    }
    content.append(weekdays, list, make("div", "sr-only", "Use arrow keys for days, Home and End for the week, Page Up and Page Down for months, with Shift for years.", { id: `${state.id}-keyboard` }));
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
    content.append(make("div", "sr-only", "Use arrow keys for days, Home and End for the week, Page Up and Page Down for months, with Shift for years.", { id: `${state.id}-keyboard` }));
  }
  if (modal && !fullscreen) {
    const footer = make("div", "footer");
    const confirm = button("confirm", "OK", "confirm") as HTMLButtonElement;
    confirm.disabled = confirmDisabled;
    footer.append(button("cancel", "Cancel", "cancel"), confirm); content.append(footer);
  }
  return content;
}
