import { activeElementOf } from "../../core/dom/focus.js";
import { createElement } from "../../core/dom/create.js";
import { renderCalendar } from "./render.js";
import { addDays, addMonths, dtf, formatDate, getFirstDayOfWeek, parseDate, parseInputDate } from "./utils.js";
const scrollLocks = new WeakMap();
function lockScroll(doc) {
    const lock = scrollLocks.get(doc) ?? { count: 0, overflow: doc.body.style.overflow };
    lock.count++;
    scrollLocks.set(doc, lock);
    doc.body.style.overflow = "hidden";
    return () => {
        if (--lock.count === 0) {
            doc.body.style.overflow = lock.overflow;
            scrollLocks.delete(doc);
        }
    };
}
export function createCalendarSurface(state, dialog, cls, view, trigger, closeOnSelect, isOpen, close, commitDraft, setDisplayDate) {
    state.firstDayOfWeek = getFirstDayOfWeek(state.locale);
    const modal = state.variant !== "docked";
    const announcement = createElement({ tag: "div", className: cls("sr-only"), attributes: { "aria-live": "polite", "aria-atomic": "true" } });
    let unlock;
    const focusCurrent = () => {
        const selector = state.inputMode ? '[data-entry="start"]' : '[data-date][tabindex="0"], [data-month][tabindex="0"], [data-year][tabindex="0"]';
        (dialog.querySelector(selector) ?? dialog.querySelector('button:not(:disabled)'))?.focus();
    };
    const track = () => dialog.querySelector(`.${cls("track")}`);
    const rtl = (element) => view.getComputedStyle(element).direction === "rtl";
    const centre = () => {
        const element = track();
        if (element?.clientWidth)
            element.scrollLeft = (rtl(element) ? -1 : 1) * element.clientWidth;
        const years = dialog.querySelector(`.${cls("years")}`);
        const year = years?.querySelector('[aria-pressed="true"]');
        if (years && year)
            years.scrollTop = year.offsetTop - (years.clientHeight - year.offsetHeight) / 2;
    };
    const monthIndex = (date) => date.getFullYear() * 12 + date.getMonth();
    const fromIndex = (index) => new Date(Math.floor(index / 12), index % 12, 1);
    const list = () => dialog.querySelector(`.${cls("list")}`);
    const limits = () => [state.minDate ? monthIndex(state.minDate) : -Infinity, state.maxDate ? monthIndex(state.maxDate) : Infinity];
    let shiftBy = null;
    const ensureWindow = () => {
        if (state.variant !== "fullscreen")
            return;
        const focus = state.currentYear * 12 + state.currentMonth;
        const start = state.listStart ? monthIndex(state.listStart) : NaN;
        if (start <= focus && focus < start + (state.listLength ?? 0))
            return;
        const [min, max] = limits();
        const first = Math.max(min, focus - 12), last = Math.min(max, focus + 12);
        state.listStart = fromIndex(first);
        state.listLength = last - first + 1;
    };
    const extend = (element) => {
        const [min, max] = limits();
        const start = monthIndex(state.listStart), end = start + state.listLength - 1;
        const margin = element.clientHeight;
        if (element.scrollTop < margin && start > min) {
            const first = Math.max(min, start - 12);
            state.listStart = fromIndex(first);
            state.listLength = end - first + 1;
            shiftBy = element.scrollHeight;
        }
        else if (element.scrollHeight - element.scrollTop - element.clientHeight < margin && end < max) {
            state.listLength = Math.min(max, end + 12) - start + 1;
        }
        else
            return;
        const focused = activeElementOf(dialog);
        const active = focused instanceof HTMLElement ? focused.dataset.date : undefined;
        render();
        if (active)
            dialog.querySelector(`[data-date="${active}"]`)?.focus({ preventScroll: true });
    };
    const reveal = () => {
        const element = list();
        const section = element?.querySelector(`[data-month-key="${state.currentYear}-${state.currentMonth}"]`);
        if (element && section)
            element.scrollTop = section.offsetTop;
    };
    const render = (focus = false, action) => {
        if (!isOpen())
            return;
        ensureWindow();
        const previous = list();
        const kept = previous && { top: previous.scrollTop, height: previous.scrollHeight };
        dialog.replaceChildren(renderCalendar(state), announcement);
        const current = list();
        if (current && kept)
            current.scrollTop = kept.top + (shiftBy === null ? 0 : current.scrollHeight - kept.height);
        shiftBy = null;
        centre();
        announcement.textContent = dtf(state.locale, { month: "long", year: "numeric" }).format(new Date(state.currentYear, state.currentMonth, 1));
        if (action)
            dialog.querySelector(`[data-action="${action}"]`)?.focus();
        else if (focus)
            focusCurrent();
    };
    const select = (date, accept = closeOnSelect) => {
        if (!state.isAllowed(date))
            return;
        if (state.selectionMode === "range" && state.selectedDate && !state.rangeEndDate) {
            state.rangeEndDate = date < state.selectedDate ? state.selectedDate : date;
            state.selectedDate = date < state.selectedDate ? date : state.selectedDate;
        }
        else {
            state.selectedDate = date;
            state.rangeEndDate = null;
        }
        setDisplayDate(date);
        const whole = state.selectionMode !== "range" || !!state.rangeEndDate;
        if ((!modal || accept) && whole)
            commitDraft();
        if (accept && whole)
            close();
        else
            render(true);
    };
    const navigate = (amount) => {
        const count = state.currentView === "day" ? amount : amount * 12;
        const anchor = new Date(state.currentYear, state.currentMonth, 1);
        anchor.setDate(Math.min(state.focusedDate.getDate(), new Date(state.currentYear, state.currentMonth + 1, 0).getDate()));
        setDisplayDate(addMonths(anchor, count));
    };
    const validateEntries = () => {
        const fields = Array.from(dialog.querySelectorAll('[data-entry]'));
        if (!fields.length)
            return !!state.selectedDate && state.isAllowed(state.selectedDate) && (state.selectionMode !== "range" || !!state.rangeEndDate && state.isAllowed(state.rangeEndDate));
        const values = fields.map(field => parseInputDate(field.value, state.dateFormat, state.locale));
        let valid = true;
        fields.forEach((field, index) => {
            const date = values[index];
            const message = !date ? `Enter a valid date (${state.dateFormat}).` : !state.isAllowed(date) ? "Date is not selectable." : index === 1 && values[0] && date < values[0] ? "End date must be on or after start date." : "";
            if (message) {
                field.setAttribute("aria-invalid", "true");
                valid = false;
            }
            else
                field.removeAttribute("aria-invalid");
            dialog.querySelector(`#${field.id}-error`).textContent = message;
        });
        const confirm = dialog.querySelector('[data-action="confirm"]');
        if (confirm)
            confirm.disabled = !valid;
        if (valid) {
            state.selectedDate = values[0];
            state.rangeEndDate = values[1] ?? null;
            setDisplayDate(values[0]);
            const headline = dialog.querySelector(`.${cls("headline")}`);
            if (headline)
                headline.textContent = formatDate(state.selectedDate, "MMM D, YYYY", state.locale) + (state.rangeEndDate ? ` – ${formatDate(state.rangeEndDate, "MMM D, YYYY", state.locale)}` : "");
        }
        return valid;
    };
    const click = (event) => {
        const target = event.target instanceof Element ? event.target.closest('button') : null;
        if (!target || !dialog.contains(target) || target.hasAttribute('disabled') || !isOpen())
            return;
        const action = target.dataset.action;
        if (target.dataset.date) {
            select(parseDate(target.dataset.date));
            return;
        }
        if (target.dataset.month) {
            setDisplayDate(new Date(state.currentYear, Number(target.dataset.month), 1));
            state.currentView = "day";
            render(true);
            return;
        }
        if (target.dataset.year) {
            state.currentYear = Number(target.dataset.year);
            state.currentView = "month";
            render(true);
            return;
        }
        if (action === "cancel")
            close();
        else if (action === "confirm") {
            if (validateEntries()) {
                commitDraft();
                close();
            }
        }
        else if (action === "toggle-mode") {
            if (state.inputMode && !validateEntries())
                return;
            state.inputMode = !state.inputMode;
            render(true);
        }
        else if (action === "month" || action === "year") {
            state.currentView = action;
            render(true);
        }
        else if (action === "prev" || action === "next") {
            const element = state.currentView === "day" ? track() : null;
            if (element?.clientWidth && !view.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
                element.scrollBy({ left: (action === "prev" ? -1 : 1) * (rtl(element) ? -1 : 1) * element.clientWidth, behavior: "smooth" });
            }
            else {
                navigate(action === "prev" ? -1 : 1);
                render(false, action);
            }
        }
    };
    const key = (event) => {
        if (event.key === "Enter" && isOpen() && state.inputMode && event.target instanceof HTMLElement && event.target.hasAttribute("data-entry")) {
            event.preventDefault();
            if (validateEntries()) {
                commitDraft();
                close();
            }
            return;
        }
        if (!isOpen())
            return;
        const target = event.target instanceof HTMLElement ? event.target : null;
        if (target?.dataset.date) {
            const date = parseDate(target.dataset.date);
            if (event.key === "Enter" && state.selectionMode === "single") {
                event.preventDefault();
                select(date, true);
                return;
            }
            let next;
            const ahead = rtl(dialog) ? -1 : 1;
            if (event.key === "ArrowLeft")
                next = addDays(date, -ahead);
            else if (event.key === "ArrowRight")
                next = addDays(date, ahead);
            else if (event.key === "ArrowUp")
                next = addDays(date, -7);
            else if (event.key === "ArrowDown")
                next = addDays(date, 7);
            else if (event.key === "Home")
                next = addDays(date, -((date.getDay() - state.firstDayOfWeek + 7) % 7));
            else if (event.key === "End")
                next = addDays(date, 6 - ((date.getDay() - state.firstDayOfWeek + 7) % 7));
            else if (event.key === "PageUp" || event.key === "PageDown")
                next = addMonths(date, (event.key === "PageUp" ? -1 : 1) * (event.shiftKey ? 12 : 1));
            else
                return;
            event.preventDefault();
            if (state.minDate && next < state.minDate)
                next = new Date(state.minDate);
            if (state.maxDate && next > state.maxDate)
                next = new Date(state.maxDate);
            const direction = next < date ? -1 : 1;
            for (let n = 0; !state.isAllowed(next) && n <= state.specialDates.length; n++)
                next = addDays(next, direction);
            if (state.isAllowed(next)) {
                setDisplayDate(next);
                render(true);
            }
        }
        else if (target?.hasAttribute('data-month') || target?.hasAttribute('data-year')) {
            const buttons = Array.from(dialog.querySelectorAll('[data-month], [data-year]'));
            let index = buttons.indexOf(target);
            const ahead = rtl(dialog) ? -1 : 1;
            const delta = { ArrowLeft: -ahead, ArrowRight: ahead, ArrowUp: -3, ArrowDown: 3 }[event.key];
            if (event.key === "Home")
                index = 0;
            else if (event.key === "End")
                index = buttons.length - 1;
            else if (delta)
                index = Math.min(buttons.length - 1, Math.max(0, index + delta));
            else
                return;
            event.preventDefault();
            buttons.forEach(button => button.tabIndex = -1);
            buttons[index].tabIndex = 0;
            buttons[index].focus();
        }
    };
    const onFocus = (event) => {
        const target = event.target instanceof HTMLElement ? event.target : null;
        if (target?.dataset.date) {
            state.focusedDate = parseDate(target.dataset.date);
            dialog.querySelectorAll('[data-date]').forEach(el => el.tabIndex = el === target ? 0 : -1);
        }
    };
    let quiet;
    const settle = () => {
        const element = track();
        if (!isOpen() || !element?.clientWidth)
            return;
        const page = Math.round(Math.abs(element.scrollLeft) / element.clientWidth) - 1;
        if (!page)
            return;
        const focused = activeElementOf(dialog);
        const active = focused instanceof HTMLElement && dialog.contains(focused) ? focused : null;
        navigate(page);
        render(!!active?.dataset.date, active?.dataset.action);
    };
    const onScroll = (event) => {
        if (event.type === "scroll" && event.target instanceof HTMLElement && event.target === list()) {
            extend(event.target);
            return;
        }
        if (!(event.target instanceof HTMLElement) || event.target !== track())
            return;
        if (event.type === "scrollend") {
            settle();
            return;
        }
        if ("onscrollend" in view)
            return;
        clearTimeout(quiet);
        quiet = setTimeout(settle, 150);
    };
    const onEntry = () => { validateEntries(); };
    dialog.append(renderCalendar(state), announcement);
    dialog.addEventListener("focusin", onFocus);
    dialog.addEventListener("input", onEntry);
    dialog.addEventListener("scroll", onScroll, true);
    dialog.addEventListener("scrollend", onScroll, true);
    return [
        function show() {
            if (!isOpen())
                return;
            render();
            if (modal && typeof dialog.showModal === "function" && dialog.isConnected)
                dialog.showModal();
            else if (!modal && typeof dialog.show === "function")
                dialog.show();
            else
                dialog.setAttribute("open", "");
            if (modal)
                unlock = lockScroll(dialog.ownerDocument);
            centre();
            reveal();
            trigger.setAttribute("aria-expanded", "true");
            focusCurrent();
        },
        function hide() {
            unlock?.();
            unlock = undefined;
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
            unlock?.();
            unlock = undefined;
        },
    ];
}
