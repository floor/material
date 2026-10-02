import { SliderConfig, SliderColor } from "../types";
import { SLIDER_SIZES, SLIDER_MEASUREMENTS, SliderSize } from "../constants";
import { PREFIX } from "../../../core/config";
import { cornerToken, type ShapeStep } from "../../../core/theme/shape";
import { sliderSizeClass } from "../config";
import { setHTML } from "../../../core/dom/html";
import { getAxis, isRtl, lengthOf, type SliderAxis } from "./axis";

export const getTrackHeight = (size?: SliderSize): number => {
  if (typeof size === "number") {
    return Math.max(size, SLIDER_SIZES.XS);
  }

  if (typeof size === "string" && size in SLIDER_SIZES) {
    return SLIDER_SIZES[size as keyof typeof SLIDER_SIZES];
  }

  return SLIDER_SIZES.XS; // Default to XS
};

/**
 * Gets the handle height based on the slider size
 */
export const getHandleHeight = (size?: SliderSize): number => {
  const trackHeight = getTrackHeight(size);

  // For XS and S sizes, use SMALL_HANDLE_HEIGHT constant
  if (trackHeight <= SLIDER_SIZES.S) {
    return SLIDER_MEASUREMENTS.SMALL_HANDLE_HEIGHT;
  }

  // For M, L, XL sizes, handle height is larger than track by HANDLE_HEIGHT_OFFSET
  return trackHeight + SLIDER_MEASUREMENTS.HANDLE_HEIGHT_OFFSET;
};

/**
 * Gets the track's outer corner radius for a size: 8 / 8 / 12 / 16 / 28 for
 * XS / S / M / L / XL (material-components-android slider tokens, m3.material.io
 * slider specs). A numeric size takes the radius of the named size it falls in.
 *
 * It is also the inset of the value positions: Compose lays the values out over the
 * track less one corner radius at each end (Slider.kt drawTrack), so the first and
 * last values sit at the centres of the rounded ends. FLO-250.
 */
/** The steps of the track's corner radii (Compose SliderTokens: small to extra-large). */
const TRACK_STEPS: Record<number, ShapeStep> = { 8: "small", 12: "medium", 16: "large", 28: "extra-large" };

export const getExternalTrackRadius = (size?: SliderSize): number => {
  const trackHeight = getTrackHeight(size);
  if (trackHeight <= SLIDER_SIZES.S) return 8;
  if (trackHeight <= SLIDER_SIZES.M) return 12;
  if (trackHeight <= SLIDER_SIZES.L) return 16;
  return 28;
};

/**
 * Where a value sits along a track `width` wide, from its fraction of the range.
 * A continuous slider spans the whole track, so its ends meet the rounded corners; a
 * discrete one puts its interior steps on a scale inset by a corner radius at each
 * end, while the first and last steps still reach the edges (Slider.kt drawTrack:
 * `sliderValueEnd`, `isEndOnFirstOrLastStep`). `inset` is 0 for a continuous slider.
 */
export const trackPosition = (fraction: number, width: number, inset: number): number =>
  inset && fraction > 0 && fraction < 1 ? inset + fraction * (width - 2 * inset) : fraction * width;

/** The same position as CSS, so a handle stays in place when the track resizes. */
export const trackPositionCss = (fraction: number, inset: number): string =>
  inset && fraction > 0 && fraction < 1
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

/** Decorative tracks and ticks. Handles and controller retain interaction ownership. */
/** What this feature reads off the component it is handed. */
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
  // accept that. VisualState is declared in this file, which is the same
  // place the producer lives. FLO-114.
  renderTracks?: (state?: VisualState) => void;
  setInsetIcon?: (icon: string, atMin?: string) => void;
  lifecycle: { destroy: () => void };
}

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
    const fraction = (value: number) => Math.min(1, Math.max(0,
      state.max === state.min ? 0 : (value - state.min) / (state.max - state.min),
    ));
    // trackPosition, as a fraction plus pixels. The inset drops off at the ends.
    const atValue = (value: number): Along => {
      const f = fraction(value);
      return ap(f, inset && f > 0 && f < 1 ? inset * (1 - 2 * f) : 0);
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
      // Ticks sit on the inset scale, including the ends (trackPosition drops the
      // inset there). TickSize 4dp, and none is drawn within a gap of a handle.
      // cqw/cqh: background-position percentages are not a fraction of the box.
      const stepF = state.step / (state.max - state.min);
      const repeat = `max(0.01px, ${alongCss(ap(stepF, -2 * inset * stepF))})`;
      const offset = alongCss(ap(-stepF / 2, inset * (1 + stepF)), axis.vertical ? "cqh" : "cqw");
      const tickAt = (value: number): Along => {
        const f = fraction(value);
        return ap(f, inset * (1 - 2 * f));
      };
      const last = tickAt(state.min + Math.floor((state.max - state.min) / state.step) * state.step);
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
    // so a slider made at M and set to XL wore both. FLO-107.
    const previous = sliderSizeClass(size), current = sliderSizeClass(next);
    if (previous) component.element.classList.remove(previous);
    if (current) component.element.classList.add(current);
    size = next;
    const handleHeight = getHandleHeight(size);
    // Sizes are thicknesses: across the axis. A vertical slider's length is its CSS height.
    container.style[axis.cross] = `${Math.max(handleHeight, SLIDER_MEASUREMENTS.MIN_HEIGHT)}px`;
    track.style[axis.cross] = `${getTrackHeight(size)}px`;
    // The track's corner step (small to extra-large), read through its token (FLO-331)
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
