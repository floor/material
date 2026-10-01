// src/components/textfield/features/required.ts

import type { BaseComponent, ElementComponent } from "../../../core/compose/component";
import type { LabelManager } from "../../../core/compose/features/textlabel";

/**
 * A required field's asterisk (FLO-301). M3's text field guidelines mark a
 * required field with an asterisk after its label, and Material's own web
 * text field appends it to the label text in the label's colour. Here it is a
 * span after the text, hidden from screen readers: the input's native
 * `required` already announces the field as required, and "star" would not.
 */
export interface RequiredConfig {
  /** Whether the field is required; the input gets `required` from withTextInput */
  required?: boolean;
  /**
   * No asterisk on a required field. M3 lets a form whose fields are mostly
   * required mark its optional ones instead (Material Web's `noAsterisk`).
   */
  noAsterisk?: boolean;
  prefix?: string;
  componentName?: string;
}

/** What this feature installs */
export interface RequiredFeature {
  /** Makes the field required or optional, its asterisk with it */
  setRequired: (required: boolean) => RequiredFeature;
  /** Whether the field is required */
  isRequired: () => boolean;
}

interface LabelledInputComponent extends ElementComponent {
  input?: HTMLInputElement | HTMLTextAreaElement;
  label?: LabelManager;
}

export const withRequired =
  // `& object` lets a component config that shares no key with RequiredConfig through.
  <T extends RequiredConfig & object>(config: T) =>
  <C extends LabelledInputComponent>(component: C): C & RequiredFeature & BaseComponent => {
    const PREFIX = config.prefix || "mtrl";
    const NAME = config.componentName || "textfield";
    const label = component.label;
    let required = Boolean(config.required);

    const asterisk = (): HTMLElement | null =>
      label?.getElement().querySelector<HTMLElement>(`.${PREFIX}-${NAME}__required`) ?? null;

    const render = (): void => {
      if (!label) return;
      const shown = asterisk();
      if (required && !config.noAsterisk) {
        if (shown) return;
        const span = document.createElement("span");
        span.className = `${PREFIX}-${NAME}__required`;
        span.setAttribute("aria-hidden", "true");
        span.textContent = "*";
        label.getElement().append(span);
      } else {
        shown?.remove();
      }
    };

    // The label's own setter writes textContent, which would drop the asterisk,
    // and its getter would read it: both keep to the label's text
    if (label) {
      const setText = label.setText.bind(label);
      label.setText = (text: string) => {
        setText(text);
        render();
        return label;
      };
      // The asterisk is always the label's last child
      label.getText = () => {
        const text = label.getElement().textContent ?? "";
        return asterisk() ? text.slice(0, -1) : text;
      };
    }

    render();

    return {
      ...component,
      setRequired(next: boolean) {
        required = next;
        if (component.input) component.input.required = next;
        render();
        return this;
      },
      isRequired() {
        return required;
      },
    } as C & RequiredFeature & BaseComponent;
  };
