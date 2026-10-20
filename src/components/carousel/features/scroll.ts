// src/components/carousel/features/scroll.ts
//
// Native scrolling for the carousel. The scroller is a real overflow
// container (touch, trackpad, wheel and assistive technologies work as
// they do anywhere), a track sized to the scroll range holds one snap
// point per item, and on every scroll event the items are placed from the
// keyline strategy: translated to their centre and clipped to their
// visible size, as the Compose carousel masks its items.

import { CarouselConfig, CarouselVariant } from "../types";
import { CAROUSEL_DEFAULTS, CAROUSEL_EVENTS, CAROUSEL_VARIANTS } from "../constants";
import { resolveLayoutDefaults } from "../config";
import { cornerToken } from "../../../core/theme/shape";
import {
  KeylineRules,
  multiBrowseKeylines,
  heroKeylines,
  cappedKeylines,
  fullScreenKeylines,
} from "../keylines";
import {
  Strategy,
  createStrategy,
  keylinesForScrollOffset,
  snapPositionOffset,
  maxScrollOffset,
  placeItem,
} from "../strategy";
import type { SlidesComponent } from "./slides";

/** A mouse drag faster than this (px per ms) advances one item in its direction */
const FLING_VELOCITY = 0.4;
/** Pointer travel below this is a click, not a drag */
const DRAG_THRESHOLD = 4;
/** 120 ms of quiet separates gestures while retaining a continuous momentum tail. */
const WHEEL_QUIET = 120;

interface ScrollComponent {
  getCurrentSlide: () => number;
  getVariant: () => CarouselVariant;
  next: () => void;
  prev: () => void;
  goTo: (index: number) => void;
  setWheel: (on: boolean) => void;
  lifecycle: { destroy: () => void };
}

export const withScroll = (config: CarouselConfig) =>
  <C extends SlidesComponent & { emit?: (event: string, data?: unknown) => unknown; lifecycle?: { destroy: () => void } }>(
    component: C,
  ): C & ScrollComponent => {
    const { variant, gap, padding, snap } = resolveLayoutDefaults(config);
    const vertical = variant === CAROUSEL_VARIANTS.FULL_SCREEN;
    const rules: KeylineRules = {
      minSmallSize: config.minSmallItemWidth ?? CAROUSEL_DEFAULTS.MIN_SMALL_ITEM_WIDTH,
      maxSmallSize: config.maxSmallItemWidth ?? CAROUSEL_DEFAULTS.MAX_SMALL_ITEM_WIDTH,
      anchorSize: CAROUSEL_DEFAULTS.ANCHOR_SIZE,
      mediumLargeThreshold: CAROUSEL_DEFAULTS.MEDIUM_LARGE_THRESHOLD,
    };
    const cornerRadius = config.cornerRadius ?? CAROUSEL_DEFAULTS.CORNER_RADIUS;
    // The default corner reads the extra-large token, so a theme's corners
    // reach the items; a radius given in the config stays as given.
    const corner = cornerRadius === CAROUSEL_DEFAULTS.CORNER_RADIUS
      ? cornerToken("extra-large", cornerRadius, config.prefix)
      : `${cornerRadius}px`;
    const reduceMotion =
      typeof window !== "undefined" && typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;

    const { element, scroller, track, slideElements } = component;
    const prefix = component.getClass("carousel");
    const snapClass = `${prefix}__snap`;
    element.classList.toggle(`${prefix}--snap`, snap);

    // Direction: the scroll range is 0..scrollRange in logical terms, and the
    // browser's scrollLeft is that in LTR but 0..-scrollRange in RTL
    // (Chromium's negative RTL range), so every read and write of scrollLeft
    // passes through the normalized pair below. Placement mirrors too: the
    // snap points and items anchor to the track's right edge and the
    // translate negates. Vertical (full-screen) scrolls top to bottom in
    // either direction, so none of this applies there. The computed direction
    // inherits into a shadow tree, which is where an element's factory lives;
    // read it at build, and again in scrollPosition() and goTo(), where a
    // changed direction rebuilds. A flip at rest fires no scroll event (the
    // read would never run), so a dir observer below rebuilds it as well, and
    // build() clears the style cache whose key omits direction. The drag needs
    // none of this: it follows the pointer in physical space and the mirrored
    // gesture meets the mirrored range, so the one formula serves both
    // directions. The style read is optional-chained: server construction runs
    // this with a window that has no such method, and no direction to read
    // means left-to-right.
    const readRtl = (): boolean =>
      !vertical && window.getComputedStyle?.(scroller).direction === "rtl";
    let rtl = readRtl();
    // 1 in ltr, -1 in rtl: the physical scrollLeft of a logical offset is
    // offset * sign, and so is the velocity that advances by dragging. Set
    // by build(), which runs before anything reads it.
    let sign = rtl ? -1 : 1;

    let lastWheel = -Infinity;
    let strategy: Strategy | null = null;
    let count = 0;
    let containerSize = 0;
    let scrollOffsetAtStart = 0;
    let snapPositions: number[] = [];
    let currentIndex = Math.max(0, config.initialSlide ?? CAROUSEL_DEFAULTS.INITIAL_SLIDE);
    let lastStyles = new WeakMap<HTMLElement, string>();

    // A programmatic scroll reports its target, not every item it passes
    let pending: number | null = null;
    let pendingTimer = 0;
    const clearPending = (): void => {
      pending = null;
      window.clearTimeout(pendingTimer);
    };
    const expect = (index: number): void => {
      pending = index;
      window.clearTimeout(pendingTimer);
      pendingTimer = window.setTimeout(clearPending, 1000);
    };

    const scrollPosition = (): number => {
      // A dir flip re-anchors the scroller, and a stale rtl here would clamp a
      // goTo() to no motion at all (no scroll event, nothing would self-heal),
      // so the read itself checks: a changed direction rebuilds the physical
      // anchors before the value returns (readRtl is false when vertical).
      if (readRtl() !== rtl) rebuild();
      return vertical ? scroller.scrollTop : scroller.scrollLeft * sign;
    };
    const setScrollPosition = (value: number, smooth: boolean): void => {
      const behavior = smooth && !reduceMotion?.matches ? "smooth" : "auto";
      const physical = value * sign;
      if (typeof scroller.scrollTo === "function")
        scroller.scrollTo(vertical ? { top: value, behavior } : { left: physical, behavior });
      else if (vertical) scroller.scrollTop = value;
      else scroller.scrollLeft = physical;
    };

    const emitChange = (): void => {
      component.emit?.(CAROUSEL_EVENTS.CHANGE, { value: currentIndex });
    };

    const nearestIndex = (position: number): number => {
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

    // ── Strategy ────────────────────────────────────────────────

    const buildKeylines = (size: number) => {
      const preferred = config.itemWidth ?? CAROUSEL_DEFAULTS.ITEM_WIDTH;
      if (variant === CAROUSEL_VARIANTS.FULL_SCREEN) return fullScreenKeylines(size, gap, rules);
      if (reduceMotion?.matches === true) {
        const itemSize = variant.startsWith("hero") ? Math.min(config.itemWidth ?? size, size) : preferred;
        return cappedKeylines(size, itemSize, gap, rules);
      }
      return variant.startsWith("hero")
        ? heroKeylines(size, config.itemWidth ?? null, gap, count, variant === CAROUSEL_VARIANTS.HERO_CENTER, rules)
        : multiBrowseKeylines(size, preferred, gap, count, rules);
    };

    const build = (): void => {
      rtl = readRtl();
      sign = rtl ? -1 : 1;
      // The style cache key omits direction: a flip that keeps the logical
      // placement would otherwise skip the very transform whose sign changed.
      // (A WeakMap cannot be cleared, so build swaps in a fresh one.)
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
        ? ({ itemSize: config.itemWidth ?? CAROUSEL_DEFAULTS.ITEM_WIDTH, gap, valid: true } as Strategy)
        : createStrategy(buildKeylines(containerSize), containerSize, gap, padding, padding);
      if (!strategy.valid) {
        strategy = null;
        return;
      }

      const unit = strategy.itemSize + strategy.gap;
      scrollOffsetAtStart = isUncontained ? 0 : -snapPositionOffset(strategy, 0, count);
      snapPositions = slideElements.map((_, i) =>
        isUncontained ? i * unit : i * unit - snapPositionOffset(strategy!, i, count) - scrollOffsetAtStart,
      );
      const scrollRange = Math.max(0, snapPositions[count - 1] ?? 0);

      // Track length and one snap point per item
      track.style[vertical ? "height" : "width"] = `${containerSize + scrollRange}px`;
      track.style[vertical ? "width" : "height"] = "";
      track.querySelectorAll(`.${snapClass}`).forEach((el) => el.remove());
      const fragment = document.createDocumentFragment();
      snapPositions.forEach((snapPosition) => {
        const point = document.createElement("div");
        point.className = snapClass;
        // Snap points sit at their logical offset from the inline-start edge:
        // the track's left in LTR, its right in RTL, where scroll-snap-align:
        // start aligns the point's right edge and scrollLeft settles at the
        // negated offset. The stylesheet's left: 0 must not win over right.
        point.style[vertical ? "top" : rtl ? "right" : "left"] = `${snapPosition}px`;
        if (rtl) point.style.left = "auto";
        fragment.appendChild(point);
      });
      track.appendChild(fragment);

      slideElements.forEach((el) => {
        el.style[vertical ? "height" : "width"] = `${strategy!.itemSize}px`;
        el.style[vertical ? "width" : "height"] = "";
        // Items anchor to the track's inline-start edge, so the negated
        // translate in layout() places them mirrored (the stylesheet's left: 0
        // would otherwise win over right: 0).
        el.style.left = rtl ? "auto" : "";
        el.style.right = rtl ? "0" : "";
      });
      element.style.setProperty(`--${config.prefix}-carousel-corner`, corner);
    };

    // ── Placement ───────────────────────────────────────────────

    const layout = (): void => {
      if (!strategy) return;
      const position = scrollPosition();
      const isUncontained = variant === CAROUSEL_VARIANTS.UNCONTAINED;
      const itemSize = strategy.itemSize;
      const unit = itemSize + strategy.gap;
      const scrollOffset = position + scrollOffsetAtStart;
      const keylines = isUncontained ? null : keylinesForScrollOffset(strategy, scrollOffset, maxScrollOffset(strategy, count));
      const fadeRange = strategy.maxItemSize - strategy.minItemSize;

      for (let i = 0; i < count; i++) {
        const el = slideElements[i]!;
        let start = padding + i * unit;
        let inset = 0;
        let fade = 1;
        let offscreen = false;
        if (!isUncontained) {
          const placement = placeItem(strategy, keylines!, i, scrollOffset);
          const visible = Math.max(0, Math.min(itemSize, placement.size));
          start = placement.center - itemSize / 2 + position;
          offscreen = placement.center + visible / 2 < -itemSize || placement.center - visible / 2 > containerSize + itemSize;
          inset = Math.max(0, (itemSize - visible) / 2);
          if (fadeRange > 0) fade = Math.min(1, Math.max(0, (visible - strategy.minItemSize) / fadeRange));
        }
        const style = offscreen
          ? "hidden"
          : `${Math.round(start * 100) / 100}|${Math.round(inset * 100) / 100}|${fade.toFixed(3)}`;
        if (lastStyles.get(el) === style) continue;
        lastStyles.set(el, style);
        if (offscreen) {
          el.style.visibility = "hidden";
          continue;
        }
        el.style.visibility = "";
        el.style.transform = vertical ? `translate3d(0, ${start}px, 0)` : `translate3d(${start * sign}px, 0, 0)`;
        el.style.clipPath = inset > 0 ? (vertical ? `inset(${inset}px 0 round ${corner})` : `inset(0 ${inset}px round ${corner})`) : "";
        el.style.setProperty(`--${config.prefix}-carousel-fade`, fade.toFixed(3));
      }

      if (pending !== null) {
        if (Math.abs(scrollPosition() - (snapPositions[pending] ?? 0)) < 1) clearPending();
        return;
      }
      const index = nearestIndex(scrollPosition());
      if (index !== currentIndex) {
        currentIndex = index;
        emitChange();
      }
    };

    const rebuild = (): void => {
      stopWheel();
      build();
      if (strategy) {
        expect(currentIndex);
        setScrollPosition(snapPositions[currentIndex] ?? 0, false);
      }
      layout();
    };

    // ── Navigation ──────────────────────────────────────────────

    const goTo = (index: number): void => {
      stopWheel();
      if (!count) return;
      // goTo writes without reading, so the flip check scrollPosition() owns
      // would not run (a stale rtl would clamp this very write to no motion):
      // bring the direction current by asking for the position.
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
    const next = (): void => goTo(currentIndex + 1);
    const prev = (): void => goTo(currentIndex - 1);

    // ── Keyboard and focus (m3.material.io carousel accessibility) ──

    const indexOf = (target: EventTarget | null): number => {
      const item = (target as HTMLElement | null)?.closest?.(`.${prefix}__item`) as HTMLElement | null;
      return item ? slideElements.indexOf(item) : -1;
    };

    const handleKeyDown = (e: KeyboardEvent): void => {
      stopWheel();
      const from = indexOf(e.target);
      if (from < 0) return;
      // Arrows are physical: the forward item sits leftwards on an RTL page.
      const forward = vertical ? "ArrowDown" : rtl ? "ArrowLeft" : "ArrowRight";
      const backward = vertical ? "ArrowUp" : rtl ? "ArrowRight" : "ArrowLeft";
      let target = -1;
      if (e.key === forward) target = from + 1;
      else if (e.key === backward) target = from - 1;
      else if (e.key === "Home") target = 0;
      else if (e.key === "End") target = count - 1;
      if (target < 0 || target >= count) return;
      e.preventDefault();
      slideElements[target]!.focus({ preventScroll: true });
      goTo(target);
    };

    const handleFocusIn = (e: FocusEvent): void => {
      const index = indexOf(e.target);
      if (index >= 0 && index !== currentIndex) goTo(index);
    };

    // ── Mouse drag (touch and trackpad scroll natively) ─────────

    let dragging = false;
    let dragged = false;
    let dragStart = 0;
    let dragScrollStart = 0;
    let dragLast = 0;
    let dragLastTime = 0;
    let dragVelocity = 0;
    let settleTimer = 0;

    // While the mouse drags and until the release scroll settles, the
    // snap points are off so they do not fight the pointer
    const restoreSnap = (): void => {
      window.clearTimeout(settleTimer);
      scroller.removeEventListener("scrollend", restoreSnap);
      delete element.dataset.settling;
    };

    const handlePointerDown = (e: PointerEvent): void => {
      stopWheel();
      clearPending();
      if (e.pointerType !== "mouse" || e.button !== 0 || !strategy) return;
      dragging = true;
      lastWheel = -Infinity;
      dragged = false;
      dragStart = vertical ? e.clientY : e.clientX;
      dragLast = dragStart;
      dragLastTime = e.timeStamp;
      dragVelocity = 0;
      // The physical position on the dragged axis, matching the physical
      // write below: a logical read would be positive in RTL, where the
      // write must go more negative, and every drag would jump to 0.
      dragScrollStart = scroller[vertical ? "scrollTop" : "scrollLeft"];
      restoreSnap();
      element.dataset.settling = "true";
      scroller.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: PointerEvent): void => {
      if (!dragging) return;
      const position = vertical ? e.clientY : e.clientX;
      const delta = position - dragStart;
      if (!dragged && Math.abs(delta) < DRAG_THRESHOLD) return;
      dragged = true;
      element.dataset.dragging = "true";
      const dt = e.timeStamp - dragLastTime;
      if (dt > 0) dragVelocity = ((position - dragLast) / dt) * sign;
      dragLast = position;
      dragLastTime = e.timeStamp;
      // No rtl term: the drag follows the pointer physically, and the
      // mirrored gesture (right-drag advances) meets the mirrored range.
      scroller[vertical ? "scrollTop" : "scrollLeft"] = dragScrollStart - delta;
      e.preventDefault();
    };

    const handlePointerUp = (e: PointerEvent): void => {
      if (!dragging) return;
      dragging = false;
      if (scroller.hasPointerCapture(e.pointerId)) scroller.releasePointerCapture(e.pointerId);
      delete element.dataset.dragging;
      if (!dragged) {
        restoreSnap();
        return;
      }
      if (snap) {
        let target = nearestIndex(scrollPosition());
        // dragVelocity is logical (* sign at its source): the velocity that
        // advances is negative in either direction.
        if (dragVelocity < -FLING_VELOCITY) target = Math.min(count - 1, target + 1);
        else if (dragVelocity > FLING_VELOCITY) target = Math.max(0, target - 1);
        goTo(target);
        scroller.addEventListener("scrollend", restoreSnap, { once: true });
        settleTimer = window.setTimeout(restoreSnap, 600);
      } else {
        restoreSnap();
      }
    };

    // A drag must not activate a link or button inside the item
    const handleClick = (e: MouseEvent): void => {
      if (dragged) {
        dragged = false;
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // ── Opt-in mouse wheel ──────────────────────────────────────

    let wheelDirection = 0;
    let wheelStart = 0;
    let wheelDelta = 0;
    let wheelTarget = 0;
    let wheelFrame = 0;
    let wheelPosition = 0;
    let wheelVelocity = 0;
    let wheelTime = 0;
    let wheelSnap: string | null = null;
    let wheelSnapPriority = "";
    const stopWheel = (resetGesture = true): void => {
      if (wheelFrame) window.cancelAnimationFrame(wheelFrame);
      wheelFrame = 0;
      wheelVelocity = 0;
      if (resetGesture) lastWheel = -Infinity;
      if (wheelSnap !== null) {
        scroller.style.setProperty("scroll-snap-type", wheelSnap, wheelSnapPriority);
        wheelSnap = null;
        clearPending();
      }
    };
    const glide = (now: number): void => {
      // Exact critically damped spring, in seconds. Retargets change only the
      // destination: position and velocity survive. 12/s settles a notch in
      // about 0.8s, with no overshoot and no frame-rate-dependent integration.
      const dt = (now - wheelTime) / 1000;
      wheelTime = now;
      const offset = wheelPosition - wheelTarget;
      const decay = Math.exp(-12 * dt);
      const carry = wheelVelocity + 12 * offset;
      wheelPosition = wheelTarget + (offset + carry * dt) * decay;
      wheelVelocity = (wheelVelocity - 12 * carry * dt) * decay;
      // A fresh gesture after quiet can choose a nearer target while the old
      // velocity is still high. Land there rather than overshooting it.
      const resting = wheelDirection * (wheelPosition - wheelTarget) >= 0 ||
        (Math.abs(wheelPosition - wheelTarget) < 0.5 && Math.abs(wheelVelocity) < 5);
      scroller.scrollLeft = (resting ? wheelTarget : wheelPosition) * sign;
      if (resting) stopWheel(false);
      else wheelFrame = window.requestAnimationFrame(glide);
    };
    const handleTouchStart = (): void => {
      stopWheel();
      clearPending();
    };
    const handleWheel = (e: WheelEvent): void => {
      if (e.ctrlKey || dragging || Math.abs(e.deltaX) >= Math.abs(e.deltaY) || !strategy) return;
      const position = scrollPosition();
      const end = snapPositions[count - 1] ?? 0;
      const direction = Math.sign(e.deltaY);
      // Use the physical range: a smooth navigation may still be travelling.
      if (direction < 0 ? position <= 1 : position >= end - 1) return;
      e.preventDefault();
      if (direction !== wheelDirection) stopWheel();
      if (e.timeStamp - lastWheel >= WHEEL_QUIET || direction !== wheelDirection) {
        wheelStart = position;
        wheelDelta = 0;
        wheelTarget = position;
      }
      lastWheel = e.timeStamp;
      wheelDirection = direction;
      // Lines use computed line height (16px for "normal"); pages use the viewport.
      const unit = e.deltaMode === 1
        ? parseFloat(window.getComputedStyle(scroller).lineHeight) || 16
        : e.deltaMode === 2 ? containerSize : 1;
      wheelDelta += e.deltaY * unit;
      const destination = Math.max(0, Math.min(end, wheelStart + wheelDelta));
      let index = direction > 0 ? count - 1 : 0;
      for (let i = direction > 0 ? 0 : count - 1; i >= 0 && i < count; i += direction) {
        if (direction * (snapPositions[i]! - destination) >= 0 &&
            direction * (snapPositions[i]! - wheelStart) > 0) {
          index = i;
          break;
        }
      }
      const target = snapPositions[index]!;
      // One spring for notches and momentum avoids switching animation engines
      // when a second wheel event arrives. Suspend native snap until landing.
      if (direction * (target - wheelTarget) > 0) {
        wheelTarget = target;
        expect(index);
        if (reduceMotion?.matches) {
          setScrollPosition(target, false);
        } else if (!wheelFrame) {
          wheelSnap = scroller.style.getPropertyValue("scroll-snap-type");
          wheelSnapPriority = scroller.style.getPropertyPriority("scroll-snap-type");
          scroller.style.setProperty("scroll-snap-type", "none");
          // Also cancel any native smooth navigation already in flight.
          scroller.scrollLeft = position * sign;
          wheelPosition = position;
          wheelTime = performance.now();
          wheelFrame = window.requestAnimationFrame(glide);
        }
        if (index !== currentIndex) {
          currentIndex = index;
          emitChange();
        }
      } else {
        // The existing passive listener clears pending before this handler runs.
        expect(currentIndex);
      }
    };
    const setWheel = (on: boolean): void => {
      scroller.removeEventListener("wheel", handleWheel);
      stopWheel();
      if (on && !vertical) scroller.addEventListener("wheel", handleWheel, { passive: false });
    };

    // ── Wiring ──────────────────────────────────────────────────

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
    // A flip at rest moves nothing (logical 0 is physical 0 either way), so
    // no scroll event fires and the flip check in scrollPosition() never
    // runs: watch the dir attribute itself, anywhere in the document.
    const directionObserver = typeof MutationObserver === "function" ? new MutationObserver(rebuild) : null;
    directionObserver?.observe(document.documentElement, { attributeFilter: ["dir"], subtree: true });

    component.onSlidesChanged(rebuild);
    rebuild();

    const destroy = component.lifecycle?.destroy;
    const enhanced = component as C & ScrollComponent;
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
