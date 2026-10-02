// src/components/text-field/features/counter.ts

import type { ElementComponent } from "../../../core/compose/component";
import { addIdRef, removeIdRef, supportingRow } from "./field";

/**
 * The character counter (FLO-300): at the end of the supporting text row
 * whenever the input has a `maxlength`, as Material Web shows it, reading
 * `count/max`. It describes the input, so a screen reader hears it with the
 * field when it is focused rather than on every keystroke. It follows the
 * input's `maxlength` attribute, so a limit set or removed later (by
 * `<m-text-field maxlength>`, say) adds or removes it.
 *
 * It owns no state of the field: in error it takes the error colour from the
 * root's --error class, as the helper does.
 */
export interface CounterComponent {
  /** Re-reads the input's value and limit */
  updateCounter: () => void;
}

interface CounterHost extends ElementComponent {
  input?: HTMLInputElement | HTMLTextAreaElement;
  setValue?: (value: string) => unknown;
  lifecycle?: { destroy: () => void };
}

export interface CounterConfig {
  prefix?: string;
  componentName?: string;
}

export const withCounter =
  // `& object` lets a component config that shares no key with CounterConfig through.
  <T extends CounterConfig & object>(config: T) =>
  <C extends CounterHost>(component: C): C & CounterComponent => {
    const input = component.input;
    if (!input) return { ...component, updateCounter: () => {} };
    const PREFIX = config.prefix || "mtrl";
    const NAME = config.componentName || "text-field";
    const row = supportingRow(component.element, PREFIX, NAME);
    const id = `${PREFIX}-${NAME}-counter-${Math.random().toString(36).slice(2, 9)}`;
    let counter: HTMLElement | null = null;

    const update = (): void => {
      const max = input.maxLength;
      if (max > 0) {
        if (!counter) {
          counter = document.createElement("div");
          counter.className = `${PREFIX}-${NAME}__counter`;
          counter.id = id;
          row.ensure().append(counter);
          addIdRef(input, "aria-describedby", id);
        }
        counter.textContent = `${input.value.length}/${max}`;
      } else if (counter) {
        counter.remove();
        counter = null;
        row.release();
        removeIdRef(input, "aria-describedby", id);
      }
    };

    input.addEventListener("input", update);
    const limits = new MutationObserver(update);
    limits.observe(input, { attributes: true, attributeFilter: ["maxlength"] });
    update();

    if (component.lifecycle?.destroy) {
      const destroy = component.lifecycle.destroy;
      component.lifecycle.destroy = () => {
        input.removeEventListener("input", update);
        limits.disconnect();
        destroy.call(component.lifecycle);
      };
    }

    const setValue = component.setValue;
    return {
      ...component,
      ...(setValue && {
        // A value set by script fires no input event.
        setValue(value: string) {
          setValue.call(this, value);
          update();
          return this;
        },
      }),
      updateCounter: update,
    };
  };
