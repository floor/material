// src/components/slider/features/axis.ts
import type { SliderConfig } from "../types";

/**
 * The axis the slider's values run along. Horizontal runs left to right. Vertical
 * runs bottom to top -- "zero is at the bottom" (m3.material.io slider guidelines) --
 * unless `topToBottom` is set, the flag Compose's VerticalSlider takes; Compose
 * defaults it to true, the site to the opposite, and the site wins. FLO-252.
 *
 * `start` is the CSS property a position along the track is written to, `size` the
 * one a length along it is, and `cross` the thickness.
 */
export interface SliderAxis {
  vertical: boolean;
  start: "left" | "top" | "bottom";
  size: "width" | "height";
  cross: "width" | "height";
}

export const getAxis = (config: Pick<SliderConfig, "orientation" | "topToBottom">): SliderAxis =>
  config.orientation === "vertical"
    ? { vertical: true, start: config.topToBottom ? "top" : "bottom", size: "height", cross: "width" }
    : { vertical: false, start: "left", size: "width", cross: "height" };

/** The track's length along the axis. */
export const lengthOf = (rect: DOMRect, axis: SliderAxis): number =>
  axis.vertical ? rect.height : rect.width;

/** How far a client coordinate on the axis lies from the track's start. */
export const offsetAlong = (client: number, rect: DOMRect, axis: SliderAxis): number =>
  axis.start === "left" ? client - rect.left
    : axis.start === "top" ? client - rect.top
      : rect.bottom - client;

/** The handle's own centring: the value is at its middle on both axes. */
export const handleTransform = (axis: SliderAxis): string =>
  axis.start === "bottom" ? "translate(-50%, 50%)" : "translate(-50%, -50%)";

/** The value indicator is centred on the value along the axis. */
export const bubbleTransform = (axis: SliderAxis): string =>
  !axis.vertical ? "translateX(-50%)" : axis.start === "bottom" ? "translateY(50%)" : "translateY(-50%)";
