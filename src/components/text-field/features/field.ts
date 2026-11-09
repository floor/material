// src/components/text-field/features/field.ts

import type { ElementComponent } from "../../../core/compose/component";
import { setHTML } from "../../../core/dom/html";

/**
 * The text field's anatomy, as M3 draws it: the root holds the
 * field — the 56dp container with its label, input, outline, icons and
 * affixes — and, under it, the supporting text row with the helper at the
 * start and the character counter at the end. The row is in the flow, so a
 * helper wraps and pushes what follows instead of overlapping it; everything
 * drawn on the container is placed against the field, so the row never moves
 * it.
 */
export interface FieldComponent {
  /** The container: label, input, outline, icons and affixes */
  field: HTMLElement;
}

export interface FieldConfig {
  prefix?: string;
  componentName?: string;
}

/** Creates the field, the container every feature after it draws into */
export const withField =
  // `& object` lets a component config that shares no key with FieldConfig through.
  <T extends FieldConfig & object>(config: T) =>
  <C extends ElementComponent>(component: C): C & FieldComponent => {
    const field = document.createElement("div");
    field.className = `${config.prefix || "mtrl"}-${config.componentName || "text-field"}__field`;
    component.element.appendChild(field);
    return { ...component, field };
  };

/** Where a feature draws on the container: the field, or the root of a component without one */
export const fieldOf = (component: { element: HTMLElement; field?: HTMLElement }): HTMLElement =>
  component.field ?? component.element;

/**
 * The supporting text row under the field, created on first use. It holds the
 * helper (first) and the counter (last); `release` removes it once both are gone.
 */
export const supportingRow = (root: HTMLElement, prefix: string, name: string) => {
  const className = `${prefix}-${name}__supporting`;
  const find = (): HTMLElement | null => root.querySelector<HTMLElement>(`:scope > .${className}`);
  return {
    ensure(): HTMLElement {
      const existing = find();
      if (existing) return existing;
      const row = document.createElement("div");
      row.className = className;
      root.appendChild(row);
      return row;
    },
    release(): void {
      const row = find();
      if (row && !row.children.length) row.remove();
    },
  };
};

/** Adds one id to an ARIA id list, keeping the ids already there */
export const addIdRef = (element: Element, attribute: string, id: string): void => {
  const ids = (element.getAttribute(attribute) || "").split(/\s+/).filter(Boolean);
  if (!ids.includes(id)) element.setAttribute(attribute, [...ids, id].join(" "));
};

/** Removes one id from an ARIA id list, and the attribute once it is empty */
export const removeIdRef = (element: Element, attribute: string, id: string): void => {
  const ids = (element.getAttribute(attribute) || "").split(/\s+/).filter((ref) => ref && ref !== id);
  if (ids.length) element.setAttribute(attribute, ids.join(" "));
  else element.removeAttribute(attribute);
};

interface SlotHost {
  element: HTMLElement;
  field?: HTMLElement;
  input?: { classList: { add: (...tokens: string[]) => void; remove: (...tokens: string[]) => void } };
  lifecycle?: { destroy: () => void };
}

/**
 * A span slot created on first use (prefix, suffix, leading icon).
 * One copy: the three features differ by class, hidden, and how the value is written.
 */
export const installTextSlot = (
  component: SlotHost,
  names: { prefix?: string; componentName?: string },
  initial: string | undefined,
  options: { part: string; modifier: string; inputModifier?: string; hidden?: boolean; html?: boolean },
): { element: HTMLElement | null; set: (value: string) => HTMLElement; remove: () => boolean } => {
  const prefix = names.prefix || "mtrl";
  const name = names.componentName || "text-field";
  const rootClass = `${prefix}-${name}--with-${options.modifier}`;
  const inputClass = options.inputModifier ? `${prefix}-${name}__input--with-${options.inputModifier}` : "";
  let slot: HTMLElement | null = null;

  const ensure = (): HTMLElement => {
    if (slot?.parentNode) return slot;
    const element = document.createElement("span");
    element.className = `${prefix}-${name}__${options.part}`;
    if (options.hidden) element.setAttribute("aria-hidden", "true");
    fieldOf(component).appendChild(element);
    component.element.classList.add(rootClass);
    if (inputClass && component.input) component.input.classList.add(inputClass);
    slot = element;
    return element;
  };

  const detach = (): void => {
    slot?.remove();
    slot = null;
    component.element.classList.remove(rootClass);
    if (inputClass && component.input) component.input.classList.remove(inputClass);
  };

  const write = (element: HTMLElement, value: string): void => {
    if (options.html) setHTML(element, value);
    else element.textContent = value;
  };

  if (initial) write(ensure(), initial);

  if (component.lifecycle?.destroy) {
    const destroy = component.lifecycle.destroy;
    component.lifecycle.destroy = () => {
      slot?.remove();
      slot = null;
      destroy.call(component.lifecycle);
    };
  }

  return {
    get element() {
      return slot;
    },
    set(value: string) {
      const element = ensure();
      write(element, value);
      return element;
    },
    remove() {
      if (!slot) return false;
      detach();
      return true;
    },
  };
};
