import { CAROUSEL_DEFAULTS, CAROUSEL_EVENTS, CAROUSEL_VARIANTS } from "../constants.js";
import { resolveLayoutDefaults } from "../config.js";
import { cornerToken } from "../../../core/theme/shape.js";
import { multiBrowseKeylines, heroKeylines, cappedKeylines, fullScreenKeylines, } from "../keylines.js";
import { createStrategy, keylinesForScrollOffset, snapPositionOffset, maxScrollOffset, placeItem, } from "../strategy.js";
const FLING_VELOCITY = 0.4;
const DRAG_THRESHOLD = 4;
const WHEEL_QUIET = 120;
const WHEEL_SNAP_REACH = 1;
export const withScroll = (config) => (component) => {
    const { variant, gap, padding, snap } = resolveLayoutDefaults(config);
    const vertical = variant === CAROUSEL_VARIANTS.FULL_SCREEN;
    const rules = {
        minSmallSize: config.minSmallItemWidth ?? CAROUSEL_DEFAULTS.MIN_SMALL_ITEM_WIDTH,
        maxSmallSize: config.maxSmallItemWidth ?? CAROUSEL_DEFAULTS.MAX_SMALL_ITEM_WIDTH,
        anchorSize: CAROUSEL_DEFAULTS.ANCHOR_SIZE,
        mediumLargeThreshold: CAROUSEL_DEFAULTS.MEDIUM_LARGE_THRESHOLD,
    };
    const cornerRadius = config.cornerRadius ?? CAROUSEL_DEFAULTS.CORNER_RADIUS;
    const corner = cornerRadius === CAROUSEL_DEFAULTS.CORNER_RADIUS
        ? cornerToken("extra-large", cornerRadius, config.prefix)
        : `${cornerRadius}px`;
    const reduceMotion = typeof window !== "undefined" && typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;
    const { element, scroller, track, slideElements } = component;
    const prefix = component.getClass("carousel");
    const snapClass = `${prefix}__snap`;
    element.classList.toggle(`${prefix}--snap`, snap);
    const readRtl = () => !vertical && window.getComputedStyle?.(scroller).direction === "rtl";
    let rtl = readRtl();
    let sign = rtl ? -1 : 1;
    let lastWheel = -Infinity;
    let strategy = null;
    let count = 0;
    let containerSize = 0;
    let scrollOffsetAtStart = 0;
    let snapPositions = [];
    let currentIndex = Math.max(0, config.initialSlide ?? CAROUSEL_DEFAULTS.INITIAL_SLIDE);
    let lastStyles = new WeakMap();
    let pending = null;
    let pendingTimer = 0;
    const clearPending = () => {
        pending = null;
        window.clearTimeout(pendingTimer);
    };
    const expect = (index) => {
        pending = index;
        window.clearTimeout(pendingTimer);
        pendingTimer = window.setTimeout(clearPending, 1000);
    };
    const scrollPosition = () => {
        if (readRtl() !== rtl)
            rebuild();
        return vertical ? scroller.scrollTop : scroller.scrollLeft * sign;
    };
    const setScrollPosition = (value, smooth) => {
        const behavior = smooth && !reduceMotion?.matches ? "smooth" : "auto";
        const physical = value * sign;
        if (typeof scroller.scrollTo === "function")
            scroller.scrollTo(vertical ? { top: value, behavior } : { left: physical, behavior });
        else if (vertical)
            scroller.scrollTop = value;
        else
            scroller.scrollLeft = physical;
    };
    const emitChange = () => {
        component.emit?.(CAROUSEL_EVENTS.CHANGE, { value: currentIndex });
    };
    const nearestIndex = (position) => {
        let best = 0;
        let bestDistance = Number.MAX_VALUE;
        snapPositions.forEach((snapPosition, i) => {
            const distance = Math.abs(position - snapPosition);
            if (distance < bestDistance) {
                bestDistance = distance;
                best = i;
            }
        });
        return best;
    };
    const buildKeylines = (size) => {
        const preferred = config.itemWidth ?? CAROUSEL_DEFAULTS.ITEM_WIDTH;
        if (variant === CAROUSEL_VARIANTS.FULL_SCREEN)
            return fullScreenKeylines(size, gap, rules);
        if (reduceMotion?.matches === true) {
            const itemSize = variant.startsWith("hero") ? Math.min(config.itemWidth ?? size, size) : preferred;
            return cappedKeylines(size, itemSize, gap, rules);
        }
        return variant.startsWith("hero")
            ? heroKeylines(size, config.itemWidth ?? null, gap, count, variant === CAROUSEL_VARIANTS.HERO_CENTER, rules)
            : multiBrowseKeylines(size, preferred, gap, count, rules);
    };
    const build = () => {
        rtl = readRtl();
        sign = rtl ? -1 : 1;
        lastStyles = new WeakMap();
        count = slideElements.length;
        containerSize = vertical ? scroller.clientHeight : scroller.clientWidth;
        currentIndex = count ? Math.min(currentIndex, count - 1) : 0;
        if (containerSize <= 0 || count === 0) {
            strategy = null;
            return;
        }
        const isUncontained = variant === CAROUSEL_VARIANTS.UNCONTAINED;
        strategy = isUncontained
            ? { itemSize: config.itemWidth ?? CAROUSEL_DEFAULTS.ITEM_WIDTH, gap, valid: true }
            : createStrategy(buildKeylines(containerSize), containerSize, gap, padding, padding);
        if (!strategy.valid) {
            strategy = null;
            return;
        }
        const unit = strategy.itemSize + strategy.gap;
        scrollOffsetAtStart = isUncontained ? 0 : -snapPositionOffset(strategy, 0, count);
        snapPositions = slideElements.map((_, i) => isUncontained ? i * unit : i * unit - snapPositionOffset(strategy, i, count) - scrollOffsetAtStart);
        const scrollRange = Math.max(0, snapPositions[count - 1] ?? 0);
        track.style[vertical ? "height" : "width"] = `${containerSize + scrollRange}px`;
        track.style[vertical ? "width" : "height"] = "";
        track.querySelectorAll(`.${snapClass}`).forEach((el) => el.remove());
        const fragment = document.createDocumentFragment();
        snapPositions.forEach((snapPosition) => {
            const point = document.createElement("div");
            point.className = snapClass;
            point.style[vertical ? "top" : rtl ? "right" : "left"] = `${snapPosition}px`;
            if (rtl)
                point.style.left = "auto";
            fragment.appendChild(point);
        });
        track.appendChild(fragment);
        slideElements.forEach((el) => {
            el.style[vertical ? "height" : "width"] = `${strategy.itemSize}px`;
            el.style[vertical ? "width" : "height"] = "";
            el.style.left = rtl ? "auto" : "";
            el.style.right = rtl ? "0" : "";
        });
        element.style.setProperty(`--${config.prefix}-carousel-corner`, corner);
    };
    const layout = () => {
        if (!strategy)
            return;
        const position = scrollPosition();
        const isUncontained = variant === CAROUSEL_VARIANTS.UNCONTAINED;
        const itemSize = strategy.itemSize;
        const unit = itemSize + strategy.gap;
        const scrollOffset = position + scrollOffsetAtStart;
        const keylines = isUncontained ? null : keylinesForScrollOffset(strategy, scrollOffset, maxScrollOffset(strategy, count));
        const fadeRange = strategy.maxItemSize - strategy.minItemSize;
        for (let i = 0; i < count; i++) {
            const el = slideElements[i];
            let start = padding + i * unit;
            let inset = 0;
            let fade = 1;
            let offscreen = false;
            if (!isUncontained) {
                const placement = placeItem(strategy, keylines, i, scrollOffset);
                const visible = Math.max(0, Math.min(itemSize, placement.size));
                start = placement.center - itemSize / 2 + position;
                offscreen = placement.center + visible / 2 < -itemSize || placement.center - visible / 2 > containerSize + itemSize;
                inset = Math.max(0, (itemSize - visible) / 2);
                if (fadeRange > 0)
                    fade = Math.min(1, Math.max(0, (visible - strategy.minItemSize) / fadeRange));
            }
            const style = offscreen
                ? "hidden"
                : `${Math.round(start * 100) / 100}|${Math.round(inset * 100) / 100}|${fade.toFixed(3)}`;
            if (lastStyles.get(el) === style)
                continue;
            lastStyles.set(el, style);
            if (offscreen) {
                el.style.visibility = "hidden";
                continue;
            }
            el.style.visibility = "";
            el.style.transform = vertical ? `translate3d(0, ${start}px, 0)` : `translate3d(${start * sign}px, 0, 0)`;
            el.style.clipPath = inset > 0 ? (vertical ? `inset(${inset}px 0 round ${corner})` : `inset(0 ${inset}px round ${corner})`) : "";
            el.style.setProperty(`--${config.prefix}-carousel-inset`, vertical ? `${inset}px 0` : `0 ${inset}px`);
            el.style.setProperty(`--${config.prefix}-carousel-fade`, fade.toFixed(3));
        }
        if (pending !== null) {
            if (Math.abs(scrollPosition() - (snapPositions[pending] ?? 0)) < 1)
                clearPending();
            return;
        }
        const index = nearestIndex(scrollPosition());
        if (index !== currentIndex) {
            currentIndex = index;
            emitChange();
        }
    };
    const rebuild = () => {
        stopWheel();
        build();
        if (strategy) {
            expect(currentIndex);
            setScrollPosition(snapPositions[currentIndex] ?? 0, false);
        }
        layout();
    };
    const goTo = (index) => {
        stopWheel();
        if (!count)
            return;
        scrollPosition();
        const target = Math.min(Math.max(index, 0), count - 1);
        if (strategy) {
            expect(target);
            setScrollPosition(snapPositions[target] ?? 0, true);
        }
        if (target !== currentIndex) {
            currentIndex = target;
            emitChange();
        }
    };
    const next = () => goTo(currentIndex + 1);
    const prev = () => goTo(currentIndex - 1);
    const indexOf = (target) => {
        const item = target?.closest?.(`.${prefix}__item`);
        return item ? slideElements.indexOf(item) : -1;
    };
    const handleKeyDown = (e) => {
        stopWheel();
        const from = indexOf(e.target);
        if (from < 0)
            return;
        const forward = vertical ? "ArrowDown" : rtl ? "ArrowLeft" : "ArrowRight";
        const backward = vertical ? "ArrowUp" : rtl ? "ArrowRight" : "ArrowLeft";
        let target = -1;
        if (e.key === forward)
            target = from + 1;
        else if (e.key === backward)
            target = from - 1;
        else if (e.key === "Home")
            target = 0;
        else if (e.key === "End")
            target = count - 1;
        if (target < 0 || target >= count)
            return;
        e.preventDefault();
        slideElements[target].focus({ preventScroll: true });
        goTo(target);
    };
    const handleFocusIn = (e) => {
        const index = indexOf(e.target);
        if (index >= 0 && index !== currentIndex)
            goTo(index);
    };
    let dragging = false;
    let dragged = false;
    let dragStart = 0;
    let dragScrollStart = 0;
    let dragLast = 0;
    let dragLastTime = 0;
    let dragVelocity = 0;
    let settleTimer = 0;
    const restoreSnap = () => {
        window.clearTimeout(settleTimer);
        scroller.removeEventListener("scrollend", restoreSnap);
        delete element.dataset.settling;
    };
    const handlePointerDown = (e) => {
        stopWheel();
        clearPending();
        if (e.pointerType !== "mouse" || e.button !== 0 || !strategy)
            return;
        dragging = true;
        lastWheel = -Infinity;
        dragged = false;
        dragStart = vertical ? e.clientY : e.clientX;
        dragLast = dragStart;
        dragLastTime = e.timeStamp;
        dragVelocity = 0;
        dragScrollStart = scroller[vertical ? "scrollTop" : "scrollLeft"];
        restoreSnap();
        element.dataset.settling = "true";
        scroller.setPointerCapture(e.pointerId);
    };
    const handlePointerMove = (e) => {
        if (!dragging)
            return;
        const position = vertical ? e.clientY : e.clientX;
        const delta = position - dragStart;
        if (!dragged && Math.abs(delta) < DRAG_THRESHOLD)
            return;
        dragged = true;
        element.dataset.dragging = "true";
        const dt = e.timeStamp - dragLastTime;
        if (dt > 0)
            dragVelocity = ((position - dragLast) / dt) * sign;
        dragLast = position;
        dragLastTime = e.timeStamp;
        scroller[vertical ? "scrollTop" : "scrollLeft"] = dragScrollStart - delta;
        e.preventDefault();
    };
    const handlePointerUp = (e) => {
        if (!dragging)
            return;
        dragging = false;
        if (scroller.hasPointerCapture(e.pointerId))
            scroller.releasePointerCapture(e.pointerId);
        delete element.dataset.dragging;
        if (!dragged) {
            restoreSnap();
            return;
        }
        if (snap) {
            let target = nearestIndex(scrollPosition());
            if (dragVelocity < -FLING_VELOCITY)
                target = Math.min(count - 1, target + 1);
            else if (dragVelocity > FLING_VELOCITY)
                target = Math.max(0, target - 1);
            goTo(target);
            scroller.addEventListener("scrollend", restoreSnap, { once: true });
            settleTimer = window.setTimeout(restoreSnap, 600);
        }
        else {
            restoreSnap();
        }
    };
    const handleClick = (e) => {
        if (dragged) {
            dragged = false;
            e.preventDefault();
            e.stopPropagation();
        }
    };
    let wheelDirection = 0;
    let wheelStart = 0;
    let wheelDelta = 0;
    let wheelTarget = 0;
    let wheelFrame = 0;
    let wheelPosition = 0;
    let wheelVelocity = 0;
    let wheelTime = 0;
    let wheelSnap = null;
    let wheelSnapPriority = "";
    const stopWheel = (resetGesture = true) => {
        if (wheelFrame)
            window.cancelAnimationFrame(wheelFrame);
        wheelFrame = 0;
        wheelVelocity = 0;
        if (resetGesture)
            lastWheel = -Infinity;
        if (wheelSnap !== null) {
            scroller.style.setProperty("scroll-snap-type", wheelSnap, wheelSnapPriority);
            wheelSnap = null;
            clearPending();
        }
    };
    const glide = (now) => {
        const dt = (now - wheelTime) / 1000;
        wheelTime = now;
        const offset = wheelPosition - wheelTarget;
        const decay = Math.exp(-12 * dt);
        const carry = wheelVelocity + 12 * offset;
        wheelPosition = wheelTarget + (offset + carry * dt) * decay;
        wheelVelocity = (wheelVelocity - 12 * carry * dt) * decay;
        const resting = wheelDirection * (wheelPosition - wheelTarget) >= 0 ||
            (Math.abs(wheelPosition - wheelTarget) < 0.5 && Math.abs(wheelVelocity) < 5);
        scroller.scrollLeft = (resting ? wheelTarget : wheelPosition) * sign;
        if (resting)
            stopWheel(false);
        else
            wheelFrame = window.requestAnimationFrame(glide);
    };
    const handleTouchStart = () => {
        stopWheel();
        clearPending();
    };
    const handleWheel = (e) => {
        if (e.ctrlKey || dragging || Math.abs(e.deltaX) >= Math.abs(e.deltaY) || !strategy)
            return;
        const position = scrollPosition();
        const end = snapPositions[count - 1] ?? 0;
        const direction = Math.sign(e.deltaY);
        if (direction < 0 ? position <= 1 : position >= end - 1)
            return;
        e.preventDefault();
        if (direction !== wheelDirection)
            stopWheel();
        const fresh = e.timeStamp - lastWheel >= WHEEL_QUIET || direction !== wheelDirection;
        if (fresh) {
            wheelStart = position;
            wheelDelta = 0;
            wheelTarget = position;
        }
        lastWheel = e.timeStamp;
        wheelDirection = direction;
        const unit = e.deltaMode === 1
            ? parseFloat(window.getComputedStyle(scroller).lineHeight) || 16
            : e.deltaMode === 2 ? containerSize : 1;
        wheelDelta += e.deltaY * unit;
        const destination = Math.max(0, Math.min(end, wheelStart + wheelDelta));
        let index = direction > 0 ? count - 1 : 0;
        const reach = fresh ? WHEEL_SNAP_REACH : 0;
        for (let i = direction > 0 ? 0 : count - 1; i >= 0 && i < count; i += direction) {
            if (direction * (snapPositions[i] - destination) >= -reach &&
                direction * (snapPositions[i] - wheelStart) > 0) {
                index = i;
                break;
            }
        }
        const target = snapPositions[index];
        if (direction * (target - wheelTarget) > 0) {
            wheelTarget = target;
            expect(index);
            if (reduceMotion?.matches) {
                setScrollPosition(target, false);
            }
            else if (!wheelFrame) {
                wheelSnap = scroller.style.getPropertyValue("scroll-snap-type");
                wheelSnapPriority = scroller.style.getPropertyPriority("scroll-snap-type");
                scroller.style.setProperty("scroll-snap-type", "none");
                scroller.scrollLeft = position * sign;
                wheelPosition = position;
                wheelTime = performance.now();
                wheelFrame = window.requestAnimationFrame(glide);
            }
            if (index !== currentIndex) {
                currentIndex = index;
                emitChange();
            }
        }
        else {
            expect(currentIndex);
        }
    };
    const setWheel = (on) => {
        scroller.removeEventListener("wheel", handleWheel);
        stopWheel();
        if (on && !vertical)
            scroller.addEventListener("wheel", handleWheel, { passive: false });
    };
    scroller.addEventListener("scroll", layout, { passive: true });
    scroller.addEventListener("wheel", clearPending, { passive: true });
    setWheel(!!config.wheel);
    scroller.addEventListener("touchstart", handleTouchStart, { passive: true });
    scroller.addEventListener("keydown", handleKeyDown);
    scroller.addEventListener("focusin", handleFocusIn);
    scroller.addEventListener("pointerdown", handlePointerDown);
    scroller.addEventListener("pointermove", handlePointerMove);
    scroller.addEventListener("pointerup", handlePointerUp);
    scroller.addEventListener("pointercancel", handlePointerUp);
    scroller.addEventListener("click", handleClick, true);
    reduceMotion?.addEventListener?.("change", rebuild);
    const resizeObserver = typeof ResizeObserver === "function" ? new ResizeObserver(rebuild) : null;
    resizeObserver?.observe(scroller);
    const directionObserver = typeof MutationObserver === "function" ? new MutationObserver(rebuild) : null;
    directionObserver?.observe(document.documentElement, { attributeFilter: ["dir"], subtree: true });
    component.onSlidesChanged(rebuild);
    rebuild();
    const destroy = component.lifecycle?.destroy;
    const enhanced = component;
    enhanced.getCurrentSlide = () => currentIndex;
    enhanced.getVariant = () => variant;
    enhanced.next = next;
    enhanced.prev = prev;
    enhanced.goTo = goTo;
    enhanced.setWheel = setWheel;
    enhanced.lifecycle = {
        destroy: () => {
            setWheel(false);
            restoreSnap();
            resizeObserver?.disconnect();
            directionObserver?.disconnect();
            reduceMotion?.removeEventListener?.("change", rebuild);
            clearPending();
            scroller.removeEventListener("scroll", layout);
            scroller.removeEventListener("wheel", clearPending);
            scroller.removeEventListener("touchstart", handleTouchStart);
            scroller.removeEventListener("keydown", handleKeyDown);
            scroller.removeEventListener("focusin", handleFocusIn);
            scroller.removeEventListener("pointerdown", handlePointerDown);
            scroller.removeEventListener("pointermove", handlePointerMove);
            scroller.removeEventListener("pointerup", handlePointerUp);
            scroller.removeEventListener("pointercancel", handlePointerUp);
            scroller.removeEventListener("click", handleClick, true);
            destroy?.();
        },
    };
    return enhanced;
};
