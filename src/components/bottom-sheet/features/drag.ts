// src/components/bottom-sheet/features/drag.ts

import { BottomSheetState } from "../types";
import {
  BOTTOM_SHEET_DEFAULTS,
  BOTTOM_SHEET_EVENTS,
  BOTTOM_SHEET_STATES,
} from "../constants";

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

/**
 * Dragging the sheet between its heights.
 *
 * Where the sheet settles follows Compose's rule: a drag past the positional
 * threshold moves to the next anchor, and a flick past the velocity threshold
 * does the same however short it was, so a quick flick works without having to
 * cover the distance.
 */
export const withDrag =
  () =>
  <C extends DragComponent>(component: C) => {
    const { structure, state } = component;
    const handle = structure.handle;

    // No handle means nothing indicates the sheet is draggable, so it is not
    if (!handle) return { ...component, drag: { release: () => {} } };

    let startY = 0;
    let startTime = 0;
    let offset = 0;
    let dragging = false;
    /** The pointer moved the sheet, so the click that follows is not a press */
    let dragged = false;

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

    /** Where a drag ends up, given how far and how fast it went */
    const settle = (distance: number, velocity: number): BottomSheetState => {
      const current = state.getState();
      const far = Math.abs(distance) >= BOTTOM_SHEET_DEFAULTS.POSITIONAL_THRESHOLD;
      const fast = Math.abs(velocity) >= BOTTOM_SHEET_DEFAULTS.VELOCITY_THRESHOLD;
      if (!far && !fast) return current;

      const downwards = distance > 0;
      if (current === BOTTOM_SHEET_STATES.EXPANDED) {
        return downwards ? BOTTOM_SHEET_STATES.PARTIAL : BOTTOM_SHEET_STATES.EXPANDED;
      }
      return downwards ? BOTTOM_SHEET_STATES.HIDDEN : BOTTOM_SHEET_STATES.EXPANDED;
    };

    const onPointerDown = (event: PointerEvent): void => {
      dragging = true;
      startY = event.clientY;
      startTime = Date.now();
      offset = 0;
      handle.setPointerCapture?.(event.pointerId);
      // the sheet should track the finger exactly, not ease behind it
      structure.container.style.transition = "none";
      component.emit(BOTTOM_SHEET_EVENTS.DRAG_START);
    };

    const onPointerMove = (event: PointerEvent): void => {
      if (!dragging) return;
      offset = event.clientY - startY;
      // upward drag is bounded: the sheet cannot go above its expanded height
      const shown = Math.max(offset, 0);
      structure.container.style.transform = `translateY(${shown}px)`;
    };

    const onPointerUp = (event: PointerEvent): void => {
      if (!dragging) return;
      dragging = false;
      handle.releasePointerCapture?.(event.pointerId);

      const elapsed = Math.max(Date.now() - startTime, 1);
      const velocity = (offset / elapsed) * 1000; // px per second

      structure.container.style.transition = "";
      structure.container.style.transform = "";
      dragged = Math.abs(offset) > 4;

      const previous = state.getState();
      const next = settle(offset, velocity);

      if (next === BOTTOM_SHEET_STATES.HIDDEN) state.close();
      else state.setState(next);

      component.emit(BOTTOM_SHEET_EVENTS.DRAG_END, { state: next, previous });
    };

    handle.addEventListener("pointerdown", onPointerDown);
    handle.addEventListener("pointermove", onPointerMove);
    handle.addEventListener("pointerup", onPointerUp);
    handle.addEventListener("pointercancel", onPointerUp);
    handle.addEventListener("click", onClick);

    return {
      ...component,
      drag: {
        release: () => {
          handle.removeEventListener("pointerdown", onPointerDown);
          handle.removeEventListener("pointermove", onPointerMove);
          handle.removeEventListener("pointerup", onPointerUp);
          handle.removeEventListener("pointercancel", onPointerUp);
          handle.removeEventListener("click", onClick);
          component.off?.(BOTTOM_SHEET_EVENTS.STATE_CHANGE, label);
        },
      },
    };
  };
