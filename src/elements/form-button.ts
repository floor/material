// src/elements/form-button.ts
/**
 * What the button-like elements (`<m-button>`, `<m-icon-button>`, `<m-fab>`,
 * `<m-extended-fab>`) share: `type="submit"` and `type="reset"` act on the
 * host's form, which a button inside a shadow root cannot reach by itself.
 *
 * @module elements
 */

import { PREFIX } from "../core/config";
import type { AttributeSpec, ElementComponent, ElementHost, FormSpec } from "./define";

interface ButtonControl {
  element: HTMLElement;
  leadingElement?: HTMLElement;
  isSelected?: () => boolean;
}

type ReferenceProperty = "ariaControlsElements" | "ariaDescribedByElements";

const ariaAttribute = (name: string, reference?: ReferenceProperty): AttributeSpec<ButtonControl> & { type: "string" } => ({
  type: "string",
  update(component, value, host) {
    const button = component.leadingElement ?? component.element;
    if (reference) {
      const control = button as HTMLElement & Partial<Record<ReferenceProperty, Element[] | null>>;
      if (!(reference in control)) return;
      // Resolve in the host's scope, where the author wrote the ID references.
      const root = host.getRootNode() as Document | DocumentFragment;
      const targets: Element[] = [];
      for (const id of String(value ?? "").split(/[\t\n\f\r ]+/)) {
        const target = id && root.getElementById?.(id);
        if (target) targets.push(target);
      }
      control[reference] = targets.length ? targets : null;
    } else if (value !== null) {
      button.setAttribute(name, String(value));
    } else if (name === "aria-pressed" && (
      button.classList.contains(`${PREFIX}-button--toggle`) || button.classList.contains(`${PREFIX}-icon-button--toggle`)
    )) {
      // With the authored override gone, the built-in toggle owns this state.
      button.setAttribute(name, String(component.isSelected?.() ?? false));
    } else {
      button.removeAttribute(name);
    }
  },
});

export const buttonAria = {
  "aria-expanded": ariaAttribute("aria-expanded"),
  "aria-haspopup": ariaAttribute("aria-haspopup"),
  "aria-pressed": ariaAttribute("aria-pressed"),
  "aria-controls": ariaAttribute("aria-controls", "ariaControlsElements"),
  "aria-describedby": ariaAttribute("aria-describedby", "ariaDescribedByElements"),
};

export const syncButtonAria = (host: HTMLElement, component: ButtonControl): void => {
  for (const [name, attribute] of Object.entries(buttonAria)) {
    const value = host.getAttribute(name);
    if (value !== null) attribute.update?.(component, value, host);
  }
};

/** The part of a button-like component the form wiring uses. */
interface Disableable {
  enable: () => unknown;
  disable: () => unknown;
}

/**
 * The `type` attribute: read by the click handler, never passed to the
 * factory, whose inner button stays `type="button"`.
 */
export const typeAttribute = { type: "string", update: () => undefined } as const;

/**
 * Form association without a value, so `internals.form` is the host's form
 * and a disabled fieldset disables the button.
 */
export const buttonForm = <C extends Disableable>(): FormSpec<C> => ({
  value: () => null,
  disable: (c, disabled) => void (disabled ? c.disable() : c.enable()),
});

/** Submits or resets the host's form on click, as `type` asks. Returns the cleanup. */
export const setupFormButton = <C extends ElementComponent>(host: ElementHost<C>, component: C): (() => void) => {
  syncButtonAria(host, component);
  const onClick = (): void => {
    const form = host.internals?.form;
    const type = host.getAttribute("type");
    if (!form || host.hasAttribute("disabled")) return;
    if (type === "submit") form.requestSubmit();
    else if (type === "reset") form.reset();
  };
  host.addEventListener("click", onClick);
  return () => host.removeEventListener("click", onClick);
};
