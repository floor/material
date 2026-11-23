import { SLIDER_EVENTS } from "../types.js";
import { defaultConfig, sliderSizeClass } from "../config.js";
import { SLIDER_MEASUREMENTS, SLIDER_SIZES } from "../constants.js";
import { PREFIX } from "../../../core/config.js";
import { cornerToken } from "../../../core/theme/shape.js";
import { setHTML } from "../../../core/dom/html.js";
import { setFormValue } from "../../../core/dom/form-value.js";
import { activeElementOf } from "../../../core/dom/focus.js";
import { arrowSign, bubbleTransform, getAxis, handleTransform, isRtl, lengthOf, offsetAlong, } from "./axis.js";
const getTrackHeight = (size) => {
    if (typeof size === "number") {
        return Math.max(size, SLIDER_SIZES.XS);
    }
    if (typeof size === "string" && size in SLIDER_SIZES) {
        return SLIDER_SIZES[size];
    }
    return SLIDER_SIZES.XS;
};
const getHandleHeight = (size) => {
    const trackHeight = getTrackHeight(size);
    if (trackHeight <= SLIDER_SIZES.S) {
        return SLIDER_MEASUREMENTS.SMALL_HANDLE_HEIGHT;
    }
    return trackHeight + SLIDER_MEASUREMENTS.HANDLE_HEIGHT_OFFSET;
};
const getExternalTrackRadius = (size) => {
    const trackHeight = getTrackHeight(size);
    if (trackHeight <= SLIDER_SIZES.S)
        return 8;
    if (trackHeight <= SLIDER_SIZES.M)
        return 12;
    if (trackHeight <= SLIDER_SIZES.L)
        return 16;
    return 28;
};
const TRACK_STEPS = { 8: "small", 12: "medium", 16: "large", 28: "extra-large" };
const trackPositionCss = (fraction, inset) => inset
    ? `calc(${fraction * 100}% + ${inset * (1 - 2 * fraction)}px)`
    : `${fraction * 100}%`;
const A0 = { f: 0, p: 0 };
const A1 = { f: 1, p: 0 };
const ap = (f, p) => ({ f, p });
const add = (a, b) => ap(a.f + b.f, a.p + b.p);
const sub = (a, b) => ap(a.f - b.f, a.p - b.p);
const px = (p) => ap(0, p);
const fractionOf = (value, min, max) => min === max ? 0 : Math.min(1, Math.max(0, (value - min) / (max - min)));
const alongCss = (a, unit = "%") => {
    const pct = Math.round(a.f * 1e8) / 1e6;
    const p = Math.round(a.p * 1e6) / 1e6;
    if (pct === 0)
        return `${p}px`;
    if (p === 0)
        return `${pct}${unit}`;
    return `calc(${pct}${unit} ${p < 0 ? "-" : "+"} ${Math.abs(p)}px)`;
};
const INSET_ICON_PADDING = 10;
const INSIDE_CORNER = 2;
const STOP_INDICATOR_INSET = 6;
const STOP_INDICATOR_RADIUS = 2;
const HANDLE_WIDTH = 4;
const NARROW_HANDLE_WIDTH = 2;
export const withTracks = (config) => (component) => {
    const container = component.container;
    const element = (className, parent) => {
        const node = document.createElement("div");
        node.className = component.getClass(className);
        parent.append(node);
        return node;
    };
    let axis = getAxis(config);
    const opposite = { left: "right", right: "left", top: "bottom", bottom: "top" };
    const at = (node, position) => {
        node.style[opposite[axis.start]] = "";
        node.style[axis.start] = position;
    };
    const visual = element("slider__visual", container);
    visual.setAttribute("aria-hidden", "true");
    const track = element("slider__track", visual);
    const segments = Array.from({ length: 3 }, () => element("slider__segment", track));
    const ticks = [element("slider__ticks", visual), element("slider__ticks", visual)];
    ticks[1].classList.add(component.getClass("slider__ticks--active"));
    const dots = [element("slider__dot", visual), element("slider__dot", visual)];
    dots[0].classList.add(component.getClass("slider__dot--start"));
    const insetIcon = element("slider__inset-icon", visual);
    insetIcon.hidden = true;
    let insetMarkup = { icon: config.insetIcon ?? "", atMin: config.insetIconAtMin ?? "" };
    let shownMarkup = null;
    let destroyed = false;
    let size = config.size ?? "XS";
    let state = {
        value: config.value ?? 0, secondValue: config.secondValue ?? null,
        min: config.min ?? 0, max: config.max ?? 100, step: config.step ?? 1,
    };
    const narrowed = (which) => {
        const handle = which === "first" ? component.handle : component.secondHandle;
        const pressed = !!state.pressed && (state.activeHandle === which || (!config.range && which === "first"));
        return pressed || !!handle?.classList.contains(component.getClass("slider__handle--focused"));
    };
    const render = (next) => {
        if (destroyed)
            return;
        if (next)
            state = { ...next };
        axis = getAxis(config, isRtl(component.element));
        const width = lengthOf(container.getBoundingClientRect(), axis) || 0;
        const corner = getExternalTrackRadius(size);
        const inset = config.ticks ? corner : 0;
        const fraction = (value) => fractionOf(value, state.min, state.max);
        const atValue = (value) => {
            const f = fraction(value);
            return ap(f, inset * (1 - 2 * f));
        };
        const cmp = (a, b) => width > 0 ? a.f * width + a.p - (b.f * width + b.p) : (a.f - b.f) || (a.p - b.p);
        const gapOf = (which) => px((narrowed(which) ? NARROW_HANDLE_WIDTH : HANDLE_WIDTH) / 2 + SLIDER_MEASUREMENTS.HANDLE_GAP);
        const firstGap = gapOf("first");
        const secondGap = gapOf("second");
        const radiusOf = (start, end) => {
            const outer = cornerToken(TRACK_STEPS[corner], corner, PREFIX), inside = `${INSIDE_CORNER}px`;
            const atStart = cmp(start, A0) === 0 ? outer : inside;
            const atEnd = cmp(end, A1) === 0 ? outer : inside;
            return {
                left: `${atStart} ${atEnd} ${atEnd} ${atStart}`,
                right: `${atEnd} ${atStart} ${atStart} ${atEnd}`,
                top: `${atStart} ${atStart} ${atEnd} ${atEnd}`,
                bottom: `${atEnd} ${atEnd} ${atStart} ${atStart}`,
            }[axis.start];
        };
        const first = atValue(state.value);
        const second = atValue(state.secondValue ?? state.max);
        let parts;
        let activeStart, activeEnd;
        if (config.centered) {
            const zero = atValue(Math.min(state.max, Math.max(state.min, 0)));
            if (cmp(first, zero) >= 0) {
                activeStart = zero;
                activeEnd = first;
                parts = [[A0, sub(zero, firstGap), false], [zero, sub(first, firstGap), true], [add(first, firstGap), A1, false]];
            }
            else {
                activeStart = first;
                activeEnd = zero;
                parts = [[A0, sub(first, firstGap), false], [add(first, firstGap), zero, true], [add(zero, firstGap), A1, false]];
            }
        }
        else if (config.range && state.secondValue !== null) {
            const lowIsFirst = cmp(first, second) <= 0;
            const low = lowIsFirst ? first : second;
            const high = lowIsFirst ? second : first;
            const lowGap = lowIsFirst ? firstGap : secondGap;
            const highGap = lowIsFirst ? secondGap : firstGap;
            activeStart = low;
            activeEnd = high;
            parts = [[A0, sub(low, lowGap), false], [add(low, lowGap), sub(high, highGap), true], [add(high, highGap), A1, false]];
        }
        else {
            activeStart = A0;
            activeEnd = first;
            parts = [[A0, A0, false], [A0, sub(first, firstGap), true], [add(first, firstGap), A1, false]];
        }
        const standard = !config.centered && !(config.range && state.secondValue !== null);
        if (config.ticks) {
            parts.forEach((part) => {
                if (cmp(part[0], A0) === 0 && cmp(part[1], px(inset)) <= 0)
                    part[1] = part[0];
                else if (cmp(part[1], A1) === 0 && cmp(part[0], ap(1, -inset)) >= 0)
                    part[1] = part[0];
            });
        }
        segments.forEach((segment, index) => {
            const [start, end, active] = parts[index] ?? [A0, A0, false];
            const len = sub(end, start);
            const drawn = (width > 0 ? len.f * width + len.p < 0 : len.f < 0 || (len.f === 0 && len.p < 0)) ? A0 : len;
            at(segment, alongCss(start));
            segment.style[axis.size] = alongCss(drawn);
            segment.style.borderRadius = radiusOf(start, end);
            segment.classList.toggle(component.getClass("slider__segment--active"), active);
        });
        dots[0].hidden = !!config.ticks || standard || cmp(parts[0][1], parts[0][0]) <= 0;
        dots[1].hidden = !!config.ticks || cmp(parts[2][1], parts[2][0]) <= 0;
        at(dots[0], alongCss(px(STOP_INDICATOR_INSET - STOP_INDICATOR_RADIUS)));
        at(dots[1], alongCss(ap(1, -(STOP_INDICATOR_INSET + STOP_INDICATOR_RADIUS))));
        placeInsetIcon(parts, width);
        const discrete = !!config.ticks && state.step > 0 && state.max > state.min;
        ticks.forEach(tick => { tick.hidden = !discrete; });
        if (discrete) {
            const stepF = state.step / (state.max - state.min);
            const repeat = `max(0.01px, ${alongCss(ap(stepF, -2 * inset * stepF))})`;
            const offset = alongCss(ap(-stepF / 2, inset * (1 + stepF)), axis.vertical ? "cqh" : "cqw");
            const last = atValue(state.min + Math.floor((state.max - state.min) / state.step) * state.step);
            const holes = [[sub(first, firstGap), add(first, firstGap)]];
            if (config.range && state.secondValue !== null)
                holes.push([sub(second, secondGap), add(second, secondGap)]);
            const mask = (intervals) => {
                const merged = [];
                for (const [start, end] of [...intervals].sort((a, b) => cmp(a[0], b[0]))) {
                    const previous = merged[merged.length - 1];
                    if (previous && cmp(start, previous[1]) <= 0) {
                        if (cmp(end, previous[1]) > 0)
                            previous[1] = end;
                    }
                    else
                        merged.push([start, end]);
                }
                const stops = merged.flatMap(([start, end]) => [`black ${alongCss(start)}`, `transparent ${alongCss(start)}`, `transparent ${alongCss(end)}`, `black ${alongCss(end)}`]);
                const direction = { left: "to right", right: "to left", top: "to bottom", bottom: "to top" }[axis.start];
                return stops.length ? `linear-gradient(${direction}, black 0px, ${stops.join(",")}, black 100%)` : "none";
            };
            ticks.forEach((tick, index) => {
                tick.style.backgroundSize = axis.vertical ? `100% ${repeat}` : `${repeat} 100%`;
                tick.style.backgroundPosition = axis.vertical
                    ? `center ${axis.start} ${offset}`
                    : `${axis.start} ${offset} center`;
                tick.style.maskImage = mask(index === 0 ? [...holes, [sub(activeStart, px(2)), add(activeEnd, px(2))]] : holes);
            });
            const clip = (fromStart, fromEnd) => ({
                left: `inset(0 ${fromEnd} 0 ${fromStart})`,
                right: `inset(0 ${fromStart} 0 ${fromEnd})`,
                top: `inset(${fromStart} 0 ${fromEnd} 0)`,
                bottom: `inset(${fromEnd} 0 ${fromStart} 0)`,
            })[axis.start];
            const fromEnd = (edge) => `max(0px, calc(100% - ${alongCss(edge)}))`;
            ticks[0].style.clipPath = clip("0px", fromEnd(add(last, px(2))));
            ticks[1].style.clipPath = clip(`max(0px, ${alongCss(sub(activeStart, px(2)))})`, `max(0px, calc(100% - min(${alongCss(add(last, px(2)))}, ${alongCss(add(activeEnd, px(2)))})))`);
        }
    };
    function placeInsetIcon(parts, width) {
        const trackHeight = getTrackHeight(size);
        const eligible = !config.range && !config.centered && trackHeight >= SLIDER_SIZES.M;
        const markup = state.value <= state.min && insetMarkup.atMin ? insetMarkup.atMin : insetMarkup.icon;
        const iconSize = trackHeight >= SLIDER_SIZES.XL ? 32 : 24;
        const room = iconSize + 2 * INSET_ICON_PADDING;
        const fits = (len) => width > 0 ? len.f * width + len.p >= room : len.f > 0 || (len.f === 0 && len.p >= room);
        const onActive = fits(sub(parts[1][1], parts[1][0]));
        const onInactive = !onActive && fits(sub(parts[2][1], parts[2][0]));
        insetIcon.hidden = !eligible || !markup || (!onActive && !onInactive);
        if (insetIcon.hidden)
            return;
        if (markup !== shownMarkup) {
            setHTML(insetIcon, markup);
            shownMarkup = markup;
        }
        insetIcon.style.width = insetIcon.style.height = `${iconSize}px`;
        at(insetIcon, alongCss(add(onActive ? parts[1][0] : parts[2][0], px(INSET_ICON_PADDING))));
        insetIcon.classList.toggle(component.getClass("slider__inset-icon--inactive"), onInactive);
    }
    component.setInsetIcon = (icon, atMin = "") => {
        if (destroyed)
            return;
        insetMarkup = { icon, atMin };
        render();
    };
    const setSize = (next) => {
        if (destroyed)
            return;
        const previous = sliderSizeClass(size), current = sliderSizeClass(next);
        if (previous)
            component.element.classList.remove(previous);
        if (current)
            component.element.classList.add(current);
        size = next;
        const handleHeight = getHandleHeight(size);
        container.style[axis.cross] = `${Math.max(handleHeight, SLIDER_MEASUREMENTS.MIN_HEIGHT)}px`;
        track.style[axis.cross] = `${getTrackHeight(size)}px`;
        for (const handle of [component.handle, component.secondHandle]) {
            if (handle)
                handle.style[axis.cross] = `${handleHeight}px`;
        }
        component.element.style.setProperty(`--${PREFIX}-slider-handle-height`, `${handleHeight}px`);
        render();
    };
    component.renderTracks = render;
    component.setSize = setSize;
    component.getSize = () => size;
    const setColor = component.appearance.setColor;
    component.appearance.setColor = (color) => {
        if (destroyed)
            return;
        setColor.call(component.appearance, color);
        config.color = color;
    };
    setSize(size);
    const resize = () => {
        if (!destroyed)
            render();
    };
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    if (observer)
        observer.observe(container);
    else
        window.addEventListener("resize", resize);
    const destroy = component.lifecycle.destroy;
    component.lifecycle.destroy = () => {
        if (destroyed)
            return;
        destroyed = true;
        observer?.disconnect();
        if (!observer)
            window.removeEventListener("resize", resize);
        destroy.call(component.lifecycle);
    };
    return component;
};
const clientXOf = (e) => "touches" in e ? e.touches[0].clientX : e.clientX;
const clientYOf = (e) => "touches" in e ? e.touches[0].clientY : e.clientY;
export const withController = (config, getComponent) => (component) => {
    const max = config.max !== undefined ? config.max : 100;
    const state = {
        value: config.value !== undefined ? config.value : 0,
        secondValue: config.secondValue !== undefined
            ? config.secondValue
            : config.range
                ? max
                : null,
        min: config.min !== undefined ? config.min : 0,
        max,
        step: config.step !== undefined ? config.step : 1,
        dragging: false,
        pressed: false,
        activeHandle: null,
        activeBubble: null,
        valueHideTimer: null,
    };
    const emitEvent = (eventName, originalEvent = null) => {
        const eventData = {
            slider: getComponent(),
            value: state.value,
            secondValue: state.secondValue,
            originalEvent,
            preventDefault: () => {
                eventData.defaultPrevented = true;
            },
            defaultPrevented: false,
        };
        component.emit(eventName, eventData);
        return eventData;
    };
    const axisNow = () => getAxis(config, isRtl(component.element));
    const inset = () => config.ticks ? getExternalTrackRadius(component.getSize?.() ?? config.size) : 0;
    const visualPosition = (value) => trackPositionCss(fractionOf(value, state.min, state.max), inset());
    const getValueFromPosition = (position) => {
        const { handle, container } = component;
        if (!handle || !container)
            return state.min;
        try {
            const containerRect = container.getBoundingClientRect();
            const range = state.max - state.min;
            const edge = inset();
            const axis = axisNow();
            const span = lengthOf(containerRect, axis) - 2 * edge;
            const along = offsetAlong(position, containerRect, axis) - edge;
            const fraction = span > 0 ? Math.max(0, Math.min(1, along / span)) : 0;
            return state.min + fraction * range;
        }
        catch (error) {
            console.warn("Error calculating value from position:", error);
            return state.min;
        }
    };
    const roundToStep = (value) => {
        const step = state.step;
        if (!step || step <= 0)
            return value;
        const steps = Math.round((value - state.min) / step);
        return state.min + steps * step;
    };
    const clamp = (value, min = state.min, max = state.max) => Math.min(Math.max(value, min), max);
    const updateHandlePositions = () => {
        const { handle, container, valueBubble, secondHandle, secondValueBubble } = component;
        if (!handle || !container)
            return;
        const axis = axisNow();
        const place = (element, value, transform) => {
            if (axis.vertical)
                element.style.left = "";
            if (axis.start === "right")
                element.style.left = "auto";
            if (axis.start === "left")
                element.style.right = "";
            element.style[axis.start] = visualPosition(value);
            element.style.transform = transform;
        };
        place(handle, state.value, handleTransform(axis));
        if (valueBubble)
            place(valueBubble, state.value, bubbleTransform(axis));
        if (config.range && secondHandle && state.secondValue !== null) {
            place(secondHandle, state.secondValue, handleTransform(axis));
            if (secondValueBubble)
                place(secondValueBubble, state.secondValue, bubbleTransform(axis));
        }
        updateHandleAria(handle, state.value);
        if (config.range && secondHandle && state.secondValue !== null) {
            updateHandleAria(secondHandle, state.secondValue);
            handle.setAttribute("aria-valuemax", String(state.secondValue));
            secondHandle.setAttribute("aria-valuemin", String(state.value));
        }
    };
    const updateHandleAria = (handleElement, value) => {
        handleElement.setAttribute("aria-valuenow", String(value));
        if (config.valueFormatter &&
            config.valueFormatter !== defaultConfig.valueFormatter) {
            handleElement.setAttribute("aria-valuetext", config.valueFormatter(value));
        }
    };
    const updateValueBubbles = () => {
        const { valueBubble, secondValueBubble } = component;
        if (!valueBubble)
            return;
        const formatter = config.valueFormatter || ((value) => value.toString());
        valueBubble.textContent = formatter(state.value);
        if (config.range && secondValueBubble && state.secondValue !== null) {
            secondValueBubble.textContent = formatter(state.secondValue);
        }
    };
    const showValueBubble = (bubbleElement, show) => {
        if (!bubbleElement || !config.showValue)
            return;
        const bubbleClass = component.getClass("slider__value");
        bubbleElement.classList[show ? "add" : "remove"](`${bubbleClass}--visible`);
    };
    const SETTLE_MS = 450;
    let rendered = null;
    let settleTimer = null;
    const settle = () => {
        const settling = component.getClass("slider--settling");
        const changed = rendered !== null &&
            (rendered.value !== state.value || rendered.secondValue !== state.secondValue);
        rendered = { value: state.value, secondValue: state.secondValue };
        if (state.dragging) {
            if (settleTimer !== null)
                clearTimeout(settleTimer);
            settleTimer = null;
            component.element.classList.remove(settling);
            return;
        }
        if (!changed)
            return;
        component.element.classList.add(settling);
        if (settleTimer !== null)
            clearTimeout(settleTimer);
        settleTimer = setTimeout(() => {
            settleTimer = null;
            component.element.classList.remove(settling);
        }, SETTLE_MS);
    };
    const render = () => {
        try {
            settle();
            updateHandlePositions();
            updateValueBubbles();
            if (component.formFields) {
                setFormValue(component.formFields[0], String(state.value));
                if (state.secondValue !== null) {
                    setFormValue(component.formFields[1], String(state.secondValue));
                }
            }
            if (component.renderTracks) {
                component.renderTracks(state);
            }
        }
        catch (error) {
            console.warn("Error rendering UI:", error);
        }
    };
    const pointerOf = config.orientation === "vertical" ? clientYOf : clientXOf;
    const rangeBounds = (isSecondHandle) => !config.range || state.secondValue === null
        ? [state.min, state.max]
        : isSecondHandle
            ? [state.value, state.max]
            : [state.min, state.secondValue];
    const { container, handle, valueBubble, secondHandle, secondValueBubble } = component;
    const handleFor = (second) => (second ? secondHandle : handle) ?? null;
    const bubbleFor = (second) => (second ? secondValueBubble : valueBubble) ?? null;
    const disabled = () => !!component.disabled?.isDisabled();
    let hasActualDragStarted = false;
    let initialX = 0;
    const DRAG_THRESHOLD = 3;
    let lastFocusedHandle = null;
    const clearBubbleHideTimer = () => {
        if (state.valueHideTimer) {
            clearTimeout(state.valueHideTimer);
            state.valueHideTimer = null;
        }
    };
    const hideAllBubbles = () => {
        clearBubbleHideTimer();
        if (valueBubble)
            showValueBubble(valueBubble, false);
        if (secondValueBubble)
            showValueBubble(secondValueBubble, false);
    };
    const showActiveBubble = (bubble) => {
        hideAllBubbles();
        if (bubble && config.showValue)
            showValueBubble(bubble, true);
    };
    const hideActiveBubble = (bubble, delay = 0) => {
        clearBubbleHideTimer();
        if (!bubble || !config.showValue)
            return;
        if (delay > 0) {
            state.valueHideTimer = setTimeout(() => {
                showValueBubble(bubble, false);
            }, delay);
        }
        else {
            showValueBubble(bubble, false);
        }
    };
    const clearKeyboardFocus = () => {
        if (handle)
            handle.classList.remove(`${component.getClass("slider__handle")}--focused`);
        if (secondHandle)
            secondHandle.classList.remove(`${component.getClass("slider__handle")}--focused`);
        try {
            const focusClass = component.getClass("slider__handle--focused");
            component.element
                .querySelectorAll(`.${focusClass}`)
                .forEach((el) => {
                el.classList.remove(focusClass);
            });
            const active = activeElementOf(component.element);
            if (active &&
                component.element.contains(active) &&
                active.classList.contains(component.getClass("slider__handle"))) {
                active.blur();
            }
        }
        catch (error) {
            console.warn("Error clearing keyboard focus:", error);
        }
    };
    const followPointer = () => {
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
        document.addEventListener("touchmove", handleMouseMove, { passive: false });
        document.addEventListener("touchend", handleMouseUp);
    };
    const stopFollowing = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.removeEventListener("touchmove", handleMouseMove);
        document.removeEventListener("touchend", handleMouseUp);
    };
    const handleHandleMouseDown = (e, isSecondHandle = false) => {
        if (disabled()) {
            return;
        }
        if (e.type === "mousedown") {
            e.preventDefault();
        }
        e.stopPropagation();
        hideAllBubbles();
        clearKeyboardFocus();
        initialX = pointerOf(e);
        state.dragging = false;
        state.pressed = true;
        hasActualDragStarted = false;
        state.activeHandle = isSecondHandle ? "second" : "first";
        state.activeBubble = bubbleFor(isSecondHandle);
        showActiveBubble(state.activeBubble);
        followPointer();
        render();
        emitEvent(SLIDER_EVENTS.START, e);
    };
    const handleTrackMouseDown = (e) => {
        if (disabled() || !container) {
            return;
        }
        if (e.type === "mousedown") {
            e.preventDefault();
        }
        hideAllBubbles();
        clearKeyboardFocus();
        let isSecondHandle = false;
        try {
            const position = pointerOf(e);
            let newValue = getValueFromPosition(position);
            if (config.snapToSteps && state.step > 0)
                newValue = roundToStep(newValue);
            newValue = clamp(newValue, state.min, state.max);
            if (config.range && state.secondValue !== null) {
                const distToFirst = Math.abs(newValue - state.value);
                const distToSecond = Math.abs(newValue - state.secondValue);
                isSecondHandle = distToSecond < distToFirst;
                isSecondHandle
                    ? (state.secondValue = newValue)
                    : (state.value = newValue);
            }
            else {
                state.value = newValue;
            }
            render();
            emitEvent(SLIDER_EVENTS.INPUT, e);
        }
        catch (error) {
            console.warn("Error handling track click:", error);
        }
        state.activeHandle = isSecondHandle ? "second" : "first";
        state.activeBubble = bubbleFor(isSecondHandle);
        initialX = pointerOf(e);
        if (config.centered && !config.range) {
            showActiveBubble(state.activeBubble);
            followPointer();
            state.pressed = false;
            emitEvent(SLIDER_EVENTS.START, e);
        }
        else {
            state.dragging = false;
            state.pressed = false;
            hasActualDragStarted = false;
            showActiveBubble(state.activeBubble);
            followPointer();
            render();
            emitEvent(SLIDER_EVENTS.START, e);
        }
    };
    const handleMouseMove = (e) => {
        if (!state.activeHandle || !container)
            return;
        e.preventDefault();
        try {
            const currentX = pointerOf(e);
            if (!hasActualDragStarted &&
                Math.abs(currentX - initialX) >= DRAG_THRESHOLD) {
                hasActualDragStarted = true;
                state.dragging = true;
                component.element.classList.add(`${component.getClass("slider")}--dragging`);
            }
            let newValue = getValueFromPosition(currentX);
            if (config.snapToSteps && state.step > 0)
                newValue = roundToStep(newValue);
            newValue = clamp(newValue, state.min, state.max);
            const isSecondHandle = state.activeHandle === "second";
            if (config.range && state.secondValue !== null) {
                const [low, high] = rangeBounds(isSecondHandle);
                const clamped = Math.min(high, Math.max(low, newValue));
                if (isSecondHandle)
                    state.secondValue = clamped;
                else
                    state.value = clamped;
            }
            else {
                state.value = newValue;
            }
            render();
            emitEvent(SLIDER_EVENTS.INPUT, e);
        }
        catch (error) {
            console.warn("Error during slider drag:", error);
        }
    };
    const handleMouseUp = (e) => {
        if (!state.activeHandle)
            return;
        e.preventDefault();
        state.dragging = false;
        state.pressed = false;
        hasActualDragStarted = false;
        component.element.classList.remove(`${component.getClass("slider")}--dragging`);
        hideActiveBubble(state.activeBubble, 1000);
        stopFollowing();
        state.activeHandle = null;
        render();
        emitEvent(SLIDER_EVENTS.CHANGE, e);
        emitEvent(SLIDER_EVENTS.END, e);
    };
    const handleKeyDown = (e, isSecondHandle = false) => {
        if (disabled())
            return;
        const step = state.step || 1;
        let newValue = isSecondHandle ? state.secondValue : state.value;
        if (newValue === null)
            return;
        const stepSize = e.shiftKey ? step * 10 : step;
        if (e.key === "Tab")
            return;
        const axis = getAxis(config, isRtl(component.element));
        const sign = arrowSign(axis);
        const intervals = Math.max(1, Math.floor((state.max - state.min) / step));
        const page = Math.min(10, Math.max(1, Math.floor(intervals / 10))) * step;
        const along = axis.vertical ? ["ArrowUp", "ArrowDown"] : ["ArrowRight", "ArrowLeft"];
        let target;
        if (e.key === along[0])
            target = newValue + sign * stepSize;
        else if (e.key === along[1])
            target = newValue - sign * stepSize;
        else if (e.key === "ArrowUp" || e.key === "ArrowRight")
            target = newValue + stepSize;
        else if (e.key === "ArrowDown" || e.key === "ArrowLeft")
            target = newValue - stepSize;
        else if (e.key === "PageUp")
            target = newValue + (axis.vertical ? sign : 1) * page;
        else if (e.key === "PageDown")
            target = newValue - (axis.vertical ? sign : 1) * page;
        else if (e.key === "Home")
            target = state.min;
        else if (e.key === "End")
            target = state.max;
        else
            return;
        e.preventDefault();
        const [low, high] = rangeBounds(isSecondHandle);
        newValue = Math.min(high, Math.max(low, target));
        state.activeBubble = bubbleFor(isSecondHandle);
        showActiveBubble(state.activeBubble);
        if (isSecondHandle) {
            state.secondValue = newValue;
        }
        else {
            state.value = newValue;
        }
        render();
        emitEvent(SLIDER_EVENTS.INPUT, e);
        emitEvent(SLIDER_EVENTS.CHANGE, e);
    };
    const handleFocus = (e, isSecondHandle = false) => {
        if (disabled())
            return;
        const currentHandle = handleFor(isSecondHandle);
        if (lastFocusedHandle && lastFocusedHandle !== currentHandle) {
            hideAllBubbles();
        }
        if (!currentHandle)
            return;
        lastFocusedHandle = currentHandle;
        currentHandle.classList.add(`${component.getClass("slider__handle")}--focused`);
        showActiveBubble(bubbleFor(isSecondHandle));
        state.activeBubble = bubbleFor(isSecondHandle);
        render();
        emitEvent(SLIDER_EVENTS.FOCUS, e);
    };
    const handleBlur = (e, isSecondHandle = false) => {
        const handleElement = handleFor(isSecondHandle);
        if (!handleElement)
            return;
        handleElement.classList.remove(`${component.getClass("slider__handle")}--focused`);
        render();
        const relatedTarget = e.relatedTarget;
        const otherHandle = handleFor(!isSecondHandle);
        if (!relatedTarget || relatedTarget !== otherHandle) {
            hideActiveBubble(bubbleFor(isSecondHandle), 200);
        }
        emitEvent(SLIDER_EVENTS.BLUR, e);
    };
    const listenersFor = (isSecondHandle) => ({
        press: (e) => handleHandleMouseDown(e, isSecondHandle),
        keydown: (e) => handleKeyDown(e, isSecondHandle),
        focus: (e) => handleFocus(e, isSecondHandle),
        blur: (e) => handleBlur(e, isSecondHandle),
    });
    const handleListeners = listenersFor(false);
    const secondHandleListeners = listenersFor(true);
    const attach = (element, listeners) => {
        element.addEventListener("mousedown", listeners.press);
        element.addEventListener("touchstart", listeners.press, { passive: true });
        element.addEventListener("keydown", listeners.keydown);
        element.addEventListener("focus", listeners.focus);
        element.addEventListener("blur", listeners.blur);
    };
    const detach = (element, listeners) => {
        element.removeEventListener("mousedown", listeners.press);
        element.removeEventListener("touchstart", listeners.press);
        element.removeEventListener("keydown", listeners.keydown);
        element.removeEventListener("focus", listeners.focus);
        element.removeEventListener("blur", listeners.blur);
    };
    const setupEventListeners = () => {
        if (!handle || !container) {
            console.warn("Cannot set up event listeners: missing container or handle");
            return;
        }
        container.addEventListener("mousedown", handleTrackMouseDown);
        container.addEventListener("touchstart", handleTrackMouseDown, {
            passive: true,
        });
        attach(handle, handleListeners);
        if (config.range && secondHandle)
            attach(secondHandle, secondHandleListeners);
    };
    const cleanupEventListeners = () => {
        if (container) {
            container.removeEventListener("mousedown", handleTrackMouseDown);
            container.removeEventListener("touchstart", handleTrackMouseDown);
        }
        if (handle)
            detach(handle, handleListeners);
        if (config.range && secondHandle)
            detach(secondHandle, secondHandleListeners);
        stopFollowing();
    };
    const initController = () => {
        try {
            if (!handle) {
                console.warn("Cannot initialize slider controller: missing required handle component");
                return;
            }
            handle.setAttribute("aria-valuemin", String(state.min));
            handle.setAttribute("aria-valuemax", String(state.max));
            handle.setAttribute("aria-valuenow", String(state.value));
            if (config.range && secondHandle && state.secondValue !== null) {
                secondHandle.setAttribute("aria-valuemin", String(state.min));
                secondHandle.setAttribute("aria-valuemax", String(state.max));
                secondHandle.setAttribute("aria-valuenow", String(state.secondValue));
            }
            setupEventListeners();
            render();
        }
        catch (error) {
            console.error("Error initializing slider controller:", error);
        }
    };
    initController();
    const layout = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => updateHandlePositions()) : null;
    layout?.observe(component.element);
    if (component.lifecycle) {
        const originalDestroy = component.lifecycle.destroy || (() => { });
        component.lifecycle.destroy = () => {
            layout?.disconnect();
            if (settleTimer !== null)
                clearTimeout(settleTimer);
            if (state.valueHideTimer !== null)
                clearTimeout(state.valueHideTimer);
            cleanupEventListeners();
            originalDestroy.call(component.lifecycle);
        };
    }
    const api = {
        element: component.element,
        setValue(value, triggerEvent = false) {
            const ceiling = config.range && state.secondValue !== null ? state.secondValue : state.max;
            const newValue = clamp(roundToStep(clamp(value, state.min, state.max)), state.min, ceiling);
            state.value = newValue;
            render();
            if (triggerEvent) {
                emitEvent(SLIDER_EVENTS.CHANGE);
            }
            return this;
        },
        getValue() {
            return state.value;
        },
        setSecondValue(value, triggerEvent = false) {
            if (!config.range)
                return this;
            const newValue = clamp(roundToStep(clamp(value, state.min, state.max)), state.value, state.max);
            state.secondValue = newValue;
            render();
            if (triggerEvent) {
                emitEvent(SLIDER_EVENTS.CHANGE);
            }
            return this;
        },
        getSecondValue() {
            return config.range ? state.secondValue : null;
        },
        setMin(min) {
            state.min = min;
            if (handle) {
                handle.setAttribute("aria-valuemin", String(min));
            }
            if (config.range && secondHandle) {
                secondHandle.setAttribute("aria-valuemin", String(min));
            }
            if (state.value < min)
                state.value = min;
            if (config.range &&
                state.secondValue !== null &&
                state.secondValue < min) {
                state.secondValue = min;
            }
            render();
            return this;
        },
        getMin() {
            return state.min;
        },
        setMax(max) {
            state.max = max;
            if (handle) {
                handle.setAttribute("aria-valuemax", String(max));
            }
            if (config.range && secondHandle) {
                secondHandle.setAttribute("aria-valuemax", String(max));
            }
            if (state.value > max)
                state.value = max;
            if (config.range &&
                state.secondValue !== null &&
                state.secondValue > max) {
                state.secondValue = max;
            }
            render();
            return this;
        },
        getMax() {
            return state.max;
        },
        setStep(step) {
            state.step = step;
            render();
            component.element.classList[step > 0 ? "add" : "remove"](`${component.getClass("slider")}--discrete`);
            return this;
        },
        getStep() {
            return state.step;
        },
        enable() {
            component.disabled?.enable();
            return this;
        },
        disable() {
            component.disabled?.disable();
            return this;
        },
        isDisabled() {
            return component.disabled?.isDisabled() ?? false;
        },
        setColor(color) {
            component.appearance.setColor(color);
            return this;
        },
        getColor() {
            return component.appearance.getColor();
        },
        setSize(size) {
            component.setSize?.(size);
            return this;
        },
        getSize() {
            return component.getSize?.() ?? "XS";
        },
        showTicks(show) {
            component.appearance.showTicks(show);
            return this;
        },
        showCurrentValue(show) {
            component.appearance.showCurrentValue(show);
            return this;
        },
        setLabel(text) {
            component.label?.setText(text);
            return this;
        },
        getLabel() {
            return component.label?.getText() ?? "";
        },
        setInsetIcon(icon, atMin) {
            component.setInsetIcon?.(icon, atMin);
            return this;
        },
        setIcon(iconHtml) {
            component.icon?.setIcon(iconHtml);
            return this;
        },
        getIcon() {
            return component.icon?.getIcon() ?? "";
        },
        on(event, handler) {
            component.on?.(event, handler);
            return this;
        },
        off(event, handler) {
            component.off?.(event, handler);
            return this;
        },
        destroy() {
            component.lifecycle?.destroy?.();
        },
    };
    const slider = {
        setValue: api.setValue,
        getValue: api.getValue,
        setSecondValue: api.setSecondValue,
        getSecondValue: api.getSecondValue,
        setMin: api.setMin,
        getMin: api.getMin,
        setMax: api.setMax,
        getMax: api.getMax,
        setStep: api.setStep,
        getStep: api.getStep,
        regenerateTicks() {
            render();
            return this;
        },
        updateUi() {
            render();
            return this;
        },
    };
    return {
        ...component,
        ...api,
        slider,
    };
};
