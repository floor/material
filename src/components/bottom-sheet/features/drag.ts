// src/components/bottom-sheet/features/drag.ts

import { BottomSheetState } from "../types";
import {
  BOTTOM_SHEET_DEFAULTS,
  BOTTOM_SHEET_EVENTS,
  BOTTOM_SHEET_STATES,
} from "../constants";
import { PREFIX } from "../../../core/config";

interface DragComponent {
  getClass: (name: string) => string;
  emit: (event: string, data?: unknown) => unknown;
  on?: (event: string, handler: () => void) => unknown;
  off?: (event: string, handler: () => void) => unknown;
  structure: { container: HTMLElement; handle: HTMLElement | null };
  state: {
    getState: () => BottomSheetState;
    setState: (next: BottomSheetState) => void;
    open: (to?: BottomSheetState) => void;
    close: () => void;
  };
}

interface Anchor {
  state: BottomSheetState;
  at: number;
}

interface Sample {
  t: number;
  y: number;
}

/**
 * How far the pointer travelled recently, in px/s, positive downward.
 *
 * The window is the last 100ms. A flick dispatched in one turn has no elapsed
 * time, so a 1ms floor keeps that velocity, matching a release that never
 * paused. Samples older than the window are a finger that stopped: velocity 0,
 * and the nearest anchor wins.
 */
const velocityOf = (samples: readonly Sample[], now: number): number => {
  const recent = samples.filter((sample) => now - sample.t <= 100);
  if (recent.length < 2) return 0;
  const first = recent[0]!;
  const last = recent[recent.length - 1]!;
  const dt = Math.max(last.t - first.t, 1);
  return ((last.y - first.y) / dt) * 1000;
};

/**
 * The anchor a drag settles on.
 *
 * Compose's `AnchoredDraggableState.computeTarget`: no velocity picks the
 * nearest anchor; a velocity past `velocityThreshold` picks the next anchor
 * in that direction; a slower drag picks it only after it has crossed
 * `positionalThreshold` from the anchor it left. BottomSheetDefaults uses
 * 56px and 125px/s, and the 56px threshold does not scale with the gap.
 * Offsets grow downward: expanded, then partial, then hidden.
 */
const targetOf = (anchors: readonly Anchor[], offset: number, velocity: number): BottomSheetState => {
  const nearest = anchors.reduce((best, anchor) =>
    Math.abs(anchor.at - offset) < Math.abs(best.at - offset) ? anchor : best);
  const directional = (upwards: boolean): Anchor => {
    if (upwards) return anchors.find((anchor) => anchor.at >= offset - 0.5) ?? anchors[anchors.length - 1]!;
    for (let index = anchors.length - 1; index >= 0; index -= 1) {
      if (anchors[index]!.at <= offset + 0.5) return anchors[index]!;
    }
    return anchors[0]!;
  };
  if (Math.abs(velocity) === 0) return nearest.state;
  const forward = velocity > 0;
  if (Math.abs(velocity) >= BOTTOM_SHEET_DEFAULTS.VELOCITY_THRESHOLD) return directional(forward).state;
  // `behind` is the anchor the pointer is leaving. The sheet takes the next
  // one only once it is 56px past that anchor; otherwise it springs back.
  const behind = directional(!forward);
  const ahead = directional(forward);
  const progressed = Math.abs(behind.at - offset) >= BOTTOM_SHEET_DEFAULTS.POSITIONAL_THRESHOLD;
  return (progressed ? ahead : behind).state;
};

/**
 * Dragging the sheet between its heights.
 *
 * The finger moves the sheet both ways, between the full height and the peek
 * by resizing it (the bottom stays put) and below the peek by translating it.
 * Releasing animates from that position. One finish path covers the pointer
 * release, a cancel, a lost capture, a mouse button that is already up, the
 * window blurring, and destroy.
 *
 * Where it settles is Compose's rule, above. The guidelines
 * (m3.material.io/components/bottom-sheets/guidelines) are the two heights the
 * handle toggles and the swipe down that dismisses.
 */
export const withDrag =
  () =>
  <C extends DragComponent>(component: C) => {
    const { structure, state } = component;
    const handle = structure.handle;
    const container = structure.container;

    // No handle means nothing indicates the sheet is draggable, so it is not
    if (!handle) return { ...component, drag: { release: () => {} } };

    const view = handle.ownerDocument.defaultView;

    let pointerId = -1;
    let startY = 0;
    let startOffset = 0;
    let offset = 0;
    let expandedHeight = 0;
    let partialHeight = 0;
    let dragging = false;
    let travel = 0;
    /** The pointer moved the sheet, so the click that follows is not a press */
    let dragged = false;
    /** Bumps when a new gesture starts, so a settle from the previous one bails */
    let gesture = 0;
    let samples: Sample[] = [];

    // Activating the handle does what Compose's does: a partially
    // open sheet expands, an expanded one closes, a hidden one opens. Its name
    // says which, for the state it is in.
    const label = (): void => {
      handle.setAttribute("aria-label", state.getState() === BOTTOM_SHEET_STATES.EXPANDED ? "Close sheet" : "Expand sheet");
    };
    const onClick = (): void => {
      if (dragged) {
        dragged = false;
        return;
      }
      const current = state.getState();
      if (current === BOTTOM_SHEET_STATES.EXPANDED) state.close();
      else if (current === BOTTOM_SHEET_STATES.PARTIAL) state.setState(BOTTOM_SHEET_STATES.EXPANDED);
      else state.open();
    };
    label();
    component.on?.(BOTTOM_SHEET_EVENTS.STATE_CHANGE, label);

    const anchorsOf = (): Anchor[] => {
      const span = Math.max(expandedHeight - partialHeight, 0);
      const anchors: Anchor[] = [{ state: BOTTOM_SHEET_STATES.EXPANDED, at: 0 }];
      if (span > 1) anchors.push({ state: BOTTOM_SHEET_STATES.PARTIAL, at: span });
      if (expandedHeight > span + 1) anchors.push({ state: BOTTOM_SHEET_STATES.HIDDEN, at: expandedHeight });
      return anchors;
    };

    /** Bottom pinned. Between the two open heights the sheet resizes; below the peek it translates. */
    const place = (next: number): void => {
      if (expandedHeight <= 0) return;
      const span = Math.max(expandedHeight - partialHeight, 0);
      if (next <= span) {
        container.style.maxHeight = `${expandedHeight - next}px`;
        container.style.transform = "translateY(0px)";
        return;
      }
      container.style.maxHeight = `${partialHeight}px`;
      container.style.transform = `translateY(${next - span}px)`;
    };

    const clearInline = (): void => {
      container.style.transition = "";
      container.style.maxHeight = "";
      container.style.transform = "";
    };

    /**
     * Leave the released pixels in place for one frame, then let the
     * stylesheet spring run. Hiding keeps the dragged height until the slide
     * finishes, so the sheet does not grow to full height as it leaves.
     */
    const settleStyles = (next: BottomSheetState, token: number): void => {
      void container.offsetHeight;
      requestAnimationFrame(() => {
        if (token !== gesture) return;
        const reduced = view?.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
        if (reduced || next !== BOTTOM_SHEET_STATES.HIDDEN) {
          clearInline();
          return;
        }
        container.style.transition = "";
        container.style.transform = "";
        requestAnimationFrame(() => {
          if (token !== gesture) return;
          const pending = (container.getAnimations?.() ?? []).filter((animation) => animation.playState === "running");
          if (pending.length === 0) {
            container.style.maxHeight = "";
            return;
          }
          void Promise.all(pending.map((animation) => animation.finished.then(() => undefined, () => undefined))).then(() => {
            if (token !== gesture) return;
            container.style.maxHeight = "";
          });
        });
      });
    };

    const remember = (clientY: number): void => {
      const now = performance.now();
      samples.push({ t: now, y: clientY });
      const horizon = now - 100;
      while (samples.length > 2 && samples[0]!.t < horizon) samples.shift();
      travel = Math.max(travel, Math.abs(clientY - startY));
      const limit = Math.max(expandedHeight, 0);
      offset = Math.min(Math.max(startOffset + (clientY - startY), 0), limit);
      place(offset);
    };

    const finish = (clientY?: number): void => {
      if (!dragging) return;
      dragging = false;
      try {
        handle.releasePointerCapture(pointerId);
      } catch {
        // The pointer was already released, or this document has no capture.
      }
      if (clientY != null) remember(clientY);
      const velocity = velocityOf(samples, performance.now());
      const previous = state.getState();
      const next = targetOf(anchorsOf(), offset, velocity);
      if (travel > 4) {
        dragged = true;
        // A click is dispatched after pointerup, still in this turn. A release
        // that never clicks (blur, a lost pointer) must not swallow the next one.
        setTimeout(() => {
          dragged = false;
        }, 0);
      }
      if (next === BOTTOM_SHEET_STATES.HIDDEN) state.close();
      else state.setState(next);
      component.emit(BOTTOM_SHEET_EVENTS.DRAG_END, { state: next, previous });
      settleStyles(next, gesture);
    };

    const onPointerDown = (event: PointerEvent): void => {
      if (dragging || event.button !== 0) return;
      const root = container.parentElement;
      if (!root) return;
      gesture += 1;
      dragging = true;
      pointerId = event.pointerId;
      startY = event.clientY;
      travel = 0;
      samples = [];
      const seen = container.getBoundingClientRect();
      const rootBox = root.getBoundingClientRect();
      for (const animation of container.getAnimations?.() ?? []) animation.cancel();
      container.style.transition = "none";
      container.style.maxHeight = "";
      container.style.transform = "";
      const heightOf = (maxHeight: string): number => {
        container.style.maxHeight = maxHeight;
        return container.getBoundingClientRect().height;
      };
      expandedHeight = heightOf("100%");
      partialHeight = heightOf(`var(--${PREFIX}-bottom-sheet-peek-height, 50%)`);
      container.style.maxHeight = "";
      const expandedTop = rootBox.bottom - expandedHeight;
      startOffset = Math.min(Math.max(seen.top - expandedTop, 0), Math.max(expandedHeight, 0));
      offset = startOffset;
      place(offset);
      remember(event.clientY);
      try {
        handle.setPointerCapture(event.pointerId);
      } catch {
        // Synthetic presses in tests have no pointer to capture.
      }
      component.emit(BOTTOM_SHEET_EVENTS.DRAG_START);
    };

    const onPointerMove = (event: PointerEvent): void => {
      if (!dragging || event.pointerId !== pointerId) return;
      // A mouse release outside the window can arrive as a move with no
      // buttons. Touch reports buttons 0 for the whole gesture.
      if (event.pointerType === "mouse" && event.buttons === 0) {
        finish(event.clientY);
        return;
      }
      remember(event.clientY);
    };

    const onPointerUp = (event: PointerEvent): void => {
      if (event.pointerId !== pointerId) return;
      finish(event.clientY);
    };

    const onBlur = (): void => finish();
    const onContextMenu = (): void => finish();
    const onLostCapture = (): void => finish();

    handle.addEventListener("pointerdown", onPointerDown);
    handle.addEventListener("pointermove", onPointerMove);
    handle.addEventListener("pointerup", onPointerUp);
    handle.addEventListener("pointercancel", onPointerUp);
    handle.addEventListener("lostpointercapture", onLostCapture);
    handle.addEventListener("contextmenu", onContextMenu);
    handle.addEventListener("click", onClick);
    view?.addEventListener("blur", onBlur);

    return {
      ...component,
      drag: {
        release: () => {
          const pending = dragging;
          finish();
          if (!pending) clearInline();
          handle.removeEventListener("pointerdown", onPointerDown);
          handle.removeEventListener("pointermove", onPointerMove);
          handle.removeEventListener("pointerup", onPointerUp);
          handle.removeEventListener("pointercancel", onPointerUp);
          handle.removeEventListener("lostpointercapture", onLostCapture);
          handle.removeEventListener("contextmenu", onContextMenu);
          handle.removeEventListener("click", onClick);
          view?.removeEventListener("blur", onBlur);
          component.off?.(BOTTOM_SHEET_EVENTS.STATE_CHANGE, label);
        },
      },
    };
  };
