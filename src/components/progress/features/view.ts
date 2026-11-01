// src/components/progress/features/view.ts
//
// The indicator's SVG view, its size, and the clocks. Sizes follow the
// Material 3 tokens exactly as the canvas did: a linear indicator is as tall
// as its track, or 10dp at the default thickness when it waves; a circular
// one is 40dp, or 48dp when it waves, and can be set from 24dp to 240dp.
//
// What runs where is the point of this file:
//
// - The indeterminate motion — the two bars on the Compose keyframes, the
//   circular spin, kick and sweep, the wave travel — is CSS keyframes on the
//   drawing elements, so it animates on the compositor and costs no script
//   per frame. The canvas ran a requestAnimationFrame loop for every
//   indicator, forever, battery and all; that loop is gone.
// - A value change keeps the canvas's own tween, verbatim: the linear
//   interpolation, the duration that shortens to the interval between
//   updates, the retarget while running and the completion at the maximum.
//   It writes the same geometry to attributes the canvas wrote to pixels.
// - The wave's amplitude fade (500ms) is the one other script animation: it
//   regenerates the wave path, and stops when the wave is where it should be.
//
// `linear.ts` and `circular.ts` hold the geometry both this file and the
// tests share, so what is drawn can be checked against what the canvas drew
// without reading pixels.

import { ProgressConfig, ProgressShape, ProgressThickness } from "../types";
import {
  PROGRESS_CLASSES,
  PROGRESS_VARIANTS,
  PROGRESS_SHAPES,
  PROGRESS_MEASUREMENTS,
  PROGRESS_MOTION,
  PROGRESS_WAVE,
  PROGRESS_THICKNESS,
} from "../constants";
import { observeCanvasResize } from "../../../core/canvas/resize";
import { waveAmplitudeAt, waveAmplitudeTarget } from "./motion";
import { linearDeterminate, linearGapPx, linearWavePath, BarWindow } from "./linear";
import {
  circularDeterminate,
  circularGapUnits,
  circularRadius,
  circularWaveRing,
  circularWaveRotation,
} from "./circular";

const SVG_NS = "http://www.w3.org/2000/svg";

/** Unique ids for the shared wave pattern and the wave window's clip */
let waveId = 0;

interface BaseComponent {
  emit?: (event: string, data?: unknown) => unknown;
  element: HTMLElement;
  getClass: (name: string) => string;
  lifecycle?: {
    init?: () => void;
    destroy?: () => void;
  };
  state?: {
    value?: number;
    max?: number;
    buffer?: number;
    indeterminate?: boolean;
    shape?: ProgressShape;
  };
  // Set by withView; the API checks for each before delegating to it
  view?: SVGSVGElement;
  setValue?: (value: number, animate?: boolean) => void;
  setIndeterminate?: (indeterminate: boolean) => void;
  setThickness?: (thickness: ProgressThickness) => void;
  setShape?: (shape: ProgressShape) => void;
  currentShape?: ProgressShape;
  setSize?: (size: number) => void;
  getSize?: () => number | undefined;
  hide?: () => BaseComponent;
  show?: () => BaseComponent;
  isVisible?: () => boolean;
}

export interface ViewComponent {
  view: SVGSVGElement;
  draw: () => void;
  resize: () => void;
}

/**
 * Resolves a thickness preset or a number of pixels
 */
export const getStrokeWidth = (thickness: ProgressThickness = "thin"): number => {
  if (typeof thickness === "number") return thickness;
  return thickness === "thick" ? PROGRESS_THICKNESS.THICK : PROGRESS_THICKNESS.THIN;
};

/**
 * How tall the wave is, in pixels. The linear wave keeps the token's
 * relationship to the track (3dp of wave to a 4dp track, which is the 10dp
 * container the tokens describe), so a thicker track waves proportionally;
 * the circular wave scales with the indicator's size, as the guidelines ask.
 */
export const getWaveAmplitude = (
  isCircular: boolean,
  strokeWidth: number,
  size: number
): number =>
  isCircular
    ? PROGRESS_WAVE.CIRCULAR.AMPLITUDE * (size / PROGRESS_MEASUREMENTS.CIRCULAR.SIZE)
    : PROGRESS_WAVE.LINEAR.AMPLITUDE * (strokeWidth / PROGRESS_THICKNESS.THIN);

/** The container size of a circular indicator: 40dp flat, 48dp wavy */
export const getCircularSize = (config: ProgressConfig): number => {
  const fallback =
    config.shape === PROGRESS_SHAPES.WAVY
      ? PROGRESS_MEASUREMENTS.CIRCULAR.WAVE_SIZE
      : PROGRESS_MEASUREMENTS.CIRCULAR.SIZE;
  return Math.max(
    PROGRESS_MEASUREMENTS.CIRCULAR.MIN_SIZE,
    Math.min(config.size ?? fallback, PROGRESS_MEASUREMENTS.CIRCULAR.MAX_SIZE)
  );
};

/** The height of a linear indicator: the track, plus the wave on both sides */
export const getLinearHeight = (strokeWidth: number, isWavy: boolean): number =>
  isWavy ? strokeWidth + 2 * getWaveAmplitude(false, strokeWidth, 0) : strokeWidth;

/**
 * Adds the SVG view, the writing of the current pose, and the two script
 * animations (value, amplitude). The indeterminate motion and the wave
 * travel are stylesheets, not script.
 */
export const withView =
  (config: ProgressConfig) =>
  <C extends BaseComponent>(component: C): C & ViewComponent => {
    const prefix = config.prefix || "mtrl";
    const isCircular = config.variant === PROGRESS_VARIANTS.CIRCULAR;
    const view = component.element.ownerDocument?.defaultView ?? null;
    const doc = component.element.ownerDocument ?? document;

    const svg = doc.createElementNS(SVG_NS, "svg") as SVGSVGElement;
    svg.setAttribute("class", component.getClass(PROGRESS_CLASSES.VIEW));
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    svg.setAttribute("preserveAspectRatio", "none");
    component.element.appendChild(svg);

    let currentThickness: ProgressThickness = config.thickness ?? "thin";
    let currentShape: ProgressShape = config.shape ?? PROGRESS_SHAPES.FLAT;
    let currentSize = getCircularSize(config);

    // The value the indicator is drawn at, which follows the state's value
    let animatedValue = config.value ?? 0;
    let targetValue = animatedValue;
    let valueAnimationId: number | null = null;
    let lastSetValueTime = 0;

    // The wave's height, which fades in and out with the value
    let amplitudeFrom = 0;
    let amplitudeTarget = 0;
    let amplitudeStarted = 0;
    let amplitudeAnimationId: number | null = null;
    // The wave path only changes with the amplitude, the width and the
    // stroke, so it is written when one of those did
    let waveCache = { amplitude: -1, width: -1, stroke: -1 };

    // The measured view width of a linear indicator; unknown until layout
    let lineWidth = 0;

    const reducedMotion = view?.matchMedia?.("(prefers-reduced-motion: reduce)") ?? null;
    const isWavy = (): boolean => currentShape === PROGRESS_SHAPES.WAVY;
    const strokeWidth = (): number => getStrokeWidth(currentThickness);
    const max = (): number => (component.state?.max as number) ?? config.max ?? 100;
    const isIndeterminate = (): boolean =>
      (component.state?.indeterminate as boolean) ?? config.indeterminate ?? false;

    // The drawing elements, rebuilt when the structure changes
    let parts: {
      track?: SVGElement;
      buffer?: SVGElement;
      indicator?: SVGGeometryElement;
      stop?: SVGCircleElement;
      waveClip?: SVGElement;
    } = {};

    const el = (name: string, ...classes: string[]): SVGElement => {
      const node = doc.createElementNS(SVG_NS, name);
      // Accumulated, not replaced: a part carries its role (indicator, wave)
      // and its place in the motion (bar-first) at once
      node.setAttribute(
        "class",
        classes.map((cls) => component.getClass(cls)).join(" ")
      );
      return node;
    };

    /** One linear bar's window, written to a rect's x and width */
    const writeWindow = (rect: SVGElement | undefined, window: BarWindow | null): void => {
      if (!rect) return;
      if (!window) {
        rect.setAttribute("width", "0");
        return;
      }
      rect.setAttribute("x", window.from.toFixed(2));
      rect.setAttribute("width", Math.max(0, window.to - window.from).toFixed(2));
    };

    /** The wave pattern for the current amplitude, in the current box */
    const writeWavePath = (target: SVGPathElement | null): void => {
      if (!target) return;
      const stroke = strokeWidth();
      const amplitude = currentAmplitude();
      const height = isCircular ? currentSize : getLinearHeight(stroke, true);
      if (
        waveCache.amplitude === amplitude &&
        waveCache.width === (isCircular ? currentSize : lineWidth) &&
        waveCache.stroke === stroke
      ) {
        return;
      }
      waveCache = { amplitude, width: isCircular ? currentSize : lineWidth, stroke };
      svg.style.setProperty(`--${prefix}-progress-amp`, `${amplitude}px`);
      target.setAttribute(
        "d",
        isCircular
          ? circularWaveRing(
              currentSize,
              circularRadius(currentSize, stroke, amplitude),
              amplitude,
              PROGRESS_WAVE.CIRCULAR.WAVELENGTH
            )
          : linearWavePath(
              lineWidth,
              height,
              amplitude,
              isIndeterminate()
                ? PROGRESS_WAVE.LINEAR.INDETERMINATE_WAVELENGTH
                : PROGRESS_WAVE.LINEAR.WAVELENGTH
            )
      );
    };

    /**
     * The wave's height right now, in pixels. Full whenever indeterminate,
     * as the canvas had it; eased between targets otherwise.
     */
    const currentAmplitude = (): number => {
      if (!isWavy()) return 0;
      const full = getWaveAmplitude(isCircular, strokeWidth(), currentSize);
      if (isIndeterminate()) return full;
      const fraction = reducedMotion?.matches
        ? amplitudeTarget
        : waveAmplitudeAt(
            amplitudeFrom,
            amplitudeTarget,
            (view?.performance ?? performance).now() - amplitudeStarted
          );
      return full * fraction;
    };

    /** The per-instance sizes and tokens the stylesheet's math reads */
    const writeTokens = (): void => {
      const stroke = strokeWidth();
      const height = isCircular ? currentSize : getLinearHeight(stroke, isWavy());
      svg.style.setProperty(`--${prefix}-progress-stroke`, `${stroke}px`);
      svg.style.setProperty(`--${prefix}-progress-cap`, `${stroke / 2}px`);
      const gap = isCircular
        ? circularGapUnits(stroke, currentSize)
        : lineWidth > 0
          ? (100 * linearGapPx(stroke)) / lineWidth
          : (100 * linearGapPx(stroke)) / 2048;
      svg.style.setProperty(
        isCircular ? `--${prefix}-progress-gap100` : `--${prefix}-progress-gapp`,
        `${gap}`
      );
      svg.style.setProperty(`--${prefix}-progress-wavelength`, `${isCircular ? 0 : isIndeterminate() ? PROGRESS_WAVE.LINEAR.INDETERMINATE_WAVELENGTH : PROGRESS_WAVE.LINEAR.WAVELENGTH}px`);
      if (isCircular) {
        const radius = circularRadius(currentSize, stroke, getWaveAmplitude(true, stroke, currentSize));
        svg.style.setProperty(`--${prefix}-progress-size`, `${currentSize}px`);
        svg.style.setProperty(`--${prefix}-progress-wave-rot`, `${circularWaveRotation(radius, currentSize)}deg`);
      }
      svg.setAttribute("viewBox", `0 0 ${isCircular ? currentSize : lineWidth || 2048} ${height}`);
      if (!isCircular) {
        svg.style.height = `${height}px`;
        svg.style.width = "100%";
      } else {
        svg.style.width = `${currentSize}px`;
        svg.style.height = `${currentSize}px`;
      }
    };

    /**
     * Builds the drawing elements for the mode the indicator is in. The
     * classes carry the geometry math and, when indeterminate, the keyframes.
     */
    const build = (): void => {
      parts = {};
      svg.replaceChildren();
      // The wave lived on elements that are gone; the next write regenerates
      // it on the new ones (the API settles the state after the view, which
      // rebuilds once more)
      waveCache = { amplitude: -1, width: -1, stroke: -1 };
      const wave = isWavy();

      if (isCircular) {
        const dial = el("g", PROGRESS_CLASSES.DIAL) as SVGGElement;
        dial.setAttribute(
          "transform",
          `rotate(-90 ${currentSize / 2} ${currentSize / 2})`
        );
        svg.append(dial);
        let rotor: SVGElement = dial;
        if (isIndeterminate()) {
          const spin = el("g", PROGRESS_CLASSES.SPIN);
          const kick = el("g", PROGRESS_CLASSES.KICK);
          spin.append(kick);
          dial.append(spin);
          rotor = kick;
        }
        const track = el("circle", PROGRESS_CLASSES.TRACK) as SVGCircleElement;
        const c = currentSize / 2;
        track.setAttribute("cx", `${c}`);
        track.setAttribute("cy", `${c}`);
        track.setAttribute("pathLength", "100");
        let indicator: SVGGeometryElement;
        if (wave) {
          const travel = el("g", PROGRESS_CLASSES.WAVE_TRAVEL);
          const path = el("path", PROGRESS_CLASSES.INDICATOR, PROGRESS_CLASSES.WAVE) as SVGPathElement;
          path.setAttribute("pathLength", "100");
          travel.append(path);
          rotor.append(track, travel);
          indicator = path;
        } else {
          const circle = el("circle", PROGRESS_CLASSES.INDICATOR) as SVGCircleElement;
          circle.setAttribute("cx", `${c}`);
          circle.setAttribute("cy", `${c}`);
          circle.setAttribute("pathLength", "100");
          rotor.append(track, circle);
          indicator = circle;
        }
        parts.track = track;
        parts.indicator = indicator;
        return;
      }

      if (isIndeterminate()) {
        if (wave) {
          const defs = doc.createElementNS(SVG_NS, "defs");
          const pattern = el("path", PROGRESS_CLASSES.WAVE_DEF) as SVGPathElement;
          pattern.setAttribute("id", `${prefix}-progress-wave-${++waveId}`);
          defs.append(pattern);
          svg.append(defs);
        }
        const ahead = el("rect", PROGRESS_CLASSES.TRACK, PROGRESS_CLASSES.AHEAD);
        svg.append(ahead);
        const bar = (which: string): SVGElement => {
          if (!wave) return el("rect", PROGRESS_CLASSES.INDICATOR, which);
          const id = `${prefix}-progress-wave-${++waveId}`;
          const group = el("g", PROGRESS_CLASSES.INDICATOR, which) as SVGGElement;
          const clip = doc.createElementNS(SVG_NS, "clipPath");
          clip.setAttribute("id", id);
          const rect = el("rect", PROGRESS_CLASSES.WAVE_WINDOW) as SVGRectElement;
          clip.append(rect);
          const travel = el("g", PROGRESS_CLASSES.WAVE_TRAVEL);
          const use = doc.createElementNS(SVG_NS, "use");
          use.setAttribute("href", `#${patternId(svg)}`);
          travel.append(use);
          group.append(clip, travel);
          return group;
        };
        const first = bar(PROGRESS_CLASSES.BAR_FIRST);
        const between = el("rect", PROGRESS_CLASSES.TRACK, PROGRESS_CLASSES.BETWEEN);
        const second = bar(PROGRESS_CLASSES.BAR_SECOND);
        const behind = el("rect", PROGRESS_CLASSES.TRACK, PROGRESS_CLASSES.BEHIND);
        svg.append(first, between, second, behind);
        return;
      }

      // Determinate linear: track, buffer, indicator, stop indicator, in the
      // canvas's drawing order
      const track = el("rect", PROGRESS_CLASSES.TRACK);
      const buffer = el("rect", PROGRESS_CLASSES.BUFFER);
      svg.append(track, buffer);
      if (wave) {
        const clip = doc.createElementNS(SVG_NS, "clipPath");
        clip.setAttribute("id", `${prefix}-progress-wave-${++waveId}`);
        const rect = el("rect", PROGRESS_CLASSES.WAVE_WINDOW) as SVGRectElement;
        clip.append(rect);
        svg.append(clip);
        const travel = el("g", PROGRESS_CLASSES.WAVE_TRAVEL);
        const path = el("path", PROGRESS_CLASSES.INDICATOR, PROGRESS_CLASSES.WAVE) as SVGPathElement;
        travel.append(path);
        svg.append(travel);
        path.setAttribute("clip-path", `url(#${clip.getAttribute("id")})`);
        parts.waveClip = rect;
        parts.indicator = path;
      } else {
        const indicator = el("rect", PROGRESS_CLASSES.INDICATOR) as SVGRectElement;
        svg.append(indicator);
        parts.indicator = indicator;
      }
      const stop = el("circle", PROGRESS_CLASSES.STOP) as SVGCircleElement;
      svg.append(stop);
      parts.track = track;
      parts.buffer = buffer;
      parts.stop = stop;
    };

    /** The id of the shared wave pattern in this view's defs */
    const patternId = (root: SVGSVGElement): string =>
      root.querySelector(`.${component.getClass(PROGRESS_CLASSES.WAVE_DEF)}`)?.getAttribute("id") ?? "";

    /**
     * Writes the current pose. Indeterminate geometry is the stylesheet's,
     * so there is nothing to write: the canvas redrew it every frame and
     * this draws it never.
     */
    const draw = (): void => {
      if (isIndeterminate()) {
        if (isWavy() && !isCircular) writeWavePath(sharedPattern());
        return;
      }
      if (isCircular) {
        const geometry = circularDeterminate(
          animatedValue / max(),
          strokeWidth(),
          currentSize
        );
        if (parts.indicator) {
          parts.indicator.setAttribute(
            "stroke-dasharray",
            geometry.indicator ? `${geometry.indicator.dash.toFixed(3)} 100` : "0 100"
          );
        }
        if (parts.track) {
          if (geometry.track) {
            parts.track.setAttribute(
              "stroke-dasharray",
              `${geometry.track.dash.toFixed(3)} 100`
            );
            parts.track.setAttribute(
              "stroke-dashoffset",
              geometry.track.offset.toFixed(3)
            );
          } else {
            parts.track.setAttribute("stroke-dasharray", "0 100");
          }
        }
        return;
      }
      if (lineWidth <= 0) return;
      const stroke = strokeWidth();
      const height = getLinearHeight(stroke, isWavy());
      const geometry = linearDeterminate({
        progress: animatedValue / max(),
        buffer: ((component.state?.buffer as number) ?? config.buffer ?? 0) / max(),
        strokeWidth: stroke,
        width: lineWidth,
        height,
        showStopIndicator: config.showStopIndicator !== false,
      });
      writeWindow(parts.track, geometry.track);
      writeWindow(parts.buffer, geometry.buffer);
      if (isWavy()) {
        writeWindow(parts.waveClip, geometry.indicator);
        writeWavePath(parts.indicator as SVGPathElement | null);
      } else {
        writeWindow(parts.indicator, geometry.indicator);
      }
      if (parts.stop) {
        if (geometry.stop) {
          parts.stop.setAttribute("cx", geometry.stop.x.toFixed(2));
          parts.stop.setAttribute("cy", (height / 2).toFixed(2));
          parts.stop.setAttribute("r", (geometry.stop.size / 2).toFixed(2));
        } else {
          parts.stop.setAttribute("r", "0");
        }
      }
    };

    const sharedPattern = (): SVGPathElement | null =>
      svg.querySelector(`.${component.getClass(PROGRESS_CLASSES.WAVE_DEF)}`) as SVGPathElement | null;

    /**
     * Points the drawing at the element's box. A server or a detached
     * element has none: the token box stands in, as the canvas's fixed
     * bitmap did, and the first real layout corrects it.
     */
    const measure = (): void => {
      if (!isCircular) {
        const box =
          (svg.getBoundingClientRect?.().width || 0) ||
          Math.max(
            (component.element.getBoundingClientRect?.().width || 0) -
              2 * PROGRESS_MEASUREMENTS.LINEAR.EDGE_INSET,
            0
          );
        if (box > 0 && Math.abs(box - lineWidth) > 0.5) lineWidth = box;
      }
      writeTokens();
      draw();
    };

    // ---------------------------------------------------------------------
    // The amplitude fade: the one loop a determinate wave runs, and only
    // while its height is changing
    // ---------------------------------------------------------------------

    const stopAmplitudeAnimation = (): void => {
      if (amplitudeAnimationId !== null) {
        cancelAnimationFrame(amplitudeAnimationId);
        amplitudeAnimationId = null;
      }
    };

    const amplitudeStep = (): void => {
      const fraction = waveAmplitudeAt(
        amplitudeFrom,
        amplitudeTarget,
        (view?.performance ?? performance).now() - amplitudeStarted
      );
      amplitudeFrom = fraction;
      draw();
      if (amplitudeFrom === amplitudeTarget) {
        amplitudeAnimationId = null;
        return;
      }
      amplitudeAnimationId = requestAnimationFrame(amplitudeStep);
    };

    /** Points the wave at the height this value calls for */
    const retargetAmplitude = (progress: number): void => {
      const next = waveAmplitudeTarget(progress);
      if (next === amplitudeTarget) return;
      amplitudeFrom = waveAmplitudeAt(
        amplitudeFrom,
        amplitudeTarget,
        (view?.performance ?? performance).now() - amplitudeStarted
      );
      amplitudeTarget = next;
      amplitudeStarted = (view?.performance ?? performance).now();
      stopAmplitudeAnimation();
      if (reducedMotion?.matches || !isWavy() || isIndeterminate()) {
        // No fade to run: the wave sits at its target height
        amplitudeFrom = amplitudeTarget;
        draw();
        return;
      }
      amplitudeAnimationId = requestAnimationFrame(amplitudeStep);
    };

    const stopValueAnimation = (): void => {
      if (valueAnimationId !== null) {
        cancelAnimationFrame(valueAnimationId);
        valueAnimationId = null;
      }
    };

    const complete = (value: number): void => {
      // The emitter's `complete`, with `{ value, max }`.
      component.emit?.("complete", { value, max: max() });
    };

    // ---------------------------------------------------------------------
    // Methods the API delegates to
    // ---------------------------------------------------------------------

    component.setValue = (value: number, animate = true): void => {
      targetValue = Math.max(0, Math.min(max(), value));
      retargetAmplitude(targetValue / max());

      if (valueAnimationId !== null && animate) return; // the running animation picks it up
      stopValueAnimation();

      if (!animate || reducedMotion?.matches) {
        animatedValue = targetValue;
        draw();
        if (targetValue >= max()) complete(targetValue);
        return;
      }

      const startValue = animatedValue;
      const startTime = (view?.performance ?? performance).now();
      // A value that changes faster than the animation would always lag, so
      // the animation shortens to the interval between updates
      const sinceLast = startTime - lastSetValueTime;
      const duration =
        lastSetValueTime > 0 && sinceLast < PROGRESS_MOTION.VALUE_DURATION
          ? Math.max(100, sinceLast * 0.9)
          : PROGRESS_MOTION.VALUE_DURATION;
      lastSetValueTime = startTime;

      const step = (now: number): void => {
        // The value tween is linear (ProgressIndicatorDefaults.ProgressAnimationSpec)
        const fraction = Math.min((now - startTime) / duration, 1);
        animatedValue = startValue + (targetValue - startValue) * fraction;
        draw();
        if (fraction < 1) {
          valueAnimationId = requestAnimationFrame(step);
        } else {
          valueAnimationId = null;
          animatedValue = targetValue;
          draw();
          if (targetValue >= max()) complete(targetValue);
        }
      };
      valueAnimationId = requestAnimationFrame(step);
    };

    /**
     * Where each running animation is, by name, so a change that rebuilds
     * the drawing elements can put the new ones where the old ones were.
     * The canvas kept one clock for everything; this keeps each animation's
     * own, which is the same thing one loop drew.
     */
    const animationPhases = (): Map<string, number> => {
      const phases = new Map<string, number>();
      for (const animation of svg.getAnimations?.() ?? []) {
        const name = (animation as { animationName?: string }).animationName;
        if (name) phases.set(name, Number(animation.currentTime ?? 0));
      }
      return phases;
    };

    const restoreAnimationPhases = (phases: Map<string, number>): void => {
      for (const animation of svg.getAnimations?.() ?? []) {
        const name = (animation as { animationName?: string }).animationName;
        const phase = name ? phases.get(name) : undefined;
        if (phase !== undefined) animation.currentTime = phase;
      }
    };

    component.setIndeterminate = (indeterminate: boolean): void => {
      if (component.state) component.state.indeterminate = indeterminate;
      stopValueAnimation();
      stopAmplitudeAnimation();
      animatedValue = (component.state?.value as number) ?? animatedValue;
      build();
      measure();
      // The indeterminate motion starts from its first keyframe, as the
      // canvas's startAnimation() did with no offset
      if (!indeterminate) retargetAmplitude(animatedValue / max());
      else draw();
    };

    component.setThickness = (thickness: ProgressThickness): void => {
      currentThickness = thickness;
      // Tokens and geometry only: the elements stay, so anything already
      // animating keeps its phase, as the canvas's unbroken loop did
      writeTokens();
      draw();
    };

    component.setShape = (shape: ProgressShape): void => {
      if (currentShape === shape) return;
      currentShape = shape;
      component.currentShape = shape;
      if (component.state) component.state.shape = shape;
      if (isCircular && config.size === undefined) currentSize = getCircularSize({ ...config, shape });
      const phases = animationPhases();
      build();
      writeTokens();
      // A wave that has just appeared starts from nothing
      if (shape === PROGRESS_SHAPES.WAVY) {
        amplitudeFrom = 0;
        amplitudeTarget = 0;
        amplitudeStarted = (view?.performance ?? performance).now();
      }
      draw();
      if (isWavy() && !isIndeterminate()) retargetAmplitude(animatedValue / max());
      restoreAnimationPhases(phases);
    };

    component.setSize = (size: number): void => {
      if (!isCircular) return;
      currentSize = Math.max(
        PROGRESS_MEASUREMENTS.CIRCULAR.MIN_SIZE,
        Math.min(size, PROGRESS_MEASUREMENTS.CIRCULAR.MAX_SIZE)
      );
      writeTokens();
      draw();
    };

    component.getSize = (): number | undefined => (isCircular ? currentSize : undefined);

    component.hide = (): BaseComponent => {
      component.element.classList.add(component.getClass(PROGRESS_CLASSES.TRANSITION));
      component.element.setAttribute("hidden", "");
      // [hidden] already pauses the stylesheet's animations; these are the
      // script ones
      stopValueAnimation();
      stopAmplitudeAnimation();
      return component;
    };

    component.show = (): BaseComponent => {
      component.element.classList.add(component.getClass(PROGRESS_CLASSES.TRANSITION));
      component.element.removeAttribute("hidden");
      measure();
      return component;
    };

    component.isVisible = (): boolean => !component.element.hasAttribute("hidden");

    const resize = (): void => {
      measure();
    };

    // ---------------------------------------------------------------------
    // Wiring
    // ---------------------------------------------------------------------

    build();
    measure();

    const resizeCleanup = observeCanvasResize(component.element, svg, resize);

    if (isWavy() && !isIndeterminate()) {
      amplitudeStarted = (view?.performance ?? performance).now();
      retargetAmplitude(animatedValue / max());
    }

    // A first frame now; the loops, if any are called for, are above
    draw();

    const originalDestroy = component.lifecycle?.destroy;
    component.lifecycle = {
      ...(component.lifecycle ?? {}),
      destroy: () => {
        resizeCleanup();
        stopValueAnimation();
        stopAmplitudeAnimation();
        originalDestroy?.();
      },
    };

    return {
      ...component,
      view: svg,
      draw,
      resize,
    };
  };
