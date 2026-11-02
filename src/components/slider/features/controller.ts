// src/components/slider/features/controller.ts
//
// The slider's behaviour in one module: the decorative track (withTracks), the
// pointer, keyboard and focus handlers, the controller state, and the public
// API. These were four files that each rebuilt the same facts -- the element
// lookups, the axis, the value's fraction of the range -- and the API was
// forwarded through three layers (the controller's `slider` object, the arrows
// getApiConfig built, and withAPI's wrappers). Merged, each fact is built once
// and the API is one set of functions.
import { SLIDER_EVENTS } from "../types";
import type {
  SliderColor,
  SliderComponent,
  SliderConfig,
  SliderEvents,
  SliderPointerEvent,
  SliderState,
  SliderStateComponent,
} from "../types";
import type { EventCallback } from "../../../core/state/emitter";
import { defaultConfig, sliderSizeClass } from "../config";
import { SLIDER_MEASUREMENTS, SLIDER_SIZES, type SliderSize } from "../constants";
import { PREFIX } from "../../../core/config";
import { cornerToken, type ShapeStep } from "../../../core/theme/shape";
import { setHTML } from "../../../core/dom/html";
import { setFormValue } from "../../../core/dom/form-value";
import { activeElementOf } from "../../../core/dom/focus";
import {
  arrowSign,
  bubbleTransform,
  getAxis,
  handleTransform,
  isRtl,
  lengthOf,
  offsetAlong,
  type SliderAxis,
} from "./axis";

//=============================================================================
// TRACK GEOMETRY
//=============================================================================

/** The track height a size names; a number is a height itself. */
const getTrackHeight = (size?: SliderSize): number => {
  if (typeof size === "number") {
    return Math.max(size, SLIDER_SIZES.XS);
  }

  if (typeof size === "string" && size in SLIDER_SIZES) {
    return SLIDER_SIZES[size as keyof typeof SLIDER_SIZES];
  }

  return SLIDER_SIZES.XS; // Default to XS
};

/** The handle's height: 44dp at the two small sizes, else the track plus 12dp. */
const getHandleHeight = (size?: SliderSize): number => {
  const trackHeight = getTrackHeight(size);

  if (trackHeight <= SLIDER_SIZES.S) {
    return SLIDER_MEASUREMENTS.SMALL_HANDLE_HEIGHT;
  }

  return trackHeight + SLIDER_MEASUREMENTS.HANDLE_HEIGHT_OFFSET;
};

/**
 * Gets the track's outer corner radius for a size: 8 / 8 / 12 / 16 / 28 for
 * XS / S / M / L / XL (m3.material.io slider specs, Track shape). A numeric
 * size takes the radius of the named size it falls in.
 *
 * On a discrete slider it is also the inset of every value position. The handle
 * and the stops sit that far in from each end of the track.
 */
/** The steps of the track's corner radii (Compose SliderTokens: small to extra-large). */
const TRACK_STEPS: Record<number, ShapeStep> = { 8: "small", 12: "medium", 16: "large", 28: "extra-large" };

const getExternalTrackRadius = (size?: SliderSize): number => {
  const trackHeight = getTrackHeight(size);
  if (trackHeight <= SLIDER_SIZES.S) return 8;
  if (trackHeight <= SLIDER_SIZES.M) return 12;
  if (trackHeight <= SLIDER_SIZES.L) return 16;
  return 28;
};

/**
 * Where a value sits along a track `width` wide, from its fraction of the range,
 * as CSS, so a handle stays in place when the track resizes. A continuous
 * slider spans the whole track (`inset` is 0), so its ends meet the rounded
 * corners. A discrete one insets every step, the first and the last included,
 * by the track's corner radius: the handle centre lands on the stop, and the
 * end stops sit in from the pill
 * (https://m3.material.io/components/sliders/guidelines — "The slider handle snaps
 * to the closest stop.").
 */
const trackPositionCss = (fraction: number, inset: number): string =>
  inset
    ? `calc(${fraction * 100}% + ${inset * (1 - 2 * fraction)}px)`
    : `${fraction * 100}%`;

/** A distance along the track: `f` of its length, plus `p` pixels. No measured width. */
type Along = { f: number; p: number };
const A0: Along = { f: 0, p: 0 };
const A1: Along = { f: 1, p: 0 };
const ap = (f: number, p: number): Along => ({ f, p });
const add = (a: Along, b: Along): Along => ap(a.f + b.f, a.p + b.p);
const sub = (a: Along, b: Along): Along => ap(a.f - b.f, a.p - b.p);
const px = (p: number): Along => ap(0, p);

/** A value's fraction of its range, clamped; an empty range has none. */
const fractionOf = (value: number, min: number, max: number): number =>
  min === max ? 0 : Math.min(1, Math.max(0, (value - min) / (max - min)));

/**
 * `calc(40% - 8px)`, or a bare percent or pixel length. Rounded so `0.4 * 100`
 * stays `40`. A zero fraction is `0px` (the track tests read that), and a
 * negative pixel term is written ` - ` so a browser does not rewrite `+ -`.
 * `unit` is `%` for positions; ticks pass `cqw`/`cqh` because a percentage in
 * `background-position` is not a fraction of the element.
 */
const alongCss = (a: Along, unit = "%"): string => {
  const pct = Math.round(a.f * 1e8) / 1e6;
  const p = Math.round(a.p * 1e6) / 1e6;
  if (pct === 0) return `${p}px`;
  if (p === 0) return `${pct}${unit}`;
  return `calc(${pct}${unit} ${p < 0 ? "-" : "+"} ${Math.abs(p)}px)`;
};

const INSET_ICON_PADDING = 10;

/** The handle's width: 4dp, halved while it is pressed or focused (PressedHandleWidth, FocusHandleWidth). */
const HANDLE_WIDTH = 4;
const NARROW_HANDLE_WIDTH = 2;

interface VisualState {
  value: number;
  secondValue: number | null;
  min: number;
  max: number;
  step: number;
  pressed?: boolean;
  activeHandle?: string | null;
}

/** What the track feature reads off the component it is handed. */
interface TracksHost {
  getClass: (name: string) => string;
  element: HTMLElement;
  // withDom installs it before withTracks runs.
  container: HTMLElement;
  handle?: HTMLElement;
  secondHandle?: HTMLElement;
  // Required, not optional: withStates installs appearance and withLifecycle
  // runs before both, so by the time withTracks is applied they are there.
  // setColor is reassigned here, wrapping the original, so it is writable.
  appearance: { setColor: (color: SliderColor) => void };
  getSize?: () => SliderSize;
  setSize?: (size: SliderSize) => void;
  // VisualState, not unknown: the producer below takes one, and under
  // strictFunctionTypes a host promising to call it with anything cannot
  // accept that.
  renderTracks?: (state?: VisualState) => void;
  setInsetIcon?: (icon: string, atMin?: string) => void;
  lifecycle: { destroy: () => void };
}

/** Decorative tracks and ticks. Handles and controller retain interaction ownership. */
export const withTracks =
  (config: SliderConfig) =>
  // Generic, so the accumulated pipeline type survives to the features after
  // this one. A concrete parameter type would erase it — the defect fixed in
  // text field's withDensity (#109).
  <C extends TracksHost>(component: C) => {
  const container: HTMLElement = component.container;
  // The class is passed whole rather than assembled from a fragment. It was
  // `getClass(\`slider-${name}\`)`, which meant none of these five classes
  // appeared anywhere a reader -- or classes:check -- could find them, while
  // every call site passed a literal anyway.
  const element = (className: string, parent: HTMLElement) => {
    const node = document.createElement("div");
    node.className = component.getClass(className);
    parent.append(node);
    return node;
  };
  // The axis is read at each render: a right-to-left layout is known only once the
  // slider is in the document.
  let axis: SliderAxis = getAxis(config);
  // Writes a position along the axis and clears the opposite side, which an earlier
  // render may have used: the first one runs before the slider is in the document,
  // when an RTL layout still reads as left to right.
  const opposite = { left: "right", right: "left", top: "bottom", bottom: "top" } as const;
  const at = (node: HTMLElement, position: string) => {
    node.style[opposite[axis.start]] = "";
    node.style[axis.start] = position;
  };
  const visual = element("slider__visual", container);
  visual.setAttribute("aria-hidden", "true");
  const track = element("slider__track", visual);
  const segments = Array.from({ length: 3 }, () => element("slider__segment", track));
  const ticks = [element("slider__ticks", visual), element("slider__ticks", visual)];
  ticks[1].classList.add(component.getClass("slider__ticks--active"));
  // Stop indicators at the start and the end of the inactive track: "all sliders have
  // stops at the end of the inactive track" (m3.material.io slider guidelines), so a
  // centred or range slider, whose track is inactive at both ends, carries both.
  const dots = [element("slider__dot", visual), element("slider__dot", visual)];
  dots[0].classList.add(component.getClass("slider__dot--start"));
  // The inset icon (M3 Expressive): one element, placed on whichever track can hold it.
  const insetIcon = element("slider__inset-icon", visual);
  insetIcon.hidden = true;
  let insetMarkup = { icon: config.insetIcon ?? "", atMin: config.insetIconAtMin ?? "" };
  let shownMarkup: string | null = null;
  let destroyed = false;
  let size = config.size ?? "XS";
  let state: VisualState = {
    value: config.value ?? 0, secondValue: config.secondValue ?? null,
    min: config.min ?? 0, max: config.max ?? 100, step: config.step ?? 1,
  };
  const narrowed = (which: "first" | "second") => {
    const handle = which === "first" ? component.handle : component.secondHandle;
    const pressed = !!state.pressed && (state.activeHandle === which || (!config.range && which === "first"));
    return pressed || !!handle?.classList.contains(component.getClass("slider__handle--focused"));
  };

  // Slider.kt drawTrack, horizontal and left to right.
  const render = (next?: VisualState) => {
    if (destroyed) return;
    if (next) state = { ...next };
    axis = getAxis(config, isRtl(component.element));
    // Only the decisions that depend on the real length (a sliver shorter than the
    // corner, an icon that fits) read it. 0, on a server, keeps the calc: the
    // sign of those decisions is known without a width except at a short end.
    const width = lengthOf(container.getBoundingClientRect(), axis) || 0;
    const corner = getExternalTrackRadius(size);
    const inset = config.ticks ? corner : 0;
    const fraction = (value: number) => fractionOf(value, state.min, state.max);
    // trackPosition, as a fraction plus pixels. The inset stays on at the ends,
    // so a segment that follows the handle stops on the same centre as the tick.
    const atValue = (value: number): Along => {
      const f = fraction(value);
      return ap(f, inset * (1 - 2 * f));
    };
    const cmp = (a: Along, b: Along): number =>
      width > 0 ? a.f * width + a.p - (b.f * width + b.p) : (a.f - b.f) || (a.p - b.p);
    // ThumbTrackGapSize is measured from the handle's edge, so it is half the handle's
    // current width plus 6dp from its centre.
    const gapOf = (which: "first" | "second"): Along =>
      px((narrowed(which) ? NARROW_HANDLE_WIDTH : HANDLE_WIDTH) / 2 + SLIDER_MEASUREMENTS.HANDLE_GAP);
    const firstGap = gapOf("first");
    const secondGap = gapOf("second");
    const first = atValue(state.value);
    const second = atValue(state.secondValue ?? state.max);
    let parts: [Along, Along, boolean][];
    let activeStart: Along, activeEnd: Along;
    if (config.centered) {
      // The active track runs from the centre to the handle, with the gap on the
      // handle's side only; the inactive track stops one gap before the centre.
      const zero = atValue(Math.min(state.max, Math.max(state.min, 0)));
      if (cmp(first, zero) >= 0) {
        activeStart = zero; activeEnd = first;
        parts = [[A0, sub(zero, firstGap), false], [zero, sub(first, firstGap), true], [add(first, firstGap), A1, false]];
      } else {
        activeStart = first; activeEnd = zero;
        parts = [[A0, sub(first, firstGap), false], [add(first, firstGap), zero, true], [add(zero, firstGap), A1, false]];
      }
    } else if (config.range && state.secondValue !== null) {
      const lowIsFirst = cmp(first, second) <= 0;
      const low = lowIsFirst ? first : second;
      const high = lowIsFirst ? second : first;
      const lowGap = lowIsFirst ? firstGap : secondGap;
      const highGap = lowIsFirst ? secondGap : firstGap;
      activeStart = low; activeEnd = high;
      parts = [[A0, sub(low, lowGap), false], [add(low, lowGap), sub(high, highGap), true], [add(high, highGap), A1, false]];
    } else {
      activeStart = A0; activeEnd = first;
      parts = [[A0, A0, false], [A0, sub(first, firstGap), true], [add(first, firstGap), A1, false]];
    }
    // A piece of track that meets an end of the slider is drawn only while it is
    // longer than the corner radius (drawTrack's activeTrackThreshold and inactive
    // thresholds): below that its rounded end would paint as a sliver. With no
    // width, only a length that is short at every width collapses.
    const standard = !config.centered && !(config.range && state.secondValue !== null);
    const short = (len: Along): boolean =>
      width > 0 ? len.f * width + len.p <= corner : len.f < 0 || (len.f === 0 && len.p <= corner);
    parts.forEach((part, index) => {
      const meetsEnd = index !== 1 || standard;
      if (meetsEnd && short(sub(part[1], part[0]))) part[1] = part[0];
    });
    segments.forEach((segment, index) => {
      const [start, end, active] = parts[index] ?? [A0, A0, false];
      const len = sub(end, start);
      const drawn = (width > 0 ? len.f * width + len.p < 0 : len.f < 0 || (len.f === 0 && len.p < 0)) ? A0 : len;
      at(segment, alongCss(start));
      segment.style[axis.size] = alongCss(drawn);
      segment.classList.toggle(component.getClass("slider__segment--active"), active);
    });
    // A stop indicator ends each inactive piece that is drawn. With ticks the ends are
    // ticks already. The end stop sits one corner in, which is `100%` minus that.
    dots[0].hidden = !!config.ticks || standard || cmp(parts[0][1], parts[0][0]) <= 0;
    dots[1].hidden = !!config.ticks || cmp(parts[2][1], parts[2][0]) <= 0;
    at(dots[0], alongCss(px(corner - 2)));
    at(dots[1], alongCss(ap(1, -(corner + 2))));
    placeInsetIcon(parts, width);
    const discrete = !!config.ticks && state.step > 0 && state.max > state.min;
    ticks.forEach(tick => { tick.hidden = !discrete; });
    if (discrete) {
      // Ticks sit on the same inset scale as the handle, ends included.
      // TickSize 4dp, and none is drawn within a gap of a handle.
      // cqw/cqh: background-position percentages are not a fraction of the box.
      const stepF = state.step / (state.max - state.min);
      const repeat = `max(0.01px, ${alongCss(ap(stepF, -2 * inset * stepF))})`;
      const offset = alongCss(ap(-stepF / 2, inset * (1 + stepF)), axis.vertical ? "cqh" : "cqw");
      const last = atValue(state.min + Math.floor((state.max - state.min) / state.step) * state.step);
      const holes: [Along, Along][] = [[sub(first, firstGap), add(first, firstGap)]];
      if (config.range && state.secondValue !== null) holes.push([sub(second, secondGap), add(second, secondGap)]);
      const mask = (intervals: [Along, Along][]) => {
        const merged: [Along, Along][] = [];
        for (const [start, end] of [...intervals].sort((a, b) => cmp(a[0], b[0]))) {
          const previous = merged[merged.length - 1];
          if (previous && cmp(start, previous[1]) <= 0) { if (cmp(end, previous[1]) > 0) previous[1] = end; }
          else merged.push([start, end]);
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
      // Cut from the start and from the end. min() picks the nearer end without a width.
      const clip = (fromStart: string, fromEnd: string) => ({
        left: `inset(0 ${fromEnd} 0 ${fromStart})`,
        right: `inset(0 ${fromStart} 0 ${fromEnd})`,
        top: `inset(${fromStart} 0 ${fromEnd} 0)`,
        bottom: `inset(${fromEnd} 0 ${fromStart} 0)`,
      })[axis.start];
      const fromEnd = (edge: Along) => `max(0px, calc(100% - ${alongCss(edge)}))`;
      ticks[0].style.clipPath = clip("0px", fromEnd(add(last, px(2))));
      ticks[1].style.clipPath = clip(
        `max(0px, ${alongCss(sub(activeStart, px(2)))})`,
        `max(0px, calc(100% - min(${alongCss(add(last, px(2)))}, ${alongCss(add(activeEnd, px(2)))})))`,
      );
    }
  };
  // Standard sliders at M, L and XL only (m3.material.io specs: 24 / 24 / 32dp). The
  // icon sits INSET_ICON_PADDING from the start of the active track, and on the
  // inactive track when the active one is shorter than the icon and its padding on
  // both sides (material-components-android BaseSlider calculateTrackIconBounds,
  // m3_slider_track_icon_padding = 10dp).
  function placeInsetIcon(parts: [Along, Along, boolean][], width: number) {
    const trackHeight = getTrackHeight(size);
    const eligible = !config.range && !config.centered && trackHeight >= SLIDER_SIZES.M;
    const markup = state.value <= state.min && insetMarkup.atMin ? insetMarkup.atMin : insetMarkup.icon;
    const iconSize = trackHeight >= SLIDER_SIZES.XL ? 32 : 24;
    const room = iconSize + 2 * INSET_ICON_PADDING;
    const fits = (len: Along) =>
      width > 0 ? len.f * width + len.p >= room : len.f > 0 || (len.f === 0 && len.p >= room);
    const onActive = fits(sub(parts[1][1], parts[1][0]));
    const onInactive = !onActive && fits(sub(parts[2][1], parts[2][0]));
    insetIcon.hidden = !eligible || !markup || (!onActive && !onInactive);
    if (insetIcon.hidden) return;
    if (markup !== shownMarkup) {
      setHTML(insetIcon, markup);
      shownMarkup = markup;
    }
    insetIcon.style.width = insetIcon.style.height = `${iconSize}px`;
    at(insetIcon, alongCss(add(onActive ? parts[1][0] : parts[2][0], px(INSET_ICON_PADDING))));
    insetIcon.classList.toggle(component.getClass("slider__inset-icon--inactive"), onInactive);
  }
  component.setInsetIcon = (icon: string, atMin = "") => {
    if (destroyed) return;
    insetMarkup = { icon, atMin };
    render();
  };

  const setSize = (next: SliderSize) => {
    if (destroyed) return;
    // The root's size modifier follows the size: it kept the one from config,
    // so a slider made at M and set to XL wore both.
    const previous = sliderSizeClass(size), current = sliderSizeClass(next);
    if (previous) component.element.classList.remove(previous);
    if (current) component.element.classList.add(current);
    size = next;
    const handleHeight = getHandleHeight(size);
    // Sizes are thicknesses: across the axis. A vertical slider's length is its CSS height.
    container.style[axis.cross] = `${Math.max(handleHeight, SLIDER_MEASUREMENTS.MIN_HEIGHT)}px`;
    track.style[axis.cross] = `${getTrackHeight(size)}px`;
    // The track's corner step (small to extra-large), read through its token
    track.style.borderRadius = cornerToken(TRACK_STEPS[getExternalTrackRadius(size)]!, getExternalTrackRadius(size), PREFIX);
    for (const handle of [component.handle, component.secondHandle]) {
      if (handle) handle.style[axis.cross] = `${handleHeight}px`;
    }
    // The value indicator sits 12dp above the handle's top, so it reads the height.
    component.element.style.setProperty(`--${PREFIX}-slider-handle-height`, `${handleHeight}px`);
    render();
  };
  component.renderTracks = render;
  component.setSize = setSize;
  component.getSize = () => size;
  const setColor = component.appearance.setColor;
  component.appearance.setColor = (color: SliderColor) => {
    if (destroyed) return;
    setColor.call(component.appearance, color);
    config.color = color;
  };
  setSize(size);
  const resize = () => { if (!destroyed) render(); };
  const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
  if (observer) observer.observe(container);
  else window.addEventListener("resize", resize);
  const destroy = component.lifecycle.destroy;
  component.lifecycle.destroy = () => {
    if (destroyed) return;
    destroyed = true;
    observer?.disconnect();
    if (!observer) window.removeEventListener("resize", resize);
    destroy.call(component.lifecycle);
  };
  return component;
};

//=============================================================================
// THE CONTROLLER
//=============================================================================

/**
 * What the controller reads off the component it is handed. `SliderStateComponent`
 * names the DOM and the pieces the pipeline installs; the rest are the managers
 * withStates, withTextLabel, withIcon and withTracks put there.
 */
interface ControllerHost extends SliderStateComponent {
  // withStates installs the whole manager; SliderStateComponent keeps only the
  // half the visual checks read.
  disabled: {
    enable: () => unknown;
    disable: () => unknown;
    isDisabled: () => boolean;
  };
  appearance: {
    setColor: (color: SliderColor) => void;
    getColor: () => string;
    showTicks: (show: boolean) => void;
    showCurrentValue: (show: boolean) => void;
  };
  label?: { setText: (text: string) => unknown; getText: () => string };
  icon: { setIcon: (html: string) => unknown; getIcon: () => string };
  setSize?: (size: SliderSize) => void;
  setInsetIcon?: (icon: string, atMin?: string) => void;
  // EventCallback, the emitter's own callback type: withEvents' generic `on`
  // is instantiated with it, so the two signatures meet exactly.
  on?: (event: string, handler: EventCallback) => unknown;
  off?: (event: string, handler: EventCallback) => unknown;
}

/**
 * The x or y coordinate of whichever kind of pointer event this is.
 *
 * `"touches" in e` is a real type guard where `e.type.includes("touch")` is
 * only a string test, so the branches below could not be narrowed. Every
 * caller is a down or a move, where the touch list is non-empty.
 */
const clientXOf = (e: SliderPointerEvent): number =>
  "touches" in e ? e.touches[0].clientX : e.clientX;
const clientYOf = (e: SliderPointerEvent): number =>
  "touches" in e ? e.touches[0].clientY : e.clientY;

/**
 * Add controller functionality to slider component
 * Manages state, events, user interactions, and UI rendering
 *
 * @param config Slider configuration
 * @returns Component enhancer with slider controller functionality
 */
export const withController =
  (config: SliderConfig, getComponent: () => SliderComponent) =>
  // Generic, so the accumulated pipeline type survives to whatever follows.
  // There used to be a `if (!component.element)` guard here, warning and
  // returning the component untouched: withElement runs before this in the
  // only pipe that calls it, so it could not fire, and an early return makes
  // the return type a union that collapses to C.
  <C extends ControllerHost>(component: C) => {
  // Initialize state with current config
  const max = config.max !== undefined ? config.max : 100;
  const state: SliderState = {
    value: config.value !== undefined ? config.value : 0,
    // A range slider's second value defaults to max, which is what withDom
    // already renders the second handle at. The two disagreed: the handle went
    // up with `aria-valuenow="100"` while the state said null, so the component
    // gave three answers at once -- the picture said 20 to 100, the screen
    // reader said 20 to 100, and getSecondValue() said there was no second
    // value. Outside a range there is genuinely no second handle, so null.
    secondValue:
      config.secondValue !== undefined
        ? config.secondValue
        : config.range
          ? max
          : null,
    min: config.min !== undefined ? config.min : 0,
    max,
    step: config.step !== undefined ? config.step : 1,
    dragging: false,
    pressed: false, // Track if handle is pressed (mouse down)
    activeHandle: null, // Track which handle is active (null, 'first', 'second')
    activeBubble: null,
    valueHideTimer: null,
  };

  /**
   * Reports a slider event. The payload carries the final component (the one
   * createSlider returns), which is why it is resolved when the event fires.
   */
  const emitEvent = (eventName: string, originalEvent: Event | null = null) => {
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

  //=============================================================================
  // UI RENDERING FUNCTIONS
  //=============================================================================

  // A discrete slider insets every step, ends included, by the track's corner
  // radius; a continuous one spans the whole track (see trackPositionCss).
  // Read at each use: a right-to-left layout is known only once the slider is placed.
  const axisNow = () => getAxis(config, isRtl(component.element));
  const inset = () => config.ticks ? getExternalTrackRadius(component.getSize?.() ?? config.size) : 0;

  // Percentage plus the inset stays aligned when the container resizes.
  const visualPosition = (value: number) =>
    trackPositionCss(fractionOf(value, state.min, state.max), inset());

  /**
   * Gets slider value from a position on the track
   * Maps from pixel position to slider value
   */
  const getValueFromPosition = (position: number): number => {
    const { handle, container } = component;

    if (!handle || !container) return state.min;

    try {
      const containerRect = container.getBoundingClientRect();
      const range = state.max - state.min;

      // The inverse of trackPositionCss: a discrete slider reads that inset scale,
      // and a pointer past either end clamps to the first or last step.
      // `position` is a client coordinate on the slider's axis.
      const edge = inset();
      const axis = axisNow();
      const span = lengthOf(containerRect, axis) - 2 * edge;
      const along = offsetAlong(position, containerRect, axis) - edge;
      const fraction = span > 0 ? Math.max(0, Math.min(1, along / span)) : 0;

      return state.min + fraction * range;
    } catch (error) {
      console.warn("Error calculating value from position:", error);
      return state.min;
    }
  };

  /**
   * Rounds a value to the nearest step
   * Used for discrete sliders
   */
  const roundToStep = (value: number): number => {
    const step = state.step;
    if (!step || step <= 0) return value;

    const steps = Math.round((value - state.min) / step);
    return state.min + steps * step;
  };

  /**
   * Clamps a value between min and max
   * Ensures values stay within valid range
   */
  const clamp = (value: number, min = state.min, max = state.max): number =>
    Math.min(Math.max(value, min), max);

  /**
   * Updates handle and bubble positions
   * Positions elements according to current state values
   */
  const updateHandlePositions = () => {
    const { handle, container, valueBubble, secondHandle, secondValueBubble } = component;

    if (!handle || !container) return;

    // Along the axis the position; across it the handle is centred on the track,
    // which the stylesheet does for a vertical slider.
    const axis = axisNow();
    // Along the axis the position, clearing the side an earlier render or withDom
    // wrote: across a vertical track the stylesheet centres the element, and the
    // value indicator's stylesheet anchors it on the left, which RTL undoes.
    const place = (element: HTMLElement, value: number, transform: string) => {
      if (axis.vertical) element.style.left = "";
      if (axis.start === "right") element.style.left = "auto";
      if (axis.start === "left") element.style.right = "";
      element.style[axis.start] = visualPosition(value);
      element.style.transform = transform;
    };
    place(handle, state.value, handleTransform(axis));
    if (valueBubble) place(valueBubble, state.value, bubbleTransform(axis));

    // Update second handle if range slider
    if (config.range && secondHandle && state.secondValue !== null) {
      place(secondHandle, state.secondValue, handleTransform(axis));
      if (secondValueBubble) place(secondValueBubble, state.secondValue, bubbleTransform(axis));
    }

    // Update ARIA attributes
    updateHandleAria(handle, state.value);
    if (config.range && secondHandle && state.secondValue !== null) {
      updateHandleAria(secondHandle, state.secondValue);
      // Each handle of a range can go only as far as the other, and says so.
      handle.setAttribute("aria-valuemax", String(state.secondValue));
      secondHandle.setAttribute("aria-valuemin", String(state.value));
    }
  };

  /**
   * Syncs a handle's current value attributes; aria-valuetext only
   * carries a custom valueFormatter's text (the default adds nothing).
   */
  const updateHandleAria = (handleElement: HTMLElement, value: number) => {
    handleElement.setAttribute("aria-valuenow", String(value));
    if (
      config.valueFormatter &&
      config.valueFormatter !== defaultConfig.valueFormatter
    ) {
      handleElement.setAttribute("aria-valuetext", config.valueFormatter(value));
    }
  };

  /**
   * Updates value bubble content
   * Applies formatting to displayed values
   */
  const updateValueBubbles = () => {
    const { valueBubble, secondValueBubble } = component;

    if (!valueBubble) return;

    const formatter = config.valueFormatter || ((value) => value.toString());
    valueBubble.textContent = formatter(state.value);

    if (config.range && secondValueBubble && state.secondValue !== null) {
      secondValueBubble.textContent = formatter(state.secondValue);
    }
  };

  /**
   * Shows or hides value bubble
   * Controls visibility for value indicators
   */
  const showValueBubble = (
    bubbleElement: HTMLElement | null,
    show: boolean,
  ): void => {
    if (!bubbleElement || !config.showValue) return;

    const bubbleClass = component.getClass("slider__value");
    bubbleElement.classList[show ? "add" : "remove"](`${bubbleClass}--visible`);
  };

  /**
   * Renders all UI elements to match current state
   * Central method for keeping UI in sync with state
   */
  // A value change that does not follow a pointer settles on the default spatial
  // spring; the stylesheet animates only while the root carries `--settling`, so a
  // drag and a layout render (the first one, a resize) move nothing.
  // The timer is the spring's duration, by design: it takes the class off again.
  const SETTLE_MS = 450; // spring-default-spatial-duration
  let rendered: { value: number; secondValue: number | null } | null = null;
  let settleTimer: ReturnType<typeof setTimeout> | null = null;
  const settle = () => {
    const settling = component.getClass("slider--settling");
    const changed = rendered !== null &&
      (rendered.value !== state.value || rendered.secondValue !== state.secondValue);
    rendered = { value: state.value, secondValue: state.secondValue };
    if (state.dragging) {
      if (settleTimer !== null) clearTimeout(settleTimer);
      settleTimer = null;
      component.element.classList.remove(settling);
      return;
    }
    if (!changed) return;
    component.element.classList.add(settling);
    if (settleTimer !== null) clearTimeout(settleTimer);
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

      // Every path that moves the slider ends here — drag, keyboard, both
      // setters whether or not they trigger an event, and min/max clamping —
      // so this is the one place the submitted value has to be kept in step.
      if (component.formFields) {
        setFormValue(component.formFields[0], String(state.value));
        if (state.secondValue !== null) {
          setFormValue(component.formFields[1], String(state.secondValue));
        }
      }

      // Trigger track redraw if available
      if (component.renderTracks) {
        // Pass the current state directly to track
        component.renderTracks(state);
      }
    } catch (error) {
      console.warn("Error rendering UI:", error);
    }
  };

  //=============================================================================
  // EVENT HANDLERS
  //=============================================================================

  // The coordinate along the slider's axis: y for a vertical slider.
  const pointerOf = config.orientation === "vertical" ? clientYOf : clientXOf;
  // The values a handle may take: a range handle stops at the other one.
  const rangeBounds = (isSecondHandle: boolean): [number, number] =>
    !config.range || state.secondValue === null
      ? [state.min, state.max]
      : isSecondHandle
        ? [state.value, state.max]
        : [state.min, state.secondValue];

  const { container, handle, valueBubble, secondHandle, secondValueBubble } = component;
  const handleFor = (second: boolean) => (second ? secondHandle : handle) ?? null;
  const bubbleFor = (second: boolean) => (second ? secondValueBubble : valueBubble) ?? null;
  const disabled = () => !!component.disabled?.isDisabled();

  // Track whether a real drag has started
  let hasActualDragStarted = false;
  let initialX = 0;
  const DRAG_THRESHOLD = 3;

  // Last focused handle tracker for keyboard navigation
  let lastFocusedHandle: HTMLElement | null = null;

  // Bubble management
  const clearBubbleHideTimer = () => {
    if (state.valueHideTimer) {
      clearTimeout(state.valueHideTimer);
      state.valueHideTimer = null;
    }
  };

  const hideAllBubbles = () => {
    clearBubbleHideTimer();
    if (valueBubble) showValueBubble(valueBubble, false);
    if (secondValueBubble) showValueBubble(secondValueBubble, false);
  };

  const showActiveBubble = (bubble: HTMLElement | null) => {
    hideAllBubbles();
    if (bubble && config.showValue) showValueBubble(bubble, true);
  };

  const hideActiveBubble = (bubble: HTMLElement | null, delay = 0) => {
    clearBubbleHideTimer();
    if (!bubble || !config.showValue) return;

    // A timer by design: the value label lingers after a release or a blur so
    // it can still be read. Cleared on the next show and on destroy.
    if (delay > 0) {
      state.valueHideTimer = setTimeout(() => {
        showValueBubble(bubble, false);
      }, delay);
    } else {
      showValueBubble(bubble, false);
    }
  };

  // Focus management
  const clearKeyboardFocus = () => {
    // Clear local focus indicators
    if (handle)
      handle.classList.remove(
        `${component.getClass("slider__handle")}--focused`,
      );
    if (secondHandle)
      secondHandle.classList.remove(
        `${component.getClass("slider__handle")}--focused`,
      );

    // Clear any focus indicator this slider still carries.
    //
    // This used to sweep the whole document, which stripped the focus ring
    // from every other slider on the page: touching one slider made a keyboard
    // user lose the indicator telling them where they were in another. It is
    // also redundant for this slider's own handles, which the two lines above
    // already clear.
    try {
      const focusClass = component.getClass("slider__handle--focused");
      component.element
        .querySelectorAll(`.${focusClass}`)
        .forEach((el: Element) => {
          el.classList.remove(focusClass);
        });

      // Only blur a handle belonging to this slider. Blurring on the strength
      // of a class name alone took focus off another component's handle.
      const active = activeElementOf(component.element) as HTMLElement | null;
      if (
        active &&
        component.element.contains(active) &&
        active.classList.contains(component.getClass("slider__handle"))
      ) {
        active.blur();
      }
    } catch (error) {
      console.warn("Error clearing keyboard focus:", error);
    }
  };

  // The document follows a pointer until it is released; both a handle press
  // and a track press start it, and both used to write the four lines out.
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

  /**
   * Handle mouse/touch down on a handle
   */
  const handleHandleMouseDown = (
    e: SliderPointerEvent,
    isSecondHandle = false,
  ) => {
    // Check if disabled
    if (disabled()) {
      return;
    }

    // Only preventDefault for mouse events to allow passive touchstart
    if (e.type === "mousedown") {
      e.preventDefault();
    }
    e.stopPropagation();

    hideAllBubbles();
    clearKeyboardFocus();

    // Capture initial position
    initialX = pointerOf(e);

    // Setup drag state
    state.dragging = false;
    state.pressed = true; // Set pressed state immediately
    hasActualDragStarted = false;
    state.activeHandle = isSecondHandle ? "second" : "first"; // Track which handle
    state.activeBubble = bubbleFor(isSecondHandle);

    // Show bubble immediately
    showActiveBubble(state.activeBubble);

    // Add global event listeners
    followPointer();

    render();
    emitEvent(SLIDER_EVENTS.START, e);
  };

  /**
   * Handle mouse/touch down on the track
   */
  const handleTrackMouseDown = (e: SliderPointerEvent) => {
    // Check if disabled
    if (disabled() || !container) {
      return;
    }

    // Only preventDefault for mouse events to allow passive touchstart
    if (e.type === "mousedown") {
      e.preventDefault();
    }
    hideAllBubbles();
    clearKeyboardFocus();

    // Determine which handle to move
    let isSecondHandle = false;

    try {
      const position = pointerOf(e);

      // Calculate value at click position and apply constraints
      let newValue = getValueFromPosition(position);
      if (config.snapToSteps && state.step > 0)
        newValue = roundToStep(newValue);
      newValue = clamp(newValue, state.min, state.max);

      if (config.range && state.secondValue !== null) {
        // For range slider, move the closest handle
        const distToFirst = Math.abs(newValue - state.value);
        const distToSecond = Math.abs(newValue - state.secondValue);

        isSecondHandle = distToSecond < distToFirst;
        isSecondHandle
          ? (state.secondValue = newValue)
          : (state.value = newValue);
      } else {
        // Regular slider - direct update
        state.value = newValue;
      }

      // Update UI and trigger events
      render();
      emitEvent(SLIDER_EVENTS.INPUT, e);
    } catch (error) {
      console.warn("Error handling track click:", error);
    }

    // Set active elements
    state.activeHandle = isSecondHandle ? "second" : "first";
    state.activeBubble = bubbleFor(isSecondHandle);

    // Store the initial position
    initialX = pointerOf(e);

    // For centered sliders, delay starting drag to allow animation
    if (config.centered && !config.range) {
      // Show bubble
      showActiveBubble(state.activeBubble);

      // Add event listeners but don't start dragging yet
      followPointer();

      // Don't set pressed state for track clicks
      state.pressed = false;

      emitEvent(SLIDER_EVENTS.START, e);
    } else {
      // For non-centered sliders, start drag but don't set pressed since it's a track click
      state.dragging = false;
      state.pressed = false; // Don't set pressed for track clicks
      hasActualDragStarted = false;

      // Show bubble
      showActiveBubble(state.activeBubble);

      // Add event listeners
      followPointer();

      render();
      emitEvent(SLIDER_EVENTS.START, e);
    }
  };

  /**
   * Handle mouse/touch move during drag
   */
  const handleMouseMove = (e: SliderPointerEvent) => {
    if (!state.activeHandle || !container) return;
    e.preventDefault();

    try {
      // Get current position
      const currentX = pointerOf(e);

      // Determine if we've started a real drag
      if (
        !hasActualDragStarted &&
        Math.abs(currentX - initialX) >= DRAG_THRESHOLD
      ) {
        hasActualDragStarted = true;
        state.dragging = true;
        component.element.classList.add(
          `${component.getClass("slider")}--dragging`,
        );
      }

      // Calculate new value and apply constraints
      let newValue = getValueFromPosition(currentX);
      if (config.snapToSteps && state.step > 0)
        newValue = roundToStep(newValue);
      newValue = clamp(newValue, state.min, state.max);

      // A range handle stops at the other one rather than crossing it (Compose's
      // RangeSlider coerces each value to the other). The handles used to swap
      // roles mid-drag.
      const isSecondHandle = state.activeHandle === "second";

      if (config.range && state.secondValue !== null) {
        const [low, high] = rangeBounds(isSecondHandle);
        const clamped = Math.min(high, Math.max(low, newValue));
        if (isSecondHandle) state.secondValue = clamped;
        else state.value = clamped;
      } else {
        state.value = newValue;
      }

      render();
      emitEvent(SLIDER_EVENTS.INPUT, e);
    } catch (error) {
      console.warn("Error during slider drag:", error);
    }
  };

  /**
   * Handle mouse/touch up after drag
   */
  const handleMouseUp = (e: SliderPointerEvent) => {
    if (!state.activeHandle) return;
    e.preventDefault();

    // Reset drag states
    state.dragging = false;
    state.pressed = false; // Clear pressed state
    hasActualDragStarted = false;
    component.element.classList.remove(
      `${component.getClass("slider")}--dragging`,
    );

    // Hide bubble with delay
    hideActiveBubble(state.activeBubble, 1000);

    // Remove global event listeners
    stopFollowing();

    // Reset active handle and update UI
    state.activeHandle = null;
    render();

    // Trigger events
    emitEvent(SLIDER_EVENTS.CHANGE, e);
    emitEvent(SLIDER_EVENTS.END, e);
  };

  /**
   * Handle keyboard input
   */
  const handleKeyDown = (e: KeyboardEvent, isSecondHandle = false) => {
    if (disabled()) return;

    const step = state.step || 1;
    let newValue = isSecondHandle ? state.secondValue : state.value;
    // `range: true` with no `secondValue` gives a second handle and a null
    // second value. There is nothing to move, and arithmetic on null would
    // have produced a value out of nowhere.
    if (newValue === null) return;
    const stepSize = e.shiftKey ? step * 10 : step;

    // Handle tab key separately
    if (e.key === "Tab") return;

    // Along the track the arrows follow it as drawn (reversed in RTL, and on a
    // top-to-bottom vertical slider); across it they keep ARIA's meaning. PageUp and
    // PageDown move a tenth of the steps, one to ten of them (Compose's
    // `(steps + 1) / 10`, coerced to 1..10), raising on a horizontal slider and
    // following the track on a vertical one.
    const axis = getAxis(config, isRtl(component.element));
    const sign = arrowSign(axis);
    const intervals = Math.max(1, Math.floor((state.max - state.min) / step));
    const page = Math.min(10, Math.max(1, Math.floor(intervals / 10))) * step;
    const along = axis.vertical ? ["ArrowUp", "ArrowDown"] : ["ArrowRight", "ArrowLeft"];
    let target: number;
    if (e.key === along[0]) target = newValue + sign * stepSize;
    else if (e.key === along[1]) target = newValue - sign * stepSize;
    else if (e.key === "ArrowUp" || e.key === "ArrowRight") target = newValue + stepSize;
    else if (e.key === "ArrowDown" || e.key === "ArrowLeft") target = newValue - stepSize;
    else if (e.key === "PageUp") target = newValue + (axis.vertical ? sign : 1) * page;
    else if (e.key === "PageDown") target = newValue - (axis.vertical ? sign : 1) * page;
    else if (e.key === "Home") target = state.min;
    else if (e.key === "End") target = state.max;
    else return; // Exit if not a handled key
    e.preventDefault();
    // A range handle stops at the other one, as Compose's RangeSlider coerces it.
    const [low, high] = rangeBounds(isSecondHandle);
    newValue = Math.min(high, Math.max(low, target));


    // Update active bubble reference
    state.activeBubble = bubbleFor(isSecondHandle);

    // Show value bubble during keyboard interaction
    showActiveBubble(state.activeBubble);

    // Update the value
    if (isSecondHandle) {
      state.secondValue = newValue;
    } else {
      state.value = newValue;
    }

    // Update UI and trigger events
    render();
    emitEvent(SLIDER_EVENTS.INPUT, e);
    emitEvent(SLIDER_EVENTS.CHANGE, e);
  };

  /**
   * Handle focus events
   */
  const handleFocus = (e: FocusEvent, isSecondHandle = false) => {
    if (disabled()) return;

    // Track the currently focused handle
    const currentHandle = handleFor(isSecondHandle);

    // Hide previous bubble if switching between handles
    if (lastFocusedHandle && lastFocusedHandle !== currentHandle) {
      hideAllBubbles();
    }

    if (!currentHandle) return;
    lastFocusedHandle = currentHandle;

    // Add focus class and show bubble
    currentHandle.classList.add(
      `${component.getClass("slider__handle")}--focused`,
    );
    showActiveBubble(bubbleFor(isSecondHandle));
    state.activeBubble = bubbleFor(isSecondHandle);
    // A focused handle narrows to 2dp and the track's gap follows it.
    render();

    emitEvent(SLIDER_EVENTS.FOCUS, e);
  };

  /**
   * Handle blur events
   */
  const handleBlur = (e: FocusEvent, isSecondHandle = false) => {
    const handleElement = handleFor(isSecondHandle);
    if (!handleElement) return;
    handleElement.classList.remove(
      `${component.getClass("slider__handle")}--focused`,
    );
    render();

    // Only hide bubble if not tabbing to another handle
    const relatedTarget = e.relatedTarget;
    const otherHandle = handleFor(!isSecondHandle);

    if (!relatedTarget || relatedTarget !== otherHandle) {
      hideActiveBubble(bubbleFor(isSecondHandle), 200);
    }

    emitEvent(SLIDER_EVENTS.BLUR, e);
  };

  /**
   * Set up all event listeners
   */
  // Each handle's listeners, made once and kept, so cleanup removes the very
  // functions setup added. Both used to be written inline, and removeEventListener
  // matches by reference, so no handle listener was ever removed: after destroy a
  // key still moved the value and focus still showed the bubble.
  const listenersFor = (isSecondHandle: boolean) => ({
    press: (e: SliderPointerEvent) => handleHandleMouseDown(e, isSecondHandle),
    keydown: (e: KeyboardEvent) => handleKeyDown(e, isSecondHandle),
    focus: (e: FocusEvent) => handleFocus(e, isSecondHandle),
    blur: (e: FocusEvent) => handleBlur(e, isSecondHandle),
  });
  const handleListeners = listenersFor(false);
  const secondHandleListeners = listenersFor(true);
  const attach = (element: HTMLElement, listeners: ReturnType<typeof listenersFor>) => {
    element.addEventListener("mousedown", listeners.press);
    element.addEventListener("touchstart", listeners.press, { passive: true });
    element.addEventListener("keydown", listeners.keydown);
    element.addEventListener("focus", listeners.focus);
    element.addEventListener("blur", listeners.blur);
  };
  const detach = (element: HTMLElement, listeners: ReturnType<typeof listenersFor>) => {
    element.removeEventListener("mousedown", listeners.press);
    element.removeEventListener("touchstart", listeners.press);
    element.removeEventListener("keydown", listeners.keydown);
    element.removeEventListener("focus", listeners.focus);
    element.removeEventListener("blur", listeners.blur);
  };

  const setupEventListeners = () => {
    if (!handle || !container) {
      console.warn(
        "Cannot set up event listeners: missing container or handle",
      );
      return;
    }

    // Use container for track events instead of track for better UX
    container.addEventListener("mousedown", handleTrackMouseDown);
    container.addEventListener("touchstart", handleTrackMouseDown, {
      passive: true,
    });

    attach(handle, handleListeners);
    if (config.range && secondHandle) attach(secondHandle, secondHandleListeners);
  };

  const cleanupEventListeners = () => {
    // Clean up container listeners
    if (container) {
      container.removeEventListener("mousedown", handleTrackMouseDown);
      container.removeEventListener("touchstart", handleTrackMouseDown);
    }

    if (handle) detach(handle, handleListeners);
    if (config.range && secondHandle) detach(secondHandle, secondHandleListeners);

    // Clean up document listeners
    stopFollowing();
  };

  // Initialize slider controller
  const initController = () => {
    try {
      // Verify we have the necessary components
      if (!handle) {
        console.warn(
          "Cannot initialize slider controller: missing required handle component",
        );
        return;
      }

      // Set handle attributes
      handle.setAttribute("aria-valuemin", String(state.min));
      handle.setAttribute("aria-valuemax", String(state.max));
      handle.setAttribute("aria-valuenow", String(state.value));

      if (config.range && secondHandle && state.secondValue !== null) {
        secondHandle.setAttribute("aria-valuemin", String(state.min));
        secondHandle.setAttribute("aria-valuemax", String(state.max));
        secondHandle.setAttribute("aria-valuenow", String(state.secondValue));
      }

      // Setup event listeners
      setupEventListeners();

      // Initial UI update
      render();
    } catch (error) {
      console.error("Error initializing slider controller:", error);
    }
  };

  // Listeners, ARIA and the first render are synchronous: keys and the pointer
  // work as soon as the slider exists, and a pointer reads the track's box at
  // event time. They used to wait a task, so an element recreating the slider
  // (a form reset, toggling range) ignored input until then. #236.
  initController();

  // What needs the slider placed is redone once it is: the direction comes from
  // an ancestor's dir, and the track measures its length (withTracks observes it
  // too). The observer reports a box when it is first laid out, then on resizes.
  const layout = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => updateHandlePositions()) : null;
  layout?.observe(component.element);

  // Register with lifecycle if available
  if (component.lifecycle) {
    const originalDestroy = component.lifecycle.destroy || (() => {});
    component.lifecycle.destroy = () => {
      layout?.disconnect();
      if (settleTimer !== null) clearTimeout(settleTimer);
      if (state.valueHideTimer !== null) clearTimeout(state.valueHideTimer);
      cleanupEventListeners();
      originalDestroy.call(component.lifecycle);
    };
  }

  //=============================================================================
  // THE PUBLIC API
  //=============================================================================

  // Each method returns the object it was called on, so calls chain. The same
  // function objects sit on the component and on the legacy `slider` object
  // below: one door, not three.
  const api: SliderComponent = {
    element: component.element,

    /**
     * Sets slider value
     * @param value New value
     * @param triggerEvent Emits `change` when true; silent by default, as a native input
     * @returns Slider component for chaining
     */
    setValue(value: number, triggerEvent = false) {
      // A range slider's first value stops at its second, as Compose's
      // RangeSliderState coerces activeRangeStart.
      const ceiling = config.range && state.secondValue !== null ? state.secondValue : state.max;
      // Snapped to the step, as keys and the pointer are and as Compose's
      // SliderState snaps a value it is given (shouldAutoSnap).
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

    /**
     * Sets secondary slider value (for range slider)
     * @param value New secondary value
     * @param triggerEvent Emits `change` when true; silent by default, as a native input
     * @returns Slider component for chaining
     */
    setSecondValue(value: number, triggerEvent = false) {
      if (!config.range) return this;

      // ...and the second at the first (activeRangeEnd).
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

    /**
     * Sets slider minimum value
     * @param min New minimum value
     * @returns Slider component for chaining
     */
    setMin(min: number) {
      state.min = min;

      // Update ARIA attributes on handles
      if (handle) {
        handle.setAttribute("aria-valuemin", String(min));
      }

      if (config.range && secondHandle) {
        secondHandle.setAttribute("aria-valuemin", String(min));
      }

      // Clamp values to new min
      if (state.value < min) state.value = min;
      if (
        config.range &&
        state.secondValue !== null &&
        state.secondValue < min
      ) {
        state.secondValue = min;
      }

      render();
      return this;
    },

    getMin() {
      return state.min;
    },

    /**
     * Sets slider maximum value
     * @param max New maximum value
     * @returns Slider component for chaining
     */
    setMax(max: number) {
      state.max = max;

      // Update ARIA attributes on handles
      if (handle) {
        handle.setAttribute("aria-valuemax", String(max));
      }

      if (config.range && secondHandle) {
        secondHandle.setAttribute("aria-valuemax", String(max));
      }

      // Clamp values to new max
      if (state.value > max) state.value = max;
      if (
        config.range &&
        state.secondValue !== null &&
        state.secondValue > max
      ) {
        state.secondValue = max;
      }

      render();
      return this;
    },

    getMax() {
      return state.max;
    },

    /**
     * Sets slider step size
     * @param step New step size
     * @returns Slider component for chaining
     */
    setStep(step: number) {
      state.step = step;
      render();

      // Add or remove discrete class
      component.element.classList[step > 0 ? "add" : "remove"](
        `${component.getClass("slider")}--discrete`,
      );

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

    setColor(color: SliderColor) {
      component.appearance.setColor(color);
      return this;
    },

    getColor() {
      return component.appearance.getColor();
    },

    setSize(size: SliderSize) {
      component.setSize?.(size);
      return this;
    },

    getSize() {
      return component.getSize?.() ?? "XS";
    },

    showTicks(show: boolean) {
      component.appearance.showTicks(show);
      return this;
    },

    showCurrentValue(show: boolean) {
      component.appearance.showCurrentValue(show);
      return this;
    },

    setLabel(text: string) {
      component.label?.setText(text);
      return this;
    },

    getLabel() {
      return component.label?.getText() ?? "";
    },

    setInsetIcon(icon: string, atMin?: string) {
      component.setInsetIcon?.(icon, atMin);
      return this;
    },

    setIcon(iconHtml: string) {
      component.icon?.setIcon(iconHtml);
      return this;
    },

    getIcon() {
      return component.icon?.getIcon() ?? "";
    },

    on<K extends keyof SliderEvents>(event: K, handler: SliderEvents[K]) {
      component.on?.(event, handler as EventCallback);
      return this;
    },

    off<K extends keyof SliderEvents>(event: K, handler: SliderEvents[K]) {
      component.off?.(event, handler as EventCallback);
      return this;
    },

    destroy() {
      component.lifecycle?.destroy?.();
    },
  };

  // The older door onto the same functions, plus the two names only it had.
  // The public component never carried either.
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
      render(); // Track will redraw ticks based on current state
      return this;
    },
    updateUi() {
      render();
      return this;
    },
  };

  // Return enhanced component
  return {
    ...component,
    ...api,
    // Provide controller API under 'slider' property for backward compatibility
    slider,
  };
};
