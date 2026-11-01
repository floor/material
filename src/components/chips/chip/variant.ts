// src/components/chips/chip/variant.ts
/**
 * What one chip variant adds to the shared chip. The shared DOM, state, API
 * and listeners stay in chip.ts, with the type's own rules (which types select,
 * take an avatar, show the checkmark); a variant's own buttons, its accessible
 * names and its keyboard removal live in its own module, so a page that imports
 * one factory does not carry the other three.
 */
import type { ChipOptions, ChipComponent } from "../types";

/** The shared pieces a variant builds on; the core creates them before a variant mounts. */
export interface ChipParts {
  /** The chip root: the `div` the component creates. */
  root: HTMLElement;
  /** The chip's primary action button. */
  action: HTMLButtonElement;
  /** The label span. */
  label: HTMLSpanElement;
  /** The merged options. */
  options: ChipOptions;
  /** The component's prefixed class name for `name`. */
  classOf: (name: string) => string;
  /** The trailing icon as the chip currently holds it; a variant's own button draws it. */
  getTrailingIcon: () => string;
  /** Emit one of the variant's own events on the chip. */
  emit: (event: "remove" | "trailing", chip: ChipComponent) => void;
  /** Listen on an element the variant owns; the listener is removed when the chip is destroyed. */
  listen: <K extends keyof HTMLElementEventMap>(
    element: HTMLElement,
    name: K,
    handler: (event: HTMLElementEventMap[K]) => void,
  ) => void;
  isDisabled: () => boolean;
  isDestroyed: () => boolean;
  /** The chip's public API; safe to read from a listener, once the chip is created. */
  getApi: () => ChipComponent;
}

/** What a variant's extra buttons add to the shared render and key handling. */
export interface ChipExtras {
  /** Input chips: the remove button, beside the action. */
  remove?: HTMLButtonElement;
  /** Filter chips: the trailing button, once the config gives it an action. */
  trailingAction?: HTMLButtonElement;
  /** Variant state at each render: a disabled button, its accessible name. */
  render?: () => void;
  /** Variant key handling on the chip's action; true when it consumed the event. */
  keydown?: (event: KeyboardEvent) => boolean;
  /** Where the trailing icon goes when it is not the shared trailing span. */
  setTrailingGlyph?: (icon: string) => void;
}

/** A variant's mount: it builds the chip's own button and hands back what the chip drives. */
export type ChipMount = (parts: ChipParts) => ChipExtras | undefined;
