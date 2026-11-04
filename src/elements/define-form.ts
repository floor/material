// src/elements/define-form.ts
/**
 * `defineFormElement` turns a component factory into a form-associated custom
 * element: `formAssociated`, `internals`, the form value and validity, reset,
 * state restore, disabling and click activation.
 *
 * The form machinery lives here rather than in `define.ts`, so a page that
 * defines no form element does not carry it. The element class still builds
 * from `createElementClass`; this module extends it and reaches the base's
 * private state through the hooks `ElementClass` declares.
 *
 * Nothing here touches the DOM at import time: the class is built on first use.
 *
 * @module elements
 */

import {
  createDefinition,
  createElementClass,
  type ElementClassConstructor,
  type ElementComponent,
  type ElementDefinition,
  type ElementSpec,
  type FormSpec,
} from "./define";

/** The form-associated element class for a spec. Called on first use, never at import. */
export const createFormElementClass = <C extends ElementComponent>(
  spec: ElementSpec<C> & { form: FormSpec<C> },
): ElementClassConstructor<C> => {
  const Base = createElementClass(spec);

  class MFormElement extends Base {
    static formAssociated = true;

    #restore: string | null = null;

    constructor() {
      super();
      this.internals = typeof this.attachInternals === "function" ? this.attachInternals() : null;
    }

    formResetCallback(): void {
      // Attributes are the defaults: rebuilding from them is the reset.
      this.resetToDefaults();
    }

    formStateRestoreCallback(state: unknown): void {
      if (typeof state !== "string" || !spec.form.restore) return;
      this.markDirty(); // a restored state is the user's, as natively
      if (!this.component) {
        this.#restore = state; // applied once the component is built
        return;
      }
      this.quietly(() => spec.form.restore?.(this.component as C, state));
      this.syncForm();
    }

    formDisabledCallback(disabled: boolean): void {
      if (this.component && spec.form.disable) this.quietly(() => spec.form.disable?.(this.component as C, disabled));
    }

    formBuild(component: C): void {
      if (this.#restore === null) return;
      const state = this.#restore;
      this.#restore = null;
      this.quietly(() => spec.form.restore?.(component, state));
    }

    syncForm(): void {
      const form = spec.form;
      const internals = this.internals;
      if (!internals || !this.component) return;
      const value = form.value(this.component, this);
      if (form.state) internals.setFormValue(value, form.state(this.component));
      else internals.setFormValue(value);
      // Not again while it stays valid: setting the validity was most of a
      // property set's cost, and a toggled checkbox that is not required
      // stays valid. The internals say whether they already are;
      // an invalid one is set every time, as its message or flags may change.
      const control = form.control?.(this.component);
      if (control) {
        const validity = control.validity;
        if (!(validity.valid && internals.validity.valid)) {
          internals.setValidity(validity, control.validationMessage, control);
        }
      }
    }
  }

  return MFormElement;
};

/**
 * Creates the definition for a spec with `form`. The element joins its form
 * like a native control: it submits the spec's value, reports the inner
 * control's validity, resets to its attributes, restores the state the
 * browser kept for it, follows the form's disabled state and activates on a
 * click of the host itself.
 *
 * Form participation is the only difference from `defineElement`, which
 * refuses a spec with `form`: a page that defines no form element does not
 * carry this module.
 *
 * @experimental The element authoring API (`defineElement`, `defineFormElement`, `ElementSpec`,
 * `registerStyles`, `hasStyles`, `SHADOW_BASE_STYLES`) is outside semantic versioning in 3.x:
 * it may change in a minor release. The elements the library defines, and their attributes,
 * properties and events, are not.
 */
export const defineFormElement = <C extends ElementComponent>(spec: ElementSpec<C>): ElementDefinition<C> => {
  if (!spec.form) throw new Error("defineFormElement: the spec needs a form");
  return createDefinition(spec as ElementSpec<C> & { form: FormSpec<C> }, createFormElementClass);
};
