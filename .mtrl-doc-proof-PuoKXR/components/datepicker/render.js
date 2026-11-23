import { DATEPICKER_ICONS } from "./constants.js";
import { setHTML } from "../../core/dom/html.js";
import { createElement } from "../../core/dom/create.js";
import { dtf, formatDate, generateCalendarDates, getMonthNames, getWeekdayNames, isSameDay, parseDate } from "./utils.js";
export function renderCalendar(state) {
    const cls = (name) => `${state.prefix}-datepicker__${name}`;
    const monthsLong = getMonthNames(state.locale, "long");
    const weekdayNames = getWeekdayNames(state.locale);
    const make = (tag, name, text, attributes) => createElement({ tag, className: cls(name), text, attributes });
    const button = (name, text, action, label = text) => {
        const element = make("button", name, text, { type: "button", "data-action": action, "aria-label": label });
        const icon = name === "close" ? DATEPICKER_ICONS.close : action === "toggle-mode" ? (state.inputMode ? DATEPICKER_ICONS.calendar : DATEPICKER_ICONS.edit) : action === "prev" ? DATEPICKER_ICONS.previous : action === "next" ? DATEPICKER_ICONS.next : null;
        if (icon)
            setHTML(element, icon);
        return element;
    };
    const monthGrid = (year, month, current, list = false) => {
        const grid = make("div", "days", undefined, { role: "grid", "aria-label": `${monthsLong[month]} ${year}`, "aria-describedby": `${state.id}-keyboard` });
        const weekdays = make("div", "weekdays", undefined, { role: "row" });
        if (list)
            weekdays.classList.add(cls("sr-only"));
        for (const { narrow, long } of weekdayNames)
            weekdays.append(make("span", "weekday", narrow, { role: "columnheader", "aria-label": long }));
        grid.append(weekdays);
        const dates = generateCalendarDates(year, month, state.selectedDate, state.rangeEndDate, state.minDate, state.maxDate, state.firstDayOfWeek);
        const focus = dates.find(item => isSameDay(item.date, state.focusedDate) && state.isAllowed(item.date)) ?? dates.find(item => item.isCurrentMonth && state.isAllowed(item.date));
        for (let week = 0; week < 6; week++) {
            const row = make("div", "week", undefined, { role: "row" });
            for (const item of dates.slice(week * 7, week * 7 + 7)) {
                const selected = !!state.selectedDate && (isSameDay(item.date, state.selectedDate) || !!state.rangeEndDate && isSameDay(item.date, state.rangeEndDate));
                const inRange = !!state.selectedDate && !!state.rangeEndDate && item.date >= state.selectedDate && item.date <= state.rangeEndDate;
                if (list && !item.isCurrentMonth) {
                    row.append(make("div", "cell", undefined, { role: "gridcell" }));
                    continue;
                }
                const cell = make("div", "cell");
                if (inRange)
                    cell.classList.add(cls("cell--range"));
                if ((item.isCurrentMonth || inRange) && state.selectedDate && isSameDay(item.date, state.selectedDate))
                    cell.classList.add(cls("cell--range-start"));
                if ((item.isCurrentMonth || inRange) && state.rangeEndDate && isSameDay(item.date, state.rangeEndDate))
                    cell.classList.add(cls("cell--range-end"));
                const special = state.specialDates.find(special => { const date = parseDate(special.date); return date && isSameDay(date, item.date); });
                const day = make("button", "day", String(item.day), {
                    type: "button", "data-date": formatDate(item.date, "YYYY-MM-DD"), "aria-label": dtf(state.locale, { weekday: "long", year: "numeric", month: "long", day: "numeric" }).format(item.date),
                    role: "gridcell", "aria-selected": String(selected || inRange), disabled: !state.isAllowed(item.date), tabindex: current && item === focus ? "0" : "-1",
                });
                if (!state.isAllowed(item.date))
                    day.classList.add(cls("day--disabled"));
                if (item.isToday) {
                    day.classList.add(cls("day--today"));
                    day.setAttribute("aria-current", "date");
                }
                if (!item.isCurrentMonth)
                    day.classList.add(cls("day--outside"));
                if (selected)
                    day.classList.add(cls("day--selected"));
                if (special?.highlight)
                    day.classList.add(cls("day--highlight"));
                if (special?.tooltip)
                    day.title = special.tooltip;
                cell.append(day);
                row.append(cell);
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
        if (fullscreen) {
            const save = button("save", "Save", "confirm");
            save.disabled = confirmDisabled;
            header.append(button("close", "", "cancel", "Close"), save);
        }
        header.append(make("div", "title", state.label, { id: `${state.id}-title` }));
        const pattern = fullscreen ? "MMM D" : "MMM D, YYYY";
        const headline = state.selectedDate ? formatDate(state.selectedDate, pattern, state.locale) : state.selectionMode === "range" ? "Select range" : "Select date";
        header.append(make("div", "headline", state.selectionMode === "range" && state.rangeEndDate ? `${headline} – ${formatDate(state.rangeEndDate, pattern, state.locale)}` : headline));
        header.append(button("mode-toggle", state.inputMode ? "▦" : "✎", "toggle-mode", state.inputMode ? "Switch to calendar" : "Switch to date input"));
        content.append(header);
    }
    if (state.inputMode) {
        const fields = make("div", "fields");
        for (const endpoint of state.selectionMode === "range" ? ["start", "end"] : ["start"]) {
            const wrapper = make("div", "field");
            const id = `${state.id}-${endpoint}`;
            wrapper.append(make("label", "label", state.selectionMode === "range" ? (endpoint === "start" ? "Start date" : "End date") : "Date", { for: id }));
            const input = make("input", "input", undefined, { id, type: "text", autocomplete: "off", placeholder: state.dateFormat, "data-entry": endpoint, "aria-describedby": `${id}-help ${id}-error` });
            input.value = formatDate(endpoint === "start" ? state.selectedDate : state.rangeEndDate, state.dateFormat, state.locale);
            wrapper.append(input, make("div", "help", state.dateFormat, { id: `${id}-help` }), make("div", "error", "", { id: `${id}-error`, "aria-live": "polite" }));
            fields.append(wrapper);
        }
        content.append(fields);
    }
    else if (fullscreen) {
        const weekdays = make("div", "weekdays", undefined, { "aria-hidden": "true" });
        for (const { narrow } of weekdayNames)
            weekdays.append(make("span", "weekday", narrow));
        const list = make("div", "list");
        const start = state.listStart ?? new Date(state.currentYear, state.currentMonth, 1);
        for (let index = 0; index < (state.listLength ?? 1); index++) {
            const first = new Date(start.getFullYear(), start.getMonth() + index, 1);
            const section = make("section", "month-section", undefined, { "data-month-key": `${first.getFullYear()}-${first.getMonth()}` });
            section.append(make("div", "subhead", `${monthsLong[first.getMonth()]} ${first.getFullYear()}`, { "aria-hidden": "true" }));
            section.append(monthGrid(first.getFullYear(), first.getMonth(), first.getFullYear() === state.focusedDate.getFullYear() && first.getMonth() === state.focusedDate.getMonth(), true));
            list.append(section);
        }
        content.append(weekdays, list);
    }
    else {
        const header = make("div", "header");
        const nav = make("div", "navigation");
        nav.append(button("month-selector", monthsLong[state.currentMonth], "month", "Select month"), button("year-selector", String(state.currentYear), "year", "Select year"));
        header.append(nav);
        if (state.currentView !== "year") {
            const span = state.currentView === "day" ? "month" : "year";
            header.append(button("prev", "‹", "prev", `Previous ${span}`), button("next", "›", "next", `Next ${span}`));
        }
        content.append(header);
        if (state.currentView === "day") {
            const track = make("div", "track");
            for (const offset of [-1, 0, 1]) {
                const first = new Date(state.currentYear, state.currentMonth + offset, 1);
                const grid = monthGrid(first.getFullYear(), first.getMonth(), offset === 0);
                if (offset) {
                    grid.setAttribute("aria-hidden", "true");
                    grid.inert = true;
                    grid.querySelectorAll("[data-date]").forEach(day => day.removeAttribute("data-date"));
                }
                track.append(grid);
            }
            content.append(track);
        }
        else {
            const months = state.currentView === "month";
            const monthsShort = months ? getMonthNames(state.locale, "short") : [];
            const grid = make("div", months ? "months" : "years", undefined, { role: "group", "aria-label": months ? "Choose month" : "Choose year" });
            const [first, last] = months ? [0, 11] : [state.minDate?.getFullYear() ?? 1900, state.maxDate?.getFullYear() ?? 2100];
            for (let value = first; value <= last; value++) {
                const selected = value === (months ? state.currentMonth : state.currentYear);
                grid.append(make("button", months ? "month" : "year", months ? monthsShort[value] : String(value), {
                    type: "button", [months ? "data-month" : "data-year"]: String(value), "aria-pressed": String(selected), tabindex: selected ? "0" : "-1",
                }));
            }
            content.append(grid);
        }
    }
    if (!state.inputMode) {
        content.append(make("div", "sr-only", "Use arrow keys for days, Home and End for the week, Page Up and Page Down for months, with Shift for years.", { id: `${state.id}-keyboard` }));
    }
    if (modal && !fullscreen) {
        const footer = make("div", "footer");
        const confirm = button("confirm", "OK", "confirm");
        confirm.disabled = confirmDisabled;
        footer.append(button("cancel", "Cancel", "cancel"), confirm);
        content.append(footer);
    }
    return content;
}
