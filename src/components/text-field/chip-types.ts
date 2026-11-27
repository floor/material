import type { ChipComponent, ChipConfig } from "../chips";

/** One item of a text field's initial chips: the text, or a full chip config. */
export type TextFieldChipItem = string | ChipConfig;

/**
 * Configuration for opt-in input chips inside a text field
 * (`TextFieldConfig.chips`). Chips commit on Enter and on a separator key, and
 * are removed from their own remove button, Backspace or Delete.
 */
export interface TextFieldChipsConfig {
  /** The committed chips the field starts with. */
  items?: readonly TextFieldChipItem[];

  /**
   * Keys that commit the draft text, as `KeyboardEvent.key` values
   * (`","`, `"Tab"`). Enter always commits a non-empty draft outside IME
   * composition.
   * @default [","]
   */
  separators?: readonly string[];

  /** The most chips the field may hold; further text stays in the input. */
  maxChips?: number;

  /** Whether the same text may be committed twice. @default false */
  allowDuplicates?: boolean;

  /** Whether a second activation of a selected chip edits it as text. @default true */
  editable?: boolean;

  /**
   * Judges a candidate text before it becomes a chip: `true` accepts, `false`
   * rejects (the text stays in the input), a string rejects with that message.
   */
  validate?: (text: string, currentValues: string[]) => boolean | string;

  /** `add` listener registered at creation. */
  onAdd?: (payload: TextFieldChipEventPayload) => void;

  /** `remove` listener registered at creation. */
  onRemove?: (payload: TextFieldChipEventPayload) => void;
}

/** Payload of the `add` and `remove` events. */
export interface TextFieldChipEventPayload {
  /** The committed chip values after the change. */
  values: string[];
  /** The chip instance that was added or removed. */
  chip: ChipComponent;
  /** The chip's text. */
  chipValue: string;
  /** The chip's place in the field. */
  index: number;
}
