import { SliderConfig, SliderColor } from "../types";
import { SLIDER_SIZES, SLIDER_MEASUREMENTS, SliderSize } from "../constants";
import { PREFIX } from "../../../core/config";
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
  // textfield's withDensity (#109).
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
    // The track's length along the axis; the names below say width for it.
    const width = lengthOf(container.getBoundingClientRect(), axis) || 200;
    const corner = getExternalTrackRadius(size);
    const inset = config.ticks ? corner : 0;
    const fraction = (value: number) => Math.min(1, Math.max(0,
      state.max === state.min ? 0 : (value - state.min) / (state.max - state.min),
    ));
    const position = (value: number) => trackPosition(fraction(value), width, inset);
    const first = position(state.value);
    const second = position(state.secondValue ?? state.max);
    // ThumbTrackGapSize is measured from the handle's edge, so it is half the handle's
    // current width plus 6dp from its centre.
    const gapOf = (which: "first" | "second") =>
      (narrowed(which) ? NARROW_HANDLE_WIDTH : HANDLE_WIDTH) / 2 + SLIDER_MEASUREMENTS.HANDLE_GAP;
    const firstGap = gapOf("first");
    const secondGap = gapOf("second");
    let parts: [number, number, boolean][];
    let activeStart: number, activeEnd: number;
    if (config.centered) {
      // The active track runs from the centre to the handle, with the gap on the
      // handle's side only; the inactive track stops one gap before the centre.
      const zero = position(Math.min(state.max, Math.max(state.min, 0)));
      if (first >= zero) {
        activeStart = zero; activeEnd = first;
        parts = [[0, zero - firstGap, false], [zero, first - firstGap, true], [first + firstGap, width, false]];
      } else {
        activeStart = first; activeEnd = zero;
        parts = [[0, first - firstGap, false], [first + firstGap, zero, true], [zero + firstGap, width, false]];
      }
    } else if (config.range && state.secondValue !== null) {
      const lowIsFirst = first <= second;
      const [low, high] = lowIsFirst ? [first, second] : [second, first];
      const [lowGap, highGap] = lowIsFirst ? [firstGap, secondGap] : [secondGap, firstGap];
      activeStart = low; activeEnd = high;
      parts = [[0, low - lowGap, false], [low + lowGap, high - highGap, true], [high + highGap, width, false]];
    } else {
      activeStart = 0; activeEnd = first;
      parts = [[0, 0, false], [0, first - firstGap, true], [first + firstGap, width, false]];
    }
    // A piece of track that meets an end of the slider is drawn only while it is
    // longer than the corner radius (drawTrack's activeTrackThreshold and inactive
    // thresholds): below that its rounded end would paint as a sliver.
    const standard = !config.centered && !(config.range && state.secondValue !== null);
    parts.forEach((part, index) => {
      const meetsEnd = index !== 1 || standard;
      if (meetsEnd && part[1] - part[0] <= corner) part[1] = part[0];
    });
    segments.forEach((segment, index) => {
      const [start, end, active] = parts[index] ?? [0, 0, false];
      at(segment, `${start}px`);
      segment.style[axis.size] = `${Math.max(0, end - start)}px`;
      segment.classList.toggle(component.getClass("slider__segment--active"), active);
    });
    // A stop indicator ends each inactive piece that is drawn. With ticks the ends are
    // ticks already.
    dots[0].hidden = !!config.ticks || standard || parts[0][1] <= parts[0][0];
    dots[1].hidden = !!config.ticks || parts[2][1] <= parts[2][0];
    at(dots[0], `${corner - 2}px`);
    at(dots[1], `${width - corner - 2}px`);
    placeInsetIcon(parts);
    const discrete = !!config.ticks && state.step > 0 && state.max > state.min;
    ticks.forEach(tick => { tick.hidden = !discrete; });
    if (discrete) {
      // Ticks sit on the inset scale, TickSize 4dp, and none is drawn within a gap
      // of a handle.
      const spacing = (width - 2 * inset) * state.step / (state.max - state.min);
      const tickAt = (value: number) => inset + fraction(value) * Math.max(0, width - 2 * inset);
      const last = tickAt(state.min + Math.floor((state.max - state.min) / state.step) * state.step);
      const holes: number[][] = [
        [first - firstGap, first + firstGap],
        ...(config.range && state.secondValue !== null ? [[second - secondGap, second + secondGap]] : []),
      ];
      const mask = (intervals: number[][]) => {
        const merged: number[][] = [];
        for (const [start, end] of intervals.sort((a, b) => a[0] - b[0])) {
          const previous = merged[merged.length - 1];
          if (previous && start <= previous[1]) previous[1] = Math.max(previous[1], end);
          else merged.push([start, end]);
        }
        const stops = merged.flatMap(([start, end]) => [`black ${start}px`, `transparent ${start}px`, `transparent ${end}px`, `black ${end}px`]);
        const direction = { left: "to right", right: "to left", top: "to bottom", bottom: "to top" }[axis.start];
        return stops.length ? `linear-gradient(${direction}, black 0px, ${stops.join(",")}, black 100%)` : "none";
      };
      ticks.forEach((tick, index) => {
        const repeat = `${Math.max(spacing, 0.01)}px`;
        tick.style.backgroundSize = axis.vertical ? `100% ${repeat}` : `${repeat} 100%`;
        tick.style.backgroundPosition = axis.vertical
          ? `center ${axis.start} ${inset - spacing / 2}px`
          : `${axis.start} ${inset - spacing / 2}px center`;
        tick.style.maskImage = mask([
          ...holes,
          ...(index === 0 ? [[activeStart - 2, activeEnd + 2]] : []),
        ]);
      });
      // Cut from the start and from the end of the axis.
      const clip = (fromStart: number, fromEnd: number) => ({
        left: `inset(0 ${fromEnd}px 0 ${fromStart}px)`,
        right: `inset(0 ${fromStart}px 0 ${fromEnd}px)`,
        top: `inset(${fromStart}px 0 ${fromEnd}px 0)`,
        bottom: `inset(${fromEnd}px 0 ${fromStart}px 0)`,
      })[axis.start];
      ticks[0].style.clipPath = clip(0, Math.max(0, width - last - 2));
      ticks[1].style.clipPath = clip(Math.max(0, activeStart - 2), Math.max(0, width - Math.min(last + 2, activeEnd + 2)));
    }
  };
  // Standard sliders at M, L and XL only (m3.material.io specs: 24 / 24 / 32dp). The
  // icon sits INSET_ICON_PADDING from the start of the active track, and on the
  // inactive track when the active one is shorter than the icon and its padding on
  // both sides (material-components-android BaseSlider calculateTrackIconBounds,
  // m3_slider_track_icon_padding = 10dp).
  function placeInsetIcon(parts: [number, number, boolean][]) {
    const trackHeight = getTrackHeight(size);
    const eligible = !config.range && !config.centered && trackHeight >= SLIDER_SIZES.M;
    const markup = state.value <= state.min && insetMarkup.atMin ? insetMarkup.atMin : insetMarkup.icon;
    const iconSize = trackHeight >= SLIDER_SIZES.XL ? 32 : 24;
    const room = iconSize + 2 * INSET_ICON_PADDING;
    const [activeStart, activeEnd] = parts[1];
    const [inactiveStart, inactiveEnd] = parts[2];
    const onActive = activeEnd - activeStart >= room;
    const onInactive = !onActive && inactiveEnd - inactiveStart >= room;
    insetIcon.hidden = !eligible || !markup || (!onActive && !onInactive);
    if (insetIcon.hidden) return;
    if (markup !== shownMarkup) {
      setHTML(insetIcon, markup);
      shownMarkup = markup;
    }
    insetIcon.style.width = insetIcon.style.height = `${iconSize}px`;
    at(insetIcon, `${(onActive ? activeStart : inactiveStart) + INSET_ICON_PADDING}px`);
    insetIcon.classList.toggle(component.getClass("slider__inset-icon--inactive"), onInactive);
  }
  component.setInsetIcon = (icon: string, atMin = "") => {
    if (destroyed) return;
    insetMarkup = { icon, atMin };
    render();
  };

  const setSize = (next: SliderSize) => {
    if (destroyed) return;
    size = next;
    const handleHeight = getHandleHeight(size);
    // Sizes are thicknesses: across the axis. A vertical slider's length is its CSS height.
    container.style[axis.cross] = `${Math.max(handleHeight, SLIDER_MEASUREMENTS.MIN_HEIGHT)}px`;
    track.style[axis.cross] = `${getTrackHeight(size)}px`;
    track.style.borderRadius = `${getExternalTrackRadius(size)}px`;
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
