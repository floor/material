// src/components/slider/features/axis.ts
import type { SliderConfig } from "../types";

/**
 * The axis the slider's values run along. Horizontal runs left to right, or right
 * to left in a right-to-left layout (Compose reverses a horizontal slider when the
 * layout direction is RTL). Vertical runs bottom to top -- "zero is at the bottom"
 * (m3.material.io slider guidelines) -- unless `topToBottom` is set, the flag
 * Compose's VerticalSlider takes; Compose defaults it to true, the site to the
 * opposite, and the site wins.
 *
 * `start` is the CSS property a position along the track is written to, `size` the
 * one a length along it is, and `cross` the thickness.
 */
export interface SliderAxis {
  vertical: boolean;
  start: "left" | "right" | "top" | "bottom";
  size: "width" | "height";
  cross: "width" | "height";
}

/** Whether the slider sits in a right-to-left layout: the nearest `dir` decides. */
export const isRtl = (element: Element): boolean =>
  element.closest("[dir]")?.getAttribute("dir")?.toLowerCase() === "rtl";

export const getAxis = (
  config: Pick<SliderConfig, "orientation" | "topToBottom">,
  rtl = false,
): SliderAxis =>
  config.orientation === "vertical"
    ? { vertical: true, start: config.topToBottom ? "top" : "bottom", size: "height", cross: "width" }
    : { vertical: false, start: rtl ? "right" : "left", size: "width", cross: "height" };

/** The track's length along the axis. */
export const lengthOf = (rect: DOMRect, axis: SliderAxis): number =>
  axis.vertical ? rect.height : rect.width;

/** How far a client coordinate on the axis lies from the track's start. */
export const offsetAlong = (client: number, rect: DOMRect, axis: SliderAxis): number =>
  axis.start === "left" ? client - rect.left
    : axis.start === "right" ? rect.right - client
      : axis.start === "top" ? client - rect.top
        : rect.bottom - client;

/** The handle's own centring: the value is at its middle on both axes. */
export const handleTransform = (axis: SliderAxis): string =>
  axis.start === "bottom" ? "translate(-50%, 50%)"
    : axis.start === "right" ? "translate(50%, -50%)"
      : "translate(-50%, -50%)";

/** The value indicator is centred on the value along the axis. */
export const bubbleTransform = (axis: SliderAxis): string =>
  axis.start === "left" ? "translateX(-50%)"
    : axis.start === "right" ? "translateX(50%)"
      : axis.start === "bottom" ? "translateY(50%)"
        : "translateY(-50%)";

/**
 * +1 when the arrow keys along the track raise the value toward its end, -1 when
 * they lower it: those arrows follow the track as drawn (Compose's
 * `reverseDirection`). Along a horizontal track that is ArrowRight, which lowers in
 * RTL; along a vertical one ArrowUp, which lowers with topToBottom. The arrows across
 * the track keep their ARIA meaning, up and right raising.
 */
export const arrowSign = (axis: SliderAxis): 1 | -1 =>
  axis.start === "right" || axis.start === "top" ? -1 : 1;
