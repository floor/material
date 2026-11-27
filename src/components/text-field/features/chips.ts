// src/components/text-field/features/chips.ts
import type { ElementComponent } from "../../../core/compose/component";
import createChip from "../../chips/chip/chip";
import type { ChipComponent, ChipConfig, ChipOptions } from "../../chips/types";
import type { TextFieldChipEventPayload, TextFieldChipItem, TextFieldChipsConfig } from "../types";

/**
 * Input chips inside a text field (m3.material.io chips, "Input chips").
 *
 * The committed chips and the draft input share one wrapping row
 * (`.mtrl-text-field__chips`): the chips sit in a named group beside the
 * labelled textbox, so a screen reader hears "To, edit" for the input and
 * reaches each chip as its own focusable element. Typing a separator or
 * Enter commits the draft as a chip; Backspace at the start of the input
 * selects the last chip and a second Backspace removes it; a second
 * activation of a selected chip turns it back into text for editing.
 *
 * A motion the field runs itself is a task or a transition, never a timer:
 * nothing here waits on a clock.
 */

/** Every option of `chips` resolved, with the defaults the design states. */
interface ChipsOptions {
  items: readonly TextFieldChipItem[];
  separators: readonly string[];
  maxChips: number;
  allowDuplicates: boolean;
  editable: boolean;
  validate?: (text: string, currentValues: string[]) => boolean | string;
}

export interface ChipsFeature {
  /** The committed values, in order */
  getValues: () => string[];
  /** Replaces the committed chips; silent unless `triggerEvent` */
  setValues: (values: readonly TextFieldChipItem[], triggerEvent?: boolean) => void;
  /** The live chip instances */
  getChips: () => ChipComponent[];
  /** Adds a chip, subject to the limit, duplicates and validation */
  addChip: (chip: TextFieldChipItem, triggerEvent?: boolean) => ChipComponent | null;
  /** Removes a chip by instance, index or text */
  removeChip: (chip: ChipComponent | number | string, triggerEvent?: boolean) => void;
  /** Re-renders the form rows, validity and the empty state */
  sync: () => void;
}

type ChipsComponent = ElementComponent & {
  input?: HTMLInputElement | HTMLTextAreaElement;
  field?: HTMLElement;
  label?: { getElement: () => HTMLElement };
  lifecycle?: { destroy: () => void };
  emit?: (event: string, payload: unknown) => unknown;
  disable?: () => unknown;
  enable?: () => unknown;
  isDisabled?: () => boolean;
};

/** The options of `chips`: `true` is the defaults, an object overrides them. */
const optionsOf = (chips: boolean | TextFieldChipsConfig | undefined): ChipsOptions | null => {
  if (!chips) return null;
  const config = typeof chips === "object" ? chips : {};
  return {
    items: config.items ?? [],
    separators: config.separators?.length ? config.separators : [","],
    maxChips: config.maxChips ?? Number.POSITIVE_INFINITY,
    allowDuplicates: config.allowDuplicates ?? false,
    editable: config.editable ?? true,
    validate: config.validate,
  };
};

/** A chip item as a config: a string is its own label and value. */
const configOf = (item: TextFieldChipItem): ChipConfig =>
  typeof item === "string" ? { label: item, value: item } : { ...item };

const textOf = (chip: ChipComponent): string => chip.getValue() ?? chip.getLabel();

/**
 * Adds input chips to a text field. Without `chips` it returns the component
 * untouched: the default text field does not carry the feature's weight.
 */
/**
 * Installs the chips feature on a text field. This module is the opt-in path:
 * the field itself never references it, so a field without chips carries no
 * chip code. `textFieldChips()` in `../chips` is the value `chips` takes.
 */
export const installChips = <C extends ElementComponent>(
  component: C,
  config: { chips?: boolean | TextFieldChipsConfig } & object,
  expose: (feature: ChipsFeature) => void,
): C & { chips?: ChipsFeature } => {
    const options = optionsOf(config.chips);
    if (!options) return component;
    const host = component as C & ChipsComponent;

    const prefix = (config as { prefix?: string }).prefix ?? "mtrl";
    const name = (config as { componentName?: string }).componentName ?? "text-field";
    const rootClass = `${prefix}-${name}`;
    const field = host.field ?? component.element;
    const input = host.input;
    if (!input) return component;

    // ---------------------------------------------------------------- anatomy
    const row = document.createElement("div");
    row.className = `${rootClass}__chips`;
    const list = document.createElement("div");
    list.className = `${rootClass}__chips-list`;
    list.setAttribute("role", "group");
    row.appendChild(list);
    field.insertBefore(row, field.firstChild);
    row.appendChild(input);
    component.element.classList.add(`${rootClass}--with-chips`);

    // A polite status region says what changed, for a screen reader: the
    // chips are removed and added without a focus move that would announce
    // them on its own.
    const live = document.createElement("span");
    live.className = `${rootClass}__chips-live`;
    live.setAttribute("role", "status");
    live.setAttribute("aria-live", "polite");
    field.appendChild(live);
    const announce = (message: string): void => {
      live.textContent = message;
    };

    // The group and the textbox are named by the same label.
    const label = host.label?.getElement() ?? null;
    if (label) {
      if (!label.id) label.id = `${input.id || `${rootClass}-label`}-label`;
      list.setAttribute("aria-labelledby", label.id);
      // The stylesheet gives a labelled field its padding; without one the
      // chips sit centred in the 56dp row.
      component.element.classList.add(`${rootClass}--with-chips-label`);
    }
    // The input's name is the field's: the chips submit under it, one hidden
    // input each, so the draft text never submits as a value of its own.
    let fieldName = input.getAttribute("name");
    const hidden: HTMLInputElement[] = [];
    if (fieldName) input.removeAttribute("name");

    // An email chip field types into a text input: `type="email"` has no
    // selection API, so a chip could not be edited and the caret could not be
    // read; `inputmode` is the keyboard hint a text input can carry. The
    // address is then validated here: the browser's email state no longer is.
    const emailMode = (input.getAttribute("type") ?? "") === "email";
    if (emailMode) {
      input.setAttribute("type", "text");
      input.setAttribute("inputmode", "email");
      input.setAttribute("autocapitalize", "off");
      input.setAttribute("autocomplete", "email");
    }

    // ---------------------------------------------------------------- state
    const chips: ChipComponent[] = [];
    let editingIndex: number | null = null;
    let inComposition = false;
    let justEndedComposition = false;
    const isDisabled = (): boolean => component.element.classList.contains(`${rootClass}--disabled`);

    const eventOf = (chip: ChipComponent, index: number): TextFieldChipEventPayload => ({
      values: chips.map(textOf),
      chip,
      chipValue: textOf(chip),
      index,
    });

    const emit = (event: "add" | "remove", payload: TextFieldChipEventPayload): void => {
      host.emit?.(event, payload);
    };

    const syncEmpty = (): void => {
      const filled = chips.length > 0 || input.value.length > 0 || (() => {
        try {
          return input.matches(":autofill") || input.matches(":-webkit-autofill");
        } catch {
          return false;
        }
      })();
      component.element.classList.toggle(`${rootClass}--empty`, !filled);
    };

    /** One hidden input per committed chip, under the field's name. */
    const syncForm = (): void => {
      for (const node of hidden) node.remove();
      hidden.length = 0;
      if (!fieldName) return;
      for (const value of chips.map(textOf)) {
        const node = document.createElement("input");
        node.type = "hidden";
        node.name = fieldName;
        node.value = value;
        node.disabled = isDisabled();
        field.appendChild(node);
        hidden.push(node);
      }
    };

    /**
     * A required field is satisfied by a committed chip, not by draft text:
     * with none, the draft input reports `valueMissing`, so a form with only
     * uncommitted text cannot submit.
     */
    // The field's required state as configured, kept apart from the input's own
    // `required`, which follows the chips: a committed chip satisfies it.
    let wantedRequired = input.required;
    // Set while we write the input's own `required`, so the observer below
    // does not read our write back as the field's configuration.
    let writingRequired = false;
    const syncValidity = (): void => {
      const missing = wantedRequired && chips.length === 0;
      writingRequired = true;
      input.required = missing;
      // A server-side DOM (linkedom) builds the input without constraint APIs;
      // SSR needs the markup, not the message.
      if (typeof input.setCustomValidity === "function") input.setCustomValidity(missing ? " " : "");
      queueMicrotask(() => {
        writingRequired = false;
      });
    };

    const sync = (): void => {
      listenReset();
      syncForm();
      syncValidity();
      syncEmpty();
    };

    // ---------------------------------------------------------------- chips
    const indexOf = (chip: ChipComponent): number => chips.indexOf(chip);

    const attach = (item: TextFieldChipItem, index?: number): ChipComponent => {
      const chipConfig = configOf(item);
      const chip = createChip({
        ...chipConfig,
        type: "input",
        // Removal is the field's: the chip reports it and the field takes the
        // chip out, so its state, its form rows and its focus stay in step.
        onRemoved: (removed: ChipComponent) => removeAt(indexOf(removed), true),
      } as ChipOptions);
      chip.action.tabIndex = -1;
      // The chip is a named group of its two actions (m3.material.io chips,
      // accessibility: a chip's label is its own text, the remove action is
      // named separately).
      chip.element.setAttribute("aria-label", chip.getLabel());
      const remove = chip.element.querySelector<HTMLButtonElement>(`[class*="chip__remove"]`);
      if (remove) remove.tabIndex = -1;
      const setLabel = chip.setLabel.bind(chip);
      chip.setLabel = (label: string) => {
        setLabel(label);
        chip.element.setAttribute("aria-label", label);
        return chip;
      };

      // First activation selects; a second one on the selected chip edits it.
      chip.on("click", () => {
        if (editingIndex !== null || isDisabled()) return;
        if (chip.isSelected() && options.editable) enterEdit(chip);
      });
      chip.element.addEventListener("keydown", (event) => onChipKeydown(event, chip));
      // A held Backspace or Delete on the chip deletes nothing: capture runs
      // before the chip's own key handler, which removes on any press.
      chip.element.addEventListener(
        "keydown",
        (event) => {
          if ((event.key === "Backspace" || event.key === "Delete") && event.repeat) {
            event.preventDefault();
            event.stopPropagation();
          }
        },
        true,
      );

      if (index === undefined) chips.push(chip);
      else chips.splice(index, 0, chip);
      const position = index === undefined ? chips.length - 1 : index;
      list.insertBefore(chip.element, list.children[position] ?? null);
      return chip;
    };

    const removeAt = (index: number, triggerEvent: boolean, focusAfter = true): void => {
      const chip = chips[index];
      if (!chip) return;
      // Inside a shadow root, the document's active element is the host: the
      // focused control is the input's own root's active element.
      const root = input.getRootNode() as Document | ShadowRoot;
      const active = (root.activeElement ?? document.activeElement) as Node | null;
      const wasFocused = !!active && chip.element.contains(active);
      if (editingIndex === index) cancelEdit(false);
      chips.splice(index, 1);
      chip.destroy();
      if (triggerEvent) {
        emit("remove", eventOf(chip, index));
        announce(`${textOf(chip)} removed`);
      }
      sync();
      if (focusAfter && wasFocused) {
        // The last chip removed hands focus back to the input; an interior one
        // hands it to the chip that took its slot (design §4.2).
        const next = chips[index];
        if (index >= chips.length && !next) input.focus();
        else if (next) focusTarget(next, "action");
        else input.focus();
      }
    };

    const currentValues = (extra: string[] = []): string[] => [...chips.map(textOf), ...extra];

    // The HTML email state's practical form: a local part, an @, a domain with
    // a dot. A rejected address stays editable text (round 2, item 3).
    const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    /** Whether `text` may become a chip, and the message that says why not. */
    const accepts = (text: string, extra: string[] = []): { ok: boolean; message?: string } => {
      if (emailMode && !options.validate && !EMAIL.test(text)) {
        return { ok: false, message: "Enter a valid email address" };
      }
      if (chips.length + extra.length >= options.maxChips) return { ok: false };
      if (!options.allowDuplicates && currentValues(extra).includes(text)) return { ok: false };
      const result = options.validate?.(text, currentValues(extra)) ?? true;
      if (result === true) return { ok: true };
      return { ok: false, message: typeof result === "string" ? result : undefined };
    };

    const showError = (message: string | undefined): void => {
      const withError = component as ChipsComponent & { setError?: (error: boolean, message?: string) => void };
      if (!message) return;
      withError.setError?.(true, message);
    };

    /** Commits the draft text as a chip. Returns whether the text was taken. */
    const commitDraft = (): boolean => {
      const text = input.value.trim();
      if (!text) return false;
      const verdict = accepts(text);
      if (!verdict.ok) {
        showError(verdict.message);
        return false;
      }
      attach(text);
      input.value = "";
      deselectAll();
      input.dispatchEvent(new Event("input", { bubbles: true }));
      emit("add", eventOf(chips[chips.length - 1]!, chips.length - 1));
      announce(`${text} added`);
      sync();
      return true;
    };

    const deselectAll = (): void => {
      for (const chip of chips) chip.setSelected(false);
    };

    /** Focus moves between the two controls of a chip and the input. */
    const focusTarget = (chip: ChipComponent, control: "action" | "remove"): void => {
      const remove = chip.element.querySelector<HTMLButtonElement>(`[class*="chip__remove"]`);
      const target = control === "remove" ? remove : chip.action;
      target?.focus();
    };

    // ---------------------------------------------------------------- editing
    const enterEdit = (chip: ChipComponent): void => {
      const index = indexOf(chip);
      if (index < 0) return;
      editingIndex = index;
      chip.element.hidden = true;
      input.value = chip.getLabel();
      list.insertBefore(input, chip.element);
      input.focus();
      try {
        input.setSelectionRange(0, input.value.length);
      } catch {
        // A control without the selection API (never for chips mode: email is
        // typed as text) keeps the caret where the browser put it.
      }
      syncEmpty();
    };

    const leaveEdit = (): void => {
      editingIndex = null;
      for (const chip of chips) chip.element.hidden = false;
      row.appendChild(input);
    };

    const cancelEdit = (refocus: boolean): void => {
      if (editingIndex === null) return;
      const chip = chips[editingIndex]!;
      leaveEdit();
      input.value = "";
      syncEmpty();
      if (refocus) focusTarget(chip, "action");
    };

    const commitEdit = (refocus = true): void => {
      if (editingIndex === null) return;
      const chip = chips[editingIndex]!;
      const text = input.value.trim();
      if (!text) {
        removeAt(editingIndex, true);
        leaveEdit();
        if (refocus) input.focus();
        return;
      }
      const others = chips.filter((_, index) => index !== editingIndex).map(textOf);
      const verdict = options.validate?.(text, others) ?? true;
      if (verdict !== true) {
        showError(typeof verdict === "string" ? verdict : undefined);
        return;
      }
      if (!options.allowDuplicates && others.includes(text)) return;
      chip.setLabel(text);
      chip.setValue(text);
      leaveEdit();
      input.value = "";
      sync();
      // The element reads its form value again on these events; an edit
      // changed the submitted chip without touching the input's text.
      input.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
      input.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
      if (refocus) input.focus();
    };

    // ---------------------------------------------------------------- keyboard
    const isRtl = (): boolean => {
      try {
        return input.closest("[dir]")?.getAttribute("dir") === "rtl" || getComputedStyle(input).direction === "rtl";
      } catch {
        return false;
      }
    };

    /** Mixed-direction text keeps its own caret: the chips leave the arrows alone. */
    const oppositeBidi = (): boolean => {
      const value = input.value;
      if (!value) return false;
      return isRtl()
        ? /[A-Za-z‎‪‭⁦]/.test(value)
        : /[֑-߿‏‫‮⁧יִ-﷽ﹰ-ﻼ]/.test(value);
    };

    const supportsSelection = (): boolean => typeof input.selectionStart === "number";
    const caretAtStart = (): boolean => !supportsSelection() || (input.selectionStart === 0 && input.selectionEnd === 0);

    /** WebKit fires the confirming keydown after compositionend, with keyCode 229. */
    const isImeConfirm = (event: KeyboardEvent): boolean =>
      event.isComposing || event.keyCode === 229 || inComposition || justEndedComposition;

    const backwardKey = (): "ArrowLeft" | "ArrowRight" => (isRtl() ? "ArrowRight" : "ArrowLeft");
    const forwardKey = (): "ArrowLeft" | "ArrowRight" => (isRtl() ? "ArrowLeft" : "ArrowRight");

    const selectLast = (): void => {
      const chip = chips[chips.length - 1];
      if (!chip) return;
      deselectAll();
      chip.setSelected(true);
      focusTarget(chip, "action");
    };

    const onInputKeydown = (event: KeyboardEvent): void => {
      if (isImeConfirm(event)) return;
      const key = event.key;
      if (editingIndex !== null) {
        if (key === "Enter" || key === ",") {
          event.preventDefault();
          commitEdit();
          return;
        }
        if (key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          cancelEdit(true);
          return;
        }
        return;
      }
      if (key === "Enter" || options.separators.includes(key)) {
        if (key === "Enter" || input.value.trim()) {
          event.preventDefault();
          commitDraft();
        }
        return;
      }
      if (key === "Backspace" && !event.repeat && caretAtStart()) {
        if (chips.length === 0) return;
        event.preventDefault();
        selectLast();
        return;
      }
      if (key === backwardKey() && !oppositeBidi() && caretAtStart() && chips.length > 0) {
        event.preventDefault();
        deselectAll();
        focusTarget(chips[chips.length - 1]!, "remove");
      }
    };

    const onChipKeydown = (event: KeyboardEvent, chip: ChipComponent): void => {
      const index = indexOf(chip);
      if (index < 0) return;
      const key = event.key;
      if (key === "Home") {
        event.preventDefault();
        deselectAll();
        focusTarget(chips[0]!, "action");
        return;
      }
      if (key === "End") {
        event.preventDefault();
        deselectAll();
        input.focus();
        return;
      }
      if (key === backwardKey()) {
        event.preventDefault();
        if (event.target === chip.action) {
          if (index > 0) {
            chip.setSelected(false);
            focusTarget(chips[index - 1]!, "remove");
          }
        } else focusTarget(chip, "action");
        return;
      }
      if (key === forwardKey()) {
        event.preventDefault();
        if (event.target === chip.action) focusTarget(chip, "remove");
        else {
          chip.setSelected(false);
          const next = chips[index + 1];
          if (next) focusTarget(next, "action");
          else {
            input.focus();
            try {
              input.setSelectionRange(0, 0);
            } catch {
              // no selection API
            }
          }
        }
      }
    };

    // ---------------------------------------------------------------- paste
    const onPaste = (event: ClipboardEvent): void => {
      if (editingIndex !== null || isImeConfirm(event as unknown as KeyboardEvent)) return;
      const raw = event.clipboardData?.getData("text/plain") ?? "";
      const splitter = new RegExp(`\\r?\\n|${options.separators.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")}`);
      if (!splitter.test(raw)) return;
      event.preventDefault();
      const tokens = raw.split(splitter).map((token) => token.trim()).filter(Boolean);
      const accepted: string[] = [];
      const leftover: string[] = [];
      let message: string | undefined;
      for (const token of tokens) {
        const verdict = accepts(token, accepted);
        if (verdict.ok) accepted.push(token);
        else {
          leftover.push(token);
          message ??= verdict.message;
        }
      }
      for (const token of accepted) {
        const chip = attach(token);
        emit("add", eventOf(chip, chips.length - 1));
      }
      if (leftover.length > 0) {
        input.value = leftover.join(`${options.separators[0]} `);
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
      showError(message);
      sync();
    };

    // ---------------------------------------------------------------- wiring
    const onInput = (): void => {
      syncEmpty();
      if (input.required) syncValidity();
    };
    const onCompositionStart = (): void => {
      inComposition = true;
      justEndedComposition = false;
    };
    const onCompositionEnd = (): void => {
      inComposition = false;
      justEndedComposition = true;
      queueMicrotask(() => {
        justEndedComposition = false;
      });
    };
    // A blur commits an edit and never pulls focus back: the control the
    // person moved to keeps it.
    const onBlur = (): void => {
      if (editingIndex !== null) commitEdit(false);
      // The shared blur handler toggles --empty from the draft alone; a field
      // with chips is not empty. This listener is registered after the shared
      // one, so the class is put right in the same tick: no frame paints the
      // label at rest.
      syncEmpty();
    };

    const target = input as HTMLInputElement;
    target.addEventListener("keydown", onInputKeydown);
    target.addEventListener("paste", onPaste);
    target.addEventListener("input", onInput);
    target.addEventListener("compositionstart", onCompositionStart);
    target.addEventListener("compositionend", onCompositionEnd);
    target.addEventListener("blur", onBlur);
    // Focus returning to the input runs the shared focus handler, which reads
    // the draft alone; the class is re-asserted chip-side.
    target.addEventListener("focus", syncEmpty);

    // Clicks on the row's empty space put the caret in the input.
    const onRowClick = (event: MouseEvent): void => {
      if (event.target === row || event.target === list) input.focus();
    };
    row.addEventListener("click", onRowClick);

    // A disabled field disables its chips too, and its rows submit nothing.
    // The field's API drives the disabled manager, so that is what is wrapped.
    const manager = (host as C & { disabled?: { disable: () => unknown; enable: () => unknown } }).disabled;
    if (manager) {
      const disable = manager.disable;
      const enable = manager.enable;
      manager.disable = () => {
        const result = disable.call(manager);
        for (const chip of chips) chip.disable();
        syncForm();
        return result;
      };
      manager.enable = () => {
        const result = enable.call(manager);
        for (const chip of chips) chip.enable();
        syncForm();
        return result;
      };
    }

    // The name attribute moves the chips' form rows, never the draft input.
    // The field's own setters write it onto the input, whichever copy of the
    // component runs them, so the input's attribute is what is watched.
    let movingName = false;
    const observer = new MutationObserver(() => {
      if (movingName) return;
      const next = input.getAttribute("name");
      if (next === null || next === "") {
        if (fieldName !== null) {
          fieldName = null;
          syncForm();
        }
        return;
      }
      fieldName = next;
      movingName = true;
      input.removeAttribute("name");
      queueMicrotask(() => {
        movingName = false;
      });
      syncForm();
    });
    observer.observe(input, { attributes: true, attributeFilter: ["name"] });
    // `setRequired(null)` and later calls write the input's own required
    // attribute: the chips' validity follows it, outside our own writes.
    const requiredObserver = new MutationObserver(() => {
      if (writingRequired) return;
      wantedRequired = input.required;
      syncValidity();
    });
    requiredObserver.observe(input, { attributes: true, attributeFilter: ["required"] });
    // The disabled state reaches the field as a class, set by whichever copy of
    // the component runs it: the rows and the chips follow the class.
    const classObserver = new MutationObserver(() => {
      for (const chip of chips) {
        if (isDisabled()) chip.disable();
        else chip.enable();
      }
      // The shared input handlers toggle --empty from the draft alone; a field
      // with committed chips is not empty, so the class is taken off again
      // (only when it is wrong, or the observer would loop).
      syncForm();
    });
    classObserver.observe(component.element, { attributes: true, attributeFilter: ["class"] });
    // Silent setters write the class without an event (`setValue("")` through
    // the API), so a class change is the last place to take it off: a mutation
    // callback runs before the next paint, and one removal cannot re-trigger
    // itself.
    let fixingEmpty = false;
    const emptyObserver = new MutationObserver(() => {
      if (fixingEmpty || chips.length === 0) return;
      if (!component.element.classList.contains(`${rootClass}--empty`)) return;
      fixingEmpty = true;
      component.element.classList.remove(`${rootClass}--empty`);
      fixingEmpty = false;
    });
    emptyObserver.observe(component.element, { attributes: true, attributeFilter: ["class"] });

    // The form's own reset restores the chips the field started with. The
    // field is built before it is connected, so the form is not known at
    // creation: the listener is attached on the first sync that sees one.
    // The full initial items keep their values (a `{label, value}` item submits
    // its value, not its label), and the draft comes back at its default.
    const initial = options.items.map(configOf);
    const onReset = (): void => {
      queueMicrotask(() => {
        setValuesInternal(initial, false);
        input.value = (input as HTMLInputElement).defaultValue ?? "";
        sync();
      });
    };
    let resetForm: HTMLFormElement | null = null;
    const listenReset = (): void => {
      const form = input.form;
      if (form === resetForm) return;
      resetForm?.removeEventListener("reset", onReset);
      resetForm = form;
      resetForm?.addEventListener("reset", onReset);
    };

    if (host.lifecycle?.destroy) {
      const destroy = host.lifecycle.destroy;
      host.lifecycle.destroy = () => {
        resetForm?.removeEventListener("reset", onReset);
        observer.disconnect();
        classObserver.disconnect();
        emptyObserver.disconnect();
        requiredObserver.disconnect();
        target.removeEventListener("keydown", onInputKeydown);
        target.removeEventListener("paste", onPaste);
        target.removeEventListener("input", onInput);
        target.removeEventListener("compositionstart", onCompositionStart);
        target.removeEventListener("compositionend", onCompositionEnd);
        target.removeEventListener("blur", onBlur);
        row.removeEventListener("click", onRowClick);
        for (const chip of chips) chip.destroy();
        destroy.call(host.lifecycle);
      };
    }

    // ---------------------------------------------------------------- API
    const setValuesInternal = (values: readonly TextFieldChipItem[], triggerEvent: boolean): void => {
      if (editingIndex !== null) cancelEdit(false);
      for (const chip of chips.splice(0)) chip.destroy();
      for (const value of values) {
        const chip = attach(value);
        if (triggerEvent) emit("add", eventOf(chip, chips.length - 1));
      }
      sync();
    };

    const addChip = (item: TextFieldChipItem, triggerEvent = true): ChipComponent | null => {
      const text = typeof item === "string" ? item : item.label ?? String(item.value ?? "");
      const verdict = accepts(text);
      if (!verdict.ok) {
        showError(verdict.message);
        return null;
      }
      const chip = attach(item);
      if (triggerEvent) emit("add", eventOf(chip, chips.length - 1));
      sync();
      return chip;
    };

    const removeChip = (target: ChipComponent | number | string, triggerEvent = true): void => {
      const index = typeof target === "number"
        ? target
        : typeof target === "string"
          ? chips.findIndex((chip) => textOf(chip) === target)
          : indexOf(target);
      if (index >= 0) removeAt(index, triggerEvent);
    };

    for (const item of options.items) attach(item);
    if (isDisabled()) for (const chip of chips) chip.disable();
    sync();

    const feature: ChipsFeature = {
      getValues: () => chips.map(textOf),
      setValues: (values, triggerEvent = false) => setValuesInternal(values, triggerEvent),
      getChips: () => [...chips],
      addChip,
      removeChip,
      sync,
    };

    expose(feature);

    // Creation-time listeners, as onTrailingClick is for `trailing`.
    const chipsConfig = typeof config.chips === "object" ? config.chips : null;
    const listeners = component as { on?: (event: "add" | "remove", handler: (payload: unknown) => void) => unknown };
    if (chipsConfig?.onAdd) listeners.on?.("add", chipsConfig.onAdd as (payload: unknown) => void);
    if (chipsConfig?.onRemove) listeners.on?.("remove", chipsConfig.onRemove as (payload: unknown) => void);

    return { ...component, chips: feature };
  };
