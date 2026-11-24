// src/components/bottom-sheet/features/drag.ts

import { BottomSheetState } from "../types";
import { BOTTOM_SHEET_DEFAULTS, BOTTOM_SHEET_EVENTS, BOTTOM_SHEET_STATES } from "../constants";
import { PREFIX } from "../../../core/config";

interface DragComponent {
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

const { EXPANDED, PARTIAL, HIDDEN } = BOTTOM_SHEET_STATES;
const { POSITIONAL_THRESHOLD: POS, VELOCITY_THRESHOLD: FAST } = BOTTOM_SHEET_DEFAULTS;

/**
 * px/s, positive downward. Still for 100ms is zero. Until then the slope is
 * the last movement, so a sparse event rate still counts. A gesture starts
 * from an empty list.
 */
const speedOf = (samples: { t: number; y: number }[], now: number): number => {
  let i = samples.length - 1;
  const last = samples[i];
  if (!last || i < 1) return 0;
  while (i > 0 && samples[i - 1]!.y === last.y) i -= 1;
  const end = samples[i]!;
  if (i === 0 || now - end.t >= 100) return 0;
  let j = i - 1;
  while (j > 0 && end.t - samples[j - 1]!.t <= 100) j -= 1;
  return (end.y - samples[j]!.y) / Math.max(end.t - samples[j]!.t, 1) * 1000;
};

/** Compose AnchoredDraggable.computeTarget. Offsets grow downward. */
const aim = (at: number[], offset: number, velocity: number): number => {
  let nearest = 0;
  for (const point of at) if (Math.abs(point - offset) < Math.abs(nearest - offset)) nearest = point;
  const step = (up: boolean): number => {
    if (up) return at.find((point) => point >= offset - 0.5) ?? at[at.length - 1]!;
    for (let index = at.length - 1; index >= 0; index -= 1) if (at[index]! <= offset + 0.5) return at[index]!;
    return at[0]!;
  };
  if (velocity === 0) return nearest;
  const forward = velocity > 0;
  if (Math.abs(velocity) >= FAST) return step(forward);
  const behind = step(!forward);
  return Math.abs(behind - offset) >= POS ? step(forward) : behind;
};

/** Drag between the peek and the full height, and settle with Compose's rule. */
export const withDrag = () => <C extends DragComponent>(component: C) => {
  const { structure, state } = component;
  const handle = structure.handle;
  const node = structure.container;
  if (!handle) return { ...component, drag: { release: () => {} } };
  const style = node.style;
  const view = handle.ownerDocument.defaultView;
  let id = -1, y0 = 0, from = 0, offset = 0, full = 0, peek = 0;
  let dragging = false, travel = 0, dragged = false, gesture = 0;
  let samples: { t: number; y: number }[] = [];
  const states = () => {
    const span = Math.max(full - peek, 0);
    const at = [0];
    const name: BottomSheetState[] = [EXPANDED];
    if (span > 1) { at.push(span); name.push(PARTIAL); }
    if (full > span + 1) { at.push(full); name.push(HIDDEN); }
    return { at, name };
  };
  const place = (next: number): void => {
    if (full <= 0) return;
    const span = Math.max(full - peek, 0);
    style.maxHeight = `${next <= span ? full - next : peek}px`;
    style.transform = `translateY(${next <= span ? 0 : next - span}px)`;
  };
  const clear = (): void => { style.transition = style.maxHeight = style.transform = ""; };
  const settle = (next: BottomSheetState, token: number): void => {
    void node.offsetHeight;
    requestAnimationFrame(() => {
      if (token !== gesture) return;
      const reduced = view?.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
      style.transition = style.transform = "";
      if (reduced || next !== HIDDEN) { style.maxHeight = ""; return; }
      requestAnimationFrame(() => {
        if (token !== gesture) return;
        const pending = (node.getAnimations?.() ?? []).filter((animation) => animation.playState === "running");
        const drop = (): void => { if (token === gesture) style.maxHeight = ""; };
        if (!pending.length) drop();
        else void Promise.all(pending.map((animation) => animation.finished.then(drop, drop)));
      });
    });
  };
  const note = (clientY: number): void => {
    const now = performance.now();
    samples.push({ t: now, y: clientY });
    if (samples.length > 12) samples.shift();
    travel = Math.max(travel, Math.abs(clientY - y0));
    offset = Math.min(Math.max(from + clientY - y0, 0), Math.max(full, 0));
    place(offset);
  };
  const finish = (clientY?: number): void => {
    if (!dragging) return;
    dragging = false;
    try { handle.releasePointerCapture(id); } catch { /* already released */ }
    if (clientY != null) note(clientY);
    const { at, name } = states();
    const next = name[at.indexOf(aim(at, offset, speedOf(samples, performance.now())))] ?? EXPANDED;
    samples = [];
    if (travel > 4) { dragged = true; setTimeout(() => { dragged = false; }, 0); }
    const previous = state.getState();
    if (next === HIDDEN) state.close();
    else state.setState(next);
    component.emit(BOTTOM_SHEET_EVENTS.DRAG_END, { state: next, previous });
    settle(next, gesture);
  };
  const down = (event: PointerEvent): void => {
    const root = node.parentElement;
    if (dragging || event.button !== 0 || !root) return;
    gesture += 1; dragging = true; id = event.pointerId; y0 = event.clientY; travel = 0; samples = [];
    const seen = node.getBoundingClientRect();
    const rootBox = root.getBoundingClientRect();
    for (const animation of node.getAnimations?.() ?? []) animation.cancel();
    style.transition = "none";
    const heightOf = (value: string): number => { style.maxHeight = value; return node.getBoundingClientRect().height; };
    full = heightOf("100%");
    peek = heightOf(`var(--${PREFIX}-bottom-sheet-peek-height, 50%)`);
    from = Math.min(Math.max(seen.top - (rootBox.bottom - full), 0), Math.max(full, 0));
    offset = from;
    place(offset);
    note(event.clientY);
    try { handle.setPointerCapture(event.pointerId); } catch { /* tests have no pointer */ }
    component.emit(BOTTOM_SHEET_EVENTS.DRAG_START);
  };
  const move = (event: PointerEvent): void => {
    if (!dragging || event.pointerId !== id) return;
    if (event.pointerType === "mouse" && event.buttons === 0) finish(event.clientY);
    else note(event.clientY);
  };
  const up = (event: PointerEvent): void => { if (event.pointerId === id) finish(event.clientY); };
  const end = (): void => finish();
  const label = (): void => handle.setAttribute("aria-label", state.getState() === EXPANDED ? "Close sheet" : "Expand sheet");
  const onClick = (): void => {
    if (dragged) { dragged = false; return; }
    const current = state.getState();
    if (current === EXPANDED) state.close();
    else if (current === PARTIAL) state.setState(EXPANDED);
    else state.open();
  };
  label();
  component.on?.(BOTTOM_SHEET_EVENTS.STATE_CHANGE, label);
  const pairs: [string, EventListener][] = [
    ["pointerdown", down as EventListener], ["pointermove", move as EventListener],
    ["pointerup", up as EventListener], ["pointercancel", up as EventListener],
    ["lostpointercapture", end], ["contextmenu", end], ["click", onClick],
  ];
  for (const [type, fn] of pairs) handle.addEventListener(type, fn);
  view?.addEventListener("blur", end);
  return { ...component, drag: { release: () => {
    const pending = dragging;
    finish();
    if (!pending) clear();
    for (const [type, fn] of pairs) handle.removeEventListener(type, fn);
    view?.removeEventListener("blur", end);
    component.off?.(BOTTOM_SHEET_EVENTS.STATE_CHANGE, label);
  } } };
};
