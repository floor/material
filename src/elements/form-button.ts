// src/elements/form-button.ts
/**
 * What the button-like elements (`<m-button>`, `<m-icon-button>`, `<m-fab>`,
 * `<m-extended-fab>`) share: `type="submit"` and `type="reset"` act on the
 * host's form, which a button inside a shadow root cannot reach by itself.
 *
 * @module elements
 */

import type { ElementComponent, ElementHost, FormSpec } from "./define";

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
export const submitOnClick = <C extends ElementComponent>(host: ElementHost<C>): (() => void) => {
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
