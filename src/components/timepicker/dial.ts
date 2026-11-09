// src/components/timepicker/dial.ts

import { TIME_FORMAT, TimeValue, type TimeFormat } from "./types";
import { activeElementOf } from "../../core/dom/focus";

/** Which part of the time the dial is setting. */
export type DialSelector = "hour" | "minute" | "second";

export interface DialOptions {
  prefix: string;
  format: TimeFormat;
  /**
   * A value picked on the dial. `final` is false while a pointer drags and true
   * when it is released or a key selects; `pointer` says which it was.
   */
  onSelect: (value: number, final: boolean, pointer: boolean) => void;
  /**
   * Whether a value can be picked (minTime, maxTime and the steps).
   * Numbers it rejects are disabled; all can be picked without it.
   */
  allowed?: (selector: DialSelector, value: number) => boolean;
}

export interface Dial {
  element: HTMLElement;
  /** Shows a time on the dial for the part being set. */
  update: (time: TimeValue, selector: DialSelector, animate?: boolean) => void;
}

// M3 dial geometry (Compose): a 256dp face, labels on a 101dp ring, the 24-hour
// inner ring at 69dp.
const OUTER = 101;
const INNER = 69;

/** One labelled position on the dial. */
interface DialItem {
  value: number;
  text: string;
  angle: number;
  radius: number;
}

const itemsFor = (selector: DialSelector, format: TimeFormat): DialItem[] => {
  if (selector !== "hour") {
    return Array.from({ length: 12 }, (_, i) => ({ value: i * 5, text: String(i * 5).padStart(2, "0"), angle: i * 30, radius: OUTER }));
  }
  if (format === TIME_FORMAT.MILITARY) {
    // Compose and MDC: 0-11 on the outer ring, 12-23 on the inner one, with 00
    // and 12 at the top.
    return Array.from({ length: 24 }, (_, h) => ({ value: h, text: h === 0 ? "00" : String(h), angle: (h % 12) * 30, radius: h < 12 ? OUTER : INNER }));
  }
  return Array.from({ length: 12 }, (_, i) => ({ value: i || 12, text: String(i || 12), angle: i * 30, radius: OUTER }));
};

/** The value a time shows on the dial, in the dial's own terms. */
const dialValue = (time: TimeValue, selector: DialSelector, format: TimeFormat): number =>
  selector === "minute" ? time.minutes
  : selector === "second" ? time.seconds ?? 0
  : format === TIME_FORMAT.MILITARY ? time.hours : time.hours % 12 || 12;

/** How a value on the dial is named: "9 o'clock", "20 hours", "15 minutes". */
export const nameFor = (selector: DialSelector, format: TimeFormat, value: number): string =>
  selector === "minute" ? `${value} minutes`
  : selector === "second" ? `${value} seconds`
  : format === TIME_FORMAT.MILITARY ? `${value} hours` : `${value} o'clock`;

let dials = 0;

/**
 * The clock dial, in the DOM. It was a canvas: hidden from assistive
 * tech, unreachable by keyboard, click-only, and coloured from the document root.
 *
 * The face is a listbox of its labelled numbers. The arrows move between them and
 * wrap (crossing the 24-hour rings in order), and Enter or Space selects, as in
 * Compose. A pointer can click or drag. One animated angle and radius place the
 * track, the handle and an on-primary copy of the labels clipped to the handle,
 * so they move together on the default spatial spring, the short way round.
 */
export const createDial = (options: DialOptions): Dial => {
  const { prefix, format } = options;
  const cls = (name: string) => `${prefix}-time-picker__${name}`;
  const id = `${prefix}-time-picker-dial-${++dials}`;
  const element = document.createElement("div");
  element.className = cls("dial-face");
  element.role = "listbox";
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
  for (const part of [track, centre, handle, selected]) part.ariaHidden = "true";
  element.append(numbers, track, centre, handle, selected);

  let selector: DialSelector | null = null;
  let items: DialItem[] = [];
  let angle = 0;
  let leaving: HTMLElement | undefined;
  const angleProperty = `--${prefix}-time-picker-angle`;

  const place = (el: HTMLElement, item: DialItem) => {
    const radians = (item.angle * Math.PI) / 180;
    el.style.setProperty(`--${prefix}-time-picker-x`, `${Math.round(Math.sin(radians) * item.radius * 100) / 100}px`);
    el.style.setProperty(`--${prefix}-time-picker-y`, `${Math.round(-Math.cos(radians) * item.radius * 100) / 100}px`);
  };

  const build = (next: DialSelector) => {
    // Keep a non-interactive copy until its exit fade ends.
    leaving?.remove();
    if (selector && element.ownerDocument.defaultView?.matchMedia?.("(prefers-reduced-motion: no-preference)").matches) {
      const old = numbers.cloneNode(true) as HTMLElement;
      old.classList.add(cls("dial-numbers--leaving"));
      old.ariaHidden = "true";
      old.inert = true;
      for (const number of old.children) number.removeAttribute("id");
      for (const type of ["animationend", "animationcancel"]) old.addEventListener(type, () => old.remove(), { once: true });
      element.append(old);
      leaving = old;
    }
    selector = next;
    items = itemsFor(next, format);
    element.ariaLabel = next === "hour" ? "Hour" : next === "minute" ? "Minute" : "Second";
    const number = (item: DialItem, index?: number) => {
      const option = document.createElement("span");
      option.className = cls("dial-number");
      if (item.radius === INNER) option.classList.add(cls("dial-number--inner"));
      if (index !== undefined) {
        option.id = `${id}-${index}`;
        option.role = "option";
        option.ariaLabel = nameFor(next, format, item.value);
        option.dataset.value = String(item.value);
      }
      option.textContent = item.text;
      place(option, item);
      return option;
    };
    numbers.replaceChildren(...items.map(number));
    selected.replaceChildren(...items.map(item => number(item)));
    // Restart the spatial scale and opacity effects together.
    element.classList.remove(cls("dial-face--swap"));
    void element.offsetWidth;
    element.classList.add(cls("dial-face--swap"));
  };

  /** The option a value sits on, or the nearest one when it is between labels. */
  const nearest = (value: number): number => {
    const exact = items.findIndex(item => item.value === value);
    if (exact >= 0) return exact;
    return Math.round(value / 5) % items.length;
  };

  const update = (time: TimeValue, next: DialSelector, animate = false) => {
    if (!animate) element.style.transition = "none";
    // Rebuilding the face removes the focused number; focus moves to the new
    // face's tab stop rather than falling back to the dialog.
    // Read from the dial's own root: inside a shadow root the document sees only
    // the host.
    const focused = activeElementOf(element);
    const refocus = next !== selector && numbers.contains(focused);
    if (next !== selector) build(next);
    const current = dialValue(time, next, format);
    const stop = nearest(current);
    const index = items[stop].value === current ? stop : -1;
    const target = next === "hour" ? items[stop] : { angle: current * 6, radius: OUTER };
    // Retarget from the rendered position, including an unfinished spring.
    // The last destination can be on the other side of the shortest path.
    if (animate) angle = parseFloat(getComputedStyle(element).getPropertyValue(angleProperty)) || 0;
    const delta = ((target.angle - (angle % 360)) % 360 + 540) % 360 - 180;
    angle += delta;
    element.style.setProperty(angleProperty, `${angle}deg`);
    element.style.setProperty(`--${prefix}-time-picker-radius`, `${target.radius}px`);
    handle.classList.toggle(cls("dial-handle--between"), index < 0);
    numbers.querySelectorAll<HTMLElement>("[role=option]").forEach((option, i) => {
      option.ariaSelected = String(i === index);
      option.ariaDisabled = options.allowed?.(next, items[i].value) === false ? "true" : null;
      if (option !== focused) option.tabIndex = i === stop ? 0 : -1;
    });
    if (refocus) numbers.querySelector<HTMLElement>('[tabindex="0"]')?.focus({ preventScroll: true });
    if (!animate) { void element.offsetWidth; element.style.transition = ""; }
  };

  // Pointer: the angle from the centre picks the value, and the distance picks
  // the 24-hour ring. The hand follows a drag without motion.
  const valueAt = (event: PointerEvent): number => {
    const box = element.getBoundingClientRect();
    const dx = event.clientX - (box.left + box.width / 2);
    const dy = event.clientY - (box.top + box.height / 2);
    const degrees = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
    if (selector !== "hour") return Math.round(degrees / 6) % 60;
    const step = Math.round(degrees / 30) % 12;
    if (format === TIME_FORMAT.MILITARY) return Math.hypot(dx, dy) < (OUTER + INNER) / 2 ? step + 12 : step;
    return step || 12;
  };
  let dragging = 0; // Idle, pressed, or dragging (2).
  let origin: PointerEvent;
  element.addEventListener("pointerdown", event => {
    if (event.button !== 0) return;
    dragging = 1;
    origin = event;
    element.setPointerCapture?.(event.pointerId);
    options.onSelect(valueAt(event), false, true);
  });
  // Small pointer noise during a click must not cancel its spring.
  element.addEventListener("pointermove", event => {
    if (dragging && (dragging === 2 || Math.hypot(event.clientX - origin.clientX, event.clientY - origin.clientY) > 4)) {
      dragging = 2;
      element.classList.add(cls("dial-face--dragging"));
      options.onSelect(valueAt(event), false, true);
    }
  });
  const release = (event: PointerEvent) => {
    if (!dragging) return;
    dragging = 0;
    element.classList.remove(cls("dial-face--dragging"));
    options.onSelect(valueAt(event), true, true);
  };
  element.addEventListener("pointerup", release);
  element.addEventListener("pointercancel", () => {
    dragging = 0;
    element.classList.remove(cls("dial-face--dragging"));
  });

  // Keyboard, as Compose: the arrows move between the numbers and wrap, Enter or
  // Space selects the focused one.
  element.addEventListener("keydown", event => {
    const options_ = Array.from(numbers.querySelectorAll<HTMLElement>("[role=option]"));
    const index = options_.indexOf(event.target as HTMLElement);
    if (index < 0) return;
    let next = index;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % options_.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index - 1 + options_.length) % options_.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = options_.length - 1;
    else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      options.onSelect(items[index].value, true, false);
      return;
    } else return;
    event.preventDefault();
    options_.forEach((option, i) => { option.tabIndex = i === next ? 0 : -1; });
    options_[next].focus();
  });

  return { element, update };
};
