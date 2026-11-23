import { TIME_FORMAT } from "./types.js";
import { activeElementOf } from "../../core/dom/focus.js";
const OUTER = 101;
const INNER = 69;
const itemsFor = (selector, format) => {
    if (selector !== "hour") {
        return Array.from({ length: 12 }, (_, i) => ({ value: i * 5, text: String(i * 5).padStart(2, "0"), angle: i * 30, radius: OUTER }));
    }
    if (format === TIME_FORMAT.MILITARY) {
        return Array.from({ length: 24 }, (_, h) => ({ value: h, text: h === 0 ? "00" : String(h), angle: (h % 12) * 30, radius: h < 12 ? OUTER : INNER }));
    }
    return Array.from({ length: 12 }, (_, i) => ({ value: i || 12, text: String(i || 12), angle: i * 30, radius: OUTER }));
};
const dialValue = (time, selector, format) => selector === "minute" ? time.minutes
    : selector === "second" ? time.seconds ?? 0
        : format === TIME_FORMAT.MILITARY ? time.hours : time.hours % 12 || 12;
export const nameFor = (selector, format, value) => selector === "minute" ? `${value} minutes`
    : selector === "second" ? `${value} seconds`
        : format === TIME_FORMAT.MILITARY ? `${value} hours` : `${value} o'clock`;
let dials = 0;
export const createDial = (options) => {
    const { prefix, format } = options;
    const cls = (name) => `${prefix}-time-picker__${name}`;
    const id = `${prefix}-time-picker-dial-${++dials}`;
    const element = document.createElement("div");
    element.className = cls("dial-face");
    element.setAttribute("role", "listbox");
    const numbers = document.createElement("div");
    numbers.className = cls("dial-numbers");
    const track = document.createElement("div");
    track.className = cls("dial-track");
    const centre = document.createElement("div");
    centre.className = cls("dial-centre");
    const handle = document.createElement("div");
    handle.className = cls("dial-handle");
    const selected = document.createElement("div");
    selected.className = `${cls("dial-numbers")} ${cls("dial-numbers--selected")}`;
    for (const part of [track, centre, handle, selected])
        part.setAttribute("aria-hidden", "true");
    element.append(numbers, track, centre, handle, selected);
    let selector = null;
    let items = [];
    let angle = 0;
    let current = 0;
    const place = (el, item) => {
        const radians = (item.angle * Math.PI) / 180;
        el.style.setProperty(`--${prefix}-time-picker-x`, `${Math.round(Math.sin(radians) * item.radius * 100) / 100}px`);
        el.style.setProperty(`--${prefix}-time-picker-y`, `${Math.round(-Math.cos(radians) * item.radius * 100) / 100}px`);
    };
    const build = (next) => {
        element.querySelectorAll(`.${cls("dial-numbers--leaving")}`).forEach(el => el.remove());
        if (selector && element.ownerDocument.defaultView?.matchMedia?.("(prefers-reduced-motion: no-preference)").matches) {
            const leaving = selected.cloneNode(true);
            leaving.className = `${cls("dial-numbers")} ${cls("dial-numbers--leaving")}`;
            leaving.removeAttribute("aria-hidden");
            leaving.inert = true;
            Array.from(numbers.children).forEach((number, i) => {
                if (number.getAttribute("aria-disabled") === "true")
                    leaving.children[i].style.opacity = "0.38";
            });
            leaving.addEventListener("animationend", () => leaving.remove(), { once: true });
            leaving.addEventListener("animationcancel", () => leaving.remove(), { once: true });
            element.append(leaving);
        }
        selector = next;
        items = itemsFor(next, format);
        element.setAttribute("aria-label", next === "hour" ? "Hour" : next === "minute" ? "Minute" : "Second");
        numbers.replaceChildren(...items.map((item, index) => {
            const option = document.createElement("span");
            option.className = cls("dial-number");
            if (item.radius === INNER)
                option.classList.add(cls("dial-number--inner"));
            option.id = `${id}-${index}`;
            option.setAttribute("role", "option");
            option.setAttribute("aria-label", nameFor(next, format, item.value));
            option.dataset.value = String(item.value);
            option.textContent = item.text;
            place(option, item);
            return option;
        }));
        selected.replaceChildren(...items.map(item => {
            const copy = document.createElement("span");
            copy.className = cls("dial-number");
            if (item.radius === INNER)
                copy.classList.add(cls("dial-number--inner"));
            copy.textContent = item.text;
            place(copy, item);
            return copy;
        }));
        element.classList.remove(cls("dial-face--swap"));
        void element.offsetWidth;
        element.classList.add(cls("dial-face--swap"));
    };
    const nearest = (value) => {
        const exact = items.findIndex(item => item.value === value);
        if (exact >= 0)
            return exact;
        return Math.round(value / 5) % items.length;
    };
    const update = (time, next, animate = false) => {
        if (!animate)
            element.style.transition = "none";
        const focused = activeElementOf(element);
        const refocus = next !== selector && numbers.contains(focused);
        if (next !== selector)
            build(next);
        current = dialValue(time, next, format);
        const index = items.findIndex(item => item.value === current);
        const target = next === "hour" ? items[nearest(current)] : { angle: current * 6, radius: OUTER };
        if (animate)
            angle = parseFloat(getComputedStyle(element).getPropertyValue(`--${prefix}-time-picker-angle`)) || 0;
        const delta = ((target.angle - (angle % 360)) % 360 + 540) % 360 - 180;
        angle += delta;
        element.style.setProperty(`--${prefix}-time-picker-angle`, `${angle}deg`);
        element.style.setProperty(`--${prefix}-time-picker-radius`, `${target.radius}px`);
        handle.classList.toggle(cls("dial-handle--between"), index < 0);
        const stop = nearest(current);
        numbers.querySelectorAll("[role=option]").forEach((option, i) => {
            option.setAttribute("aria-selected", String(i === index));
            if (options.allowed?.(next, items[i].value) === false)
                option.setAttribute("aria-disabled", "true");
            else
                option.removeAttribute("aria-disabled");
            option.tabIndex = i === stop ? 0 : -1;
        });
        if (refocus)
            numbers.querySelector('[tabindex="0"]')?.focus({ preventScroll: true });
        if (!animate) {
            void element.offsetWidth;
            element.style.transition = "";
        }
    };
    const valueAt = (event) => {
        const box = element.getBoundingClientRect();
        const dx = event.clientX - (box.left + box.width / 2);
        const dy = event.clientY - (box.top + box.height / 2);
        const degrees = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
        if (selector !== "hour")
            return Math.round(degrees / 6) % 60;
        const step = Math.round(degrees / 30) % 12;
        if (format === TIME_FORMAT.MILITARY)
            return Math.hypot(dx, dy) < (OUTER + INNER) / 2 ? step + 12 : step;
        return step || 12;
    };
    let dragging = false;
    let pointerX = 0;
    let pointerY = 0;
    element.addEventListener("pointerdown", event => {
        if (event.button !== 0)
            return;
        dragging = true;
        pointerX = event.clientX;
        pointerY = event.clientY;
        element.setPointerCapture?.(event.pointerId);
        options.onSelect(valueAt(event), false, true);
    });
    element.addEventListener("pointermove", event => {
        if (dragging && (element.classList.contains(cls("dial-face--dragging")) || Math.hypot(event.clientX - pointerX, event.clientY - pointerY) > 4)) {
            element.classList.add(cls("dial-face--dragging"));
            options.onSelect(valueAt(event), false, true);
        }
    });
    const release = (event) => {
        if (!dragging)
            return;
        dragging = false;
        element.classList.remove(cls("dial-face--dragging"));
        options.onSelect(valueAt(event), true, true);
    };
    element.addEventListener("pointerup", release);
    element.addEventListener("pointercancel", () => {
        dragging = false;
        element.classList.remove(cls("dial-face--dragging"));
    });
    element.addEventListener("keydown", event => {
        const options_ = Array.from(numbers.querySelectorAll("[role=option]"));
        const index = options_.indexOf(event.target);
        if (index < 0)
            return;
        let next = index;
        if (event.key === "ArrowRight" || event.key === "ArrowDown")
            next = (index + 1) % options_.length;
        else if (event.key === "ArrowLeft" || event.key === "ArrowUp")
            next = (index - 1 + options_.length) % options_.length;
        else if (event.key === "Home")
            next = 0;
        else if (event.key === "End")
            next = options_.length - 1;
        else if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            options.onSelect(items[index].value, true, false);
            return;
        }
        else
            return;
        event.preventDefault();
        options_.forEach((option, i) => { option.tabIndex = i === next ? 0 : -1; });
        options_[next].focus();
    });
    return { element, update };
};
