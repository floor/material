// src/components/text-field/features/field.ts

import type { ElementComponent } from "../../../core/compose/component";

/**
 * The text field's anatomy, as M3 draws it (FLO-300): the root holds the
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
